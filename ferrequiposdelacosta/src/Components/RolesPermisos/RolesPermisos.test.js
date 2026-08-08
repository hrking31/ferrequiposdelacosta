import RolesPermisos from "./RolesPermisos";

// Este mapa decide qué puede hacer cada rol. Las reglas de seguridad de
// Firestore replican estas mismas relaciones, así que probar sus invariantes
// protege contra cambios accidentales que abrirían o cerrarían permisos de más.
describe("RolesPermisos", () => {
  it("solo el administrador crea y elimina usuarios", () => {
    expect(RolesPermisos.administrador).toContain("crearUsuarios");
    expect(RolesPermisos.administrador).toContain("eliminarUsuarios");
    expect(RolesPermisos.gestorEditor).not.toContain("crearUsuarios");
    expect(RolesPermisos.gestorIntegral).not.toContain("crearUsuarios");
    expect(RolesPermisos.gestorFacturacion).not.toContain("crearUsuarios");
  });

  it("gestorEditor gestiona equipos pero no clientes", () => {
    expect(RolesPermisos.gestorEditor).toContain("crearEquipos");
    expect(RolesPermisos.gestorEditor).not.toContain("clientes");
  });

  it("gestorFacturacion gestiona clientes y cartera pero no equipos", () => {
    expect(RolesPermisos.gestorFacturacion).toContain("clientes");
    expect(RolesPermisos.gestorFacturacion).toContain("gestionCartera");
    expect(RolesPermisos.gestorFacturacion).not.toContain("crearEquipos");
  });

  it("gestorIntegral combina equipos y clientes, sin tocar usuarios", () => {
    expect(RolesPermisos.gestorIntegral).toContain("crearEquipos");
    expect(RolesPermisos.gestorIntegral).toContain("clientes");
    expect(RolesPermisos.gestorIntegral).not.toContain("crearUsuarios");
  });

  it("el administrador tiene todos los permisos de los demás roles", () => {
    const deLosDemas = new Set([
      ...RolesPermisos.gestorEditor,
      ...RolesPermisos.gestorFacturacion,
      ...RolesPermisos.gestorIntegral,
    ]);
    deLosDemas.forEach((permiso) => {
      expect(RolesPermisos.administrador).toContain(permiso);
    });
  });
});
