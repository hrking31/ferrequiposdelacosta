import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Snackbar, Alert, Button, useMediaQuery } from "@mui/material";
import { applyUpdateNow } from "../../pwaUpdate.js";

// tiempo que se muestra el aviso antes de desaparecer solo si se ignora;
// no se pierde la actualización pendiente, solo se oculta el aviso (queda
// el ícono palpitante en la navbar como recordatorio)
const BANNER_VISIBLE_MS = 10000;

export default function UpdateBanner() {
  const updateAvailable = useSelector(
    (state) => state.pwaUpdate.updateAvailable,
  );
  const [dismissed, setDismissed] = useState(false);
  // el NavBar se mueve abajo en pantallas chicas (mismo corte que NavBar.jsx);
  // ahí arriba queda libre, en pantallas grandes hay que despejar su altura
  const isSmallScreen = useMediaQuery("(max-width:915px)");

  useEffect(() => {
    if (!updateAvailable) return undefined;

    setDismissed(false);
    // temporizador propio en vez de autoHideDuration: el de MUI pausa la
    // cuenta mientras el mouse está encima del aviso y no vuelve a correr
    // hasta que se quita, así que puede no desaparecer nunca si el cursor
    // queda cerca. Este no depende de dónde esté el mouse.
    const timer = setTimeout(() => setDismissed(true), BANNER_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [updateAvailable]);

  const visible = updateAvailable && !dismissed;

  return (
    <Snackbar
      open={visible}
      onClose={() => setDismissed(true)}
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
        onClose={() => setDismissed(true)}
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
