import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import VistaCcWeb from "./VistaCcWeb";

// La muestra de la pantalla dice lo mismo que el PDF (ver documentosPdf.test.js).
const cuenta = (extra = {}) => ({
  tipo: "persona",
  cuentaCobroId: "CC-1",
  empresa: "ANA PÉREZ",
  nit: "123",
  fecha: "2026-11-04",
  iva: false,
  subtotalNumero: 400000,
  total: 400000,
  pagado: 0,
  abonos: 0,
  valorDeposito: 0,
  items: [{ factura: "", description: "RANA", quantity: 1, day: 8, price: 50000, subtotal: 400000 }],
  ...extra,
});

const abrir = (value) =>
  renderConProviders(<VistaCcWeb />, {
    estadoInicial: { cuentacobro: { value, original: value } },
  });

describe("la muestra de la cuenta de cobro", () => {
  it("el depósito va antes de los totales, con su título y sin sumar", () => {
    abrir(cuenta({ valorDeposito: 100000, pagado: 350000 }));

    const titulo = screen.getByText("DEPÓSITO");
    const subtotal = screen.getByRole("cell", { name: "Subtotal" });
    expect(titulo.compareDocumentPosition(subtotal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Recibido" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Pagado" }).nextSibling).toHaveTextContent("- ");
    expect(screen.getByRole("cell", { name: "Pagado" }).nextSibling).toHaveTextContent("250.000");
    expect(screen.queryByRole("cell", { name: "Depósito" })).not.toBeInTheDocument();
  });

  it("sin depósito no dibuja esa sección", () => {
    abrir(cuenta());
    expect(screen.queryByText("DEPÓSITO")).not.toBeInTheDocument();
  });

  it("solo por horas, la columna dice Horas", () => {
    abrir(cuenta({ items: [{ ...cuenta().items[0], unidad: "horas" }] }));
    expect(screen.getByRole("columnheader", { name: "Horas" })).toBeInTheDocument();
  });

  it("al combinar días y horas, la columna dice Duración y cada renglón su unidad", () => {
    abrir(
      cuenta({
        items: [
          { ...cuenta().items[0], unidad: "horas" },
          { ...cuenta().items[0], description: "ANDAMIO", day: 3, unidad: "dias" },
        ],
      }),
    );

    expect(screen.getByRole("columnheader", { name: "Duración" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "8 horas" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "3 días" })).toBeInTheDocument();
  });

  it("a una empresa no le dibuja la columna Factura", () => {
    abrir(
      cuenta({
        tipo: "empresa",
        items: [{ ...cuenta().items[0], factura: "0783" }],
      }),
    );
    expect(screen.queryByRole("columnheader", { name: "Factura" })).not.toBeInTheDocument();
  });
});
