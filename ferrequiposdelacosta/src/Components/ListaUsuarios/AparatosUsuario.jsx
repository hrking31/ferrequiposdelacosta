import { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Typography,
} from "@mui/material";
import ComputerIcon from "@mui/icons-material/Computer";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import TabletIcon from "@mui/icons-material/TabletAndroid";
import { describirUltimoUso } from "../../Utils/aparatos";

const ICONOS = { pc: ComputerIcon, celular: SmartphoneIcon, tablet: TabletIcon };

// La parte de abajo de la tarjeta de cada usuario: en qué aparatos tiene la
// sesión abierta y el botón para cerrárselas todas (ver Utils/aparatos.js y
// cerrarSesiones en functions/index.js).
export default function AparatosUsuario({ nombre, aparatos, onCerrarSesiones }) {
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const cerrar = async () => {
    setCerrando(true);
    try {
      await onCerrarSesiones();
      setConfirmando(false);
    } finally {
      setCerrando(false);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Divider sx={{ mb: 1.5 }} />

      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        Sesiones abiertas
      </Typography>

      {aparatos.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Ninguna.
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
          {aparatos.map((aparato) => {
            const Icono = ICONOS[aparato.tipo] || ComputerIcon;
            return (
              <Box
                component="li"
                key={aparato.id}
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}
              >
                <Icono fontSize="small" sx={{ color: "text.secondary" }} />
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                  {aparato.descripcion}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {describirUltimoUso(aparato.ultimoUso?.toDate?.())}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
        <Button
          size="small"
          color="error"
          variant="outlined"
          disabled={aparatos.length === 0}
          onClick={() => setConfirmando(true)}
        >
          Cerrar todas las sesiones
        </Button>
      </Box>

      <Dialog
        open={confirmando}
        onClose={() => !cerrando && setConfirmando(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>¿Cerrar todas las sesiones?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            A {nombre} se le cerrará la app en todos sus aparatos y tendrá que
            volver a entrar con su correo y contraseña.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmando(false)} disabled={cerrando}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={cerrar}
            disabled={cerrando}
            startIcon={cerrando ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Cerrar sesiones
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

AparatosUsuario.propTypes = {
  nombre: PropTypes.string.isRequired,
  aparatos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      tipo: PropTypes.string,
      descripcion: PropTypes.string,
      ultimoUso: PropTypes.object,
    }),
  ).isRequired,
  onCerrarSesiones: PropTypes.func.isRequired,
};
