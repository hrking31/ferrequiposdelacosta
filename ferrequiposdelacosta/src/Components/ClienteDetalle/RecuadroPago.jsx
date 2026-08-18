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

export default function RecuadroPago({ pagos, tipoPago, fecha, color }) {
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
    // "Pago inicial" y no "Pago" a secas: acá va lo que el cliente entregó
    // al emitirse la factura, y el tipo dice cómo cubría ESE momento. Con el
    // rótulo viejo, un "Pago: Total" de $864.000 sobre una factura que hoy
    // vale $3.006.000 se leía como que estaba saldada.
    datos.push({ clave: "pago", rotulo: "Pago inicial", valor: tipoPagoLabel });
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
        return (
          <Box key={`abono-${indice}`}>
            {renderFilaDatos(color, datos)}
            {/* Cuando el abono no lo hizo el cliente directamente sobre
                esta factura, sino que llegó como sobrante de otra (ver
                AgregarEquipoDialog), queda esta nota para no confundirlo. */}
            {abono.nota && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}
              >
                {abono.nota}
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
