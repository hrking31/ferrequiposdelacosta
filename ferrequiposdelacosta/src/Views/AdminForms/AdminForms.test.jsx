import { screen, waitFor } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import RolesPermisos from "../../Components/RolesPermisos/RolesPermisos";
import { authContext } from "../../Context/useAuth";
import AdminForms from "./AdminForms";

// El menú del panel. Cada persona ve solo lo que su rol le permite: no es
// seguridad —eso lo hacen las reglas del servidor— pero sí evita que alguien se
// pasee por pantallas que no le tocan y se confunda.
//
// También decide qué recuadros de cifras se piden: quien no puede ver cartera
// no debería estar consultando cuánta plata falta cobrar.
const nube = vi.hoisted(() => ({
  contarCuentas: vi.fn(() => Promise.resolve(0)),
  contarCotizaciones: vi.fn(() => Promise.resolve(0)),
  leerTotales: vi.fn(() => Promise.resolve({ equiposActivos: 0, pagosPendientes: 0 })),
  contarCatalogo: vi.fn(() => Promise.resolve({ data: () => ({ count: 0 }) })),
}));

vi.mock("../../Components/Firebase/Firebase", () => ({ db: {}, auth: {}, storage: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db, nombre) => nombre,
  getCountFromServer: nube.contarCatalogo,
}));
vi.mock("../../Components/CuentaDeCobro/cuentasCobroDb", () => ({
  contarCuentasCobroDelMes: nube.contarCuentas,
}));
vi.mock("../../Components/AdminCotizaciones/cotizacionesDb", () => ({
  contarCotizacionesDelMes: nube.contarCotizaciones,
}));
vi.mock("./totalesPanelDb", () => ({ leerTotalesPanel: nube.leerTotales }));

// El menú usa la sesión (para el botón de salir), así que necesita su contexto.
const comoRol = (role) =>
  renderConProviders(
    <authContext.Provider value={{ logout: vi.fn(), user: { role } }}>
      <AdminForms />
    </authContext.Provider>,
    {
    estadoInicial: {
      user: {
        uid: "u1",
        name: "Aida",
        role,
        permisos: RolesPermisos[role],
        photoURL: "",
        genero: "femenino",
      },
      presence: { usuariosConectados: {} },
      kpis: {},
      },
    },
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminForms — qué ve cada rol", () => {
  it("el administrador ve todo, incluida la gestión de usuarios", () => {
    comoRol("administrador");

    expect(screen.getByText("COTIZACIÓN")).toBeInTheDocument();
    expect(screen.getByText("CLIENTES")).toBeInTheDocument();
    expect(screen.getByText("CREAR USUARIOS")).toBeInTheDocument();
    expect(screen.getByText("CREAR EQUIPO")).toBeInTheDocument();
  });

  it("el gestor de equipos solo ve el catálogo", () => {
    comoRol("gestorEditor");

    expect(screen.getByText("CREAR EQUIPO")).toBeInTheDocument();
    // Nada de plata ni de usuarios.
    expect(screen.queryByText("COTIZACIÓN")).not.toBeInTheDocument();
    expect(screen.queryByText("CLIENTES")).not.toBeInTheDocument();
    expect(screen.queryByText("CREAR USUARIOS")).not.toBeInTheDocument();
  });

  it("el gestor de facturación ve cartera pero no el catálogo ni usuarios", () => {
    comoRol("gestorFacturacion");

    expect(screen.getByText("COTIZACIÓN")).toBeInTheDocument();
    expect(screen.getByText("CLIENTES")).toBeInTheDocument();
    expect(screen.queryByText("CREAR EQUIPO")).not.toBeInTheDocument();
    expect(screen.queryByText("CREAR USUARIOS")).not.toBeInTheDocument();
  });

  it("el gestor integral ve las dos áreas, pero no usuarios", () => {
    comoRol("gestorIntegral");

    expect(screen.getByText("COTIZACIÓN")).toBeInTheDocument();
    expect(screen.getByText("CREAR EQUIPO")).toBeInTheDocument();
    expect(screen.queryByText("CREAR USUARIOS")).not.toBeInTheDocument();
  });
});

describe("AdminForms — las cifras del menú", () => {
  it("a quien no puede ver cuentas de cobro, no se las cuenta", () => {
    comoRol("gestorEditor");

    // Ni siquiera se le pregunta al servidor: son lecturas que no le tocan.
    expect(nube.contarCuentas).not.toHaveBeenCalled();
    expect(nube.contarCotizaciones).not.toHaveBeenCalled();
  });

  it("al de facturación sí se le piden las del mes", async () => {
    comoRol("gestorFacturacion");

    // Las cifras se piden después de dibujar la pantalla, así que hay que
    // esperarlas.
    await waitFor(() => expect(nube.contarCuentas).toHaveBeenCalled());
    expect(nube.contarCotizaciones).toHaveBeenCalled();
  });
});
