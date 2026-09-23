// EL RECUADRO DEL DEPÓSITO: la cuenta de la garantía, aparte de la factura.
//
// Con la 8154: Total $500.000 · Recibido $500.000 · Retenido $0 · Devolver
// $500.000. Si el cliente pide usarlo para pagar, aparece además "Aplicado a
// la factura". Cada número sale de calcularDeposito, la misma cuenta
// que usa el estado de cuenta, así que los dos lugares dicen siempre lo mismo.
//
// Con más de un despacho con depósito se anota de cuál salió cada parte: el
// depósito es de cada despacho, y la suma sola no dice cuánto dejó en cada uno.
import PropTypes from "prop-types";
import { Stack, Typography, useTheme } from "@mui/material";
import { adicionalesDe, gruposDe } from "./facturaUtils";
import TollIcon from "@mui/icons-material/Toll";
import ErrorIcon from "@mui/icons-material/Error";
import HandymanIcon from "@mui/icons-material/Handyman";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import IconoDeposito from "./IconoDeposito";
import { renderFilaDatos, renderRecuadroBloque } from "./recuadrosCuenta";
import { formatearMoneda, formatearFechaLegible } from "../../Utils/formato";

// `plano` lo deja sin marco: en el celular el bloque ya va dentro del
// recuadro de su rótulo, y un marco dentro de otro no separa nada.
export default function RecuadroDeposito({ factura, cuenta, plano = false }) {
  const theme = useTheme();
  const color = theme.palette.custom.seccionDeposito;
  const deposito = cuenta.deposito;

  const dato = (clave, Icono, colorIcono, rotulo, valor) => ({
    clave,
    Icono,
    colorIcono,
    rotulo,
    valor: formatearMoneda(valor),
  });

  // Las cuatro de siempre, en el orden en que se lee la garantía: cuánto se
  // pactó, cuánto dejó, cuánto se retuvo y cuánto queda para devolverle. Con
  // la 8932: Total $240.000 · Recibido $190.000 —un despacho salió sin su
  // depósito completo— · Retenido $50.000 · Devolver lo que quede.
  //
  // Las otras tres solo aparecen cuando pasaron, antes de "Devolver" porque
  // son lo que la baja: lo que falta dejar, lo que el cliente pidió usar para
  // pagar y lo que ya se le entregó.
  const datos = [
    dato("total", IconoDeposito, color, "Total", deposito.pactado),
    dato("recibido", TollIcon, theme.palette.success.main, "Recibido", deposito.recibido),
  ];
  if (deposito.porCobrar > 0) {
    datos.push(
      dato("porCobrar", ErrorIcon, theme.palette.error.main, "Por cobrar", deposito.porCobrar),
    );
  }
  datos.push(
    dato("retenido", HandymanIcon, theme.palette.warning.main, "Retenido", deposito.retenido),
  );
  if (deposito.aplicado > 0) {
    datos.push(
      dato(
        "aplicado",
        ReceiptLongIcon,
        theme.palette.custom.accent,
        "Aplicado a la factura",
        deposito.aplicado,
      ),
    );
  }
  if (deposito.devuelto > 0) {
    datos.push(
      dato("devuelto", CheckCircleIcon, theme.palette.success.main, "Devuelto", deposito.devuelto),
    );
  }
  // Lo que queda en la mano de la empresa: con equipos afuera todavía es
  // garantía, pero es lo que se le va a devolver.
  datos.push(
    dato(
      "devolver",
      CurrencyExchangeIcon,
      theme.palette.custom.accent,
      "Devolver",
      deposito.guardado,
    ),
  );

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
    </>
  );

  return plano ? contenido : renderRecuadroBloque(color, contenido);
}

RecuadroDeposito.propTypes = {
  factura: PropTypes.object.isRequired,
  cuenta: PropTypes.object.isRequired,
  plano: PropTypes.bool,
};
