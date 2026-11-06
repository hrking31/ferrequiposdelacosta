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

describe("la pizarra de la cotización, igual que la cuenta del PDF", () => {
  it("una sola pizarra: sin el recuadro aparte del depósito", () => {
    abrir(cotizacion({ deposito: true, valorDeposito: 100000 }));

    expect(screen.queryByText("DEPÓSITO")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".MuiPaper-root")).toHaveLength(1);
  });

  it("los cinco renglones van siempre, aunque estén en cero", () => {
    abrir(cotizacion());

    const pizarra = pizarraDe("Subtotal");
    const rotulos = [...pizarra.querySelectorAll(".fila")].map((fila) => fila.firstChild.textContent);
    expect(rotulos).toEqual(["Subtotal", "IVA (19%)", "Depósito", "Transporte", "Total"]);
    const cero = /\$\s*0(,00)?$/;
    expect(within(pizarra).getByText("IVA (19%)").closest(".fila")).toHaveTextContent(cero);
    expect(within(pizarra).getByText("Depósito").closest(".fila")).toHaveTextContent(cero);
    expect(within(pizarra).getByText("Transporte").closest(".fila")).toHaveTextContent(cero);
    const cierre = pizarra.querySelector(".fila:last-of-type");
    expect(cierre).toHaveTextContent(/^Total/);
    expect(cierre).toHaveClass("total");
    expect(cierre).toHaveTextContent("400.000");
  });

  it("con depósito: va entre el IVA y el transporte, y el total lo suma", () => {
    abrir(
      cotizacion({
        iva: true,
        deposito: true,
        valorDeposito: 100000,
        transporte: "Ida y vuelta",
        valorTransporte: 40000,
      }),
    );

    const pizarra = pizarraDe("Subtotal");
    const rotulos = [...pizarra.querySelectorAll(".fila")].map((fila) => fila.firstChild.textContent);
    expect(rotulos).toEqual(["Subtotal", "IVA (19%)", "Depósito", "Transporte", "Total"]);
    // 400.000 + 76.000 de IVA + 100.000 de depósito + 40.000 de transporte.
    expect(pizarra.querySelector(".fila:last-of-type")).toHaveTextContent("616.000");
  });

  it("el total guardado (el que muestra la lista) incluye el depósito", async () => {
    const { store, usuario } = abrir(cotizacion({ deposito: true }));

    await usuario.type(screen.getByLabelText("Valor Depósito"), "100000");

    const value = store.getState().cotizacion.value;
    expect(value.valorDeposito).toBe("100000");
    expect(value.totalNumero).toBe(500000);
  });
});

describe("el IVA en el primer renglón, como en la cuenta de cobro", () => {
  it("marcarlo suma el 19 % del subtotal al total", async () => {
    const { store, usuario } = abrir(cotizacion({ deposito: true, valorDeposito: 100000 }));

    await usuario.click(screen.getByRole("checkbox", { name: "IVA" }));

    const value = store.getState().cotizacion.value;
    expect(value.iva).toBe(true);
    // 400.000 + 76.000 de IVA + 100.000 de depósito.
    expect(value.totalNumero).toBeCloseTo(576000);
    expect(within(pizarraDe("Subtotal")).getByText("IVA (19%)")).toBeInTheDocument();
  });

  it("la casilla de depósito sigue en su lugar y lo saca del total", async () => {
    const { store, usuario } = abrir(cotizacion({ deposito: true, valorDeposito: 100000 }));

    await usuario.click(screen.getByRole("checkbox", { name: "Depósito" }));

    const value = store.getState().cotizacion.value;
    expect(value.valorDeposito).toBe(0);
    expect(value.totalNumero).toBe(400000);
    expect(within(pizarraDe("Subtotal")).getByText("Depósito").closest(".fila")).toHaveTextContent(
      /\$\s*0(,00)?$/,
    );
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
