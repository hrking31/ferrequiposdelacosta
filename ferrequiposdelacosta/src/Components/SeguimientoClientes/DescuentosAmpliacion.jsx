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
  return `${prefijo}Valen ${formatearMoneda(valor)}${
    descuento > 0 ? ` · quedan en ${formatearMoneda(valor - descuento)}` : ""
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
  const vencidos = Number(descuentoVencidos) || 0;

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

      {/* Solo si de verdad se cierran días vencidos hoy: al que le renuevan
          el mismo día en que vence no hay nada que perdonarle. */}
      {proyeccion.diasVencidos > 0 && (
        <TextField
          label={`Descuento en ${enLosDias(proyeccion.diasVencidos, "vencido")}`}
          inputProps={{ inputMode: "numeric" }}
          value={formatearMonedaInput(descuentoVencidos)}
          onChange={(e) => onCambiarDescuentoVencidos(limpiarMonedaInput(e.target.value))}
          error={vencidos > proyeccion.valorVencidos}
          helperText={ayudaDe(
            proyeccion.valorVencidos,
            vencidos,
            `Desde el ${formatearFechaLegible(proyeccion.vencidosDesde)} · `,
          )}
          fullWidth
          size="small"
          sx={{ mt: 1 }}
        />
      )}
    </>
  );
}

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
