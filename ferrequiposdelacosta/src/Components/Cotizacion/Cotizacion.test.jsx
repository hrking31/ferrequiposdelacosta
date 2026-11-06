import { screen, within } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import Cotizacion from "./Cotizacion";

const cotizacion = (extra = {}) => ({
  tipo: "persona",
  empresa: "Ana Pérez",
  nit: "",
  telefono: "",
  direccion: "",
  barrio: "",
  otrosDatos: "",
  departamento: "",
  municipio: "",
  fecha: "2026-11-05",
  transporte: "Sin transporte",
  valorTransporte: 0,
  iva: false,
  ivaNumero: 0,
  deposito: false,
  valorDeposito: 0,
  subtotalNumero: 400000,
  subtotal: "$ 400.000",
  totalNumero: 400000,
  total: "$ 400.000",
  items: [
    { description: "RETROEXCAVADORA", quantity: 1, day: 8, price: 50000, subtotal: "$ 400.000" },
  ],
  ...extra,
});

const abrir = (value, forma) =>
  renderConProviders(<Cotizacion forma={forma} />, {
    estadoInicial: { cotizacion: { value, original: value } },
  });

// La pizarra (el Paper) que contiene un texto.
const pizarraDe = (texto) => screen.getByText(texto).closest(".MuiPaper-root");

describe("las dos pizarras de la cotización, como en la factura", () => {
  it("sin depósito, la cuenta cierra con el Total y el depósito dice que no hay", () => {
    abrir(cotizacion());

    const cierre = pizarraDe("Subtotal").querySelector(".fila:last-of-type");
    expect(cierre).toHaveTextContent(/^Total/);
    expect(cierre).toHaveClass("total");
    expect(screen.queryByText("Para despachar")).not.toBeInTheDocument();
    expect(within(pizarraDe("DEPÓSITO")).getByText("Sin depósito")).toBeInTheDocument();
  });

  it("con depósito, el total no lo suma y cierra lo que se lleva para despachar", () => {
    abrir(cotizacion({ deposito: true, valorDeposito: 100000 }));

    const cuenta = within(pizarraDe("Subtotal"));
    expect(cuenta.getByText("Total").closest(".fila")).toHaveTextContent("400.000");
    expect(cuenta.getByText("Para despachar").closest(".fila")).toHaveTextContent("500.000");

    const deposito = within(pizarraDe("DEPÓSITO"));
    const aEntregar = deposito.getByText("A entregar").closest(".fila");
    expect(aEntregar).toHaveClass("resaltada");
    expect(aEntregar).toHaveTextContent("100.000");
    expect(deposito.queryByText("Sin depósito")).not.toBeInTheDocument();
  });

  it("el total guardado (el que muestra la lista) ya no lleva el depósito", async () => {
    const { store, usuario } = abrir(cotizacion({ deposito: true }));

    await usuario.type(screen.getByLabelText("Valor Depósito"), "100000");

    const value = store.getState().cotizacion.value;
    expect(value.valorDeposito).toBe("100000");
    expect(value.totalNumero).toBe(400000);
  });
});

describe("el botón de agregar ítem", () => {
  it("es el punteado y agrega un ítem", async () => {
    const { store, usuario } = abrir(cotizacion());

    await usuario.click(screen.getByRole("button", { name: "Agregar Ítem" }));

    expect(store.getState().cotizacion.value.items).toHaveLength(2);
  });

  it("de pie lleva al lado el contador de ítems", () => {
    abrir(cotizacion(), "dePie");

    const contador = screen.getByText("Ítems").parentElement;
    expect(contador).toHaveTextContent(/^Ítems1$/);
    expect(contador.parentElement).toContainElement(
      screen.getByRole("button", { name: "Agregar Ítem" }),
    );
  });

  it("de pie y sin ítems, queda solo el botón", () => {
    abrir(cotizacion({ items: [] }), "dePie");

    expect(screen.queryByText("Ítems")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar Ítem" })).toBeInTheDocument();
  });

  it("en las demás formas no hay contador", () => {
    abrir(cotizacion());

    expect(screen.queryByText("Ítems")).not.toBeInTheDocument();
  });
});
