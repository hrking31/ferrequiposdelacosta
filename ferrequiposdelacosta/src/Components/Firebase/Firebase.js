import firebaseConfig from "./firebaseConfig";
import { initializeApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";

const app = initializeApp(firebaseConfig);

// App Check: adjunta un token de reCAPTCHA Enterprise a las llamadas a Firebase
// para que la Cloud Function crearCotizacion pueda rechazar peticiones que no
// vengan de esta app.
//
// En desarrollo (npm run dev) reCAPTCHA no valida localhost, así que se usa un
// token de depuración: al arrancar, la consola del navegador imprime un token
// que hay que registrar UNA vez en Firebase Console → App Check → Apps → tokens
// de depuración. Sin esto, con la exigencia activa, la app local no podría
// escribir.
if (import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(
    "6LeGpHotAAAAAAcG-_8PNVMqB2mGh1Rp2dYbhh91",
  ),
  isTokenAutoRefreshEnabled: true,
});

export const storage = getStorage(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const database = getDatabase(app);
export const functions = getFunctions(app);

// La app de Firebase, para quien necesite armar un servicio bajo demanda. Lo
// usa Utils/avisos.js con la mensajería: ese servicio NO se puede crear acá
// arriba porque revienta en los navegadores que no soportan notificaciones
// (Safari sin instalar la app, por ejemplo), y este archivo lo carga TODA la
// app, incluida la tienda pública.
export { app };

// La llave pública de las notificaciones (par de claves VAPID, generado en
// Consola de Firebase → Configuración del proyecto → Cloud Messaging →
// Certificados push web). Es pública por diseño, igual que la de reCAPTCHA:
// identifica al remitente ante el navegador, no autoriza a enviar nada. Quien
// envía es el servidor, con sus credenciales de administrador.
export const LLAVE_AVISOS =
  "BA6eq6xlfRaEIK2ZdJqcbOLs3icPR6ss9mafffT8-PxHIHWRYsy7-lHPxKaoPm592BzGhau36HS7gSWM1rYLf-I";
