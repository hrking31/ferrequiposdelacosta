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
export const POR_TANDA = 100;

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

// Cuántas cuentas se EMITIERON en el mes corriente, para el panel del menú.
// Los borradores no cuentan: lo que interesa es cuánto se facturó, no cuántas
// quedaron a medias.
//
// Una emitida que alguien tiene ABIERTA en este momento sigue contando: su
// estado dice "enProceso" solo mientras dure esa sesión, y sin esto el número
// del mes bajaría solo porque alguien la abrió a mirar.
const seEmitio = (cuenta) =>
  cuenta.status === "creada" ||
  (cuenta.status === "enProceso" && cuenta.statusPrevio === "creada");

// Se filtra por fecha en la base —una sola condición, así no hace falta crear
// un índice compuesto— y el estado se mira acá. Con las pocas decenas que se
// emiten por mes, traerlas sale más barato que mantener un índice.
export const contarCuentasCobroDelMes = async () => {
  const inicioDeMes = new Date();
  inicioDeMes.setDate(1);
  inicioDeMes.setHours(0, 0, 0, 0);

  const snap = await getDocs(
    query(collection(db, COLECCION), where("creadaEn", ">=", inicioDeMes.getTime())),
  );

  return snap.docs.filter((docSnap) => seEmitio(docSnap.data())).length;
};
