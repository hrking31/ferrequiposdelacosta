import { screen, within } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import ListaClientes from "./ListaClientes";

// La columna "Facturas": las que cada cliente tiene sin finalizar. No sale de
// leer sus facturas sino de la cuenta que lleva el servidor, que llega con el
// sello de la copia (ver clientesCache). Acá se fija lo que muestra.
const copia = vi.hoisted(() => ({ obtenerClientes: vi.fn() }));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({ collection: () => null, getDocs: () => null }));
vi.mock("./clientesCache", () => ({
  obtenerClientes: copia.obtenerClientes,
  invalidarCopiaClientes: () => {},
}));

const CLIENTES = [
  { id: "c1", tipo: "persona", nombres: "Aida", apellido: "Pérez", estado: "activa" },
  { id: "c2", tipo: "persona", nombres: "Pedro", apellido: "Gómez", estado: "finalizada" },
];

const conCuenta = (facturasAbiertas) =>
  copia.obtenerClientes.mockResolvedValue({
    clientes: CLIENTES,
    desdeCopia: true,
    facturasAbiertas,
  });

const facturasDe = async (nombre) => {
  const fila = (await screen.findByText(nombre)).closest("tr");
  const columna = screen
    .getAllByRole("columnheader")
    .findIndex((titulo) => titulo.textContent === "Facturas");
  return within(fila).getAllByRole("cell")[columna].textContent;
};

describe("ListaClientes — la columna de facturas", () => {
  it("muestra las sin finalizar de cada uno, y cero al que no tiene", async () => {
    conCuenta({ c1: 2 });
    renderConProviders(<ListaClientes />);

    expect(await facturasDe("Aida Pérez")).toBe("2");
    expect(await facturasDe("Pedro Gómez")).toBe("0");
  });

  it("si el servidor todavía no las contó, no inventa ceros", async () => {
    conCuenta(null);
    renderConProviders(<ListaClientes />);

    expect(await facturasDe("Aida Pérez")).toBe("—");
  });
});

// En el celular no hay columnas: el número va en el ícono de la tarjeta, como
// en la ficha del cliente.
describe("ListaClientes — en el celular", () => {
  const original = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = (query) => ({
      matches: query.includes("max-width:915px"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  });
  afterEach(() => {
    window.matchMedia = original;
  });

  it("el número va en el ícono, y sin facturas abiertas no hay número", async () => {
    conCuenta({ c1: 3 });
    renderConProviders(<ListaClientes />);

    const tarjeta = (nombre) => screen.findByRole("button", { name: `Ver detalles de ${nombre}` });
    expect(within(await tarjeta("Aida Pérez")).getByText("3")).toBeInTheDocument();
    expect(within(await tarjeta("Pedro Gómez")).queryByText("0")).not.toBeInTheDocument();
  });
});
