import { inicioDeMesBogota } from "./documentosDelMesDb";

vi.mock("../../Components/Firebase/Firebase", () => ({ db: {} }));

// Desde dónde se cuentan las cotizaciones y cuentas del mes: la medianoche del
// día 1 en Colombia, no en la hora del aparato ni en la universal.
describe("inicioDeMesBogota", () => {
  it("el mes empieza a la medianoche de Colombia", () => {
    // 15 de octubre de 2026, mediodía en Colombia.
    const inicio = inicioDeMesBogota(Date.UTC(2026, 9, 15, 17));

    // 1 de octubre, 00:00 en Colombia = 05:00 en hora universal.
    expect(inicio).toBe(Date.UTC(2026, 9, 1, 5));
  });

  it("las 9 p.m. del 31 de octubre en Colombia siguen siendo octubre", () => {
    // En hora universal ya es 1 de noviembre.
    expect(inicioDeMesBogota(Date.UTC(2026, 10, 1, 2))).toBe(Date.UTC(2026, 9, 1, 5));
  });

  it("diciembre pasa bien a enero", () => {
    expect(inicioDeMesBogota(Date.UTC(2027, 0, 1, 6))).toBe(Date.UTC(2027, 0, 1, 5));
  });
});
