import RolesPermisos from "../RolesPermisos/RolesPermisos";
import { faltanEnLaClave } from "../../Utils/requisitosClave";
import {
  ROLES,
  estadoConexion,
  filtrarUsuarios,
  generarClave,
  iniciales,
  nombreDelRol,
  permisosDelRol,
} from "./usuarios";

// Lo que comparten las piezas de la pantalla de Usuarios (2026-10-28).

describe("los roles", () => {
  it("los cuatro de la pantalla son exactamente los del mapa de permisos", () => {
    expect(ROLES.map((r) => r.clave).sort()).toEqual(Object.keys(RolesPermisos).sort());
  });

  it("dan su nombre y sus permisos; uno desconocido no da ninguno", () => {
    expect(nombreDelRol("gestorIntegral")).toBe("Gestor Integral");
    expect(permisosDelRol("gestorEditor")).toEqual(RolesPermisos.gestorEditor);
    expect(nombreDelRol("inventado")).toBe("Sin rol");
    expect(permisosDelRol("inventado")).toEqual([]);
  });
});

describe("iniciales", () => {
  it("la primera letra del nombre y del apellido", () => {
    expect(iniciales("Laura Martínez")).toBe("LM");
    expect(iniciales("  aida  ")).toBe("A");
  });

  it("sin nombre, la del correo; sin nada, un signo de pregunta", () => {
    expect(iniciales("", "pedro@ejemplo.com")).toBe("P");
    expect(iniciales("", "")).toBe("?");
  });
});

describe("estadoConexion", () => {
  const ahora = new Date("2026-10-28T15:00:00Z").getTime();
  const hace = (minutos) => ({ online: false, timestamp: ahora - minutos * 60000 });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(ahora);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("en línea", () => {
    expect(estadoConexion({ online: true })).toEqual({
      enLinea: true,
      corto: "En línea",
      largo: "En línea ahora",
    });
  });

  it("desconectado, con cuánto hace, en minutos, horas, ayer o días", () => {
    expect(estadoConexion(hace(10)).corto).toBe("hace 10 min");
    expect(estadoConexion(hace(3 * 60)).corto).toBe("hace 3 h");
    expect(estadoConexion(hace(30 * 60)).corto).toBe("ayer");
    expect(estadoConexion(hace(3 * 24 * 60)).corto).toBe("hace 3 días");
  });

  it("dice desconectada o desconectado según el género", () => {
    expect(estadoConexion(hace(60), "femenino").largo).toBe("Desconectada · hace 1 h");
    expect(estadoConexion(hace(60), "masculino").largo).toBe("Desconectado · hace 1 h");
  });

  it("sin presencia guardada no inventa una hora", () => {
    expect(estadoConexion(undefined)).toEqual({ enLinea: false, corto: "", largo: "Sin conexión reciente" });
  });
});

describe("filtrarUsuarios", () => {
  const personal = [
    { id: "1", name: "Laura Martínez", email: "laura@ejemplo.com", role: "gestorFacturacion" },
    { id: "2", name: "Carlos Ríos", email: "carlos@ejemplo.com", role: "gestorEditor" },
    { id: "3", name: "Aida Pérez", email: "aida@ejemplo.com", role: "administrador" },
  ];
  const nombres = (lista) => lista.map((u) => u.name);

  it("sin búsqueda, todos por orden alfabético", () => {
    expect(nombres(filtrarUsuarios(personal, ""))).toEqual(["Aida Pérez", "Carlos Ríos", "Laura Martínez"]);
  });

  it("encuentra sin tildes ni mayúsculas, por nombre, correo o rol", () => {
    expect(nombres(filtrarUsuarios(personal, "martinez"))).toEqual(["Laura Martínez"]);
    expect(nombres(filtrarUsuarios(personal, "CARLOS@"))).toEqual(["Carlos Ríos"]);
    expect(nombres(filtrarUsuarios(personal, "editor"))).toEqual(["Carlos Ríos"]);
  });
});

describe("generarClave", () => {
  it("siempre cumple todos los requisitos de la contraseña", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(faltanEnLaClave(generarClave())).toEqual([]);
    }
  });

  // Firebase no cuenta el guion como signo: una clave con guion y sin otro
  // signo crearía una cuenta que después no podría entrar.
  it("nunca lleva guion", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generarClave()).not.toContain("-");
    }
  });
});
