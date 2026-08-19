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
