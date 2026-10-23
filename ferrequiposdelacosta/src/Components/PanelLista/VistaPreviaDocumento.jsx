import PropTypes from "prop-types";
import { Box, Chip, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ConstructionIcon from "@mui/icons-material/Construction";
import PaymentsIcon from "@mui/icons-material/Payments";
import { TituloSeccion } from "./ResumenLista";
import { formatearMoneda } from "../../Utils/formato";

// LA VISTA PREVIA DE UNA COTIZACIÓN O DE UNA CUENTA DE COBRO (2026-10-22), en
// el recuadro de la derecha, al tocar su tarjeta en la lista. Sirve para MIRAR
// sin abrir: abrir el documento lo marca "En proceso" a nombre de quien lo
// abre, aunque solo quisiera ver qué pidió el cliente.
//
// Con el mismo color e íconos que el resumen de la lista (pedido del dueño,
// 2026-10-23). Se suelta con la X de la esquina del recuadro (ver
// PanelDocumentos) o tocando otra vez la tarjeta.
//
// Cada renglón es "equipo — cantidad × días" con su subtotal, que se calcula
// acá (cantidad × precio × días): en las cotizaciones el subtotal se guarda ya
// con formato de moneda y no se puede sumar.
export default function VistaPreviaDocumento({ numero, cliente, estado, fecha, items, totales }) {
  const theme = useTheme();
  const renglones = (items || []).filter((item) => String(item.description || "").trim());
  // El color del estado es el mismo del chip de la lista ("success",
  // "warning"...); "default" es gris.
  const colorEstado = theme.palette[estado.color]?.main ?? theme.palette.text.secondary;
  const colorEquipos = theme.palette.info.main;
  const colorTotales = theme.palette.success.main;

  return (
    <Stack spacing={5} sx={{ mt: 2, px: 1 }}>
      <Stack
        direction="row"
        alignItems="flex-start"
        spacing={1}
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: alpha(colorEstado, 0.08),
          borderLeft: "4px solid",
          borderLeftColor: colorEstado,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {cliente || "Cliente sin nombre"}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div">
            {numero}
            {fecha ? ` · ${fecha}` : ""}
          </Typography>
        </Box>
        <Chip size="small" label={estado.label} color={estado.color} sx={{ flexShrink: 0 }} />
      </Stack>

      <Box>
        <TituloSeccion titulo="EQUIPOS" icono={<ConstructionIcon />} color={colorEquipos} />
        {renglones.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1, px: 1.5 }}>
            Sin equipos todavía.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {renglones.map((item, indice) => {
              const cantidad = Number(item.quantity) || 0;
              const dias = Number(item.day) || 0;
              const subtotal = cantidad * (Number(item.price) || 0) * dias;
              return (
                <Stack
                  // Un mismo equipo puede ir en dos renglones: va con su posición.
                  key={`${item.description}-${indice}`}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={2}
                  sx={{
                    py: 1,
                    px: 1.5,
                    borderRadius: 1.5,
                    bgcolor: alpha(colorEquipos, 0.07),
                    borderLeft: "3px solid",
                    borderLeftColor: colorEquipos,
                  }}
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
            })}
          </Stack>
        )}
      </Box>

      <Box>
        <TituloSeccion titulo="TOTALES" icono={<PaymentsIcon />} color={colorTotales} />
        <Stack spacing={0.75}>
          {totales.map(({ label, valor, destacado }) =>
            destacado ? (
              // Lo que importa, en grande: el total de la cotización o lo que
              // falta por cancelar de la cuenta.
              <Stack
                key={label}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
                sx={{
                  py: 1.25,
                  px: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: alpha(colorTotales, 0.35),
                  bgcolor: alpha(colorTotales, 0.1),
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {label}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: colorTotales, flexShrink: 0 }}>
                  {valor}
                </Typography>
              </Stack>
            ) : (
              <Stack key={label} direction="row" justifyContent="space-between" spacing={2} sx={{ px: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {valor}
                </Typography>
              </Stack>
            ),
          )}
        </Stack>
      </Box>
    </Stack>
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
};
