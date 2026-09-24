import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import TimelineIcon from "@mui/icons-material/Timeline";
import HistorialEquipo from "../ClienteDetalle/HistorialEquipo";

// De qué equipo es la historia: "Fact. 8154 · BENITIN" y, debajo, el cliente.
// La comparten el diálogo del celular y el panel del computador, para que la
// misma historia se presente igual en las dos pantallas.
export function EncabezadoHistoria({ equipo, numeroFactura, nombreCliente }) {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" fontWeight="bold" sx={{ color: "custom.accent" }}>
        {`Fact. ${numeroFactura ?? "s/n"} · ${equipo.cantidadEquipos} ${equipo.nombre}`}
      </Typography>
      {nombreCliente && (
        <Typography variant="caption" color="text.secondary">
          {nombreCliente}
        </Typography>
      )}
    </Stack>
  );
}

EncabezadoHistoria.propTypes = {
  equipo: PropTypes.object.isRequired,
  numeroFactura: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  nombreCliente: PropTypes.string,
};

// EN EL CELULAR, la historia del equipo sin salir de Seguimiento: es la misma
// línea de tiempo del recuadro de equipos de la ficha del cliente. Sirve para
// buscar el dato que la tarjeta no trae —cuándo se pactó, cuántos días se
// pagaron— con el cliente al teléfono.
export default function HistorialEquipoDialog({
  open,
  onClose,
  equipo,
  numeroFactura,
  nombreCliente,
  hoy,
}) {
  return (
    <Dialog
      open={open && Boolean(equipo)}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      // EN EL CELULAR, casi todo el ancho. Con los 32px de margen que MUI deja
      // a cada lado, la historia quedaba en 300px: cada hito se partía en
      // cuatro renglones y el rótulo "Vencido" se salía por la derecha.
      sx={{
        "& .MuiDialog-paper": {
          mx: { xs: 1, sm: 4 },
          width: { xs: "calc(100% - 16px)", sm: undefined },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <TimelineIcon sx={{ color: "custom.accent" }} />
        Historia del equipo
      </DialogTitle>
      {equipo && (
        <DialogContent dividers sx={{ px: { xs: 1.5, sm: 3 } }}>
          <EncabezadoHistoria
            equipo={equipo}
            numeroFactura={numeroFactura}
            nombreCliente={nombreCliente}
          />
          {/* Su raya de arriba es la que separa al cliente de la historia:
              con `enDialogo` usa el borde que se ve sobre el fondo del
              diálogo. */}
          <HistorialEquipo equipo={equipo} hoy={hoy} enDialogo />
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

HistorialEquipoDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  equipo: PropTypes.object,
  numeroFactura: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  nombreCliente: PropTypes.string,
  hoy: PropTypes.string,
};
