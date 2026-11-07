// LA TIENDA (www.ferrequiposdelacosta.com): catálogo, detalle, carrito y
// kiosco. No tiene inicio de sesión: el personal entra por su propia app
// (mainPersonal.jsx). Ver vite.config.js.
import AppTienda from "./AppTienda.jsx";
import { arrancar } from "./arrancar.jsx";
import { markUpdatePending, applyUpdateNow } from "./pwaUpdate.js";

arrancar(<AppTienda />, {
  alHaberVersionNueva() {
    const isKiosk = window.location.pathname.toLowerCase().includes("kiosk");

    if (isKiosk) {
      // en modo kiosk no se recarga con un cliente activo: se aplica
      // cuando se active el protector de pantalla (KioskScreensaver)
      markUpdatePending();
    } else {
      applyUpdateNow();
    }
  },
});
