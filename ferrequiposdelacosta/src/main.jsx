import "../index.css";
import App from "./App.jsx";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { AuthProvider } from "./Context/AuthContext";
import { CustomThemeProvider } from "./Theme/ThemeProvider.jsx";
import store from "./Store/Store";
import { registerSW } from "virtual:pwa-register";
import {
  registerUpdateHandler,
  markUpdatePending,
  applyUpdateNow,
} from "./pwaUpdate.js";

const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

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
    } else {
      applyUpdateNow();
    }
  },
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;

    const checkForUpdate = () => registration.update().catch(() => {});

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
