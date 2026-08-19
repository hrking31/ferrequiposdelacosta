import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import ListaCuentasCobro from "./ListaCuentasCobro";

// El historial de cuentas de cobro. Dos reglas de permisos viven acá y son
// fáciles de romper sin darse cuenta:
//
//   · marcar una cuenta como PAGADA es solo del administrador, y solo sobre
//     cuentas ya emitidas (una pausada todavía no se cobró);
//   · eliminar, lo mismo: borrar una cuenta emitida no se deshace.
//
// Los datos llegan escuchando Firestore en vivo, así que la escucha va como
// doble: la prueba le entrega las cuentas que quiere mostrar.
const datos = vi.hoisted(() => ({
  escuchar: vi.fn(),
  marcarPagada: vi.fn(() => Promise.resolve()),
  eliminar: vi.fn(() => Promise.resolve()),
  leerMas: vi.fn(() => Promise.resolve({ cuentas: [], ultimo: null, hayMas: false })),
  marcarEnProceso: vi.fn(() => Promise.resolve()),
}));

vi.mock("./cuentasCobroDb", () => ({
  escucharCuentasCobro: datos.escuchar,
  leerCuentasCobro: datos.leerMas,
  marcarCuentaPagada: datos.marcarPagada,
  eliminarCuentaCobro: datos.eliminar,
  marcarCuentaEnProceso: datos.marcarEnProceso,
}));

vi.mock("../VistaPdf/VistaCcPdf", () => ({ default: vi.fn() }));

const cuentaEmitida = {
  id: "cc1",
  cuentaCobroId: "CC-1001",
  status: "creada",
  tipo: "persona",
  empresa: "Aida Pérez",
  nit: "123456",
  total: 500000,
  pagado: 0,
  abonos: 0,
  creadaEn: 1787000000000,
  fecha: "2026-08-10",
};

const cuentaPausada = { ...cuentaEmitida, id: "cc2", cuentaCobroId: "CC-1002", status: "pausada" };
const cuentaPagada = { ...cuentaEmitida, id: "cc3", cuentaCobroId: "CC-1003", status: "pagada" };

// Deja que la pantalla reciba estas cuentas, como si llegaran de la base.
const conCuentas = (cuentas) => {
  datos.escuchar.mockImplementation((alRecibir) => {
    alRecibir({ cuentas, ultimo: null, hayMas: false });
    return () => {};
  });
};

const mostrar = (rol = "administrador") =>
  renderConProviders(<ListaCuentasCobro />, {
    estadoInicial: {
      user: { uid: "u1", name: "Aida", role: rol, permisos: [] },
      presence: { usuariosConectados: {} },
    },
  });

// El botón de pagar es de solo ícono y su texto vive en el globo de ayuda, que
// no le da nombre accesible: se lo ubica por el ícono. PaidIcon = "marcar como
// pagada"; MoneyOffIcon = "devolverla a emitida".
const botonMarcarPagada = () => screen.queryByTestId("PaidIcon")?.closest("button");
const botonQuitarPago = () => screen.queryByTestId("MoneyOffIcon")?.closest("button");

beforeEach(() => {
  vi.clearAllMocks();
  datos.leerMas.mockResolvedValue({ cuentas: [], ultimo: null, hayMas: false });
});

describe("ListaCuentasCobro — lo que muestra", () => {
  it("lista las cuentas con su número", async () => {
    conCuentas([cuentaEmitida, cuentaPausada]);
    mostrar();

    expect(await screen.findByText(/CC-1001/)).toBeInTheDocument();
    expect(screen.getByText(/CC-1002/)).toBeInTheDocument();
  });
});

describe("ListaCuentasCobro — marcar como pagada", () => {
  it("sobre una emitida y siendo administrador, el botón está", async () => {
    conCuentas([cuentaEmitida]);
    mostrar("administrador");

    await screen.findByText(/CC-1001/);
    // El contraste de las dos pruebas de abajo: si esta no estuviera, "no
    // aparece" podría pasar por buscar mal y no por estar oculto.
    expect(botonMarcarPagada()).toBeInTheDocument();
  });

  it("el administrador puede marcar una cuenta emitida", async () => {
    conCuentas([cuentaEmitida]);
    const { usuario } = mostrar("administrador");

    await screen.findByText(/CC-1001/);
    await usuario.click(botonMarcarPagada());

    // El segundo argumento dice a qué estado va: true = pagada.
    expect(datos.marcarPagada).toHaveBeenCalledWith("cc1", true, expect.anything());
  });

  it("es un interruptor: sobre una pagada, la devuelve a emitida", async () => {
    conCuentas([cuentaPagada]);
    const { usuario } = mostrar("administrador");

    await screen.findByText(/CC-1003/);
    await usuario.click(botonQuitarPago());

    expect(datos.marcarPagada).toHaveBeenCalledWith("cc3", false, expect.anything());
  });

  it("una cuenta pausada no se puede marcar: todavía no se cobró", async () => {
    conCuentas([cuentaPausada]);
    mostrar("administrador");

    await screen.findByText(/CC-1002/);
    expect(botonMarcarPagada()).toBeUndefined();
  });

  it("quien no es administrador no ve ese botón", async () => {
    conCuentas([cuentaEmitida]);
    mostrar("gestorFacturacion");

    await screen.findByText(/CC-1001/);
    expect(botonMarcarPagada()).toBeUndefined();
  });
});
