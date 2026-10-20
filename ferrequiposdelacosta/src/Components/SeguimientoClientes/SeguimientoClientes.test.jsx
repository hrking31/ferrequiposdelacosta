import { screen, within } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import {
  unEquipo,
  unEquipoDevuelto,
  unaFactura,
  unTramoVencido,
} from "../../test/facturas";
import SeguimientoClientes from "./SeguimientoClientes";

// LOS FILTROS DE SEGUIMIENTO, en el celular: gestión, días vencidos y tipo. Lo
// que importa es que filtren FACTURAS —la tarjeta lleva solo las que
// cumplen— y que el selector de días ofrezca solo los que hay.
const nube = vi.hoisted(() => ({ getDocs: vi.fn() }));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db, ...partes) => partes.join("/"),
  query: (ruta) => ruta,
  where: () => null,
  getDocs: nube.getDocs,
  doc: (_db, ...partes) => partes.join("/"),
  updateDoc: vi.fn(() => Promise.resolve()),
  writeBatch: () => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) }),
}));
vi.mock("../../Utils/pantalla", async (importarOriginal) => ({
  ...(await importarOriginal()),
  usePantallaCompacta: () => true,
  usePantallaBaja: () => false,
}));

const andamio = (extra = {}) =>
  unEquipo({
    nombre: "ANDAMIO",
    cantidad: 5,
    dias: 3,
    valorDia: 20000,
    fechaDespacho: "2026-08-01",
    ...extra,
  });

const factura = (id, numeroFactura, equipos) => ({
  id,
  ...unaFactura({
    numeroFactura,
    fechaCreacion: "2026-08-01",
    subtotal: 300000,
    total: 300000,
    equipos,
  }),
});

// Aida: una factura con 3 días vencidos y otra que ya devolvió y debe plata.
// Bruno: una que vence hoy.
const facturasDe = {
  aida: [
    factura("f1", "1001", [
      andamio({ vencidos: [unTramoVencido({ desde: "2026-08-18", hasta: null })] }),
    ]),
    factura("f2", "1002", [
      unEquipoDevuelto({
        nombre: "ANDAMIO",
        cantidad: 5,
        dias: 3,
        valorDia: 20000,
        fechaDespacho: "2026-08-01",
        vencidos: [unTramoVencido({ desde: "2026-08-04", hasta: "2026-08-05" })],
        fechaDevolucion: "2026-08-05",
      }),
    ]),
  ],
  bruno: [factura("f3", "1003", [andamio({ dias: 20 })])],
};

const clientes = [
  { id: "aida", tipo: "persona", nombres: "Aida", apellido: "Pérez", estado: "vencida" },
  { id: "bruno", tipo: "persona", nombres: "Bruno", apellido: "Díaz", estado: "vencida" },
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-08-20T15:00:00Z"));
  nube.getDocs.mockImplementation((ruta) => {
    if (ruta === "clientes") {
      return Promise.resolve({
        docs: clientes.map(({ id, ...datos }) => ({ id, data: () => datos })),
      });
    }
    const id = ruta.split("/")[1];
    return Promise.resolve({
      docs: (facturasDe[id] || []).map(({ id: idFactura, ...datos }) => ({
        id: idFactura,
        data: () => datos,
      })),
    });
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// Cada opción lleva el nombre y la cantidad en los dos extremos del renglón.
const partesDeLasOpciones = () =>
  within(screen.getByRole("listbox"))
    .getAllByRole("option")
    .map((opcion) =>
      [...opcion.querySelectorAll(".MuiStack-root > span")].map((parte) => parte.textContent),
    );

const elegir = async (usuario, rotulo, opcion) => {
  await usuario.click(screen.getByRole("combobox", { name: rotulo }));
  await usuario.click(within(screen.getByRole("listbox")).getByText(opcion));
};

describe("SeguimientoClientes — los filtros", () => {
  it("sin filtros están los dos clientes", async () => {
    renderConProviders(<SeguimientoClientes />);

    expect(await screen.findByText("2 de 2")).toBeInTheDocument();
  });

  it("el selector de días ofrece solo los que hay: Hoy y 3, sin el 1 ni el 2", async () => {
    const { usuario } = renderConProviders(<SeguimientoClientes />);
    await screen.findByText("2 de 2");

    await usuario.click(screen.getByRole("combobox", { name: "Días vencidos" }));
    const opciones = partesDeLasOpciones();

    expect(opciones).toEqual([
      ["Todos", "3"],
      ["Vence hoy", "1"],
      ["3 días vencidos", "1"],
    ]);
  });

  it("la gestión ofrece todas, aunque estén en 0, contando facturas", async () => {
    const { usuario } = renderConProviders(<SeguimientoClientes />);
    await screen.findByText("2 de 2");

    await usuario.click(screen.getByRole("combobox", { name: "Gestión" }));
    expect(partesDeLasOpciones()).toEqual([
      ["Todas", "3"],
      ["Sin gestionar", "2"],
      ["Sin respuesta", "0"],
      ["Renovación", "0"],
      ["Parcial", "0"],
      ["Entrega pactada", "0"],
      ["Cobro", "1"],
    ]);
  });

  it("el tipo cuenta CLIENTES, y sigue a la gestión elegida", async () => {
    const { usuario } = renderConProviders(<SeguimientoClientes />);
    await screen.findByText("2 de 2");

    await usuario.click(screen.getByRole("combobox", { name: "Tipo" }));
    expect(partesDeLasOpciones()).toEqual([
      ["Todos", "2"],
      ["Personas", "2"],
      ["Empresas", "0"],
    ]);
    await usuario.keyboard("{Escape}");

    // En cobro solo está Aida.
    await elegir(usuario, "Gestión", "Cobro");
    await usuario.click(screen.getByRole("combobox", { name: "Tipo" }));
    expect(partesDeLasOpciones()).toEqual([
      ["Todos", "1"],
      ["Personas", "1"],
      ["Empresas", "0"],
    ]);
  });

  it("por días queda solo el cliente que tiene una factura con esos días", async () => {
    const { usuario } = renderConProviders(<SeguimientoClientes />);
    await screen.findByText("2 de 2");

    await elegir(usuario, "Días vencidos", "Vence hoy");

    expect(await screen.findByText("1 de 2")).toBeInTheDocument();
    expect(screen.getByText("Bruno Díaz")).toBeInTheDocument();
    expect(screen.queryByText("Aida Pérez")).not.toBeInTheDocument();
  });

  it("«Cobro» deja solo la factura de cobro de Aida", async () => {
    const { usuario } = renderConProviders(<SeguimientoClientes />);
    await screen.findByText("2 de 2");

    await elegir(usuario, "Gestión", "Cobro");

    expect(await screen.findByText("1 de 2")).toBeInTheDocument();
    expect(screen.getByText("Aida Pérez")).toBeInTheDocument();
    // La tarjeta lleva solo la factura de cobro, no la vencida.
    expect(screen.getByText(/1002/)).toBeInTheDocument();
    expect(screen.queryByText(/1001/)).not.toBeInTheDocument();
  });
});
