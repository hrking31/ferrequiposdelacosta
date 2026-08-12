import kpisReducer, { setKpis } from "./kpisSlice";

// Este slice solo recuerda los últimos números que se vieron en el menú, para
// no mostrar "…" mientras se vuelven a consultar. Lo que importa probar es que
// un dato que no llegó NO borre el que ya había.
describe("kpisSlice", () => {
  const base = () => ({
    cotizaciones: null,
    cuentasCobro: null,
    equiposActivos: null,
    pagosPendientes: null,
    equiposCatalogo: null,
  });

  it("setKpis guarda los números que llegaron", () => {
    const estado = kpisReducer(
      base(),
      setKpis({
        cotizaciones: 12,
        cuentasCobro: 7,
        equiposActivos: 30,
        pagosPendientes: 1500000,
      }),
    );

    expect(estado).toEqual({
      cotizaciones: 12,
      cuentasCobro: 7,
      equiposActivos: 30,
      pagosPendientes: 1500000,
      equiposCatalogo: null,
    });
  });

  it("conserva el número anterior si esa consulta falló (llega null)", () => {
    const previo = { ...base(), cotizaciones: 12, cuentasCobro: 7 };

    const estado = kpisReducer(
      previo,
      setKpis({ cotizaciones: null, cuentasCobro: 9 }),
    );

    expect(estado.cotizaciones).toBe(12);
    expect(estado.cuentasCobro).toBe(9);
  });

  it("el cero es un número válido y sí reemplaza", () => {
    const estado = kpisReducer({ ...base(), cotizaciones: 12 }, setKpis({ cotizaciones: 0 }));

    expect(estado.cotizaciones).toBe(0);
  });

  it("no se rompe si no le pasan nada", () => {
    const estado = kpisReducer(base(), setKpis());

    expect(estado).toEqual(base());
  });
});
