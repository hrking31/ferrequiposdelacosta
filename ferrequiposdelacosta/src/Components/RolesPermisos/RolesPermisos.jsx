const RolesPermisos = {
  gestorEditor: ["eliminarEditarEquipos", "crearEquipos"],
  gestorFacturacion: [
    "cuentaCombro",
    "cotizacion",
    "solicitudesCotizaciones",
    "clientes",
    "gestionCartera",
  ],
  gestorIntegral: [
    "eliminarEditarEquipos",
    "crearEquipos",
    "cuentaCombro",
    "cotizacion",
    "solicitudesCotizaciones",
    "clientes",
    "gestionCartera",
  ],
  administrador: [
    "eliminarEditarEquipos",
    "crearEquipos",
    "eliminarUsuarios",
    "crearUsuarios",
    "cuentaCombro",
    "cotizacion",
    "solicitudesCotizaciones",
    "clientes",
    "gestionCartera",
  ],
};
export default RolesPermisos;
