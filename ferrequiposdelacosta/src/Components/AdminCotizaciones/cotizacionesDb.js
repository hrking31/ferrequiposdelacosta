// Las cotizaciones en Firestore.
//
// Vivían en la base en tiempo real (RTDB) porque llegan solas desde la tienda y
// hay que verlas aparecer. El problema era que la app se bajaba el nodo ENTERO
// al arrancar —todo el historial, en cada carga— y que las reglas de RTDB no
// pueden leer el rol del usuario, así que no había forma de dejar el borrado
// solo en manos del administrador.
//
// Acá se resuelven las dos cosas: Firestore pagina (tandas de 50, como
// cuentasCobro) y sus reglas sí leen el rol. Lo único que se quedó en RTDB es
// el TIMBRE —un dato chico que cambia con cada solicitud nueva— para que la
// campanita no cueste lecturas de Firestore; ver App.jsx.
//
// Ojo: la colección necesita su regla en firestore.rules. Sin desplegarla, todo
// lo de acá falla con "permission-denied".
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

export const COLECCION = "cotizaciones";

// Cuántas se traen por tanda. El buzón pide la primera al abrirse y el resto
// solo si alguien pide "cargar más". Mismo criterio y mismo número que
// cuentasCobro: cada documento es una lectura que se paga, y entrar a la
// pantalla vuelve a pedir la tanda.
export const POR_TANDA = 50;

// El número visible de la solicitud. Se mantiene el formato de siempre para no
// invalidar los que ya están impresos en PDFs entregados a clientes.
export const generarCotizacionId = () => `COT-${Date.now()}`;

// Cómo se arma el objeto que ve la app a partir de un documento de Firestore.
//
// El id del documento va DESPUÉS de sus datos a propósito: las cotizaciones
// migradas desde RTDB conservan adentro un campo `id` viejo, y si ese campo
// pisara al id real del documento, guardar o borrar apuntaría a la nada.
const desdeDocumento = (docSnap) => ({ ...docSnap.data(), id: docSnap.id });

// Lo que se guarda de una cotización. `id` no entra: es el nombre del
// documento, no un campo, y tenerlo en los dos lados los deja divergir.
const documentoDesdeFormulario = (cotizacion, estado) => {
  const datos = { ...cotizacion };
  delete datos.id;

  return {
    ...datos,
    status: estado,
    actualizadoEn: Date.now(),
  };
};

// Guarda la cotización y devuelve el objeto tal como quedó (con su id), que es
// lo que después necesita el PDF. Si ya venía de la base la actualiza en vez de
// crear otra: así reabrir una guardada, corregirla y volver a guardarla no
// deja dos.
export const guardarCotizacion = async (cotizacion, estado) => {
  const datos = documentoDesdeFormulario(cotizacion, estado);

  if (cotizacion.id) {
    await updateDoc(doc(db, COLECCION, cotizacion.id), datos);
    return { ...datos, id: cotizacion.id };
  }

  // createdAt es la fecha por la que se ordena y por la que se cuenta el mes.
  // Va SIEMPRE al crear: Firestore deja fuera de una consulta ordenada a los
  // documentos que no tienen el campo del orden, así que una cotización sin
  // createdAt sería invisible en el buzón.
  const nueva = {
    ...datos,
    cotizacionId: cotizacion.cotizacionId || generarCotizacionId(),
    createdAt: Date.now(),
  };

  const referencia = await addDoc(collection(db, COLECCION), nueva);
  return { ...nueva, id: referencia.id };
};

// Una tanda de cotizaciones, de la más nueva a la más vieja. `despuesDe` es el
// último documento de la tanda anterior (el crudo de Firestore, no el objeto ya
// mapeado): con él Firestore sigue desde donde se quedó.
//
// Devuelve también el último documento crudo, para poder pedir la tanda
// siguiente, y si quedan más por traer.
export const leerCotizaciones = async (despuesDe = null) => {
  const partes = [orderBy("createdAt", "desc")];
  if (despuesDe) partes.push(startAfter(despuesDe));
  partes.push(limit(POR_TANDA));

  const snap = await getDocs(query(collection(db, COLECCION), ...partes));

  return {
    cotizaciones: snap.docs.map(desdeDocumento),
    ultimo: snap.docs[snap.docs.length - 1] || null,
    hayMas: snap.docs.length === POR_TANDA,
  };
};

// La primera tanda, pero escuchando: el buzón se entera solo de que entró una
// solicitud nueva o de que alguien abrió una, sin recargar la pantalla.
// Firestore cobra por documento leído, no por tener el oído puesto.
//
// Solo la primera tanda: las siguientes las trae `leerCotizaciones` a pedido.
// Devuelve la función para cortar la escucha, que hay que llamar al salir.
export const escucharCotizaciones = (alRecibir, alFallar) =>
  onSnapshot(
    query(
      collection(db, COLECCION),
      orderBy("createdAt", "desc"),
      limit(POR_TANDA),
    ),
    (snap) =>
      alRecibir({
        cotizaciones: snap.docs.map(desdeDocumento),
        ultimo: snap.docs[snap.docs.length - 1] || null,
        hayMas: snap.docs.length === POR_TANDA,
      }),
    alFallar,
  );

// Marca que alguien la está trabajando. `statusPrevio` es a dónde vuelve si esa
// persona sale sin guardar; se calcula al abrirla (ver Utils/estadoDocumento).
export const marcarCotizacionEnProceso = (cotizacionId, statusPrevio, usuario) =>
  updateDoc(doc(db, COLECCION, cotizacionId), {
    status: "enProceso",
    statusPrevio,
    atendidoPor: usuario?.name || "",
    atendidoPorUid: usuario?.uid || null,
  });

// Devuelve la cotización al estado que tenía, sin tocar sus datos: es la salida
// "descartar", donde lo que se escribió en esta sesión no se guarda.
export const liberarCotizacion = (cotizacionId, status) =>
  updateDoc(doc(db, COLECCION, cotizacionId), { status });

// Borrar no se deshace. La regla de firestore.rules lo deja solo en manos del
// administrador; el botón escondido en el buzón es apenas la parte visible.
export const eliminarCotizacion = (cotizacionId) =>
  deleteDoc(doc(db, COLECCION, cotizacionId));

// Cuántas solicitudes entraron en el mes corriente, para el panel del menú.
//
// Cuenta TODAS las del mes, en cualquier estado: la pregunta que responde el
// recuadro es cuánto trabajo llegó, no cuánto se terminó.
//
// Usa el contador del servidor: Firestore devuelve solo el número, sin mandar
// las cotizaciones. Eso son 1 lectura por visita al menú en vez de una por
// cotización del mes. Se puede porque hay una sola condición —la fecha—, así
// que tampoco hace falta crear un índice compuesto.
export const contarCotizacionesDelMes = async () => {
  const inicioDeMes = new Date();
  inicioDeMes.setDate(1);
  inicioDeMes.setHours(0, 0, 0, 0);

  const snap = await getCountFromServer(
    query(
      collection(db, COLECCION),
      where("createdAt", ">=", inicioDeMes.getTime()),
    ),
  );

  return snap.data().count;
};
