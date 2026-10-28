import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { deleteDoc, doc } from "firebase/firestore";
import { ref, listAll, deleteObject } from "firebase/storage";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { db, storage } from "../Firebase/Firebase";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import MiniaturaEquipo from "../CatalogoEquipos/MiniaturaEquipo";

// BORRAR UN EQUIPO DEL CATÁLOGO, con su ventana de confirmación (2026-10-26):
// muestra qué se va a borrar y el botón rojo se activa recién al escribir el
// nombre del equipo (pedido del dueño), para que un toque en falso no se lleve
// un equipo con todas sus fotos.
//
// `onTerminar({ mensaje, severidad, eliminado })`: la vista avisa el
// resultado y, si se borró, vuelve a la galería.
export default function EliminarEquipoDialogo({ equipo, open, onClose, onTerminar, conCambios }) {
  const dispatch = useDispatch();
  const [escrito, setEscrito] = useState("");
  const [borrando, setBorrando] = useState(false);
  const nombre = (equipo.name || "").trim() || "ELIMINAR";
  const coincide = escrito.trim().toLowerCase() === nombre.toLowerCase();
  const fotos = equipo.images?.length || 0;
  const variantes = equipo.variantes?.length || 0;

  useEffect(() => {
    if (open) setEscrito("");
  }, [open]);

  const eliminar = async () => {
    setBorrando(true);
    try {
      // Se borra primero el documento para que el equipo deje de aparecer
      // en el catálogo de inmediato; si luego falla la limpieza de Storage
      // solo quedan imágenes huérfanas (invisibles), no un equipo fantasma
      // con imágenes rotas.
      await deleteDoc(doc(db, "equipos", equipo.id));

      // El catálogo vive en Redux y solo se consulta cuando está vacío, así que
      // sin este refresh el equipo borrado sigue apareciendo en la tienda, el
      // kiosco y la lista hasta que se recargue la página.
      dispatch(fetchEquiposData());

      try {
        const carpeta = await listAll(ref(storage, `${equipo.id}/`));
        await Promise.all(carpeta.items.map((item) => deleteObject(item)));
        onTerminar({
          mensaje: `Equipo ${equipo.name} eliminado correctamente.`,
          severidad: "success",
          eliminado: true,
        });
      } catch {
        onTerminar({
          mensaje: `Equipo ${equipo.name} eliminado, pero no se pudieron borrar todas sus imágenes del almacenamiento.`,
          severidad: "warning",
          eliminado: true,
        });
      }
    } catch (error) {
      onTerminar({
        mensaje: error.message || `Error al eliminar el equipo ${equipo.name}.`,
        severidad: "error",
        eliminado: false,
      });
    } finally {
      setBorrando(false);
    }
  };

  return (
    <Dialog open={open} onClose={borrando ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: "bold", bgcolor: "error.main", color: "error.contrastText" }}>
        ⚠️ Eliminar equipo
      </DialogTitle>

      <DialogContent sx={{ pt: "20px !important" }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2 }}>
          <MiniaturaEquipo equipo={equipo} ancho={96} radio={1.5} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>{equipo.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {fotos === 1 ? "1 foto" : `${fotos} fotos`} ·{" "}
              {variantes === 1 ? "1 variante" : `${variantes} variantes`}
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Se borra del catálogo, la tienda y el kiosco, con todas sus fotos.{" "}
          <strong>No se puede deshacer.</strong>
        </Typography>

        {conCambios && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Tiene cambios sin guardar: también se pierden.
          </Alert>
        )}

        {/* La instrucción va afuera y la casilla en blanco: que la casilla
            no dicte lo que hay que escribir (pedido del dueño, 2026-10-28). */}
        <Typography variant="body2" sx={{ mb: 1 }}>
          Escribe <strong>{nombre}</strong> para confirmar
        </Typography>

        <TextField
          name="confirmarNombre"
          inputProps={{ "aria-label": "Confirmar eliminación" }}
          value={escrito}
          onChange={(e) => setEscrito(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && coincide && !borrando) eliminar();
          }}
          autoComplete="off"
          autoFocus
          fullWidth
        />
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1.5, "& > :not(style)": { m: "0 !important" } }}>
        {/* El que borra va en ROJO y el de salir en contorno: el verde invita
            a tocar, y acá se lleva el equipo con todas sus imágenes. */}
        <Button
          onClick={eliminar}
          variant="contained"
          color="error"
          disabled={!coincide || borrando}
          fullWidth
        >
          {borrando ? "Eliminando..." : "Eliminar"}
        </Button>
        <Button onClick={onClose} variant="outlined" disabled={borrando} fullWidth>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

EliminarEquipoDialogo.propTypes = {
  equipo: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    images: PropTypes.array,
    variantes: PropTypes.array,
  }).isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onTerminar: PropTypes.func.isRequired,
  // El equipo tiene cambios sin guardar en el editor.
  conCambios: PropTypes.bool,
};
