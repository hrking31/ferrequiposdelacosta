import { screen, waitFor, within } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import RolesPermisos from "../../Components/RolesPermisos/RolesPermisos";
import { authContext } from "../../Context/useAuth";
import { formatearMoneda } from "../../Utils/formato";
import AdminForms from "./AdminForms";

// La plata como la deja toHaveTextContent: el espacio especial del formato
// queda como un espacio común.
const plata = (monto) => formatearMoneda(monto).replace(/\s+/g, " ");

// El menú del panel. Cada persona ve solo lo que su rol le permite: no es
// seguridad —eso lo hacen las reglas del servidor— pero sí evita que alguien se
// pasee por pantallas que no le tocan y se confunda.
//
// También decide qué recuadros de cifras se piden: quien no puede ver cartera
// no debería estar consultando cuánta plata falta cobrar.
const nube = vi.hoisted(() => ({
  leerTotales: vi.fn(() => Promise.resolve({ equiposActivos: 0, pagosPendientes: 0 })),
  contarCatalogo: vi.fn(() => Promise.resolve({ data: () => ({ count: 0 }) })),
  leerCatalogo: vi.fn(() => Promise.resolve({ docs: [] })),
  contarCotizaciones: vi.fn(() => Promise.resolve(0)),
  contarCuentas: vi.fn(() => Promise.resolve(0)),
}));

vi.mock("../../Components/Firebase/Firebase", () => ({ db: {}, auth: {}, storage: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db, nombre) => nombre,
  getCountFromServer: nube.contarCatalogo,
  getDocs: nube.leerCatalogo,
}));
vi.mock("./totalesPanelDb", () => ({ leerTotalesPanel: nube.leerTotales }));
vi.mock("./documentosDelMesDb", () => ({
  contarCotizacionesDelMes: nube.contarCotizaciones,
  contarCuentasCobroDelMes: nube.contarCuentas,
}));

// El menú usa la sesión (para el botón de salir), así que necesita su contexto.
const comoRol = (role, { equipos = [] } = {}) =>
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
        equipos: { equipos, loading: false, error: null },
      },
    },
  );

// La pizarra, con los equipos afuera.
const pizarra = { equiposActivos: 51, pagosPendientes: 0 };

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
  it("al gestor de equipos no se le muestra la cartera ni se le lee la pizarra", async () => {
    nube.contarCatalogo.mockResolvedValueOnce({ data: () => ({ count: 37 }) });
    comoRol("gestorEditor");

    await screen.findByText("37");
    expect(screen.queryByText("EQUIPOS ACTIVOS")).not.toBeInTheDocument();
    expect(screen.queryByText("PAGOS PENDIENTES")).not.toBeInTheDocument();
    // La regla se la rechazaría: ni se le pregunta.
    expect(nube.leerTotales).not.toHaveBeenCalled();
  });

  it("al de facturación: la cartera de la pizarra y el mes contado aparte", async () => {
    nube.leerTotales.mockResolvedValueOnce(pizarra);
    nube.contarCotizaciones.mockResolvedValueOnce(12);
    nube.contarCuentas.mockResolvedValueOnce(4);
    comoRol("gestorFacturacion");

    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("51")).toBeInTheDocument();
    expect(screen.getByText("EQUIPOS ACTIVOS")).toBeInTheDocument();
    // Una lectura por cosa: la pizarra, las cotizaciones y las cuentas.
    expect(nube.leerTotales).toHaveBeenCalledTimes(1);
    expect(nube.contarCotizaciones).toHaveBeenCalledTimes(1);
    expect(nube.contarCuentas).toHaveBeenCalledTimes(1);
    // Sin el recuadro del catálogo, ni se cuenta.
    expect(nube.contarCatalogo).not.toHaveBeenCalled();
  });

  it("al gestor de equipos no se le cuentan cotizaciones ni cuentas", async () => {
    comoRol("gestorEditor");

    await waitFor(() => expect(nube.contarCatalogo).toHaveBeenCalledTimes(1));
    expect(nube.contarCotizaciones).not.toHaveBeenCalled();
    expect(nube.contarCuentas).not.toHaveBeenCalled();
  });

  it("el catálogo lo ven quienes trabajan con equipos, no facturación", async () => {
    for (const rol of ["administrador", "gestorIntegral", "gestorEditor"]) {
      nube.contarCatalogo.mockClear();
      const { unmount } = comoRol(rol);
      expect(screen.getByText("En el catálogo")).toBeInTheDocument();
      await waitFor(() => expect(nube.contarCatalogo).toHaveBeenCalledTimes(1));
      unmount();
    }

    nube.contarCatalogo.mockClear();
    comoRol("gestorFacturacion");
    expect(screen.queryByText("En el catálogo")).not.toBeInTheDocument();
    // Sin el recuadro, ni se cuenta.
    expect(nube.contarCatalogo).not.toHaveBeenCalled();
  });

  it("en el computador las tarjetas solo muestran: no abren ninguna ventana", async () => {
    nube.leerTotales.mockResolvedValueOnce(pizarra);
    nube.contarCotizaciones.mockResolvedValueOnce(12);
    const { usuario } = comoRol("administrador");

    await screen.findByText("12");
    // No son botones, y tocarlas no abre nada.
    expect(screen.queryByRole("button", { name: /COTIZACIONES/ })).not.toBeInTheDocument();
    await usuario.click(screen.getByText("EQUIPOS ACTIVOS"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  describe("en el celular", () => {
    // Las pantallas angostas: todas las medidas de ancho máximo coinciden. Solo
    // ahí las casillas abren su detalle (en el computador, desde 2026-10-23,
    // no).
    const matchMediaOriginal = window.matchMedia;
    beforeEach(() => {
      window.matchMedia = (query) => ({
        ...matchMediaOriginal(query),
        matches: query.includes("max-width"),
      });
    });
    afterEach(() => {
      window.matchMedia = matchMediaOriginal;
    });

    // Sin detalle por estado (decisión del dueño, 2026-10-23): la ventana
    // muestra la tarjeta del computador, sin pedir nada más.
    it("tocar «Cotizaciones» abre su tarjeta como en el computador", async () => {
      nube.contarCotizaciones.mockResolvedValueOnce(12);
      const { usuario } = comoRol("administrador");

      await screen.findByText("12");
      await usuario.click(screen.getByRole("button", { name: "COTIZACIONES" }));

      const dialogo = await screen.findByRole("dialog");
      expect(dialogo).toHaveTextContent("COTIZACIONES12Este mes");
      expect(nube.contarCotizaciones).toHaveBeenCalledTimes(1);
    });

    it("tocar «Cuentas de cobro» abre su tarjeta como en el computador", async () => {
      nube.contarCuentas.mockResolvedValueOnce(4);
      const { usuario } = comoRol("administrador");

      await screen.findByText("4");
      await usuario.click(screen.getByRole("button", { name: "CUENTAS DE COBRO" }));

      const dialogo = await screen.findByRole("dialog");
      expect(dialogo).toHaveTextContent("CUENTAS DE COBRO4Este mes");
      expect(nube.contarCuentas).toHaveBeenCalledTimes(1);
    });

    // Pedido del dueño, 2026-10-23: sin botón "Cerrar" al pie. La tarjeta sola
    // no lleva nada; los que muestran datos, una X arriba.
    it("la tarjeta sola no trae botón de cerrar", async () => {
      const { usuario } = comoRol("administrador");

      await usuario.click(screen.getByRole("button", { name: "COTIZACIONES" }));

      const dialogo = await screen.findByRole("dialog");
      expect(within(dialogo).queryByRole("button")).not.toBeInTheDocument();
    });

    it("el detalle se cierra con la X de arriba", async () => {
      nube.leerTotales.mockResolvedValueOnce({ equiposActivos: 51, pagosPendientes: 0 });
      const { usuario } = comoRol("administrador");

      await screen.findByText("51");
      await usuario.click(screen.getByRole("button", { name: "EQUIPOS ACTIVOS" }));

      const dialogo = await screen.findByRole("dialog");
      expect(within(dialogo).queryByText("Cerrar")).not.toBeInTheDocument();
      await usuario.click(within(dialogo).getByRole("button", { name: "Cerrar" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("tocar «Equipos activos» abre el detalle por equipo, sin pedir nada más", async () => {
      nube.leerTotales.mockResolvedValueOnce({
        equiposActivos: 51,
        pagosPendientes: 0,
        equiposPorTipo: { TABLÓN: 8, ANDAMIO: 43 },
      });
      const { usuario } = comoRol("administrador");

      await screen.findByText("51");
      await usuario.click(screen.getByRole("button", { name: "EQUIPOS ACTIVOS" }));

      const dialogo = await screen.findByRole("dialog");
      expect(dialogo).toHaveTextContent("ANDAMIO43");
      expect(dialogo).toHaveTextContent("TABLÓN8");
      expect(dialogo).toHaveTextContent("Total51");
      // El detalle vino en la misma lectura de la pizarra.
      expect(nube.leerTotales).toHaveBeenCalledTimes(1);
    });

    it("tocar «Pagos pendientes» abre la plata por estado, sin pedir nada más", async () => {
      nube.leerTotales.mockResolvedValueOnce({
        equiposActivos: 51,
        pagosPendientes: 700000,
        equiposPorTipo: { ANDAMIO: 51 },
        pagosPorEstado: { activa: 200000, vencida: 500000 },
      });
      const { usuario } = comoRol("administrador");

      await screen.findByText("51");
      await usuario.click(screen.getByRole("button", { name: "PAGOS PENDIENTES" }));

      const dialogo = await screen.findByRole("dialog");
      expect(dialogo).toHaveTextContent("Pagos pendientes");
      expect(dialogo).toHaveTextContent(
        `Vencidas${plata(500000)}Activas${plata(200000)}` +
          `Total${plata(700000)}`,
      );
      expect(nube.leerTotales).toHaveBeenCalledTimes(1);
    });

    it("el catálogo ya bajado: los nombres salen de memoria, sin leer nada", async () => {
      nube.contarCatalogo.mockResolvedValueOnce({ data: () => ({ count: 2 }) });
      const { usuario } = comoRol("gestorEditor", {
        equipos: [{ name: "MEZCLADORA" }, { name: "ANDAMIO" }],
      });

      await screen.findByText("2");
      await usuario.click(screen.getByRole("button", { name: "EQUIPOS" }));

      const dialogo = await screen.findByRole("dialog");
      expect(dialogo).toHaveTextContent("Equipos del catálogo");
      expect(dialogo).toHaveTextContent("ANDAMIOMEZCLADORATotal2");
      expect(nube.leerCatalogo).not.toHaveBeenCalled();
    });

    it("el catálogo sin bajar: lo pide una vez al abrir el detalle", async () => {
      nube.leerCatalogo.mockResolvedValueOnce({
        docs: [{ id: "e1", data: () => ({ name: "ANDAMIO" }) }],
      });
      const { usuario } = comoRol("gestorEditor");

      await usuario.click(screen.getByRole("button", { name: "EQUIPOS" }));

      const dialogo = await screen.findByRole("dialog");
      await waitFor(() => expect(dialogo).toHaveTextContent("ANDAMIOTotal1"));
      expect(nube.leerCatalogo).toHaveBeenCalledTimes(1);
    });
  });
});
