// Lo que se cobra aparte del alquiler de un lote de equipos: el IVA, el
// depósito y el transporte, con su total, y —al desplegar la flecha— el IVA
// discriminado equipo por equipo.
//
// El IVA del recuadro es la suma del de todos los equipos del grupo, y sumado
// no se entiende de dónde salió: una factura que arrancó con $20.000 de IVA y
// a la que después se le sumó un equipo de $30.000 muestra $50.000, sin forma
// de reconstruir el reparto. Cerrado se ve exactamente lo de antes; la flecha
// es lo único que se agrega.
//
// El depósito y el transporte no se desglosan porque no son por equipo: se
// cobran una vez por despacho, no importa cuántos equipos hayan salido en él.
import PropTypes from "prop-types";
import { alpha } from "@mui/material/styles";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddCardIcon from "@mui/icons-material/AddCard";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { calcularAmpliacionEquipo } from "./facturaUtils";
import { renderFilaDatos, renderRecuadroBloque } from "./recuadrosCuenta";
// Con alias: la moneda que deja el hueco vacío si no hay número.
import { formatearMonedaOVacio as formatearMoneda } from "../../Utils/formato";

// El recuadro con los importes. Antes vivía dentro del cuadro de pago,
// mezclado con el medio y el monto; ahora va en su propio recuadro, debajo de
// los equipos.
const renderAdicionales = ({
  deposito,
  transporteTipo,
  transporteMonto,
  iva,
  color,
}) => {
  const hayTransporte = transporteTipo && transporteTipo !== "Sin transporte";
  const hayIva = Number(iva) > 0;
  if (deposito <= 0 && !hayTransporte && !hayIva) return null;

  const total =
    (hayIva ? Number(iva) : 0) +
    deposito +
    (hayTransporte ? transporteMonto : 0);

  const datos = [];
  if (hayIva) {
    datos.push({
      clave: "iva",
      rotulo: "IVA (19%)",
      valor: formatearMoneda(Number(iva)),
    });
  }
  if (deposito > 0) {
    datos.push({
      clave: "deposito",
      rotulo: "Depósito",
      valor: formatearMoneda(deposito),
    });
  }
  // El tipo de transporte y su valor van juntos: son un solo dato, no dos
  // ("Ida y vuelta · $60.000").
  if (hayTransporte) {
    datos.push({
      clave: "transporte",
      rotulo: "Transporte",
      valor:
        transporteMonto > 0
          ? `${transporteTipo} · ${formatearMoneda(transporteMonto)}`
          : transporteTipo,
    });
  }
  // La suma de todo lo que se cobra aparte del alquiler. Se llama "Total
  // adicionales" y no "Total" a secas porque más abajo, en el mismo
  // recuadro, está el "Total factura": dos números distintos con el mismo
  // nombre y a pocos centímetros se leían como si tuvieran que coincidir.
  datos.push({
    clave: "total",
    rotulo: "Total adicionales",
    valor: formatearMoneda(total),
  });

  return renderRecuadroBloque(color, renderFilaDatos(color, datos));
};

export default function CargosAdicionales({
  equipos,
  deposito,
  transporteTipo,
  transporteMonto,
  // La marca de IVA de la factura: vale para los equipos que no traen la suya
  // propia (las facturas viejas, migradas del Excel).
  aplicaIvaFactura,
  abierto,
  onToggle,
}) {
  const theme = useTheme();
  const color = theme.palette.custom.seccionAdicionales;

  // El IVA de un grupo de equipos: cada uno respeta su propia marca y suma
  // también los días que se le ampliaron. Así el recuadro de la factura
  // muestra solo el IVA de sus equipos y cada lote agregado el suyo, sin
  // contarlo dos veces.
  const ivaDeEquipos = (lista) =>
  lista.reduce((total, equipo) => {
    const llevaIva = equipo.aplicaIva ?? Boolean(aplicaIvaFactura);
    if (!llevaIva) return total;
    const base =
      (Number(equipo.cantidad) || 0) *
        (Number(equipo.dias) || 0) *
        (Number(equipo.valor) || 0) +
      calcularAmpliacionEquipo(equipo).neto;
    return total + base * 0.19;
  }, 0);

  // El IVA de UN equipo: la misma cuenta que ivaDeEquipos, para una sola
  // línea. Sirve para abrir el total y ver de dónde sale.
  const ivaDeUnEquipo = (equipo) => ivaDeEquipos([equipo]);

  const recuadro = renderAdicionales({
    iva: ivaDeEquipos(equipos),
    color,
    deposito,
    transporteTipo,
    transporteMonto,
  });
  if (!recuadro) return null;

  // Solo hay algo que desglosar si más de un equipo aporta IVA. Con uno solo,
  // el detalle repetiría el total que ya está arriba, y una flecha que no abre
  // nada es peor que no tenerla.
  const aportantes = equipos.filter((equipo) => ivaDeUnEquipo(equipo) > 0);
  const hayDesglose = aportantes.length > 1;

  return (
    <Box sx={{ mt: 1 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Typography
          variant="overline"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            lineHeight: 1.6,
            color,
          }}
        >
          <AddCardIcon fontSize="small" />
          Cargos adicionales
        </Typography>
        {hayDesglose && (
          <Tooltip
            title={abierto ? "Ocultar el detalle" : "Ver de dónde sale el IVA"}
          >
            <IconButton
              size="small"
              onClick={onToggle}
              sx={{ color }}
            >
              {abierto ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <Box sx={{ mt: 0.5 }}>{recuadro}</Box>

      {hayDesglose && abierto && (
        <Stack
          sx={{
            mt: 0.75,
            pl: 1.5,
            // Una línea al costado en vez de otro recuadro: el
            // detalle pertenece al recuadro de arriba, no es un
            // bloque nuevo que compita con él.
            borderLeft: "2px solid",
            borderColor: alpha(color, 0.5),
            rowGap: 0.25,
          }}
        >
          <Typography variant="rotuloDato" sx={{ color: color }}>
            IVA POR EQUIPO
          </Typography>
          {aportantes.map((equipo, indice) => (
            <Stack
              key={`iva-${equipo.nombre}-${indice}`}
              direction="row"
              justifyContent="space-between"
              sx={{ gap: 2 }}
            >
              <Typography variant="body2" sx={{ minWidth: 0 }}>
                {equipo.cantidad} {equipo.nombre}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                {formatearMoneda(ivaDeUnEquipo(equipo))}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

CargosAdicionales.propTypes = {
  equipos: PropTypes.array.isRequired,
  deposito: PropTypes.number,
  transporteTipo: PropTypes.string,
  transporteMonto: PropTypes.number,
  aplicaIvaFactura: PropTypes.bool,
  abierto: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};
