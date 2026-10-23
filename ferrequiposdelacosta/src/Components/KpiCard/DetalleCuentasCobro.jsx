import PropTypes from "prop-types";
import { Box, Divider, Stack, Typography, useTheme } from "@mui/material";
import { formatearMoneda } from "../../Utils/formato";

// EL DETALLE DE "CUENTAS DE COBRO" (2026-10-22): de las emitidas este mes,
// cuántas faltan por cobrar y cuántas ya se pagaron, cada una con su plata, y
// el total al pie.
//
// Sale de la misma pizarra que el número del recuadro (ver
// Utils/resumenDocumentos), así que verlo no cuesta ninguna lectura. La plata
// es el "Total a cancelar" de cada cuenta, el mismo que muestra la lista.
//
// `cuentasCobroMes` llega en null mientras la pizarra no tenga el dato (entre
// que se publica y corre el primer recuento).
export default function DetalleCuentasCobro({ cuentasCobroMes }) {
  const theme = useTheme();

  if (!cuentasCobroMes) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        El detalle todavía no está listo.
      </Typography>
    );
  }

  if (cuentasCobroMes.total === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        Todavía no hay cuentas de cobro emitidas este mes.
      </Typography>
    );
  }

  const fila = (clave, label, cantidad, monto, color) => (
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
        {cantidad} · {formatearMoneda(monto)}
      </Typography>
    </Stack>
  );

  return (
    <Box>
      {fila(
        "porCobrar",
        "Por cobrar",
        cuentasCobroMes.porCobrar,
        cuentasCobroMes.montoPorCobrar,
        theme.palette.warning.main,
      )}
      {fila(
        "pagadas",
        "Pagadas",
        cuentasCobroMes.pagadas,
        cuentasCobroMes.montoPagadas,
        theme.palette.primary.main,
      )}
      <Divider sx={{ my: 0.5 }} />
      {fila("total", "Total", cuentasCobroMes.total, cuentasCobroMes.monto)}
    </Box>
  );
}

DetalleCuentasCobro.propTypes = {
  cuentasCobroMes: PropTypes.shape({
    total: PropTypes.number,
    monto: PropTypes.number,
    porCobrar: PropTypes.number,
    montoPorCobrar: PropTypes.number,
    pagadas: PropTypes.number,
    montoPagadas: PropTypes.number,
  }),
};
