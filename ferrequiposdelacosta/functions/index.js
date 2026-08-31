import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";

import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import {getMessaging} from "firebase-admin/messaging";
import {getDatabase, ServerValue} from "firebase-admin/database";
import {getStorage} from "firebase-admin/storage";

// Las cuentas de las facturas, TAL CUAL las usa la app. No es una version
// aparte: compartido/facturaCalculos.js es una copia generada de
// src/Components/ClienteDetalle/facturaCalculos.js, que se rehace sola en cada
// despliegue (ver scripts/sincronizar-calculos.js). Si las dos se separaran, el
// menu y la ficha del cliente mostrarian numeros distintos; hay una prueba que
// falla si eso pasa.
import {
  calcularAporteFactura,
  calcularCantidadPendiente,
  calcularEstadoCliente,
  calcularTotalesFacturas,
  equiposQueVencieronHoy,
  facturaCerrada,
  facturaEnSeguimiento,
  obtenerFechaHoyBogota,
} from "./compartido/facturaCalculos.js";

initializeApp();

setGlobalOptions({
  maxInstances: 10,
  cors: true,
});

// Mismo mapeo que src/Components/RolesPermisos/RolesPermisos.jsx: solo estos
// roles tienen los permisos "crearUsuarios"/"eliminarUsuarios". Si se agrega
// ahí otro rol con esos permisos, agregarlo también acá.
const ROLES_CON_PERMISO_USUARIOS = ["administrador"];

/**
 * Verifica que quien llama esté logueado y tenga rol con permiso para
 * gestionar usuarios. createUser/deleteUser crean o borran cuentas reales
 * de Firebase Auth: sin esta verificación, cualquiera en internet podía
 * llamarlas sin loguearse.
 * @param {Object} request Request recibido por la Cloud Function onCall.
 * @return {Promise} Promesa vacía; lanza HttpsError si no autoriza.
 */
async function verificarPermisoUsuarios(request) {
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "Tenés que iniciar sesión para hacer esto.",
    );
  }

  const perfilSnap = await getFirestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();
  const role = perfilSnap.exists ? perfilSnap.data().role : null;

  if (!ROLES_CON_PERMISO_USUARIOS.includes(role)) {
    throw new HttpsError(
        "permission-denied",
        "No tenés permiso para gestionar usuarios.",
    );
  }
}

export const createUser = onCall(async (request) => {
  await verificarPermisoUsuarios(request);

  try {
    const {email, password, name, genero, role, permisos} = request.data;

    if (!email || !password) {
      throw new HttpsError(
          "invalid-argument",
          "Email y contraseña son obligatorios",
      );
    }

    const userRecord = await getAuth().createUser({
      email,
      password,
    });

    await getFirestore().collection("users").doc(userRecord.uid).set({
      name,
      genero,
      email,
      role,
      permisos,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      uid: userRecord.uid,
    };
  } catch (error) {
    console.error("Error detallado en createUser:", error);

    const errorMessage = error.message || "";

    if (
      error.code === "auth/email-already-in-use" ||
      errorMessage.indexOf("already in use") !== -1
    ) {
      throw new HttpsError("already-exists", "El correo ya está registrado.");
    }

    if (
      error.code === "auth/invalid-email" ||
      errorMessage.indexOf("invalid email") !== -1
    ) {
      throw new HttpsError(
          "invalid-argument",
          "El formato del correo es inválido.",
      );
    }

    throw new HttpsError(
        "internal",
        errorMessage || "Error interno del servidor",
    );
  }
});

export const deleteUser = onCall(async (request) => {
  await verificarPermisoUsuarios(request);

  try {
    const {email} = request.data;

    if (!email) {
      throw new HttpsError(
          "invalid-argument",
          "El correo electrónico es obligatorio.",
      );
    }

    const userRecord = await getAuth().getUserByEmail(email);
    const uid = userRecord.uid;

    await getFirestore().collection("users").doc(uid).delete();

    // Lo que el usuario deja regado en los otros dos servicios. Se borra
    // desde acá porque esta función corre con permisos de administrador: las
    // reglas de Storage dejan tocar un avatar SOLO a su dueño, así que el
    // intento que hacía la app al eliminar fallaba siempre —en silencio— y la
    // foto quedaba huérfana en el bucket. La presencia directamente no la
    // borraba nadie.
    //
    // Cada uno va en su propio try: que quede una foto suelta no puede
    // impedir que se elimine la cuenta.
    try {
      await getDatabase().ref(`usuariosConectados/${uid}`).remove();
    } catch (error) {
      console.error("No se pudo borrar la presencia del usuario:", error);
    }

    try {
      // ignoreNotFound porque un usuario que nunca subió foto no tiene
      // archivo, y eso no es un error.
      await getStorage()
          .bucket()
          .file(`avatars/${uid}`)
          .delete({ignoreNotFound: true});
    } catch (error) {
      console.error("No se pudo borrar la foto del usuario:", error);
    }

    await getAuth().deleteUser(uid);

    return {
      success: true,
      message: `Usuario con email ${email} eliminado correctamente.`,
    };
  } catch (error) {
    console.error("Error en deleteUser:", error);

    const errorMessage = error.message || "";

    if (
      error.code === "auth/user-not-found" ||
      errorMessage.indexOf("no user record") !== -1
    ) {
      throw new HttpsError("not-found", "El usuario no existe en el sistema.");
    }

    throw new HttpsError(
        "internal",
        errorMessage || "Error interno al eliminar el usuario.",
    );
  }
});

// Los roles que atienden solicitudes: los mismos que ven el buzón en
// RolesPermisos.jsx (permiso "solicitudesCotizaciones"). Si allá se agrega otro
// rol con ese permiso, agregarlo también acá.
const ROLES_QUE_ATIENDEN = [
  "gestorFacturacion",
  "gestorIntegral",
  "administrador",
];

/**
 * El día anterior a una fecha AAAA-MM-DD. Se arma en UTC a propósito: la fecha
 * ya viene resuelta en hora de Bogotá (obtenerFechaHoyBogota), así que acá solo
 * hay que correr el calendario un día, sin volver a mezclar zonas horarias.
 * @param {string} fechaIso Fecha AAAA-MM-DD.
 * @return {string} El día anterior, AAAA-MM-DD.
 */
function restarUnDia(fechaIso) {
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() - 1);
  return fecha.toISOString().slice(0, 10);
}

/**
 * Cómo se llama un cliente, sea persona o empresa. Mismo criterio que la app
 * (obtenerNombreCompleto en las pantallas de clientes).
 * @param {Object} cliente Datos del cliente.
 * @return {string} Nombre para mostrar.
 */
function nombreDeCliente(cliente) {
  if (!cliente) return "Un cliente";
  if (cliente.tipo === "empresa") {
    return cliente.razonSocial || cliente.nombreOriginal || "Una empresa";
  }
  return (
    [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") ||
    cliente.nombreOriginal ||
    "Un cliente"
  );
}

/**
 * El título del aviso de la madrugada.
 *
 * Se avisa por EQUIPO: lo normal es que la novedad del día sea que venció
 * alguno. La factura que entra en seguimiento sin ningún equipo vencido existe
 * igual —devolvió todo y quedó debiendo—, y ahí se dice así.
 *
 * @param {Array} novedades Lo detectado hoy, ver describirNovedades.
 * @return {string} Primera línea del aviso.
 */
function tituloDeNovedades(novedades) {
  const equipos = novedades.filter((novedad) => novedad.equipo);

  if (novedades.length === 1) {
    return equipos.length === 1 ?
      "Venció un equipo" :
      "Una factura entró en seguimiento";
  }

  return equipos.length === novedades.length ?
    `${novedades.length} equipos vencieron hoy` :
    `${novedades.length} novedades en seguimiento`;
}

/**
 * El texto del aviso de la madrugada.
 *
 * Con una sola novedad se dice cuál es —qué equipo, de qué factura y de
 * quién—; con varias, de quiénes son. Más de tres nombres no entran en la
 * pantalla del teléfono, así que se cuentan los que sobran: el aviso es para
 * que alguien abra la pantalla, no para resolverlo desde ahí.
 *
 * Los nombres no se repiten: tres equipos vencidos del mismo cliente se
 * nombran una vez, no tres veces seguidas.
 *
 * @param {Array} novedades Cada una con clienteId, numero y, si es un equipo
 *   vencido, su nombre y cuántas unidades faltan.
 * @param {Map} nombres clienteId → nombre para mostrar.
 * @return {string} Segunda línea del aviso.
 */
function describirNovedades(novedades, nombres) {
  const deQuien = (novedad) => nombres.get(novedad.clienteId) || "Un cliente";

  if (novedades.length === 1) {
    const [novedad] = novedades;
    if (!novedad.equipo) {
      return `Factura ${novedad.numero} de ${deQuien(novedad)}.`;
    }
    return (
      `${novedad.cantidad} ${novedad.equipo} de la factura ` +
      `${novedad.numero}, de ${deQuien(novedad)}.`
    );
  }

  const clientes = [...new Set(novedades.map(deQuien))];
  const primeros = clientes.slice(0, 3).join(", ");
  const resto = clientes.length - 3;

  return resto > 0 ? `${primeros} y ${resto} más.` : `${primeros}.`;
}

/**
 * Manda un aviso al teléfono del personal que puede atenderlo, aunque tengan la
 * app cerrada.
 *
 * Cada persona registra sus equipos desde el botón "Activar avisos"
 * (src/Utils/avisos.js), y quedan en `avisosTokens` de su ficha. Una misma
 * persona puede tener varios: el celular y el computador de la oficina.
 *
 * Se manda SOLO datos, sin el bloque de notificación que arma Firebase: así el
 * aviso lo dibuja el ayudante del navegador (public/firebase-messaging-sw.js),
 * que decide el ícono, el texto y a dónde lleva al tocarlo.
 *
 * Nunca lanza: un aviso que no sale no puede tumbar la solicitud del cliente,
 * que es lo único que de verdad no se puede perder.
 *
 * @param {Object} aviso Qué decir y a dónde llevar.
 * @param {string} aviso.titulo Primera línea del aviso.
 * @param {string} aviso.cuerpo Segunda línea.
 * @param {string} aviso.url Pantalla que se abre al tocarlo.
 * @param {string} aviso.tipo Agrupa los avisos parecidos en el teléfono.
 * @return {Promise<void>}
 */
async function avisarAlPersonal({titulo, cuerpo, url, tipo}) {
  try {
    const db = getFirestore();
    const personal = await db
        .collection("users")
        .where("role", "in", ROLES_QUE_ATIENDEN)
        .get();

    // De quién es cada equipo, para poder limpiar después los que ya no
    // responden.
    const porUsuario = new Map();
    personal.forEach((docSnap) => {
      const equipos = docSnap.data().avisosTokens;
      if (Array.isArray(equipos) && equipos.length > 0) {
        porUsuario.set(docSnap.id, equipos);
      }
    });

    const tokens = [...porUsuario.values()].flat();
    if (tokens.length === 0) return;

    const respuesta = await getMessaging().sendEachForMulticast({
      tokens,
      data: {titulo, cuerpo, url, tipo},
      // Un aviso de trabajo no puede esperar a que el teléfono despierte solo.
      webpush: {headers: {Urgency: "high"}},
    });

    // Equipos que ya no existen (app desinstalada, teléfono cambiado). Si no se
    // sacan, la lista crece para siempre y cada envío arrastra direcciones
    // muertas.
    const muertos = new Set();
    respuesta.responses.forEach((resultado, i) => {
      const codigo = resultado.error ? resultado.error.code : "";
      if (
        codigo.includes("registration-token-not-registered") ||
        codigo.includes("invalid-argument")
      ) {
        muertos.add(tokens[i]);
      }
    });

    if (muertos.size === 0) return;

    await Promise.all(
        [...porUsuario].map(([uid, suyos]) => {
          const aBorrar = suyos.filter((token) => muertos.has(token));
          if (aBorrar.length === 0) return null;
          return db
              .collection("users")
              .doc(uid)
              .update({avisosTokens: FieldValue.arrayRemove(...aBorrar)});
        }),
    );
  } catch (error) {
    console.error("No se pudo avisar al personal:", error);
  }
}

// enforceAppCheck rechaza toda llamada que no traiga un token válido de App
// Check (reCAPTCHA Enterprise). Así solo la app real puede crear cotizaciones;
// un bot que descubra la URL de la función queda fuera. El cliente adjunta el
// token automáticamente porque App Check se inicializa en Firebase.js.
//
// La solicitud se guarda en Firestore (colección "cotizaciones", ver
// src/Components/AdminCotizaciones/cotizacionesDb.js) y no en la base en tiempo
// real. El cliente de la tienda no nota ninguna diferencia: nunca escribió en
// la base directamente, siempre llamó a esta función, que escribe con permisos
// de administrador sin pasar por las reglas.
const CON_APP_CHECK = {enforceAppCheck: true};

export const crearCotizacion = onCall(CON_APP_CHECK, async (request) => {
  const quotationData = request.data;

  if (
    !quotationData ||
    !quotationData.items ||
    quotationData.items.length === 0
  ) {
    throw new HttpsError(
        "invalid-argument",
        "La cotización debe contener al menos un equipo.",
    );
  }

  try {
    const cotizacionId = `COT-${Date.now()}`;

    // `id` no se guarda adentro: es el nombre del documento. createdAt va como
    // número (no como marca de tiempo de Firestore) porque es el campo por el
    // que ordena y cuenta el resto de la app, y así se compara igual que el de
    // las cuentas de cobro.
    const finalData = {
      ...quotationData,
      atendidoPor: "",
      atendidoPorUid: "",
      status: "pendiente",
      statusPrevio: null,
      cotizacionId,
      createdAt: Date.now(),
    };

    const referencia = await getFirestore()
        .collection("cotizaciones")
        .add(finalData);

    // El TIMBRE. La campanita del personal no escucha las cotizaciones —eso
    // costaría lecturas de Firestore a toda hora—, escucha este único dato en
    // la base en tiempo real, que cobra por bytes y acá no pesa nada.
    //
    // Clave: el timbre NO se apaga. Es un valor que CAMBIA, y cada app anota
    // cuál fue el último que le sonó. Con un "encendido/apagado", la primera
    // persona que lo viera lo apagaría y a las demás no les sonaría nunca.
    //
    // Si esto falla no se cancela nada: la cotización ya quedó guardada y el
    // cliente no tiene por qué recibir un error porque no sonó una campana.
    try {
      await getDatabase().ref("timbreCotizaciones").set({
        cotizacionId,
        en: ServerValue.TIMESTAMP,
      });
    } catch (error) {
      console.error("No se pudo tocar el timbre de cotizaciones:", error);
    }

    // Y el aviso al teléfono, para quien no tenga la app abierta. Va acá y no
    // en un disparador aparte por el mismo motivo que el timbre: así hereda la
    // regla de que las cotizaciones que arma el PERSONAL no avisan —esas pasan
    // por guardarCotizacion, no por esta función—.
    //
    // El aviso NO nombra al cliente ni dice qué pidió: aparece en la pantalla
    // de bloqueo del teléfono, donde lo puede leer cualquiera que lo tenga a
    // la vista. Los datos están adentro de la app, a un toque.
    await avisarAlPersonal({
      titulo: "📋 Nueva solicitud",
      cuerpo:
        "Tienes una nueva cotización pendiente por gestionar. " +
        "Entra a la app para revisar los detalles.",
      url: "/vistacotizacionesAdmin",
      tipo: "cotizacion",
    });

    return {success: true, id: referencia.id};
  } catch (error) {
    console.error("Error al guardar cotización:", error);
    throw new HttpsError("internal", "No se pudo procesar la solicitud.");
  }
});

// ─────────────────────────────────────────────────────────────────────────
// LA PIZARRA: los totales del panel del menú
// ─────────────────────────────────────────────────────────────────────────
//
// Un solo documento con dos números: cuántos equipos están afuera y cuánta
// plata falta cobrar. El menú lo lee de una, en vez de recorrer TODOS los
// clientes y TODAS sus facturas en cada visita como hacía antes (con 200
// clientes y 2.000 facturas eran ~2.200 lecturas por entrada al menú).
//
// Adentro no hay un solo dato de cliente —solo números sueltos—, así que sus
// reglas lo dejan leer a cualquier empleado con sesión. Escribirlo, solo estas
// funciones: corren con permisos de administrador y no pasan por las reglas.
const COLECCION_RESUMEN = "resumen";
const DOC_TOTALES = "totales";

/**
 * El documento de la pizarra.
 * @return {Object} Referencia al documento resumen/totales.
 */
function refTotales() {
  return getFirestore().collection(COLECCION_RESUMEN).doc(DOC_TOTALES);
}

// ─────────────────────────────────────────────────────────────────────────
// EL ESTADO DEL CLIENTE
// ─────────────────────────────────────────────────────────────────────────
//
// El estado de una FACTURA se calcula siempre, nunca se guarda. El del
// CLIENTE es la única excepción: se guarda en clientes/{id}.estado para que la
// lista de clientes pueda filtrar y contar sin leer las facturas de todos.
//
// Y lo que se guarda se puede quedar viejo. Antes lo corregían las pantallas
// al abrirse (la ficha del cliente y el seguimiento), o sea que un cliente
// cuya factura venció anoche seguía figurando "activa" —y NO aparecía al
// filtrar por vencidas, que es justo cuando se lo necesita— hasta que a
// alguien se le ocurriera entrar a mirarlo. Corregirlo acá lo vuelve
// independiente de que alguien abra algo.
/**
 * Recalcula el estado de un cliente a partir de sus facturas y lo corrige si
 * quedó viejo.
 * @param {string} clienteId Id del documento del cliente.
 * @param {string} hoy Fecha de hoy en Bogotá (AAAA-MM-DD).
 * @return {Promise} Promesa vacía.
 */
async function corregirEstadoCliente(clienteId, hoy) {
  const refCliente = getFirestore().collection("clientes").doc(clienteId);

  const [clienteSnap, facturasSnap] = await Promise.all([
    refCliente.get(),
    refCliente.collection("facturas").get(),
  ]);

  // Si el cliente ya no existe no hay nada que corregir, y escribirle sería
  // peor que no hacer nada: al eliminar un cliente se borran sus facturas, y
  // cada borrado despierta a esta función. Un update sobre un documento
  // borrado falla; peor aún sería un set, que lo resucitaría vacío.
  if (!clienteSnap.exists) return;

  const facturas = facturasSnap.docs.map((doc) => doc.data());
  const estado = calcularEstadoCliente(facturas, hoy);

  if (estado === clienteSnap.data().estado) return;

  await refCliente.update({estado});
}

// Cada vez que se toca una factura —un abono, un pago, una devolución, una
// ampliación de plazo, un equipo agregado, una corrección— hay que corregir la
// pizarra.
//
// LA CLAVE: esto NO lee ninguna factura. Firestore entrega en el mismo aviso
// cómo estaba la factura antes y cómo quedó después. Con eso se calcula cuánto
// aportaba y cuánto aporta, y se ajusta la DIFERENCIA. Cuesta cero lecturas y
// una escritura, sin importar cuántas facturas haya en la base.
//
// Y como se mide la diferencia en vez de interpretar qué pasó, funciona igual
// para todos los movimientos —incluidos los que se inventen mañana— sin
// enseñarle a la función qué es un abono ni qué es una devolución.
//
// Se ajusta con increment y no escribiendo el total: si dos personas registran
// algo en el mismo segundo, los dos ajustes se aplican. Escribiendo el total,
// el segundo pisaría al primero y un movimiento se perdería.
export const ajustarTotalesPanel = onDocumentWritten(
    "clientes/{clienteId}/facturas/{facturaId}",
    async (event) => {
      const hoy = obtenerFechaHoyBogota();

      // Una factura recién creada no tiene "antes"; una recién borrada no
      // tiene "después". calcularAporteFactura devuelve cero para eso, así que
      // altas y bajas salen del mismo cálculo.
      const antes = event.data?.before?.data() ?? null;
      const despues = event.data?.after?.data() ?? null;

      const aporteAntes = calcularAporteFactura(antes, hoy);
      const aporteDespues = calcularAporteFactura(despues, hoy);

      const equipos = aporteDespues.equiposActivos - aporteAntes.equiposActivos;
      const pagos =
        aporteDespues.pagosPendientes - aporteAntes.pagosPendientes;

      // Muchos cambios no mueven ninguno de los dos números (por ejemplo,
      // corregir una dirección). Ahí no se escribe nada.
      if (equipos !== 0 || pagos !== 0) {
        await refTotales().set(
            {
              equiposActivos: FieldValue.increment(equipos),
              pagosPendientes: FieldValue.increment(pagos),
              actualizadoEn: Date.now(),
            },
            {merge: true},
        );
      }

      // La marca de "cerrada" en la propia factura. Es el único pedazo del
      // estado que se guarda, porque es el único que no cambia solo con el
      // calendario (ver facturaCerrada en las cuentas compartidas). Guardarlo
      // es lo que permite pedirle a la base "dame solo las facturas abiertas".
      //
      // Escribir la factura desde su propio disparador lo vuelve a despertar.
      // No es un problema: la segunda vez el valor ya coincide, no se escribe
      // nada y la cadena se corta ahí. Pasa una o dos veces en la vida de cada
      // factura —cuando se cierra, y si alguna vez se reabre—, así que no vale
      // la pena una salvaguarda más enredada que el propio caso.
      if (despues && facturaCerrada(despues, hoy) !== despues.cerrada) {
        await event.data.after.ref.update({
          cerrada: facturaCerrada(despues, hoy),
        });
      }

      // Y de paso, el estado del cliente dueño de esta factura.
      //
      // Ojo: esto SÍ lee, a diferencia de la pizarra. No es un descuido, es
      // que no hay forma de evitarlo: la pizarra son sumas, así que basta la
      // diferencia entre el antes y el después que Firestore regala en el
      // aviso. El estado del cliente no es una suma, es "la más urgente de
      // TODAS sus facturas": si a un cliente vencido le pagan la factura
      // vencida, para saber si pasa a activa hay que mirar las otras.
      //
      // Son las facturas de UN cliente —pocas—, así que es barato. Pero
      // téngalo presente antes de correr un script que reescriba facturas en
      // masa: cada escritura despierta esto y se paga la lectura.
      await corregirEstadoCliente(event.params.clienteId, hoy);
    },
);

// EL SELLO: la fecha del último cambio en los clientes.
//
// La lista de clientes tiene que traerlos a todos —el buscador encuentra por
// cualquier pedazo del nombre y los contadores de la izquierda cuentan sobre
// el total—, así que son 200 lecturas por visita con 200 clientes. Pero de una
// visita a la otra casi nunca cambió nada.
//
// Con este sello, la lista guarda su propia copia en el equipo y al abrirse
// solo mira esta fecha: 1 lectura. Si coincide con la de su copia, no vuelve a
// pedir nada. Si es más nueva, recién ahí trae los 200 de nuevo.
//
// Cuesta cero lecturas y una escritura por cambio. Y como vive en el servidor
// y no en la app, se entera TAMBIÉN de lo que se edita a mano en la consola de
// Firebase, que es justo lo que uno hace cuando está probando algo.
//
// Se despierta también cuando la función de arriba corrige un estado, que es
// exactamente cuando hay que sellar.
export const sellarCambioDeClientes = onDocumentWritten(
    "clientes/{clienteId}",
    async () => {
      await refTotales().set(
          {clientesActualizadoEn: Date.now()},
          {merge: true},
      );
    },
);

// El repaso de madrugada: rehace la pizarra desde cero, todos los días a las
// 3 de la mañana hora de Colombia.
//
// NO es un lujo ni una red de seguridad opcional: hay números que cambian
// SOLOS con el calendario, sin que nadie toque la base, y de esos el ajuste de
// arriba no se entera nunca porque no hay nada que lo despierte.
//
//   - Una factura "pendiente" pasa a "activa" sola el día que salen los
//     equipos: ahí suben los equipos afuera.
//   - Una factura pasada de fecha suma un día de alquiler por día: la plata
//     por cobrar sube sola.
//
// De paso corrige cualquier desvío que hubiera quedado de los ajustes.
//
// Lo mismo vale para el estado del cliente, y por el mismo motivo: una
// factura que vence a la medianoche no la escribe nadie, así que el
// disparador de arriba no se entera nunca. Acá se corrige. Entre la
// medianoche y las 3 el estado puede estar viejo; a esa hora no trabaja
// nadie.
//
// collectionGroup trae las facturas de TODOS los clientes en una sola
// consulta, sin recorrer cliente por cliente.
export const recalcularTotalesPanel = onSchedule(
    {schedule: "0 3 * * *", timeZone: "America/Bogota"},
    async () => {
      const db = getFirestore();
      const hoy = obtenerFechaHoyBogota();

      const snap = await db.collectionGroup("facturas").get();
      const facturas = snap.docs.map((doc) => doc.data());

      const totales = calcularTotalesFacturas(facturas, hoy);

      await refTotales().set(
          {...totales, actualizadoEn: Date.now(), recalculadoEn: Date.now()},
          {merge: true},
      );

      console.log(
          `Pizarra recalculada sobre ${facturas.length} facturas:`,
          totales,
      );

      // Este recorrido lee TODAS las facturas, también las cerradas. Se
      // evaluó filtrarlas —aportan cero a los dos totales, así que sumarlas no
      // cambia nada— y NO conviene: es el único proceso que garantiza que la
      // pizarra esté bien, y si a una factura le faltara la marca de "cerrada"
      // quedaría fuera de la consulta y sus equipos y su saldo desaparecerían
      // de los números del menú, en silencio. Leer de más una vez por noche es
      // barato; un total mal en el menú, no.
      //
      // Y ya que están todas a la vista, se aprovecha para lo contrario:
      // reparar la marca de "cerrada" donde falte o esté mal. El disparador la
      // mantiene al día, pero esto cubre las facturas que nadie tocó desde que
      // el campo existe. Acá es una red de seguridad; allá arriba habría sido
      // un riesgo.
      let lote = db.batch();
      let enElLote = 0;

      const anotarEnLote = async (ref, datos) => {
        lote.update(ref, datos);
        enElLote += 1;

        // Un lote de Firestore no admite más de 500 operaciones.
        if (enElLote === 400) {
          await lote.commit();
          lote = db.batch();
          enElLote = 0;
        }
      };

      // El "padre del padre" de clientes/X/facturas/Y es el cliente X.
      const facturasPorCliente = new Map();
      let facturasCorregidas = 0;

      // Lo que apareció con el cambio de día. Un equipo vence solo, por
      // calendario: nadie escribe nada y por eso nadie se entera. Se detecta
      // preguntando por HOY y por AYER —los cálculos reciben la fecha, así que
      // alcanza con evaluarlos dos veces— y no hace falta guardar ningún dato
      // nuevo para saberlo.
      //
      // Se cuenta un EQUIPO a la vez, no una factura. Avisar por factura dejaba
      // ciega la mitad del problema: como una factura figura vencida en cuanto
      // UNO de sus equipos lo está, la que ya estaba en seguimiento no volvía a
      // "entrar" nunca y el segundo equipo vencía en silencio. Pasó de verdad
      // con la 1234 el fin de semana del 2026-08-29: avisó el sábado por el
      // equipo inicial y no dijo nada el domingo por el agregado.
      //
      // La factura que entra en seguimiento SIN ningún equipo vencido se sigue
      // avisando igual: es la que devolvió todo y quedó debiendo.
      const ayer = restarUnDia(hoy);
      const novedades = [];

      for (const facturaSnap of snap.docs) {
        const clienteId = facturaSnap.ref.parent.parent?.id;
        if (!clienteId) continue;

        const factura = facturaSnap.data();
        const lista = facturasPorCliente.get(clienteId) ?? [];
        lista.push(factura);
        facturasPorCliente.set(clienteId, lista);

        const numero = factura.numeroFactura ?? "s/n";
        const vencidosHoy = equiposQueVencieronHoy(factura, hoy, ayer);

        for (const equipo of vencidosHoy) {
          novedades.push({
            clienteId,
            numero,
            equipo: equipo.nombre || "Un equipo",
            cantidad: calcularCantidadPendiente(equipo),
          });
        }

        if (
          vencidosHoy.length === 0 &&
          facturaEnSeguimiento(factura, hoy) &&
          !facturaEnSeguimiento(factura, ayer)
        ) {
          novedades.push({clienteId, numero});
        }

        const cerrada = facturaCerrada(factura, hoy);
        if (cerrada !== factura.cerrada) {
          await anotarEnLote(facturaSnap.ref, {cerrada});
          facturasCorregidas += 1;
        }
      }

      // Se recorren TODOS los clientes, no solo los que aparecieron arriba:
      // un cliente al que le borraron su última factura no sale en la
      // consulta y tiene que volver a "inactivo".
      const clientesSnap = await db.collection("clientes").get();
      let clientesCorregidos = 0;

      for (const clienteSnap of clientesSnap.docs) {
        const estado = calcularEstadoCliente(
            facturasPorCliente.get(clienteSnap.id) ?? [],
            hoy,
        );
        if (estado === clienteSnap.data().estado) continue;

        await anotarEnLote(clienteSnap.ref, {estado});
        clientesCorregidos += 1;
      }

      if (enElLote > 0) await lote.commit();

      console.log(
          `Clientes revisados: ${clientesSnap.size}, ` +
          `estados corregidos: ${clientesCorregidos}, ` +
          `marcas de cerrada corregidas: ${facturasCorregidas}`,
      );

      // El aviso de lo que apareció hoy. Va acá abajo, con los clientes ya
      // leídos, para poder decir de quién es cada factura sin volver a
      // consultar nada.
      if (novedades.length > 0) {
        const nombres = new Map(
            clientesSnap.docs.map((docSnap) => [
              docSnap.id,
              nombreDeCliente(docSnap.data()),
            ]),
        );

        await avisarAlPersonal({
          titulo: tituloDeNovedades(novedades),
          cuerpo: describirNovedades(novedades, nombres),
          url: "/vistaseguimientoclientes",
          tipo: "seguimiento",
        });
      }
    },
);
