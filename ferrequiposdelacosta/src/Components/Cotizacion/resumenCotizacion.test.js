import resumenCotizacion, { subtotalDeItems } from "./resumenCotizacion";

// Una cotización como las que arma el carrito: los números a veces llegan como
// texto, igual que de los campos del formulario.
const cotizacion = (extra = {}) => ({
  items: [
    { description: "ANDAMIO", quantity: "4", day: "3", price: "20000" },
    { description: "RANA", quantity: 1, day: 2, price: 50000 },
  ],
  iva: false,
  transporte: "Ida y vuelta",
  valorTransporte: "40000",
  deposito: true,
  valorDeposito: "100000",
  ...extra,
});

describe("resumenCotizacion", () => {
  it("el subtotal sale de los ítems: cantidad × días × valor", () => {
    expect(subtotalDeItems(cotizacion().items)).toBe(340000);
    expect(subtotalDeItems(undefined)).toBe(0);
  });

  it("el total suma todo: subtotal, IVA, depósito y transporte", () => {
    const r = resumenCotizacion(cotizacion());

    expect(r.deposito).toBe(100000);
    expect(r.transporte).toBe(40000);
    expect(r.total).toBe(480000);
  });

  it("el IVA es el 19 % del subtotal, sin el transporte ni el depósito", () => {
    const r = resumenCotizacion(cotizacion({ iva: true }));

    expect(r.iva).toBeCloseTo(64600);
    expect(r.total).toBeCloseTo(340000 + 64600 + 100000 + 40000);
  });

  it("sin la casilla de depósito, no hay depósito aunque quede un valor escrito", () => {
    const r = resumenCotizacion(cotizacion({ deposito: false }));

    expect(r.deposito).toBe(0);
    expect(r.total).toBe(380000);
  });

  it("sin transporte no se cobra transporte aunque quede un valor escrito", () => {
    const r = resumenCotizacion(cotizacion({ transporte: "Sin transporte" }));

    expect(r.transporte).toBe(0);
    expect(r.total).toBe(440000);
  });

  it("calcula desde las partes y no le cree al total guardado", () => {
    const desfasada = cotizacion({ total: "$ 1", totalNumero: 1 });

    expect(resumenCotizacion(desfasada).total).toBe(480000);
  });
});
