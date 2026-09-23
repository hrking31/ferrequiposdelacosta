// La plata que entró, en dos recuadros hermanos:
//
// - RecuadroPago: lo que el cliente entregó por un lote de equipos —el
//   original de la factura, o cada equipo agregado después—: tipo de pago,
//   medio(s), fecha y valor de ESE lote puntual, no de toda la factura.
// - ListaAbonos: lo que fue abonando después de emitida la factura.
//
// Van juntos porque son lo mismo visto en dos momentos: plata que entró, con
// su fecha y su medio, dentro del mismo recuadro de color.
// Un ícono por dato: el calendario es cuándo, el recibo qué clase de pago
// fue, los billetes un abono y la moneda el monto. El medio no lleva: ya se
// muestra con el logo de Nequi, Bancolombia o Daviplata.
import EventIcon from "@mui/icons-material/Event";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentsIcon from "@mui/icons-material/Payments";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import PropTypes from "prop-types";
import {
  Box,
  Divider,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Fragment } from "react";
import {
  casillaQueAbre,
  renderConDetalle,
  renderFilaDatos,
  renderFlechaDetalle,
  renderMedioPago,
  renderContenidoPlano,
  renderRecuadroBloque,
} from "./recuadrosCuenta";
// Con alias: la moneda que deja el hueco vacío si no hay número, y la fecha
// DD/MM/AAAA.
import {
  formatearMonedaOVacio as formatearMoneda,
  formatearFechaLegible as formatearFecha,
} from "../../Utils/formato";

const TIPO_PAGO_LABELS = {
  total: "Total",
  parcial: "Parcial",
  // "Pago con abono" es solo la forma de cargarlo: el cliente entregó de más y
  // el sobrante quedó como abono, así que lo facturado se cubrió completo. Acá
  // se lee como lo que es, un pago total.
  conAbono: "Total",
  sinPago: "Sin pago",
};

export default function RecuadroPago({
  pagos,
  tipoPago,
  fecha,
  color,
  // Como se llama el renglon del tipo de pago. Por defecto "Pago inicial",
  // que es el del alta de la factura; cada lote de equipos agregado despues
  // pasa "Tipo de pago", porque ahi ya no hay nada de inicial (ver abajo).
  rotuloTipoPago = "Pago inicial",
  // El depósito de ESTE despacho. El pago lo cubre primero (ver
  // calcularDeposito), así que con depósito el recuadro dice el total que
  // entregó el cliente y, al final, el valor que le quedó a la factura.
  deposito = 0,
  // Sin su propio marco: cuando ya va DENTRO de un recuadro —el celular mete
  // cada bloque en uno—, dibujar otro adentro es un marco dentro de otro. En
  // su lugar, una línea que lo separa del rótulo de arriba.
  plano = false,
}) {
  const theme = useTheme();
  // Cada ícono con su color, sacado del tema: azul el tiempo, verde la plata
  // que entró y el acento lo pactado. Los mismos que usa la historia de un
  // equipo, para que un calendario signifique lo mismo en toda la ficha.
  const colores = {
    tiempo: theme.palette.custom.estadoEquipo.ampliacion,
    plata: theme.palette.success.main,
    total: theme.palette.custom.accent,
  };
  const tipoPagoLabel = TIPO_PAGO_LABELS[tipoPago] || null;
  if (pagos.length === 0 && !tipoPagoLabel) return null;

  const mediosPago = pagos.filter((pago) => pago.medio);
  const totalPagos = pagos.reduce(
    (total, pago) => total + (Number(pago.monto) || 0),
    0,
  );

  // Cada dato es una columna con el rotulo arriba y el valor abajo, igual
  // que el resumen de cuenta del encabezado.
  const datos = [];
  // Cuando se recibio esta plata: la fecha de creacion en la factura, y la
  // de solicitud en cada lote de equipos agregados.
  if (fecha) {
    datos.push({
      clave: "fecha",
      Icono: EventIcon,
      // Azul, el del tiempo: es el mismo con que la historia de un equipo
      // marca sus fechas.
      colorIcono: colores.tiempo,
      rotulo: "Fecha",
      valor: formatearFecha(fecha),
    });
  }
  if (tipoPagoLabel) {
    // "Pago inicial" y no "Pago" a secas: en el alta va lo que el cliente
    // entregó al emitirse la factura, y el tipo dice cómo cubría ESE momento.
    // Con el rótulo viejo, un "Pago: Total" de $864.000 sobre una factura que
    // hoy vale $3.006.000 se leía como que estaba saldada.
    //
    // Inicial hay UNO solo, el de la factura. Un equipo agregado después se
    // paga cuando se agrega, así que ahí el renglón dice "Tipo de pago": lo
    // pone quien usa el recuadro con rotuloTipoPago.
    datos.push({
      clave: "pago",
      Icono: ReceiptLongIcon,
      // El acento, el de lo pactado: qué clase de pago se acordó.
      colorIcono: colores.total,
      rotulo: rotuloTipoPago,
      valor: tipoPagoLabel,
    });
  }
  // El medio va con el logo de la marca en vez del nombre escrito. Cuando el
  // pago se repartio entre varios, siguen separados por "+".
  if (mediosPago.length > 0) {
    datos.push({
      clave: "medio",
      rotulo: "Medio",
      contenido: (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 0.5,
          }}
        >
          {mediosPago.map((pago, indice) => (
            <Fragment key={`${pago.medio}-${indice}`}>
              {indice > 0 && "+"}
              {renderMedioPago(pago.medio)}
            </Fragment>
          ))}
        </Box>
      ),
    });
  }
  // Lo que de este pago fue al depósito: primero lo cubre, hasta su valor.
  const alDeposito = Math.min(Math.max(0, Number(deposito) || 0), totalPagos);
  const conDeposito = alDeposito > 0;

  // SIN DEPÓSITO, como siempre: "Valor" con lo que entregó y, si vino por
  // varios medios, "Total" con la suma.
  //
  // CON DEPÓSITO, lo que entregó el cliente se llama "Total" —es lo que cuadra
  // con el banco— y al final va "Valor": lo que le quedó a la factura después
  // del depósito. Con la 8154: Total $1.514.000 · Valor $1.014.000. Varios
  // medios van primero desglosados, en "Montos".
  const montos = pagos
    .map((pago) => formatearMoneda(Number(pago.monto)))
    .filter(Boolean)
    .join(" + ");
  const datoTotal = {
    clave: "total",
    Icono: ReceiptLongIcon,
    colorIcono: colores.total,
    rotulo: "Total",
    valor: formatearMoneda(totalPagos),
  };

  if (conDeposito) {
    if (pagos.length > 1) {
      datos.push({
        clave: "montos",
        Icono: MonetizationOnIcon,
        colorIcono: colores.plata,
        rotulo: "Montos",
        valor: montos,
      });
    }
    datos.push(datoTotal);
    datos.push({
      clave: "valor",
      Icono: MonetizationOnIcon,
      // Verde, el de la plata que entró a la factura.
      colorIcono: colores.plata,
      rotulo: "Valor",
      valor: formatearMoneda(totalPagos - alDeposito),
    });
  } else {
    if (pagos.length > 0) {
      datos.push({
        clave: "valor",
        Icono: MonetizationOnIcon,
        // Verde, el de la plata que entró.
        colorIcono: colores.plata,
        rotulo: "Valor",
        valor: montos,
      });
    }
    // Con el pago repartido en varios medios, el renglon de arriba queda como
    // una suma sin resolver: aca va el resultado.
    if (pagos.length > 1) datos.push(datoTotal);
  }

  if (plano) return renderContenidoPlano(color, renderFilaDatos(color, datos));

  return renderRecuadroBloque(color, renderFilaDatos(color, datos));
}

RecuadroPago.propTypes = {
  pagos: PropTypes.array.isRequired,
  tipoPago: PropTypes.string,
  fecha: PropTypes.string,
  color: PropTypes.string.isRequired,
  rotuloTipoPago: PropTypes.string,
  deposito: PropTypes.number,
  plano: PropTypes.bool,
};

// DE DÓNDE SALIÓ ESTA PLATA. Todo abono entra por el mismo nodo, venga de
// donde venga, y `tipo` dice cuál fue su origen:
//
//   sistema   el botón Abono, repartido por la app entre las facturas con saldo
//   cliente   el botón Abono, y el cliente pidió que fuera a esta factura
//   agregado  sobró de lo que se pagó al agregar equipos
//   cruce     el saldo a favor de OTRA factura del mismo cliente
//
// Y `desdeFactura` distingue el sobrante que nació acá del que cruzó desde
// otra factura. Solo se escribe una línea cuando hay algo que explicar: un
// abono que el cliente hizo sobre esta factura no necesita aclaración.
const origenDelAbono = (abono) => {
  // El cruce NO es plata que entró por caja: es la que la empresa le debía al
  // cliente en otra factura y se usó acá. Sin esta línea, el abono parecería
  // un pago que nunca hizo.
  if (abono?.tipo === "cruce") {
    return abono.desdeFactura
      ? `Viene del saldo a favor de la factura ${abono.desdeFactura}`
      : "Viene de un saldo a favor del cliente";
  }
  if (abono?.tipo === "agregado") {
    return abono.desdeFactura
      ? `Abono proveniente de los equipos agregados de la factura ${abono.desdeFactura}`
      : "Abono proveniente de los equipos agregados";
  }
  if (abono?.tipo === "sistema") return "Repartido por el sistema entre las facturas con saldo";
  // Una nota escrita a mano, si alguna vez la hubo.
  return abono?.nota || "";
};

// Los abonos que se registraron después de emitida la factura.
//
// Cerrados muestran solo cuántos son y el total abonado —en la 8154, 1 abono
// por $1.142.400—; la flecha abre la lista, cada uno con su fecha y su medio.
// Igual que el recuadro del IVA.
export function ListaAbonos({ abonos, color, plano = false, abierto = false, onToggle }) {
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  // Los mismos colores que el recuadro de pago: un abono es plata que entró.
  const colores = {
    plata: theme.palette.success.main,
  };

  if (!abonos || abonos.length === 0) return null;

  const totalAbonado = abonos.reduce((total, abono) => total + (Number(abono.monto) || 0), 0);
  const titulo = "Ver cada abono";
  const resumen = [
    {
      clave: "cuantos",
      Icono: PaymentsIcon,
      colorIcono: colores.plata,
      rotulo: "Abonos",
      valor: String(abonos.length),
      ...(esMovil ? casillaQueAbre({ abierto, alternar: onToggle, titulo }) : {}),
    },
    {
      clave: "total",
      Icono: MonetizationOnIcon,
      colorIcono: colores.plata,
      rotulo: "Total",
      valor: formatearMoneda(totalAbonado),
    },
  ];

  const renglones = (
    <Stack spacing={1} divider={<Divider />}>
      {abonos.map((abono, indice) => {
        const datos = [
          {
            clave: "fecha",
            Icono: PaymentsIcon,
            colorIcono: colores.plata,
            rotulo: "Abono",
            valor: formatearFecha(abono.fecha),
          },
          {
            clave: "medio",
            rotulo: "Medio",
            contenido: renderMedioPago(abono.medio),
          },
          {
            clave: "valor",
            Icono: MonetizationOnIcon,
            colorIcono: colores.plata,
            rotulo: "Valor",
            valor: formatearMoneda(Number(abono.monto) || 0),
          },
        ];
        const origen = origenDelAbono(abono);
        return (
          <Box key={`abono-${indice}`}>
            {renderFilaDatos(color, datos)}
            {origen && (
              <Typography
                variant="caption"
                color="text.secondary"
                // Pegada al abono que explica: es su pie de foto, no un
                // renglón aparte. Con aire en medio se leía como si hablara
                // del abono siguiente.
                sx={{ display: "block", mt: 0, lineHeight: 1.25, fontStyle: "italic" }}
              >
                {origen}
              </Typography>
            )}
          </Box>
        );
      })}
    </Stack>
  );

  const contenido = renderConDetalle(
    renderFilaDatos(color, resumen),
    abierto ? renglones : null,
    renderFlechaDetalle({
      abierto,
      alternar: onToggle,
      color: esMovil ? theme.palette.custom.accent : color,
      esMovil,
      titulo,
    }),
  );

  if (plano) return renderContenidoPlano(color, contenido);

  return renderRecuadroBloque(color, contenido);
}

ListaAbonos.propTypes = {
  abonos: PropTypes.array,
  color: PropTypes.string.isRequired,
  plano: PropTypes.bool,
  abierto: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};
