import firebaseConfig from "./firebaseConfig";
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";

const app = initializeApp(firebaseConfig);

// ── App Check, BAJO DEMANDA ─────────────────────────────────────────────
//
// Adjunta un token de reCAPTCHA Enterprise a las llamadas a Firebase para que
// la Cloud Function crearCotizacion pueda rechazar peticiones que no vengan de
// esta app.
//
// POR QUÉ NO SE ARRANCA ACÁ ARRIBA. Antes sí: este archivo lo carga toda la
// app, así que reCAPTCHA se descargaba y se ponía a analizar el comportamiento
// del usuario en cuanto se abría cualquier pantalla, aunque nadie fuera a pedir
// una cotización. En el KIOSCO eso es todo el día: la pantalla queda encendida
// en reposo y reCAPTCHA sigue trabajando y renovando su token cada hora, para
// nada.
//
// Ahora lo enciende quien lo necesita. Y quien lo necesita es UNO SOLO:
// `crearCotizacion`, la única función con `enforceAppCheck: true` (ver
// functions/index.js). La llaman VistaCart y KioskCart, y las dos lo activan al
// entrar al carrito — no al apretar Enviar—, así el token ya está listo
// mientras el cliente llena sus datos.
//
// ⚠️ SI ALGÚN DÍA SE ACTIVA LA EXIGENCIA DE APP CHECK PARA FIRESTORE, STORAGE O
// REALTIME DATABASE desde la consola de Firebase, esto hay que volver atrás: el
// catálogo y el login se cargan antes de que nadie pase por el carrito y
// quedarían sin token. Hoy la exigencia vive SOLO en el código de esa función,
// por eso el resto no corre riesgo.
//
// El SDK tolera que se encienda tarde: `getFunctions` guarda una promesa del
// proveedor de App Check y la resuelve cuando aparece, así que la llamada
// posterior sí lleva su token.
const CLAVE_RECAPTCHA = "6LeGpHotAAAAAAcG-_8PNVMqB2mGh1Rp2dYbhh91";

let appCheckEncendido = null;

export const activarAppCheck = () => {
  // Una sola vez: initializeAppCheck revienta si se lo llama dos veces sobre
  // la misma app, y al carrito se entra y se sale muchas veces.
  if (appCheckEncendido) return appCheckEncendido;

  appCheckEncendido = (async () => {
    // Import dinámico para que el código de App Check y el script de reCAPTCHA
    // no viajen en el paquete que carga la tienda entera.
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import(
      "firebase/app-check"
    );

    // En desarrollo (npm run dev) reCAPTCHA no valida localhost, así que se usa
    // un token de depuración: la consola del navegador imprime uno que hay que
    // registrar UNA vez en Firebase Console → App Check → Apps → tokens de
    // depuración. Sin esto, con la exigencia activa, la app local no podría
    // pedir cotizaciones. Va antes de initializeAppCheck, que es cuando se lee.
    if (import.meta.env.DEV) {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    return initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(CLAVE_RECAPTCHA),
      isTokenAutoRefreshEnabled: true,
    });
  })();

  return appCheckEncendido;
};

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
