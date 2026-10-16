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
// sesión abierta, el botón para cerrárselas todas (ver Utils/aparatos.js) y el
// de quitarle los dos pasos a quien perdió o cambió el celular (ver
// cerrarSesiones y quitarDosPasos en functions/index.js).
//
// Las dos acciones lo sacan de todos sus aparatos, así que las dos preguntan
// antes.
const ACCIONES = {
  cerrar: {
    titulo: "¿Cerrar todas las sesiones?",
    texto: (nombre) =>
      `A ${nombre} se le cerrará la app en todos sus aparatos y tendrá que volver a entrar con su correo y contraseña.`,
    boton: "Cerrar sesiones",
  },
  quitar: {
    titulo: "¿Quitar los dos pasos?",
    texto: (nombre) =>
      `Úselo si ${nombre} perdió o cambió el celular. Se le cerrará la app en todos sus aparatos y, al volver a entrar, tendrá que activar los dos pasos con el celular nuevo.`,
    boton: "Quitar dos pasos",
  },
};

export default function AparatosUsuario({
  nombre,
  aparatos,
  onCerrarSesiones,
  onQuitarDosPasos,
}) {
  const [accion, setAccion] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const confirmar = async () => {
    setOcupado(true);
    try {
      await (accion === "quitar" ? onQuitarDosPasos() : onCerrarSesiones());
      setAccion(null);
    } finally {
      setOcupado(false);
    }
  };

  const enCurso = accion ? ACCIONES[accion] : null;

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

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          gap: 1,
          mt: 1,
        }}
      >
        <Button size="small" variant="text" onClick={() => setAccion("quitar")}>
          Quitar dos pasos
        </Button>
        <Button
          size="small"
          color="error"
          variant="outlined"
          disabled={aparatos.length === 0}
          onClick={() => setAccion("cerrar")}
        >
          Cerrar todas las sesiones
        </Button>
      </Box>

      <Dialog
        open={Boolean(enCurso)}
        onClose={() => !ocupado && setAccion(null)}
        fullWidth
        maxWidth="xs"
      >
        {enCurso && (
          <>
            <DialogTitle>{enCurso.titulo}</DialogTitle>
            <DialogContent>
              <DialogContentText>{enCurso.texto(nombre)}</DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setAccion(null)} disabled={ocupado}>
                Cancelar
              </Button>
              <Button
                color="error"
                variant="contained"
                onClick={confirmar}
                disabled={ocupado}
                startIcon={
                  ocupado ? <CircularProgress size={16} color="inherit" /> : null
                }
              >
                {enCurso.boton}
              </Button>
            </DialogActions>
          </>
        )}
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
  onQuitarDosPasos: PropTypes.func.isRequired,
};
