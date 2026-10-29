// LOS APARATOS CON SESIÓN ABIERTA (2026-10-16).
//
// Cada navegador donde alguien inicia sesión queda anotado en
// users/{uid}/aparatos/{id}: qué aparato es y cuándo se usó por última vez.
// El administrador lo ve en la ficha de cada usuario (FichaUsuario.jsx) y
// desde ahí puede cerrarle la sesión de uno (la papelera) o de todos.
//
// El "en línea" de la presencia no sirve para esto: es por usuario y no por
// aparato, y una sesión olvidada con el navegador cerrado aparece
// desconectada aunque siga abierta. Esta lista sí la muestra: el aparato se
// borra solo cuando la persona toca "Cerrar sesión".
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../Components/Firebase/Firebase";

const LLAVE_ID = "idAparato";
const LLAVE_ANOTADO = "aparatoAnotadoEn";

// Mientras se usa, el último uso se renueva como mucho cada media hora: no
// hace falta más precisión, y cada renovación es una escritura.
const CADA = 30 * 60 * 1000;

// Un número que identifica a ESTE navegador, guardado en él. Si no se puede
// guardar (ventana privada, almacenamiento bloqueado), no se anota nada.
export const idDeEsteAparato = () => {
  try {
    let id = localStorage.getItem(LLAVE_ID);
    if (!id) {
      id =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(LLAVE_ID, id);
    }
    return id;
  } catch {
    return null;
  }
};

const nombreDelNavegador = (ua) => {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Firefox|FxiOS/.test(ua)) return "Firefox";
  if (/Chrome|CriOS/.test(ua)) return "Chrome";
  if (/Safari/.test(ua)) return "Safari";
  return "Navegador";
};

// Qué aparato es, en palabras, a partir de lo que el navegador dice de sí.
// Ojo: el iPad moderno se presenta como Mac, así que sale como "Mac".
export const describirAparato = (ua = "") => {
  const navegador = nombreDelNavegador(ua);
  const es = (tipo, nombre) => ({ tipo, descripcion: `${nombre} · ${navegador}` });

  if (/iPhone/.test(ua)) return es("celular", "iPhone");
  if (/iPad/.test(ua)) return es("tablet", "iPad");
  if (/Android/.test(ua)) {
    return /Mobile/.test(ua)
      ? es("celular", "Celular Android")
      : es("tablet", "Tablet Android");
  }
  if (/Windows/.test(ua)) return es("pc", "PC Windows");
  if (/Macintosh|Mac OS X/.test(ua)) return es("pc", "Mac");
  if (/Linux|CrOS/.test(ua)) return es("pc", "PC");
  return es("pc", "Otro aparato");
};

const leerAnotado = (uid) => {
  try {
    return Number(localStorage.getItem(`${LLAVE_ANOTADO}:${uid}`)) || 0;
  } catch {
    return 0;
  }
};

const guardarAnotado = (uid) => {
  try {
    localStorage.setItem(`${LLAVE_ANOTADO}:${uid}`, String(Date.now()));
  } catch {
    // Sin dónde guardarlo, la próxima vez se vuelve a anotar: no pasa nada.
  }
};

// Anota (o renueva) este aparato. Al entrar va con `forzar`: puede que el
// administrador haya borrado la lista al cerrarle las sesiones.
export const anotarAparato = async (uid, { forzar = false } = {}) => {
  const id = idDeEsteAparato();
  if (!uid || !id) return;
  if (!forzar && Date.now() - leerAnotado(uid) < CADA) return;

  await setDoc(doc(db, "users", uid, "aparatos", id), {
    ...describirAparato(globalThis.navigator?.userAgent),
    ultimoUso: serverTimestamp(),
  });
  guardarAnotado(uid);
};

// Al tocar "Cerrar sesión": este aparato ya no tiene la sesión abierta.
export const olvidarAparato = async (uid) => {
  const id = idDeEsteAparato();
  if (!uid || !id) return;
  await deleteDoc(doc(db, "users", uid, "aparatos", id));
  try {
    localStorage.removeItem(`${LLAVE_ANOTADO}:${uid}`);
  } catch {
    // Nada que limpiar.
  }
};

const mismoDia = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// "hoy 10:32 a. m.", "ayer 6:15 p. m." o "12 oct, 6:15 p. m.".
export const describirUltimoUso = (fecha, ahora = new Date()) => {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return "hace un momento";

  const hora = fecha.toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
  });
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);

  if (mismoDia(fecha, ahora)) return `hoy ${hora}`;
  if (mismoDia(fecha, ayer)) return `ayer ${hora}`;
  const dia = fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  return `${dia}, ${hora}`;
};
