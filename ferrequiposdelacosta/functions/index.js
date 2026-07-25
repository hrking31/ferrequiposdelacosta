const {setGlobalOptions} = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");

const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");
const {getDatabase, ServerValue} = require("firebase-admin/database");

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

exports.createUser = onCall(async (request) => {
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

exports.deleteUser = onCall(async (request) => {
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

exports.crearCotizacion = onCall(async (request) => {
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
    const db = getDatabase();
    const cotizacionesRef = db.ref("cotizaciones");

    const newQuotationRef = cotizacionesRef.push();

    const finalData = {
      ...quotationData,
      atendidoPor: "",
      atendidoPorUid: "",
      status: "pendiente",
      id: newQuotationRef.key,
      cotizacionId: `COT-${Date.now()}`,
      createdAt: ServerValue.TIMESTAMP,
    };

    await newQuotationRef.set(finalData);

    return {success: true, id: newQuotationRef.key};
  } catch (error) {
    console.error("Error al guardar cotización:", error);
    throw new HttpsError("internal", "No se pudo procesar la solicitud.");
  }
});
