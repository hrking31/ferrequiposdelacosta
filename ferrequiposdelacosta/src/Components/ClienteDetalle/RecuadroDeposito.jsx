// EL RECUADRO DEL DEPÓSITO: la cuenta de la garantía, aparte de la factura.
//
// Con la 8154: Recibido $500.000 · Por devolver $500.000. Si el cliente pide
// usarlo para pagar, aparece "Aplicado a la factura"; si un equipo vuelve mal,
// "Retenido por daños". Cada número sale de calcularDeposito, la misma cuenta
// que usa el estado de cuenta, así que los dos lugares dicen siempre lo mismo.
//
// Con más de un despacho con depósito se anota de cuál salió cada parte: el
// depósito es de cada despacho, y la suma sola no dice cuánto dejó en cada uno.
import PropTypes from "prop-types";
import { Stack, Typography, useTheme } from "@mui/material";
import { adicionalesDe, datosFactura, gruposDe } from "./facturaUtils";
import { renderFilaDatos, renderRecuadroBloque } from "./recuadrosCuenta";
import { formatearMoneda, formatearFechaLegible } from "../../Utils/formato";

// `plano` lo deja sin marco: en el celular el bloque ya va dentro del
// recuadro de su rótulo, y un marco dentro de otro no separa nada.
export default function RecuadroDeposito({ factura, cuenta, plano = false }) {
  const theme = useTheme();
  const color = theme.palette.custom.seccionDeposito;
  const deposito = cuenta.deposito;
  const resuelto = Boolean(datosFactura(factura).depositoResuelto);

  const dato = (clave, rotulo, valor) => ({
    clave,
    rotulo,
    valor: formatearMoneda(valor),
  });

  const datos = [dato("recibido", "Recibido", deposito.recibido)];
  if (deposito.porCobrar > 0) datos.push(dato("porCobrar", "Por cobrar", deposito.porCobrar));
  if (deposito.retenido > 0) {
    datos.push(dato("retenido", "Retenido por daños", deposito.retenido));
  }
  if (deposito.aplicado > 0) {
    datos.push(dato("aplicado", "Aplicado a la factura", deposito.aplicado));
  }
  if (deposito.devuelto > 0) datos.push(dato("devuelto", "Devuelto", deposito.devuelto));
  // Lo que queda en la mano de la empresa, dicho según el momento: con
  // equipos afuera es la garantía; resuelta la devolución, es plata del
  // cliente esperando que se la entreguen.
  if (deposito.guardado > 0) {
    datos.push(
      dato(
        "guardado",
        resuelto ? "Por devolver" : "En garantía",
        deposito.guardado,
      ),
    );
  }

  const despachos = gruposDe(factura)
    .map((grupo) => ({
      fecha: grupo?.fechaSolicitud,
      monto: Number(adicionalesDe(grupo).valorDeposito) || 0,
    }))
    .filter(({ monto }) => monto > 0);

  const contenido = (
    <>
      {renderFilaDatos(color, datos)}
      {despachos.length > 1 && (
        <Stack sx={{ mt: 1 }} spacing={0.25}>
          {despachos.map(({ fecha, monto }, indice) => (
            <Typography
              key={`${fecha}-${indice}`}
              variant="caption"
              color="text.secondary"
            >
              Despacho del {formatearFechaLegible(fecha) || "s/f"}:{" "}
              {formatearMoneda(monto)}
            </Typography>
          ))}
        </Stack>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 0.75, fontStyle: "italic" }}
      >
        No es parte de la factura: es plata del cliente que la empresa guarda
        mientras tiene los equipos.
      </Typography>
    </>
  );

  return plano ? contenido : renderRecuadroBloque(color, contenido);
}

RecuadroDeposito.propTypes = {
  factura: PropTypes.object.isRequired,
  cuenta: PropTypes.object.isRequired,
  plano: PropTypes.bool,
};
