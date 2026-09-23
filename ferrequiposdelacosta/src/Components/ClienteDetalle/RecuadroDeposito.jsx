// EL RECUADRO DEL DEPÓSITO: la cuenta de la garantía, aparte de la factura.
//
// Con la 8154: Total $500.000 · Recibido $500.000 · Retenido $0 · Devolver
// $500.000. Si el cliente pide usarlo para pagar, aparece además "Aplicado a
// la factura". Cada número sale de calcularDeposito, la misma cuenta
// que usa el estado de cuenta, así que los dos lugares dicen siempre lo mismo.
//
// Con más de un despacho con depósito se anota cuánto dejó cada uno, con el
// nombre de sus equipos: la suma sola no dice cuánto dejó en cada uno.
import PropTypes from "prop-types";
import { Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { adicionalesDe, gruposDe } from "./facturaUtils";
import TollIcon from "@mui/icons-material/Toll";
import ErrorIcon from "@mui/icons-material/Error";
import HandymanIcon from "@mui/icons-material/Handyman";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import IconoDeposito from "./IconoDeposito";
import {
  casillaQueAbre,
  renderConDetalle,
  renderFilaDatos,
  renderFlechaDetalle,
  renderRecuadroBloque,
} from "./recuadrosCuenta";
import { formatearMoneda } from "../../Utils/formato";

// `plano` lo deja sin marco: en el celular el bloque ya va dentro del
// recuadro de su rótulo, y un marco dentro de otro no separa nada.
//
// Con más de un despacho con depósito, la flecha abre de cuál salió cada
// parte, igual que el IVA abre el de cada equipo. Con uno solo no hay nada
// que abrir y no aparece.
export default function RecuadroDeposito({
  factura,
  cuenta,
  plano = false,
  abierto = false,
  onToggle,
}) {
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
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

  // Cada despacho se nombra por sus equipos, con la cantidad: "1 SALTARIN",
  // "5 ANDAMIOS, 5 GATOS". Una devolución parcial parte un equipo en dos
  // líneas con el mismo nombre; se juntan para no decir "3 ANDAMIOS, 2
  // ANDAMIOS".
  const nombreDelDespacho = (grupo) => {
    const cantidades = new Map();
    (grupo?.equipos ?? []).forEach((equipo) => {
      const nombre = equipo?.nombre || "Equipo";
      cantidades.set(nombre, (cantidades.get(nombre) || 0) + (Number(equipo?.cantidadEquipos) || 0));
    });
    return [...cantidades].map(([nombre, cantidad]) => `${cantidad} ${nombre}`).join(", ");
  };

  const despachos = gruposDe(factura)
    .map((grupo) => ({
      nombre: nombreDelDespacho(grupo),
      monto: Number(adicionalesDe(grupo).valorDeposito) || 0,
    }))
    .filter(({ monto }) => monto > 0);

  const hayDetalle = despachos.length > 1;
  const titulo = "Ver el depósito de cada despacho";
  // En el celular la abre la casilla del total, como la del IVA.
  if (hayDetalle && esMovil) {
    Object.assign(datos[0], casillaQueAbre({ abierto, alternar: onToggle, titulo }));
  }

  const detalle = (
    <Stack spacing={0.25}>
      {despachos.map(({ nombre, monto }, indice) => (
        <Typography
          key={`${nombre}-${indice}`}
          variant="body2"
          color="text.secondary"
        >
          {nombre}: {formatearMoneda(monto)}
        </Typography>
      ))}
    </Stack>
  );

  const contenido = renderConDetalle(
    renderFilaDatos(color, datos),
    hayDetalle && abierto ? detalle : null,
    hayDetalle
      ? renderFlechaDetalle({
          abierto,
          alternar: onToggle,
          color: esMovil ? theme.palette.custom.accent : color,
          esMovil,
          titulo,
        })
      : null,
  );

  return plano ? contenido : renderRecuadroBloque(color, contenido);
}

RecuadroDeposito.propTypes = {
  factura: PropTypes.object.isRequired,
  cuenta: PropTypes.object.isRequired,
  plano: PropTypes.bool,
  abierto: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};
