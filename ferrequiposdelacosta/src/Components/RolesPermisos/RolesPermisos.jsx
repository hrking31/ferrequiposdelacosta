const RolesPermisos = {
  gestorEditor: ["eliminarEditarEquipos", "crearEquipos"],
  gestorFacturacion: ["cuentaCombro", "cotizacion"],
  gestorIntegral: [
    "eliminarEditarEquipos",
    "crearEquipos",
    "cuentaCombro",
    "cotizacion",
  ],
  administrador: [
    "eliminarEditarEquipos",
    "crearEquipos",
    "eliminarUsuarios",
    "crearUsuarios",
    "cuentaCombro",
    "cotizacion",
  ],
};
export default RolesPermisos;
