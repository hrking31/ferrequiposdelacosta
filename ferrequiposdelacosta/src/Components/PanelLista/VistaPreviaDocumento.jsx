import PropTypes from "prop-types";
import { Box, Chip, Divider, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { formatearMoneda } from "../../Utils/formato";

// LA VISTA PREVIA DE UNA COTIZACIÓN O DE UNA CUENTA DE COBRO (2026-10-22), en
// el recuadro de la derecha, al tocar su tarjeta en la lista. Sirve para MIRAR
// sin abrir: abrir el documento lo marca "En proceso" a nombre de quien lo
// abre, aunque solo quisiera ver qué pidió el cliente.
//
// Cada renglón es "equipo — cantidad × días" con su subtotal, que se calcula
// acá (cantidad × precio × días): en las cotizaciones el subtotal se guarda ya
// con formato de moneda y no se puede sumar.
export default function VistaPreviaDocumento({ numero, cliente, estado, fecha, items, totales, onSoltar }) {
  const renglones = (items || []).filter((item) => String(item.description || "").trim());

  return (
    <Box sx={{ mt: 0.5 }}>
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {cliente || "Cliente sin nombre"}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div">
            {numero}
            {fecha ? ` · ${fecha}` : ""}
          </Typography>
        </Box>
        <Chip
          size="small"
          variant="outlined"
          label={estado.label}
          color={estado.color}
          sx={{ flexShrink: 0 }}
        />
        <Tooltip title="Soltar">
          <IconButton size="small" onClick={onSoltar} aria-label="Soltar" sx={{ mt: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider sx={{ my: 1 }} />

      {renglones.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          Sin equipos todavía.
        </Typography>
      ) : (
        renglones.map((item, indice) => {
          const cantidad = Number(item.quantity) || 0;
          const dias = Number(item.day) || 0;
          const subtotal = cantidad * (Number(item.price) || 0) * dias;
          return (
            <Stack
              // Un mismo equipo puede ir en dos renglones: va con su posición.
              key={`${item.description}-${indice}`}
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
              spacing={2}
              sx={{ py: 0.5 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2">{item.description}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {cantidad} × {dias} {dias === 1 ? "día" : "días"}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
                {formatearMoneda(subtotal)}
              </Typography>
            </Stack>
          );
        })
      )}

      <Divider sx={{ my: 1 }} />

      {totales.map(({ label, valor, destacado }) => (
        <Stack key={label} direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.25 }}>
          <Typography variant="body2" sx={{ fontWeight: destacado ? 700 : 400 }}>
            {label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {valor}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}

VistaPreviaDocumento.propTypes = {
  numero: PropTypes.string,
  cliente: PropTypes.string,
  estado: PropTypes.shape({ label: PropTypes.string.isRequired, color: PropTypes.string }).isRequired,
  fecha: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.object),
  // Los renglones del pie: { label, valor ya con formato, destacado }.
  totales: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      valor: PropTypes.node.isRequired,
      destacado: PropTypes.bool,
    }),
  ).isRequired,
  onSoltar: PropTypes.func.isRequired,
};
