import PropTypes from "prop-types";
import { TextField, Typography } from "@mui/material";
import {
  formatearFechaLegible,
  formatearMoneda,
  formatearMonedaInput,
  limpiarMonedaInput,
} from "../../Utils/formato";

// LOS DESCUENTOS DE UNA AMPLIACIÓN, que se negocian con el cliente: uno sobre
// los días nuevos y otro sobre los vencidos que se cierran hoy. Se llena uno,
// el otro o los dos.
//
// Arriba va a cómo se cobra el día, que es la base para saber cuánto
// descontar, y cada casilla dice cuánto valen sus días: ninguna puede pasar de
// ahí. Lo usan el diálogo de ampliar y el de devolver una parte, que piden lo
// mismo.
//
// `proyeccion` es la de proyectarAmpliacion, hecha con la cantidad que se
// queda afuera. Los diálogos no dejan guardar mientras alguno se pase (ver
// descuentoExcedido).

// "el día vencido", "los 4 días vencidos".
const enLosDias = (cantidad, adjetivo) =>
  cantidad === 1 ? `el día ${adjetivo}` : `los ${cantidad} días ${adjetivo}s`;

const ayudaDe = (valor, descuento, prefijo = "") => {
  if (descuento > valor) return `No puede pasar de ${formatearMoneda(valor)}`;
  return `${prefijo}Valor ${formatearMoneda(valor)}${
    descuento > 0 ? ` · Con descuento ${formatearMoneda(valor - descuento)}` : ""
  }`;
};

export default function DescuentosAmpliacion({
  proyeccion,
  cantidad,
  valorDia,
  descuento,
  descuentoVencidos,
  onCambiarDescuento,
  onCambiarDescuentoVencidos,
}) {
  if (proyeccion.porDia <= 0) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Este equipo no tiene precio del día cargado.
      </Typography>
    );
  }

  const nuevos = Number(descuento) || 0;

  return (
    <>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Valor del día:{" "}
        {cantidad > 1
          ? `${cantidad} × ${formatearMoneda(valorDia)} = ${formatearMoneda(proyeccion.porDia)}`
          : formatearMoneda(proyeccion.porDia)}
      </Typography>

      <TextField
        label={`Descuento en ${enLosDias(proyeccion.diasPedidos, "nuevo")}`}
        // Con puntos de miles mientras se escribe, como los demás campos de
        // plata: "200.000" y no "200000", que a simple vista se confunde con
        // 20.000 o 2.000.000. Va como texto y no como número porque un campo
        // numérico no acepta los puntos; lo que se guarda son solo los dígitos.
        inputProps={{ inputMode: "numeric" }}
        value={formatearMonedaInput(descuento)}
        onChange={(e) => onCambiarDescuento(limpiarMonedaInput(e.target.value))}
        error={nuevos > proyeccion.valorPedidos}
        helperText={ayudaDe(proyeccion.valorPedidos, nuevos)}
        fullWidth
        size="small"
        sx={{ mt: 1 }}
      />

      <DescuentoVencidos
        proyeccion={proyeccion}
        descuento={descuentoVencidos}
        onCambiar={onCambiarDescuentoVencidos}
      />
    </>
  );
}

// LA CASILLA DE LOS VENCIDOS sola. La usan la ampliación (con los días nuevos
// al lado) y la devolución, donde no hay días nuevos: el cliente devuelve, y lo
// único que se negocia es lo que se pasó.
//
// Solo aparece si de verdad se cierran días vencidos hoy: al que le renuevan o
// devuelve el mismo día en que vence no hay nada que perdonarle.
//
// `etiqueta` reemplaza el nombre de la casilla: la devolución la llama
// "Descuento de…", y la de lo que se queda, en la misma pantalla, sigue
// diciendo "Descuento en…".
export function DescuentoVencidos({ proyeccion, descuento, onCambiar, etiqueta = "" }) {
  if (proyeccion.porDia <= 0 || proyeccion.diasVencidos <= 0) return null;

  const monto = Number(descuento) || 0;

  return (
    <TextField
      label={etiqueta || `Descuento en ${enLosDias(proyeccion.diasVencidos, "vencido")}`}
      inputProps={{ inputMode: "numeric" }}
      value={formatearMonedaInput(descuento)}
      onChange={(e) => onCambiar(limpiarMonedaInput(e.target.value))}
      error={monto > proyeccion.valorVencidos}
      helperText={ayudaDe(
        proyeccion.valorVencidos,
        monto,
        `Desde el ${formatearFechaLegible(proyeccion.vencidosDesde)} · `,
      )}
      fullWidth
      size="small"
      sx={{ mt: 1 }}
    />
  );
}

DescuentoVencidos.propTypes = {
  proyeccion: PropTypes.shape({
    porDia: PropTypes.number.isRequired,
    diasVencidos: PropTypes.number.isRequired,
    valorVencidos: PropTypes.number.isRequired,
    vencidosDesde: PropTypes.string,
  }).isRequired,
  descuento: PropTypes.string.isRequired,
  onCambiar: PropTypes.func.isRequired,
  etiqueta: PropTypes.string,
};

DescuentosAmpliacion.propTypes = {
  proyeccion: PropTypes.shape({
    porDia: PropTypes.number.isRequired,
    diasPedidos: PropTypes.number.isRequired,
    valorPedidos: PropTypes.number.isRequired,
    diasVencidos: PropTypes.number.isRequired,
    valorVencidos: PropTypes.number.isRequired,
    vencidosDesde: PropTypes.string,
  }).isRequired,
  cantidad: PropTypes.number.isRequired,
  valorDia: PropTypes.number.isRequired,
  descuento: PropTypes.string.isRequired,
  descuentoVencidos: PropTypes.string.isRequired,
  onCambiarDescuento: PropTypes.func.isRequired,
  onCambiarDescuentoVencidos: PropTypes.func.isRequired,
};
