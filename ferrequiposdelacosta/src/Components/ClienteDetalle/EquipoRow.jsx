// Tarjeta de un equipo dentro de una factura. Se lee en dos columnas: a la
// izquierda quién es el equipo y qué le pasó —cantidad, nombre y los chips de
// fechas—, a la derecha la plata. La misma tarjeta sirve para un equipo
// original o uno agregado después; el color lo pone quien la usa, según el
// lote al que pertenezca el equipo.
//
// La excepción es un equipo YA DEVUELTO: ese se pinta en verde, el mismo que
// usan los chips de lo que va a favor del cliente. El color dice el estado sin
// que haya que leer, que es lo que se pedía: en un lote donde una parte volvió
// y otra sigue afuera, las dos tarjetas se veían iguales.
import { useState } from "react";
import PropTypes from "prop-types";
import { alpha } from "@mui/material/styles";
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import EventIcon from "@mui/icons-material/Event";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HistorialEquipo from "./HistorialEquipo";
import { iconBtnSx } from "./recuadrosCuenta";
import {
  calcularEquipo,
  calcularEstadoEquipo,
  estaDevuelto,
  ESTADO_EQUIPO_INFO,
  ROTULO_ESTADO_MAS_LARGO,
} from "./facturaUtils";
// Con alias para que se lean como lo que son acá: la moneda que deja el hueco
// vacío si no hay número, y la fecha DD/MM/AAAA.
import {
  formatearMonedaOVacio as formatearMoneda,
  formatearFechaLegible as formatearFecha,
} from "../../Utils/formato";

// ── Calibrado del bloque de cifras ──────────────────────────────────────
//
// Los tres márgenes que ubican la columna de la plata, sueltos acá arriba y
// no repartidos por el JSX: son los que se ajustan mirando la pantalla, y
// buscarlos entre los estilos era la mitad del trabajo. Estos valores se
// aprobaron a ojo sobre la factura 1234.
//
// La unidad es la del tema: 1 = 8 píxeles.
const CALIBRE = {
  // Lo de AFUERA: cuánto se separa el bloque de la columna del nombre.
  separacionColumnas: 1,
  // Cuánto baja el bloque respecto del nombre. En 0 arrancan parejos.
  margenSuperior: 0,
  // Lo de ADENTRO: el aire entre una cifra y la siguiente.
  espacioEntreCifras: 0.25,
};

// Lo que vale el equipo, debajo de su estado.
const Cifra = ({ monto }) => (
  <Typography
    variant="body2"
    fontWeight="bold"
    sx={{ lineHeight: 1.2, whiteSpace: "nowrap" }}
  >
    {formatearMoneda(monto)}
  </Typography>
);

Cifra.propTypes = {
  monto: PropTypes.number.isRequired,
};

// Una condición del alquiler: su ícono y el dato. Los tres se dibujan igual,
// así que se arman acá en vez de repetir el mismo Stack tres veces.
const Condicion = ({ Icono, texto }) => (
  <Stack direction="row" alignItems="center" sx={{ gap: 0.25 }}>
    <Icono sx={{ fontSize: "0.9rem" }} />
    <Typography variant="caption">{texto}</Typography>
  </Stack>
);

Condicion.propTypes = {
  Icono: PropTypes.elementType.isRequired,
  texto: PropTypes.string.isRequired,
};

const Separador = () => (
  <Typography variant="caption" sx={{ color: "divider", px: 0.25 }}>
    |
  </Typography>
);

export default function EquipoRow({ equipo, color, fechaPedido }) {
  const theme = useTheme();
  // La historia arranca plegada: de un equipo se quiere ver primero la lista
  // completa de la factura, y recién después lo que le pasó a uno.
  const [abierto, setAbierto] = useState(false);

  // La cuenta de la línea: sus días por el valor del día, con los descuentos
  // ya restados. De acá sale el único número de la tarjeta y los días que se
  // muestran como condición.
  const cuentaEquipo = calcularEquipo(equipo);
  const devuelto = estaDevuelto(equipo);
  // Cuál de los cinco, y con qué color. El color sale del tema —no se arma
  // acá— para que un equipo vencido se vea del mismo rojo que una factura
  // vencida en Clientes.
  const estadoEquipo = calcularEstadoEquipo(equipo);
  const colorEstado =
    theme.palette.custom.estadoEquipo[estadoEquipo] ??
    theme.palette.custom.estadoNeutro;

  // El molde del rótulo del estado. Se dibuja dos veces —el de verdad y el
  // fantasma que le da el ancho— así que vive acá y no repetido en el JSX.
  const rotuloSx = {
    display: "block",
    px: 0.75,
    py: 0.15,
    borderRadius: 0.5,
    whiteSpace: "nowrap",
    textAlign: "center",
    fontSize: "0.7rem",
    fontWeight: 700,
    border: "1px solid",
    borderColor: colorEstado,
    bgcolor: alpha(colorEstado, 0.12),
    color: colorEstado,
    // Todos los rótulos miden lo mismo, acá y en el historial: el más largo
    // de todos, escrito en un pseudo-elemento sin alto. Es CSS y no texto del
    // documento, así que no se lee ni aparece dos veces en una búsqueda.
    "&::after": {
      content: `"${ROTULO_ESTADO_MAS_LARGO}"`,
      display: "block",
      height: 0,
      overflow: "hidden",
      visibility: "hidden",
    },
  };
  // El color del RELLENO —el resplandor de adentro y el degradado—. Un equipo
  // ya devuelto se pinta de gris por dentro: el color dice el estado sin que
  // haya que leer. Gris y no verde a propósito — en esta pantalla el verde
  // significa PAGO, y una línea cerrada no es plata. El borde no lo toca: eso
  // sigue diciendo de qué lote es.
  const colorEquipo = devuelto
    ? theme.palette.custom.seccionDevuelto
    : color;


  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: "background.paper",
        border: "1px solid",
        // Mismo tratamiento que el recuadro de pago. El BORDE se queda
        // siempre con el color del lote: es lo que ata la tarjeta a su grupo,
        // y si también se volviera verde la devuelta parecería de otro lote.
        // Lo que cambia es el relleno (ver colorEquipo, abajo).
        borderColor: color,
        boxShadow: `inset 0 0 12px ${alpha(colorEquipo, 0.2)}`,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: `linear-gradient(135deg, ${alpha(colorEquipo, 0.12)}, ${alpha(colorEquipo, 0.03)})`,
          pointerEvents: "none",
        },
      }}
    >
      {/* LAS DOS COLUMNAS. Antes las cifras vivían dentro de la fila del
          nombre y los chips iban debajo, a lo ancho de toda la tarjeta: cada
          cifra que se sumaba estiraba esa fila y la tarjeta crecía hacia
          abajo, mientras al lado de los chips sobraba lugar vacío.

          Ahora el bloque de plata es una columna propia que corre junto al
          nombre Y a los chips. El alto de la tarjeta lo manda la más alta de
          las dos columnas —casi siempre la izquierda—, así que la segunda y la
          tercera cifra caen en un espacio que ya estaba ahí. */}
      <Stack
        direction="row"
        alignItems="flex-start"
        gap={CALIBRE.separacionColumnas}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Chip
              variant="meta"
              label={equipo.cantidadEquipos}
              size="small"
              sx={{
                fontWeight: "bold",
                flexShrink: 0,
                height: 34,
                fontSize: "0.9rem",
                // Antes era amarillo fijo, que en modo claro quedaba casi
                // invisible sobre el chip. Es letra chica, así que va el
                // acento en su versión oscura.
                //
                // El acento TAMBIÉN en el equipo devuelto: en el gris de esa
                // tarjeta el número se perdía, y cuántas unidades volvieron es
                // justamente el dato que se va a buscar. Lo que se apaga es el
                // fondo, no la cifra.
                color: theme.palette.custom.accent,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="span" variant="body2" fontWeight="bold">
                {equipo.nombre}
              </Typography>
              {/* CUÁNDO SE PIDIÓ, que no es lo mismo que cuándo salió
                  despachado. La traen todos los equipos, no solo los que se
                  sumaron después: para los del despacho original es la fecha
                  en que se creó la factura, y sin ella había que deducir de la
                  ausencia del dato que el equipo venía de entrada. */}
              {fechaPedido && (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.75, whiteSpace: "nowrap" }}
                >
                  agregado {formatearFecha(fechaPedido)}
                </Typography>
              )}
              {/* La fecha, FUERA del rótulo. Son dos datos distintos —que
                  volvió, y cuándo— y adentro del bloque rosa se leían como uno
                  solo; separada se lee igual que la del pedido, que es su par.
                  Sigue acá arriba y no entre los chips de fechas: ahí obligaba
                  a bajar a buscar cuándo había vuelto. */}
              {devuelto && equipo.devolucion?.fechaDevolucion && (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.75, whiteSpace: "nowrap" }}
                >
                  {formatearFecha(equipo.devolucion.fechaDevolucion)}
                </Typography>
              )}
            {/* LAS CONDICIONES DEL ALQUILER, que son las tres cosas que se
                preguntan de un equipo sin abrir nada: por cuántos días va, a
                cuánto el día y hasta cuándo.

                Acá vivían los chips de fechas, los mismos que usa Seguimiento.
                Contaban el estado de hoy —vencía tal día, +5 días, 2 vencidos—
                encadenados con flechas, pero no CUÁNDO pasó cada cosa, y la
                entrega indefinida desaparecía al renovar el plazo. Esa historia
                se cuenta abajo, hito por hito. */}
            <Stack
              direction="row"
              flexWrap="wrap"
              alignItems="center"
              sx={{ gap: 0.5, color: "text.secondary", mt: 0.25 }}
            >
              <Condicion Icono={ScheduleIcon} texto={`${cuentaEquipo.dias} días`} />
              <Separador />
              <Condicion
                Icono={MonetizationOnIcon}
                texto={`${formatearMoneda(Number(equipo.valorDia) || 0)}/día`}
              />
              <Separador />
              <Condicion
                Icono={EventIcon}
                texto={
                  equipo.vencimientoIndefinido
                    ? "Sin fecha de entrega"
                    : formatearFecha(equipo.fechaVencimiento)
                }
              />
            </Stack>
            </Box>
          </Stack>
        </Box>

        {/* COLUMNA DERECHA: en qué anda el equipo y cuánto cuesta.
            
            El rótulo del estado vivía pegado al nombre. Acá arriba encabeza su
            propia columna: el estado y la plata son las dos cosas que se leen
            de un vistazo, y juntas a la derecha se leen de una sola pasada en
            vez de saltar de una punta a la otra de la fila.

            Reemplazó al rótulo "DEVUELTO", que decía uno solo de los cinco
            casos. Un equipo que no ha vuelto también tiene algo que decir
            —está en fecha, se pasó, le dieron más días, ni salió de bodega— y
            antes eso había que deducirlo leyendo las fechas.

            Contorno del color y no relleno sólido: son hasta diez filas en una
            factura, y diez etiquetas macizas convierten la lista en un
            semáforo ilegible. El fondo tenue del mismo color evita el problema
            que tenía el rótulo viejo —gris sobre gris se perdía— sin gritar. */}
        <Stack
          alignItems="flex-end"
          sx={{
            flexShrink: 0,
            textAlign: "right",
            mt: CALIBRE.margenSuperior,
            gap: CALIBRE.espacioEntreCifras,
          }}
        >
          <Box component="span" sx={{ ...rotuloSx, mb: 0.25 }}>
            {ESTADO_EQUIPO_INFO[estadoEquipo]?.label ?? ""}
          </Box>
          {/* UN solo número: lo que vale el equipo entero, que es la cuenta
              que la app ya hace de cada línea —sus días por el valor del día,
              menos los descuentos—.

              Acá iban tres cifras, una debajo de la otra: lo del despacho, lo
              que se pactó al ampliar y lo que corría por vencimiento. Contaban
              de dónde salía la plata, pero eso ahora lo cuenta la historia
              renglón por renglón, con su fecha y su motivo. Repetirlo en la
              cabecera era decir lo mismo dos veces, y sin fechas. */}
          {cuentaEquipo.neto > 0 && <Cifra monto={cuentaEquipo.neto} />}
        </Stack>

        {/* La flecha, al lado de la plata y a su misma altura: es la misma
            que abre cada factura y el detalle del IVA, así que se busca
            arriba a la derecha del bloque que abre. */}
        <Tooltip title={abierto ? "Ocultar la historia" : "Ver qué pasó con este equipo"}>
          <IconButton
            size="small"
            onClick={() => setAbierto((previo) => !previo)}
            sx={{ ...iconBtnSx, color, flexShrink: 0, alignSelf: "flex-start" }}
          >
            {abierto ? (
              <ExpandLessIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Stack>

      {/* La historia completa, plegada: son hasta nueve renglones por equipo y
          una factura con cinco equipos no se podría recorrer. Va debajo de las
          dos columnas y no dentro de la del nombre, para que su línea cruce la
          tarjeta entera. */}
      {abierto && <HistorialEquipo equipo={equipo} />}
    </Box>
  );
}

EquipoRow.propTypes = {
  equipo: PropTypes.object.isRequired,
  color: PropTypes.string.isRequired,
  // Cuándo se pidió: la fecha del lote que lo trajo. Para los equipos del
  // despacho original es la de la factura; para los agregados después, la del
  // lote. La pone quien dibuja la fila, que es quien sabe de qué lote es.
  fechaPedido: PropTypes.string,
};
