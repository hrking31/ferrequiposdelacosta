import PropTypes from "prop-types";
import { useTheme } from "@mui/material";
import DetallePorEstado from "./DetallePorEstado";

// EL DETALLE DE "CUENTAS DE COBRO" (2026-10-22): de las emitidas este mes,
// cuántas hay en cada estado. Los colores son los de la lista de cuentas (ver
// ListaCuentasCobro).
//
// Sin plata, a pedido del dueño: los montos dependían de que cada quien
// llenara bien lo pagado y los abonos, y un descuido daba un número errado.
//
// "Pausada" acá es una cuenta que ya se emitió y que alguien volvió a guardar
// sin emitirla de nuevo: los borradores que nunca se emitieron no cuentan.
export default function DetalleCuentasCobro({ cuentasCobroMes }) {
  const { palette } = useTheme();

  const filas = cuentasCobroMes && [
    { clave: "emitidas", label: "Emitida", color: palette.success.main },
    { clave: "pausadas", label: "Pausada", color: palette.grey[500] },
    { clave: "enProceso", label: "En proceso", color: palette.info.main },
    { clave: "pagadas", label: "Pagada", color: palette.primary.main },
  ].map((fila) => ({ ...fila, cantidad: cuentasCobroMes[fila.clave] }));

  return (
    <DetallePorEstado filas={filas} vacio="Todavía no hay cuentas de cobro emitidas este mes." />
  );
}

DetalleCuentasCobro.propTypes = {
  cuentasCobroMes: PropTypes.shape({
    emitidas: PropTypes.number,
    pausadas: PropTypes.number,
    enProceso: PropTypes.number,
    pagadas: PropTypes.number,
  }),
};
