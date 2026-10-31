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
  IconButton,
  Typography,
} from "@mui/material";
import ComputerIcon from "@mui/icons-material/Computer";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import TabletIcon from "@mui/icons-material/TabletAndroid";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { describirUltimoUso } from "../../Utils/aparatos";

const ICONOS = { pc: ComputerIcon, celular: SmartphoneIcon, tablet: TabletIcon };

// Las sesiones abiertas de una persona, dentro del recuadro SESIONES ABIERTAS
// de su ficha (FichaUsuario): en qué aparatos tiene la sesión abierta, la papelera para cerrar la de uno solo, el botón para
// cerrárselas todas (ver Utils/aparatos.js) y el de quitarle los dos pasos a
// quien perdió o cambió el celular (ver cerrarSesionAparato, cerrarSesiones y
// quitarDosPasos en functions/index.js).
//
// Las tres acciones lo sacan de algún aparato, así que las tres preguntan
// antes.
const ACCIONES = {
  uno: {
    titulo: "¿Cerrar esta sesión?",
    texto: (nombre, aparato) =>
      `A ${nombre} se le cerrará la app en ${aparato.descripcion}. En sus otros aparatos sigue abierta.`,
    boton: "Cerrar sesión",
  },
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

// LA LISTA EN SU PROPIO RECUADRO, para que se vea dónde empieza y termina
// lo que se desplaza, y de ALTO FIJO —unas cuatro sesiones— para que la
// ficha no cambie de tamaño con pocas o ninguna (pedido del dueño,
// 2026-10-28). Si son más, se desplazan adentro. Solo se achica si en la
// pantalla no cabe (ver `encoge` en Seccion).
const RECUADRO_LISTA = {
  height: 232,
  flex: "0 1 auto",
  minHeight: 0,
  boxSizing: "border-box",
  p: 1,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  bgcolor: "background.default",
  display: "flex",
  flexDirection: "column",
  gap: 0.75,
  overflowY: "auto",
};

// `estira`: la lista crece con el recuadro, desde ese alto fijo como mínimo
// (la ficha en dos pisos de una tableta de pie, donde sobra alto; pedido del
// dueño, 2026-10-30).
// `fechaDebajo`: en un recuadro angosto (ROL y SESIONES lado a lado), la fecha
// va debajo del nombre del aparato y no al lado, que lo partía en tres
// renglones (2026-10-30).
export default function AparatosUsuario({
  nombre,
  aparatos,
  onCerrarSesionAparato,
  onCerrarSesiones,
  onQuitarDosPasos,
  estira = false,
  fechaDebajo = false,
}) {
  // { tipo: "uno" | "cerrar" | "quitar", aparato }: lo que espera confirmación.
  const [accion, setAccion] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const confirmar = async () => {
    setOcupado(true);
    try {
      if (accion.tipo === "uno") await onCerrarSesionAparato(accion.aparato);
      else if (accion.tipo === "quitar") await onQuitarDosPasos();
      else await onCerrarSesiones();
      setAccion(null);
    } finally {
      setOcupado(false);
    }
  };

  const enCurso = accion ? ACCIONES[accion.tipo] : null;
  const recuadroLista = estira
    ? { ...RECUADRO_LISTA, height: "auto", flex: "1 1 auto", minHeight: RECUADRO_LISTA.height }
    : RECUADRO_LISTA;

  return (
    // En columna y achicable: si al recuadro no le alcanza el alto, la lista
    // cede y los botones de abajo quedan a la vista.
    <Box sx={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {aparatos.length === 0 ? (
        <Box sx={{ ...recuadroLista, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Ninguna: no tiene la app abierta en ningún aparato.
          </Typography>
        </Box>
      ) : (
        <Box component="ul" sx={{ ...recuadroLista, listStyle: "none", m: 0 }}>
          {aparatos.map((aparato) => {
            const Icono = ICONOS[aparato.tipo] || ComputerIcon;
            return (
              <Box
                component="li"
                key={aparato.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  pl: 1.5,
                  pr: 0.5,
                  py: 0.25,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  flexShrink: 0,
                }}
              >
                <Icono fontSize="small" sx={{ color: "text.secondary" }} />
                {fechaDebajo ? (
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap title={aparato.descripcion}>
                      {aparato.descripcion}
                    </Typography>
                    <Typography variant="caption" component="p" color="text.secondary" noWrap>
                      {describirUltimoUso(aparato.ultimoUso?.toDate?.())}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                      {aparato.descripcion}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {describirUltimoUso(aparato.ultimoUso?.toDate?.())}
                    </Typography>
                  </>
                )}
                <IconButton
                  size="small"
                  color="error"
                  aria-label={`Cerrar la sesión en ${aparato.descripcion}`}
                  onClick={() => setAccion({ tipo: "uno", aparato })}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
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
          mt: 1.5,
          flexShrink: 0,
        }}
      >
        <Button size="small" variant="text" onClick={() => setAccion({ tipo: "quitar" })}>
          Quitar dos pasos
        </Button>
        <Button
          size="small"
          color="error"
          variant="outlined"
          disabled={aparatos.length === 0}
          onClick={() => setAccion({ tipo: "cerrar" })}
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
              <DialogContentText>
                {enCurso.texto(nombre, accion.aparato)}
              </DialogContentText>
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
  onCerrarSesionAparato: PropTypes.func.isRequired,
  onCerrarSesiones: PropTypes.func.isRequired,
  onQuitarDosPasos: PropTypes.func.isRequired,
  estira: PropTypes.bool,
  fechaDebajo: PropTypes.bool,
};
