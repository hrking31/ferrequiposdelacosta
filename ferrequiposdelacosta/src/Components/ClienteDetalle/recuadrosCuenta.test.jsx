import { casillasDeCuenta } from "./recuadrosCuenta";

// Las casillas de la pizarra de la cuenta. Acá se fija solo la del descuento
// al cobrar (2026-10-16): aparece si hubo, y no ensucia la pizarra si no.
const cuenta = (extra = {}) => ({
  total: 100000,
  pagado: 0,
  abonos: 70000,
  saldoPendiente: 0,
  saldoAFavor: 0,
  ...extra,
});

const claves = (lista) => lista.map(({ clave }) => clave);

describe("casillasDeCuenta — el descuento al cobrar", () => {
  it("con descuento, va su casilla antes del saldo", () => {
    const casillas = casillasDeCuenta(cuenta({ descuentoAlCobrar: 30000 }));
    expect(claves(casillas)).toEqual(["total", "pagado", "abonos", "descuento", "saldo"]);
    expect(casillas.find(({ clave }) => clave === "descuento").rotulo).toBe("Descuento");
  });

  it("sin descuento, no aparece", () => {
    expect(claves(casillasDeCuenta(cuenta()))).not.toContain("descuento");
  });
});
