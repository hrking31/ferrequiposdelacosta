import PropTypes from "prop-types";
import { Typography } from "@mui/material";
import ListaEquipos from "../CatalogoEquipos/ListaEquipos";

// EL DETALLE DE "EQUIPOS" DEL CATÁLOGO (2026-10-22): la lista de equipos de
// la tienda. Desde el 2026-10-28 (pedido del dueño), la misma de Equipos,
// solo para mirar: miniatura de la portada, buscador y, debajo,
// "Lista de equipos" con el contador.
//
// La lista es la misma que la app ya baja para la tienda y para la pantalla de
// Equipos (el catálogo en memoria, ver equiposSlice). Si ya se bajó
// en esta sesión, verla no cuesta nada; si no, el menú la pide al abrir esto y
// queda guardada para esas pantallas.
//
// `equipos` llega en null mientras se está bajando.
export default function DetalleCatalogo({ equipos }) {
  if (!equipos) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        Cargando el catálogo…
      </Typography>
    );
  }

  if (equipos.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        No hay equipos en el catálogo.
      </Typography>
    );
  }

  return <ListaEquipos equipos={equipos} enPanel contadorDebajo />;
}

DetalleCatalogo.propTypes = {
  equipos: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string })),
};
