import PropTypes from "prop-types";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import TimelineIcon from "@mui/icons-material/Timeline";
import CloseIcon from "@mui/icons-material/Close";
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
      {/* LA X ARRIBA, al lado del título, y sin botón "Cerrar" al pie: en el
          celular ese renglón se comía alto que la historia necesita. Y poco
          aire entre el título y la factura, por lo mismo. */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          py: { xs: 1, sm: 1.5 },
          pr: 1,
        }}
      >
        <TimelineIcon sx={{ color: "custom.accent" }} />
        <Box component="span" sx={{ flex: 1 }}>
          Historia del equipo
        </Box>
        <Tooltip title="Cerrar">
          <IconButton size="small" aria-label="Cerrar" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      {equipo && (
        // Sin `dividers`: su línea es del color de "divider", que en modo
        // oscuro es el mismo del fondo del diálogo. No se veía y solo dejaba
        // un hueco entre el título y la factura.
        <DialogContent sx={{ px: { xs: 1.5, sm: 3 }, pb: 2 }}>
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
