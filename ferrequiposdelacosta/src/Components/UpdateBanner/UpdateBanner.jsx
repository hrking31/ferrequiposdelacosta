import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { Snackbar, Alert, Button, useMediaQuery } from "@mui/material";
import { applyUpdateNow } from "../../pwaUpdate.js";

// tiempo máximo que se deja el aviso sin forzar la actualización,
// por si el usuario nunca cambia de ruta ni hace clic
const FORCE_UPDATE_AFTER_MS = 10 * 60 * 1000;

export default function UpdateBanner() {
  const location = useLocation();
  const updateAvailable = useSelector(
    (state) => state.pwaUpdate.updateAvailable,
  );
  const isFirstRender = useRef(true);
  // el NavBar se mueve abajo en pantallas chicas (mismo corte que NavBar.jsx);
  // ahí arriba queda libre, en pantallas grandes hay que despejar su altura
  const isSmallScreen = useMediaQuery("(max-width:915px)");

  // empujón: si ya hay una actualización esperando y el usuario navega
  // a otra pantalla, se aprovecha ese cambio para aplicarla
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (updateAvailable) {
      applyUpdateNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar al cambio de ruta
  }, [location.pathname]);

  // empujón de respaldo: si se queda quieto en la misma pantalla,
  // no lo dejamos esperando para siempre
  useEffect(() => {
    if (!updateAvailable) return undefined;

    const timer = setTimeout(() => applyUpdateNow(), FORCE_UPDATE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [updateAvailable]);

  return (
    <Snackbar
      open={updateAvailable}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{
        "&.MuiSnackbar-root": {
          top: isSmallScreen ? 12 : 88,
        },
      }}
    >
      <Alert
        severity="info"
        variant="filled"
        sx={{ alignItems: "center" }}
        action={
          <Button
            onClick={applyUpdateNow}
            variant="outlined"
            size="small"
            sx={{
              color: (theme) => theme.palette.info.contrastText,
              borderColor: (theme) => theme.palette.info.contrastText,
              fontWeight: "bold",
            }}
          >
            ACTUALIZAR
          </Button>
        }
      >
        Hay una nueva versión disponible
      </Alert>
    </Snackbar>
  );
}
