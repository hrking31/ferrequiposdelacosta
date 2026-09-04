// La plata que entró, en dos recuadros hermanos:
//
// - RecuadroPago: lo que el cliente entregó por un lote de equipos —el
//   original de la factura, o cada equipo agregado después—: tipo de pago,
//   medio(s), fecha y valor de ESE lote puntual, no de toda la factura.
// - ListaAbonos: lo que fue abonando después de emitida la factura.
//
// Van juntos porque son lo mismo visto en dos momentos: plata que entró, con
// su fecha y su medio, dentro del mismo recuadro de color.
import PropTypes from "prop-types";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { Fragment } from "react";
import {
  renderFilaDatos,
  renderMedioPago,
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
}) {
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
    datos.push({ clave: "pago", rotulo: rotuloTipoPago, valor: tipoPagoLabel });
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
  if (pagos.length > 0) {
    datos.push({
      clave: "valor",
      rotulo: "Valor",
      valor: pagos
        .map((pago) => formatearMoneda(Number(pago.monto)))
        .filter(Boolean)
        .join(" + "),
    });
  }
  // Con el pago repartido en varios medios, el renglon de arriba queda como
  // una suma sin resolver: aca va el resultado.
  if (pagos.length > 1) {
    datos.push({
      clave: "total",
      rotulo: "Total",
      valor: formatearMoneda(totalPagos),
    });
  }

  return renderRecuadroBloque(color, renderFilaDatos(color, datos));
}

RecuadroPago.propTypes = {
  pagos: PropTypes.array.isRequired,
  tipoPago: PropTypes.string,
  fecha: PropTypes.string,
  color: PropTypes.string.isRequired,
  rotuloTipoPago: PropTypes.string,
};

// DE DÓNDE SALIÓ ESTA PLATA. Todo abono entra por el mismo nodo, venga de
// donde venga, y `tipo` dice cuál fue su origen:
//
//   sistema   el botón Abono, repartido por la app entre las facturas con saldo
//   cliente   el botón Abono, y el cliente pidió que fuera a esta factura
//   agregado  sobró de lo que se pagó al agregar equipos
//
// Y `desdeFactura` distingue el sobrante que nació acá del que cruzó desde
// otra factura. Solo se escribe una línea cuando hay algo que explicar: un
// abono que el cliente hizo sobre esta factura no necesita aclaración.
const origenDelAbono = (abono) => {
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
export function ListaAbonos({ abonos, color }) {
  if (!abonos || abonos.length === 0) return null;

  const renglones = (
    <Stack spacing={1} divider={<Divider />}>
      {abonos.map((abono, indice) => {
        const datos = [
          {
            clave: "fecha",
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
                sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}
              >
                {origen}
              </Typography>
            )}
          </Box>
        );
      })}
    </Stack>
  );

  return renderRecuadroBloque(color, renglones);
}

ListaAbonos.propTypes = {
  abonos: PropTypes.array,
  color: PropTypes.string.isRequired,
};
