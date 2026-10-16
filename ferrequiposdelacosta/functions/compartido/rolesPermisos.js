// ⚠️  ARCHIVO GENERADO — NO EDITAR A MANO.
//
// Es una copia de src/Components/RolesPermisos/RolesPermisos.jsx, hecha por
// scripts/sincronizar-calculos.js en cada despliegue. Cualquier cambio que se
// escriba acá se pierde en el próximo deploy.
//
// Para cambiar algo, tocá el original. Es el mismo archivo que usa la app, así
// que la corrección vale para las dos partes a la vez.

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
