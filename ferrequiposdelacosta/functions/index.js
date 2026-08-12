import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";

import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
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
  calcularTotalesFacturas,
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
      if (equipos === 0 && pagos === 0) return;

      await refTotales().set(
          {
            equiposActivos: FieldValue.increment(equipos),
            pagosPendientes: FieldValue.increment(pagos),
            actualizadoEn: Date.now(),
          },
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
// collectionGroup trae las facturas de TODOS los clientes en una sola
// consulta, sin recorrer cliente por cliente.
export const recalcularTotalesPanel = onSchedule(
    {schedule: "0 3 * * *", timeZone: "America/Bogota"},
    async () => {
      const snap = await getFirestore().collectionGroup("facturas").get();
      const facturas = snap.docs.map((doc) => doc.data());

      const totales = calcularTotalesFacturas(
          facturas,
          obtenerFechaHoyBogota(),
      );

      await refTotales().set(
          {...totales, actualizadoEn: Date.now(), recalculadoEn: Date.now()},
          {merge: true},
      );

      console.log(
          `Pizarra recalculada sobre ${facturas.length} facturas:`,
          totales,
      );
    },
);
