import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";

import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import {getDatabase, ServerValue} from "firebase-admin/database";

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
