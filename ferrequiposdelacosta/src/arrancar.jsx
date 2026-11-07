import "../index.css";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { CustomThemeProvider } from "./Theme/ThemeProvider.jsx";
import store from "./Store/Store";
import { registerSW } from "virtual:pwa-register";
import { registerUpdateHandler, applyUpdateNow } from "./pwaUpdate.js";

const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Lo que las dos apps hacen igual al abrir (2026-11-07): buscar versiones
 * nuevas y dibujar la app dentro del estado, el router y el tema.
 *
 * Cada app (mainTienda, mainPersonal) pasa su propio componente y, si hace
 * falta, lo que cambia:
 *
 * @param {JSX.Element} app La app ya armada, con lo que necesite alrededor
 *   (la del personal va dentro de AuthProvider; la tienda no tiene sesión).
 * @param {Object} opciones
 * @param {Function} opciones.alHaberVersionNueva Qué hacer cuando hay una
 *   versión nueva. De fábrica, recargar ya. El kiosco espera al protector de
 *   pantalla para no recargarle la pantalla a un cliente.
 */
export function arrancar(app, { alHaberVersionNueva = applyUpdateNow } = {}) {
  const applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      // en npm run dev cada guardado genera una "versión nueva" del SW:
      // aplicar/recargar aquí crearía un bucle. Esta lógica es solo para producción.
      if (import.meta.env.DEV) return;
      alHaberVersionNueva();
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
        <CustomThemeProvider>{app}</CustomThemeProvider>
      </BrowserRouter>
    </Provider>,
  );
}
