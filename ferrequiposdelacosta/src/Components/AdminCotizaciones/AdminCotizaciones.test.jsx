import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import AdminCotizaciones from "./AdminCotizaciones";

// El buzón de solicitudes: lo que llega de la tienda y del kiosco, más lo que
// arma el personal. Es la pantalla donde el equipo decide qué atender.
//
// Lo que se prueba: que se vean las solicitudes con su estado, y que eliminar
// quede solo en manos del administrador — borrar una cotización no se deshace.
const datos = vi.hoisted(() => ({
  escuchar: vi.fn(),
  leerMas: vi.fn(() => Promise.resolve({ cotizaciones: [], ultimo: null, hayMas: false })),
  eliminar: vi.fn(() => Promise.resolve()),
  marcarEnProceso: vi.fn(() => Promise.resolve()),
}));

vi.mock("./cotizacionesDb", () => ({
  escucharCotizaciones: datos.escuchar,
  leerCotizaciones: datos.leerMas,
  eliminarCotizacion: datos.eliminar,
  marcarCotizacionEnProceso: datos.marcarEnProceso,
}));

vi.mock("../VistaPdf/VistaCotPdf", () => ({ default: vi.fn() }));

const pendiente = {
  id: "cot1",
  cotizacionId: "COT-1001",
  status: "pendiente",
  tipo: "persona",
  empresa: "Aida Pérez",
  nit: "123456",
  telefono: "3116576633",
  total: "$ 500.000",
  totalNumero: 500000,
  createdAt: 1787000000000,
  fecha: "2026-08-10",
  items: [{ description: "ANDAMIO", quantity: 4, day: 3, price: 20000, subtotal: 240000 }],
};

const emitida = { ...pendiente, id: "cot2", cotizacionId: "COT-1002", status: "creada" };

const conCotizaciones = (cotizaciones) => {
  datos.escuchar.mockImplementation((alRecibir) => {
    alRecibir({ cotizaciones, ultimo: null, hayMas: false });
    return () => {};
  });
};

const mostrar = (rol = "administrador") =>
  renderConProviders(<AdminCotizaciones />, {
    estadoInicial: {
      user: { uid: "u1", name: "Aida", role: rol, permisos: [] },
      presence: { usuariosConectados: {} },
    },
  });

const botonEliminar = () => screen.queryByTestId("DeleteIcon")?.closest("button");

beforeEach(() => {
  vi.clearAllMocks();
  datos.leerMas.mockResolvedValue({ cotizaciones: [], ultimo: null, hayMas: false });
});

describe("AdminCotizaciones — el buzón", () => {
  it("muestra las solicitudes que llegaron", async () => {
    conCotizaciones([pendiente, emitida]);
    mostrar();

    expect(await screen.findByText(/COT-1001/)).toBeInTheDocument();
    expect(screen.getByText(/COT-1002/)).toBeInTheDocument();
  });

  it("una solicitud pendiente se puede tomar para atenderla", async () => {
    conCotizaciones([pendiente]);
    mostrar();

    await screen.findByText(/COT-1001/);
    // "Asumir gestión": quien la abre queda registrado como quien la atiende.
    expect(screen.getByTestId("EditIcon").closest("button")).toBeInTheDocument();
  });
});

describe("AdminCotizaciones — eliminar", () => {
  it("el administrador puede eliminar una solicitud", async () => {
    conCotizaciones([pendiente]);
    mostrar("administrador");

    await screen.findByText(/COT-1001/);
    expect(botonEliminar()).toBeInTheDocument();
  });

  it("quien no es administrador no puede: borrar no se deshace", async () => {
    conCotizaciones([pendiente]);
    mostrar("gestorFacturacion");

    await screen.findByText(/COT-1001/);
    expect(botonEliminar()).toBeUndefined();
  });

  it("pedir eliminar no borra hasta confirmar", async () => {
    conCotizaciones([pendiente]);
    const { usuario } = mostrar("administrador");

    await screen.findByText(/COT-1001/);
    await usuario.click(botonEliminar());

    // Se abre la confirmación, pero todavía no se tocó la base.
    expect(datos.eliminar).not.toHaveBeenCalled();
  });
});

describe("AdminCotizaciones — el filtro de estado", () => {
  // Sin columna (pantalla angosta en las pruebas) los filtros van en los
  // desplegables, como en el celular. Cada opción dice cuántas hay.
  it("deja solo las de ese estado, y cada opción dice cuántas hay", async () => {
    conCotizaciones([pendiente, emitida]);
    const { usuario } = mostrar();

    await screen.findByText(/COT-1001/);
    await usuario.click(screen.getByRole("combobox", { name: "Estado" }));
    expect(screen.getByRole("option", { name: /^En proceso\s*0$/ })).toBeInTheDocument();
    await usuario.click(screen.getByRole("option", { name: /^Emitida\s*1$/ }));

    expect(screen.getByText(/COT-1002/)).toBeInTheDocument();
    expect(screen.queryByText(/COT-1001/)).not.toBeInTheDocument();
  });
});

describe("AdminCotizaciones — la columna de la derecha", () => {
  // Pantalla ancha: coinciden las medidas de ancho mínimo, no las de máximo.
  const matchMediaOriginal = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = (query) => ({
      ...matchMediaOriginal(query),
      matches: query.includes("min-width"),
    });
  });
  afterEach(() => {
    window.matchMedia = matchMediaOriginal;
  });

  it("sin nada elegido muestra las estadísticas de lo cargado; tocar una solicitud muestra su vista previa sin abrirla", async () => {
    conCotizaciones([pendiente, emitida]);
    const { usuario } = mostrar();

    await screen.findByText(/COT-1001/);
    expect(screen.getByText("Estadísticas")).toBeInTheDocument();
    expect(screen.getByText("Basado en las últimas 2")).toBeInTheDocument();
    expect(screen.getByText("COTIZACIONES HECHAS")).toBeInTheDocument();
    // Las dos piden andamios: el equipo cuenta por cotización, no por unidad.
    expect(screen.getByText("EQUIPOS MÁS SOLICITADOS")).toBeInTheDocument();
    expect(screen.getByText("ANDAMIO").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("CLIENTES QUE MÁS SOLICITAN")).toBeInTheDocument();
    // Sin vista previa no hay X.
    expect(screen.queryByRole("button", { name: "Volver al resumen" })).not.toBeInTheDocument();

    await usuario.click(screen.getByText(/COT-1001/));

    expect(screen.getByText("Vista previa")).toBeInTheDocument();
    expect(screen.getByText("4 × 3 días")).toBeInTheDocument();
    // Mirar no es abrir: no se marca "En proceso".
    expect(datos.marcarEnProceso).not.toHaveBeenCalled();

    // La X de la esquina vuelve a las estadísticas.
    await usuario.click(screen.getByRole("button", { name: "Volver al resumen" }));
    expect(screen.getByText("Estadísticas")).toBeInTheDocument();

    // Tocar la tarjeta también la elige y, otra vez, la suelta.
    await usuario.click(screen.getByText(/COT-1001/));
    expect(screen.getByText("Vista previa")).toBeInTheDocument();
    await usuario.click(screen.getAllByText(/COT-1001/)[0]);
    expect(screen.getByText("Estadísticas")).toBeInTheDocument();
  });
});
