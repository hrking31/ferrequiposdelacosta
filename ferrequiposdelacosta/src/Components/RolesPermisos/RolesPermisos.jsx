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

export const departamentosYMunicipios = {
  Atlántico: [
    "Barranquilla",
    "Soledad",
    "Malambo",
    "Puerto Colombia",
    "Sabanalarga",
    "Galapa",
    "Baranoa",
    "Palmar de Varela",
    "Sabanagrande",
    "Repelón",
  ],
  Bolívar: [
    "Cartagena",
    "Turbaco",
    "Arjona",
    "Magangué",
    "El Carmen de Bolívar",
    "San Juan Nepomuceno",
    "María la Baja",
    "San Jacinto",
    "Villanueva",
    "Santa Rosa",
  ],
  Magdalena: [
    "Santa Marta",
    "Ciénaga",
    "Fundación",
    "El Banco",
    "Plato",
    "Aracataca",
    "Pivijay",
    "Zona Bananera",
    "Tenerife",
    "Salamina",
  ],
};
