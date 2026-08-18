// Lo que se cobra aparte del alquiler de un lote de equipos: el IVA, el
// depósito y el transporte, con su total, y —al desplegar la flecha— el IVA
// discriminado equipo por equipo.
//
// El IVA del recuadro es la suma del de todos los equipos del grupo, y sumado
// no se entiende de dónde salió: una factura que arrancó con $20.000 de IVA y
// a la que después se le sumó un equipo de $30.000 muestra $50.000, sin forma
// de reconstruir el reparto. La flecha vive arriba a la derecha, DENTRO del
// mismo recuadro —igual que el botón de ocultar factura—, y el detalle
// abre debajo, también adentro.
//
// El depósito y el transporte no se desglosan porque no son por equipo: se
// cobran una vez por despacho, no importa cuántos equipos hayan salido en él.
import PropTypes from "prop-types";
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
import { iconBtnSx, renderFilaDatos, renderRecuadroBloque } from "./recuadrosCuenta";
// Con alias: la moneda que deja el hueco vacío si no hay número.
import { formatearMonedaOVacio as formatearMoneda } from "../../Utils/formato";

// Los datos del recuadro de importes. Antes vivía dentro del cuadro de pago,
// mezclado con el medio y el monto; ahora va en su propio recuadro, debajo de
// los equipos. Devuelve la lista de datos en vez del recuadro ya armado,
// para que el componente pueda meterle la flecha y el desglose adentro.
const datosAdicionales = ({
  deposito,
  transporteTipo,
  transporteMonto,
  iva,
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

  return datos;
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

  // Cada equipo respeta su propia marca de IVA (o la de la factura, si no
  // trae la suya). El de un lote es solo el de sus equipos, sin contar el de
  // otro lote agregado después.
  const llevaIvaEquipo = (equipo) => equipo.aplicaIva ?? Boolean(aplicaIvaFactura);

  // El IVA de la renta inicial, sin lo ampliado.
  const ivaInicialDeEquipo = (equipo) => {
    if (!llevaIvaEquipo(equipo)) return 0;
    const inicial =
      (Number(equipo.cantidad) || 0) *
      (Number(equipo.dias) || 0) *
      (Number(equipo.valor) || 0);
    return inicial * 0.19;
  };

  // El IVA de los días que se le ampliaron al equipo, aparte del inicial:
  // el dueño los quiere ver separados, no sumados en una sola cifra.
  const ivaAmpliadoDeEquipo = (equipo) =>
    llevaIvaEquipo(equipo) ? calcularAmpliacionEquipo(equipo).neto * 0.19 : 0;

  // El IVA de UN equipo completo: inicial + ampliado. Sirve para el total
  // del recuadro y para decidir quién aporta al desglose.
  const ivaDeUnEquipo = (equipo) =>
    ivaInicialDeEquipo(equipo) + ivaAmpliadoDeEquipo(equipo);

  const ivaDeEquipos = (lista) =>
    lista.reduce((total, equipo) => total + ivaDeUnEquipo(equipo), 0);

  const datos = datosAdicionales({
    iva: ivaDeEquipos(equipos),
    deposito,
    transporteTipo,
    transporteMonto,
  });
  if (!datos) return null;

  // Hay algo que desglosar si más de un equipo aporta IVA —si fuera uno
  // solo, la línea repetiría el total que ya está arriba— o si ese único
  // equipo tiene ampliación, porque ahí sí hay algo nuevo que mostrar: el
  // IVA partido entre la renta inicial y los días de más. El depósito y el
  // transporte no entran acá: son un cargo único del lote, no de cada
  // equipo (ver la nota de arriba).
  const aportantes = equipos.filter((equipo) => ivaDeUnEquipo(equipo) > 0);
  const hayAmpliacionConIva = aportantes.some(
    (equipo) => ivaAmpliadoDeEquipo(equipo) > 0,
  );
  const hayDesglose = aportantes.length > 1 || hayAmpliacionConIva;

  // La flecha va DENTRO del recuadro, al lado de los datos y a su mismo
  // nivel —no en un renglón propio arriba, que solo dejaba un hueco vacío—,
  // igual que el botón de ocultar factura.
  const contenidoRecuadro = (
    <>
      <Stack
        direction="row"
        alignItems="flex-start"
        sx={{ gap: 1 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {renderFilaDatos(color, datos)}
        </Box>
        {hayDesglose && (
          <Tooltip
            title={abierto ? "Ocultar el detalle" : "Ver de dónde sale el IVA"}
          >
            <IconButton
              size="small"
              onClick={onToggle}
              sx={{ ...iconBtnSx, color, flexShrink: 0 }}
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

      {hayDesglose && abierto && (
        <Stack
          sx={{
            mt: 0.75,
            rowGap: 0.25,
          }}
        >
          <Typography variant="rotuloDato" sx={{ color: color }}>
            IVA POR EQUIPO
          </Typography>
          {aportantes.map((equipo, indice) => {
            const ivaAmpliado = ivaAmpliadoDeEquipo(equipo);
            // Con ampliación, el IVA se ve partido en dos: el de la renta
            // inicial y el de los días de más. Sin ampliación, una sola
            // línea con el total, como siempre.
            const filas = ivaAmpliado > 0
              ? [
                  { etiqueta: `${equipo.cantidad} ${equipo.nombre}`, monto: ivaInicialDeEquipo(equipo) },
                  { etiqueta: `${equipo.cantidad} ${equipo.nombre} · días ampliados`, monto: ivaAmpliado },
                ]
              : [{ etiqueta: `${equipo.cantidad} ${equipo.nombre}`, monto: ivaDeUnEquipo(equipo) }];

            return filas.map((fila, indiceFila) => (
              <Stack
                key={`iva-${equipo.nombre}-${indice}-${indiceFila}`}
                direction="row"
                justifyContent="space-between"
                sx={{ gap: 2 }}
              >
                <Typography variant="body2" sx={{ minWidth: 0 }}>
                  {fila.etiqueta}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                  {formatearMoneda(fila.monto)}
                </Typography>
              </Stack>
            ));
          })}
        </Stack>
      )}
    </>
  );

  return (
    <Box sx={{ mt: 1 }}>
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

      <Box sx={{ mt: 0.5 }}>
        {renderRecuadroBloque(color, contenidoRecuadro)}
      </Box>
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
