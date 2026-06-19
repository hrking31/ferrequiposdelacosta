const { setGlobalOptions } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

const admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({
  maxInstances: 10,
  cors: true,
});

exports.createUser = onCall(async (request) => {
  try {
    const { email, password, name, genero, role, permisos } = request.data;

    if (!email || !password) {
      throw new HttpsError(
        "invalid-argument",
        "Email y contraseña son obligatorios",
      );
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    await admin.firestore().collection("users").doc(userRecord.uid).set({
      name,
      genero,
      email,
      role,
      permisos,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
  try {
    const { email } = request.data;

    if (!email) {
      throw new HttpsError(
        "invalid-argument",
        "El correo electrónico es obligatorio.",
      );
    }

    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;

    await admin.firestore().collection("users").doc(uid).delete();

    await admin.auth().deleteUser(uid);

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
    const db = admin.database();
    const cotizacionesRef = db.ref("cotizaciones");

    const newQuotationRef = cotizacionesRef.push();

    const finalData = {
      ...quotationData,
      id: newQuotationRef.key,
      cotizacionId: `COT-${Date.now()}`,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      status: "pendiente",
    };

    await newQuotationRef.set(finalData);

    return { success: true, id: newQuotationRef.key };
  } catch (error) {
    console.error("Error al guardar cotización:", error);
    throw new HttpsError("internal", "No se pudo procesar la solicitud.");
  }
});
