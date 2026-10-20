import PropTypes from "prop-types";
import { Box, Divider, Stack, Typography, useTheme } from "@mui/material";
import { formatearMoneda } from "../../Utils/formato";

// EL DETALLE DE "PAGOS PENDIENTES" (2026-10-20): cuánto se debe en facturas
// vencidas, en cobro y activas, con el total al pie.
//
// Igual que el de equipos activos, sale de la misma pizarra que el número del
// recuadro (ver calcularAporteFactura): verlo no cuesta ninguna lectura. La
// usan el menú, en un diálogo, y Seguimiento, en el recuadro de la historia.
//
// `pagosPorEstado` llega en null mientras la pizarra no tenga el detalle
// (entre que se publica y corre el primer repaso).

// Primero lo más urgente. Una factura finalizada no debe nada, así que nunca
// tiene casilla.
const ESTADOS = [
  { estado: "vencida", label: "Vencidas" },
  { estado: "cobro", label: "En cobro" },
  { estado: "activa", label: "Activas" },
  { estado: "pendiente", label: "Sin despachar" },
];

export default function DetallePagosPendientes({ pagosPorEstado }) {
  const theme = useTheme();

  if (!pagosPorEstado) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        El detalle todavía no está listo.
      </Typography>
    );
  }

  const filas = ESTADOS.filter(({ estado }) => pagosPorEstado[estado] > 0);

  if (filas.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        No hay pagos pendientes.
      </Typography>
    );
  }

  const total = filas.reduce((suma, { estado }) => suma + pagosPorEstado[estado], 0);

  const fila = (clave, label, monto, color) => (
    <Stack
      key={clave}
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={2}
      sx={{ py: 0.75 }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
        {color && (
          <Box
            sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }}
          />
        )}
        <Typography variant="body2" sx={{ fontWeight: color ? 400 : 700 }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
        {formatearMoneda(monto)}
      </Typography>
    </Stack>
  );

  return (
    <Box>
      {filas.map(({ estado, label }) =>
        fila(estado, label, pagosPorEstado[estado], theme.palette.custom.estadoFactura[estado]),
      )}
      <Divider sx={{ my: 0.5 }} />
      {fila("total", "Total", total)}
    </Box>
  );
}

DetallePagosPendientes.propTypes = {
  pagosPorEstado: PropTypes.objectOf(PropTypes.number),
};
