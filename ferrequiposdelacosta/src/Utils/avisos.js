// Los avisos que llegan con la app CERRADA.
//
// La campanita que ya existe solo suena si alguien tiene la app abierta. Esto
// es lo otro: el servidor le manda el aviso al teléfono aunque la app esté
// cerrada, como hace WhatsApp.
//
// CÓMO FUNCIONA, EN CORTO
//
//   1. La persona toca "Activar avisos" una vez. El navegador le pregunta si
//      permite notificaciones (eso lo pregunta el navegador, no la app).
//   2. Si acepta, el navegador entrega una "dirección" única de ESE aparato.
//   3. Esa dirección se guarda en la ficha del usuario (`avisosTokens`), y el
//      servidor le manda ahí los avisos.
//
// Cada aparato tiene la suya, por eso es una lista: la misma persona puede
// tener el celular y el computador de la oficina.
//
// DOS COSAS QUE CONVIENE SABER ANTES DE PERSEGUIR UN FANTASMA
//
//   · En iPhone esto SOLO funciona con la app instalada en la pantalla de
//     inicio (iOS 16.4 o más nuevo). Abierta en Safari, el navegador dice que
//     no soporta avisos, y es cierto.
//   · El sonido lo pone el sistema operativo, no la app. No se puede usar la
//     campana propia (notification.mp3); esa es solo para la app abierta.
import {
  getMessaging,
  getToken,
  deleteToken,
  isSupported,
} from "firebase/messaging";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { app, db, LLAVE_AVISOS } from "../Components/Firebase/Firebase";

// El ayudante que recibe los avisos con la app cerrada. Se registra en su
// propio rincón para no pelearse con el de la PWA, que vive en la raíz.
const RUTA_AYUDANTE = "/firebase-messaging-sw.js";
const RINCON_AYUDANTE = "/firebase-cloud-messaging-push-scope";

// La dirección de ESTE aparato queda anotada acá para poder darla de baja al
// desactivar: sin esto habría que adivinar cuál de la lista es la suya.
const CLAVE_LOCAL = "avisos_token";

/**
 * Si el navegador puede recibir avisos. Da `false` en Safari sin instalar la
 * app y en navegadores viejos; el botón de activar no debe mostrarse ahí.
 */
export const avisosSoportados = async () => {
  try {
    return (await isSupported()) && "Notification" in window;
  } catch {
    return false;
  }
};

/**
 * En qué punto está este aparato, para saber qué mostrar:
 *
 *   "activados"  — ya los tiene andando
 *   "sin activar" — nunca se le preguntó, o se activaron en otro aparato
 *   "bloqueados" — la persona dijo que no. El navegador NO deja volver a
 *                  preguntar: hay que habilitarlo a mano en su configuración.
 */
export const estadoAvisos = () => {
  if (!("Notification" in window)) return "sin soporte";
  if (Notification.permission === "denied") return "bloqueados";
  if (Notification.permission === "granted" && localStorage.getItem(CLAVE_LOCAL)) {
    return "activados";
  }
  return "sin activar";
};

const registrarAyudante = () =>
  navigator.serviceWorker.register(RUTA_AYUDANTE, { scope: RINCON_AYUDANTE });

/**
 * Pide el permiso, consigue la dirección de este aparato y la guarda en la
 * ficha del usuario.
 *
 * Devuelve `{ ok, mensaje }` con un texto ya listo para mostrarle a la persona:
 * las razones por las que esto falla son todas cosas que ella tiene que
 * entender (dijo que no, el navegador no puede, se cayó internet).
 */
export const activarAvisos = async (uid) => {
  if (!uid) return { ok: false, mensaje: "Iniciá sesión para activar los avisos." };

  if (!(await avisosSoportados())) {
    return {
      ok: false,
      mensaje:
        "Este navegador no puede recibir avisos. En iPhone hay que instalar la app en la pantalla de inicio.",
    };
  }

  const permiso = await Notification.requestPermission();

  if (permiso === "denied") {
    return {
      ok: false,
      mensaje:
        "Los avisos quedaron bloqueados. Se habilitan desde la configuración del navegador, en los permisos de este sitio.",
    };
  }

  if (permiso !== "granted") {
    return { ok: false, mensaje: "Quedó sin activar. Podés intentarlo de nuevo cuando quieras." };
  }

  try {
    const ayudante = await registrarAyudante();
    const token = await getToken(getMessaging(app), {
      vapidKey: LLAVE_AVISOS,
      serviceWorkerRegistration: ayudante,
    });

    if (!token) {
      return { ok: false, mensaje: "No se pudo registrar este equipo. Intentá de nuevo." };
    }

    // arrayUnion no repite: activar dos veces en el mismo equipo no deja dos
    // direcciones iguales ni manda el aviso por duplicado.
    await updateDoc(doc(db, "users", uid), { avisosTokens: arrayUnion(token) });
    localStorage.setItem(CLAVE_LOCAL, token);

    return { ok: true, mensaje: "Listo: este equipo va a recibir los avisos." };
  } catch (error) {
    return { ok: false, mensaje: `No se pudieron activar los avisos: ${error.message}` };
  }
};

/**
 * Da de baja este aparato. El permiso del navegador queda como estaba —eso
 * solo lo cambia la persona—, pero el servidor deja de mandarle avisos.
 */
export const desactivarAvisos = async (uid) => {
  const token = localStorage.getItem(CLAVE_LOCAL);

  try {
    if (token && uid) {
      await updateDoc(doc(db, "users", uid), { avisosTokens: arrayRemove(token) });
    }
    if (await avisosSoportados()) await deleteToken(getMessaging(app));
    localStorage.removeItem(CLAVE_LOCAL);

    return { ok: true, mensaje: "Este equipo ya no va a recibir avisos." };
  } catch (error) {
    // Aunque falle el borrado remoto, se olvida la dirección local: el servidor
    // limpia sola la que ya no responde.
    localStorage.removeItem(CLAVE_LOCAL);
    return { ok: false, mensaje: `No se pudieron desactivar del todo: ${error.message}` };
  }
};
