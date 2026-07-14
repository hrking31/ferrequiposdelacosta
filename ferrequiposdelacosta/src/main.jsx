import "../index.css";
import App from "./App.jsx";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { AuthProvider } from "./Context/AuthContext";
import { CustomThemeProvider } from "./Theme/ThemeProvider.jsx";
import store from "./Store/Store";
import { setUpdateAvailable } from "./Store/Slices/pwaUpdateSlice";
import { registerSW } from "virtual:pwa-register";
import {
  registerUpdateHandler,
  markUpdatePending,
  applyUpdateNow,
} from "./pwaUpdate.js";

const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
// si la actualización se detecta dentro de esta ventana desde que cargó la
// app, se considera "recién abierta" y se aplica de una (no hay nada que
// interrumpir todavía). Después de esta ventana, se avisa en vez de aplicar.
const STARTUP_WINDOW_MS = 8000;
const appLoadedAt = Date.now();

const applyUpdate = registerSW({
  immediate: true,
  onNeedRefresh() {
    // en npm run dev cada guardado genera una "versión nueva" del SW:
    // aplicar/recargar aquí crearía un bucle. Esta lógica es solo para producción.
    if (import.meta.env.DEV) return;

    const isKiosk = window.location.pathname.toLowerCase().includes("kiosk");

    if (isKiosk) {
      // en modo kiosk no se recarga con un cliente activo: se aplica
      // cuando se active el protector de pantalla (KioskScreensaver)
      markUpdatePending();
    } else if (Date.now() - appLoadedAt < STARTUP_WINDOW_MS) {
      // se detectó al recargar/abrir la app: nada que interrumpir todavía
      applyUpdateNow();
    } else {
      // ya en uso: se avisa (UpdateBanner + ícono en la navbar) en vez de
      // recargar solo
      store.dispatch(setUpdateAvailable());
    }
  },
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;

    const checkForUpdate = () => registration.update().catch(() => {});

    // revisa de una vez al abrir/registrar (por ejemplo, al reabrir la app
    // cerrada): no esperar a los 15 min ni a un cambio de visibilidad
    checkForUpdate();

    setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  },
});

registerUpdateHandler(applyUpdate);
  
ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <CustomThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </CustomThemeProvider>
    </BrowserRouter>
  </Provider>,
);
