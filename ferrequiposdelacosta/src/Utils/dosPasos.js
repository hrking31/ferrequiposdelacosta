// INICIO DE SESIÓN EN DOS PASOS, con aplicación de códigos (2026-10-16).
//
// Después de la contraseña se piden los 6 números que muestra en ese momento
// la aplicación de códigos del celular (Google Authenticator, Microsoft
// Authenticator o las contraseñas del iPhone). Es obligatorio para todos: las
// pantallas protegidas no dejan pasar a quien no lo activó
// (VistaActivarDosPasos.jsx), y las reglas no le dejan leer nada a una sesión
// que no entró con el segundo paso.
//
// Requiere la versión superior de Firebase Authentication (Identity Platform)
// con la aplicación de códigos encendida. Eso se hace el día de publicar; ver
// la nota de abajo.
import {
  getMultiFactorResolver,
  multiFactor,
  TotpMultiFactorGenerator,
} from "firebase/auth";
import { auth } from "../Components/Firebase/Firebase";

// EL INTERRUPTOR. Mientras Firebase no tenga encendida la aplicación de
// códigos, nadie podría activarla y la pantalla de activar dejaría a todos
// afuera, también en el PC de desarrollo. Se pasa a true el día de publicar,
// DESPUÉS de encenderla en Firebase y junto con las reglas que la exigen.
//
// Apagado no abre nada que hoy esté cerrado: el segundo paso al iniciar
// sesión lo pide Firebase solo, a quien ya lo tenga activado.
export const EXIGIR_DOS_PASOS = false;

// Cómo aparece la cuenta en la aplicación de códigos del celular.
const NOMBRE_EN_LA_APLICACION = "Ferrequipos de la Costa";

// En qué está la sesión:
//   "activo"   → entró con contraseña Y código.
//   "reentrar" → tiene los dos pasos activados, pero esta sesión es de antes:
//                tiene que salir y volver a entrar.
//   "falta"    → nunca los activó.
export const estadoDosPasos = async (currentUser) => {
  const { claims } = await currentUser.getIdTokenResult();
  if (claims.firebase?.sign_in_second_factor) return "activo";
  return multiFactor(currentUser).enrolledFactors.length > 0
    ? "reentrar"
    : "falta";
};

// --- Al iniciar sesión -------------------------------------------------------

// Cuando la contraseña está bien pero falta el código, Firebase responde con un
// error que trae lo necesario para el segundo paso. Se guarda y se usa con
// cada intento de código.
export const prepararSegundoPaso = (errorDeLogin) =>
  getMultiFactorResolver(auth, errorDeLogin);

export const entrarConCodigo = (resolver, codigo) => {
  const pista = resolver.hints.find(
    (hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID,
  );
  if (!pista) {
    throw Object.assign(new Error("La cuenta no tiene aplicación de códigos"), {
      code: "app/sin-aplicacion-de-codigos",
    });
  }
  return resolver.resolveSignIn(
    TotpMultiFactorGenerator.assertionForSignIn(pista.uid, codigo),
  );
};

// --- Al activarlos -----------------------------------------------------------

// Firebase genera la clave secreta que comparten la cuenta y el celular. De
// ella sale el código cuadrado para escanear y, por si no se puede escanear,
// la misma clave para escribirla a mano.
export const empezarActivacion = async (currentUser) => {
  const sesion = await multiFactor(currentUser).getSession();
  const secreto = await TotpMultiFactorGenerator.generateSecret(sesion);
  return {
    secreto,
    enlace: secreto.generateQrCodeUrl(currentUser.email, NOMBRE_EN_LA_APLICACION),
    clave: secreto.secretKey,
  };
};

// Con el primer código que muestra el celular se comprueba que quedó bien
// configurado, y recién ahí se activa.
export const terminarActivacion = (currentUser, secreto, codigo) =>
  multiFactor(currentUser).enroll(
    TotpMultiFactorGenerator.assertionForEnrollment(secreto, codigo),
    "Aplicación de códigos",
  );
