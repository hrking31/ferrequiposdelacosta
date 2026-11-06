import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import MapaBodega from "./MapaBodega";

// "DÓNDE ESTAMOS" del menú del celular (pedido del dueño, 2026-11-06): el
// mismo mapa que la tienda muestra en el computador, en una ventana.
export default function DondeEstamosDialogo({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Dónde estamos</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Kra 38 # 108 – 23, Barranquilla
        </Typography>
        <MapaBodega alto="min(360px, 55vh)" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

DondeEstamosDialogo.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
