import {
  calcularAporteFactura,
  calcularTotalesFacturas,
} from "./facturaCalculos";

// Los dos números de los recuadros "Equipos activos" y "Pagos pendientes".
//
// Estas cuentas las corre la Cloud Function que mantiene la pizarra, del lado
// del servidor, donde un error no se ve en pantalla: el número saldría mal y
// parecería normal. Por eso se prueban acá con casos de valor conocido.
//
// El día se pasa siempre a mano (hoyIso) para que las pruebas no dependan del
// reloj.
const HOY = "2026-08-15";

// Una factura simple: un equipo, sin devolver, con fecha de despacho y de
// vencimiento, y su valor total.
const factura = ({
  cantidad = 10,
  cantidadDevuelta = 0,
  valor = 5000,
  fechaDespacho = "2026-08-10",
  fechaVencimiento = "2026-08-20",
  valorTotal = 500000,
  montoPagado = 0,
  abonos = [],
} = {}) => ({
  fecha: fechaDespacho,
  valorTotal,
  montoPagado,
  pagos: montoPagado ? [{ medio: "Efectivo", monto: montoPagado }] : [],
  abonos,
  equipos: [
    {
      descripcion: "Andamio",
      cantidad,
      cantidadDevuelta,
      valor,
      fechaDespacho,
      fechaVencimiento,
    },
  ],
});

describe("calcularAporteFactura", () => {
  it("una factura activa aporta sus equipos afuera y su saldo", () => {
    const aporte = calcularAporteFactura(factura(), HOY);

    expect(aporte.equiposActivos).toBe(10);
    expect(aporte.pagosPendientes).toBe(500000);
  });

  it("descuenta los equipos que ya volvieron", () => {
    const aporte = calcularAporteFactura(
      factura({ cantidad: 10, cantidadDevuelta: 4 }),
      HOY,
    );

    expect(aporte.equiposActivos).toBe(6);
  });

  it("una factura que todavía no salió no suma equipos afuera", () => {
    // Se despacha recién en septiembre: los equipos siguen en la bodega.
    const aporte = calcularAporteFactura(
      factura({ fechaDespacho: "2026-09-01", fechaVencimiento: "2026-09-10" }),
      HOY,
    );

    expect(aporte.equiposActivos).toBe(0);
    // Pero la plata se debe igual.
    expect(aporte.pagosPendientes).toBe(500000);
  });

  it("una vencida sigue contando los equipos: están afuera pasados de fecha", () => {
    const aporte = calcularAporteFactura(
      factura({ fechaVencimiento: "2026-08-12" }),
      HOY,
    );

    expect(aporte.equiposActivos).toBe(10);
  });

  it("si devolvió todo y pagó todo, no aporta nada", () => {
    const aporte = calcularAporteFactura(
      factura({ cantidadDevuelta: 10, montoPagado: 500000 }),
      HOY,
    );

    expect(aporte).toEqual({ equiposActivos: 0, pagosPendientes: 0 });
  });

  it("si devolvió todo pero debe plata, aporta solo el saldo", () => {
    const aporte = calcularAporteFactura(
      factura({ cantidadDevuelta: 10, montoPagado: 200000 }),
      HOY,
    );

    expect(aporte.equiposActivos).toBe(0);
    expect(aporte.pagosPendientes).toBe(300000);
  });

  it("los abonos bajan el saldo", () => {
    const aporte = calcularAporteFactura(
      factura({ abonos: [{ monto: 150000 }] }),
      HOY,
    );

    expect(aporte.pagosPendientes).toBe(350000);
  });

  // Este es el caso que le permite al servidor no leer nada: una factura
  // recién creada no tenía versión anterior, y una borrada no tiene posterior.
  it("una factura que no existe aporta cero", () => {
    expect(calcularAporteFactura(null, HOY)).toEqual({
      equiposActivos: 0,
      pagosPendientes: 0,
    });
  });
});

describe("calcularTotalesFacturas", () => {
  it("suma el aporte de todas", () => {
    const totales = calcularTotalesFacturas(
      [
        factura(),
        factura({ cantidad: 3, valorTotal: 200000 }),
        // Cerrada: no suma nada.
        factura({ cantidadDevuelta: 10, montoPagado: 500000 }),
      ],
      HOY,
    );

    expect(totales.equiposActivos).toBe(13);
    expect(totales.pagosPendientes).toBe(700000);
  });

  it("sin facturas, todo en cero", () => {
    expect(calcularTotalesFacturas([], HOY)).toEqual({
      equiposActivos: 0,
      pagosPendientes: 0,
    });
  });

  // La suma de los aportes tiene que dar lo mismo que ajustar de a uno: es lo
  // que hace que el disparador (que suma diferencias) y el repaso de madrugada
  // (que recalcula de cero) no puedan dar números distintos.
  it("el total es la suma de los aportes, uno por uno", () => {
    const facturas = [factura(), factura({ cantidad: 7, valorTotal: 300000 })];

    const total = calcularTotalesFacturas(facturas, HOY);
    const sumaManual = facturas
      .map((f) => calcularAporteFactura(f, HOY))
      .reduce(
        (a, b) => ({
          equiposActivos: a.equiposActivos + b.equiposActivos,
          pagosPendientes: a.pagosPendientes + b.pagosPendientes,
        }),
        { equiposActivos: 0, pagosPendientes: 0 },
      );

    expect(total).toEqual(sumaManual);
  });
});
