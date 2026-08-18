// Las cuentas de cobro en Firestore.
//
// Viven en la colección raíz `cuentasCobro`, una por documento. A diferencia
// de las cotizaciones —que van en la base en tiempo real porque llegan solas
// desde la web y hay que verlas aparecer— estas las emite el staff, se
// consultan de vez en cuando y conviene que queden en Firestore, al lado de
// los clientes y sus facturas.
//
// Ojo: la colección necesita su regla en firestore.rules. Sin desplegarla,
// todo lo de acá falla con "permission-denied".
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../Firebase/Firebase";

export const COLECCION = "cuentasCobro";

// Cuántas se traen por tanda. La lista pide la primera al abrirse y el resto
// solo si alguien pide "cargar más": la colección crece para siempre y traerla
// entera sería cada vez más lento y más caro.
//
// Cada documento de la tanda es una lectura que se paga, y entrar a la pantalla
// vuelve a pedirla: por eso conviene que sea chica. 50 alcanza para ver de un
// vistazo lo del último tiempo, que es a lo que se entra el 99% de las veces.
export const POR_TANDA = 50;

// El número visible del documento. Mismo formato que el de la cotización
// ("COT-..."), con CC adelante para no confundirlos.
export const generarCuentaCobroId = () => `CC-${Date.now()}`;

// Lo que se guarda de una cuenta. Se parte del formulario entero y se le
// agrega quién la hizo y cuándo; `id` no entra —es el nombre del documento,
// no un campo— para no guardarlo dos veces y que puedan divergir.
const documentoDesdeFormulario = (cuenta, estado, usuario) => {
  const datos = { ...cuenta };
  delete datos.id;

  return {
    ...datos,
    status: estado,
    // Que la cuenta se emitió es un HECHO, no un estado. El estado va y viene
    // —"enProceso" mientras alguien la tiene abierta, "pagada" cuando entra la
    // plata— pero haberse emitido no se deshace nunca. Guardarlo aparte deja
    // contar las del mes con una sola consulta en vez de traerlas todas y
    // mirarles el estado acá (ver contarCuentasCobroDelMes).
    //
    // Se pone al emitir y no se saca: una vez true, se queda en true.
    ...(estado === "creada" ? { emitida: true } : {}),
    actualizadoEn: Date.now(),
    // Queda registrado quién la emitió: son documentos de cobro y en algún
    // momento alguien va a preguntar quién hizo cuál.
    emitidaPor: {
      uid: usuario?.uid || null,
      nombre: usuario?.name || "",
    },
  };
};

// Guarda la cuenta y devuelve el id del documento. Si la cuenta ya venía de la
// base (trae `id`) la actualiza en vez de crear otra: así reabrir una guardada,
// corregirla y volver a guardarla no deja dos.
export const guardarCuentaCobro = async (cuenta, estado, usuario) => {
  const datos = documentoDesdeFormulario(cuenta, estado, usuario);

  if (cuenta.id) {
    await updateDoc(doc(db, COLECCION, cuenta.id), datos);
    return cuenta.id;
  }

  const referencia = await addDoc(collection(db, COLECCION), {
    ...datos,
    creadaEn: Date.now(),
  });
  return referencia.id;
};

// Una tanda de cuentas, de la más nueva a la más vieja. `despuesDe` es el
// último documento de la tanda anterior (el crudo de Firestore, no el objeto
// ya mapeado): con él Firestore sigue desde donde se quedó.
//
// Devuelve también el último documento crudo, para poder pedir la tanda
// siguiente, y si quedan más por traer.
export const leerCuentasCobro = async (despuesDe = null) => {
  const partes = [orderBy("creadaEn", "desc")];
  if (despuesDe) partes.push(startAfter(despuesDe));
  partes.push(limit(POR_TANDA));

  const snap = await getDocs(query(collection(db, COLECCION), ...partes));

  return {
    cuentas: snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    ultimo: snap.docs[snap.docs.length - 1] || null,
    hayMas: snap.docs.length === POR_TANDA,
  };
};

// La primera tanda, pero escuchando: la lista se entera sola de que alguien
// abrió una cuenta, sin recargar la pantalla. Firestore cobra por documento
// leído, no por tener el oído puesto, así que esto cuesta la misma lectura
// inicial de siempre más una por cada cuenta que cambie.
//
// Solo la primera tanda: las siguientes las trae `leerCuentasCobro` a pedido.
// Devuelve la función para cortar la escucha, que hay que llamar al salir de
// la pantalla.
export const escucharCuentasCobro = (alRecibir, alFallar) =>
  onSnapshot(
    query(collection(db, COLECCION), orderBy("creadaEn", "desc"), limit(POR_TANDA)),
    (snap) =>
      alRecibir({
        cuentas: snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })),
        ultimo: snap.docs[snap.docs.length - 1] || null,
        hayMas: snap.docs.length === POR_TANDA,
      }),
    alFallar,
  );

// Marca que alguien la está trabajando. `statusPrevio` es a dónde vuelve si esa
// persona sale sin guardar; se calcula al abrirla (ver Utils/estadoDocumento).
export const marcarCuentaEnProceso = (cuentaId, statusPrevio, usuario) =>
  updateDoc(doc(db, COLECCION, cuentaId), {
    status: "enProceso",
    statusPrevio,
    atendidoPor: usuario?.name || "",
    atendidoPorUid: usuario?.uid || null,
  });

// Devuelve la cuenta al estado que tenía, sin tocar sus datos: es la salida
// "descartar", donde lo que se escribió en esta sesión no se guarda.
export const liberarCuentaCobro = (cuentaId, status) =>
  updateDoc(doc(db, COLECCION, cuentaId), { status });

export const eliminarCuentaCobro = (cuentaId) =>
  deleteDoc(doc(db, COLECCION, cuentaId));

// Marca que el cliente ya pagó esta cuenta, o la devuelve a "Emitida" si se
// marcó por error. Solo el administrador puede hacerlo (ver ListaCuentasCobro).
//
// Es un estado más, no un hecho aparte como `emitida`: el pago se registra a
// mano y por eso se puede desmarcar. El conteo del mes NO se toca, justamente
// porque cuenta por `emitida`: una cuenta pagada se emitió igual, y si el
// número bajara al cobrarla diría cuánto falta cobrar en vez de cuánto se
// facturó.
//
// Queda anotado quién la marcó y cuándo: es plata, y en algún momento alguien
// va a preguntar quién dijo que estaba paga.
export const marcarCuentaPagada = (cuentaId, pagada, usuario) =>
  updateDoc(doc(db, COLECCION, cuentaId), {
    status: pagada ? "pagada" : "creada",
    pagadaEn: pagada ? Date.now() : null,
    pagadaPor: pagada
      ? { uid: usuario?.uid || null, nombre: usuario?.name || "" }
      : null,
  });

// Cuántas cuentas se EMITIERON en el mes corriente, para el panel del menú.
// Los borradores no cuentan: lo que interesa es cuánto se facturó, no cuántas
// quedaron a medias.
//
// De los cuatro recuadros del menú este era el único que costaba N lecturas
// por visita —una por cada cuenta del mes—, porque la condición era compuesta
// y el estado se miraba acá:
//
//   status === "creada" || (status === "enProceso" && statusPrevio === "creada")
//
// Ese enredo existía porque el estado SE MUEVE: mientras alguien tiene la
// cuenta abierta dice "enProceso", y sin la segunda parte el número del mes
// bajaba solo porque alguien la abrió a mirar. Con el campo `emitida` —un
// hecho que no se deshace— la condición vuelve a ser simple y la cuenta la
// hace el servidor: 1 lectura, sin traer un solo documento.
//
// Mismo patrón que el campo `cerrada` de las facturas.
//
// Ojo: necesita el índice compuesto (emitida + creadaEn) en Firestore. Sin él
// la consulta falla, y el mensaje de error trae el enlace para crearlo.
export const contarCuentasCobroDelMes = async () => {
  const inicioDeMes = new Date();
  inicioDeMes.setDate(1);
  inicioDeMes.setHours(0, 0, 0, 0);

  const snap = await getCountFromServer(
    query(
      collection(db, COLECCION),
      where("emitida", "==", true),
      where("creadaEn", ">=", inicioDeMes.getTime()),
    ),
  );

  return snap.data().count;
};
