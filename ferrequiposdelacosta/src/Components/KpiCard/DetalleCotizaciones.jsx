import PropTypes from "prop-types";
import { useTheme } from "@mui/material";
import DetallePorEstado from "./DetallePorEstado";

// EL DETALLE DE "COTIZACIONES" (2026-10-22): de las que entraron este mes,
// cuántas hay en cada estado, en el orden en que una cotización los recorre.
// Los colores son los del buzón (ver AdminCotizaciones).
//
// Sale de la misma pizarra que el número del recuadro (ver
// Utils/resumenDocumentos), así que verlo no cuesta ninguna lectura.
export default function DetalleCotizaciones({ cotizacionesMes }) {
  const { palette } = useTheme();

  const filas = cotizacionesMes && [
    { clave: "pendientes", label: "Pendiente", color: palette.warning.main },
    { clave: "pausadas", label: "Pausada", color: palette.grey[500] },
    { clave: "enProceso", label: "En proceso", color: palette.info.main },
    { clave: "emitidas", label: "Emitida", color: palette.success.main },
  ].map((fila) => ({ ...fila, cantidad: cotizacionesMes[fila.clave] }));

  return <DetallePorEstado filas={filas} vacio="Todavía no hay cotizaciones este mes." />;
}

DetalleCotizaciones.propTypes = {
  cotizacionesMes: PropTypes.shape({
    pendientes: PropTypes.number,
    pausadas: PropTypes.number,
    enProceso: PropTypes.number,
    emitidas: PropTypes.number,
  }),
};
