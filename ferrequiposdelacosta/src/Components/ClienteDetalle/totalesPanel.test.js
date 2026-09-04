import { calcularAporteFactura, calcularTotalesFacturas } from "./facturaCuentas";
import { unEquipo, unEquipoDevuelto, unaFactura } from "../../test/facturas";

// Los dos números de los recuadros "Equipos activos" y "Pagos pendientes".
//
// Estas cuentas las corre la Cloud Function que mantiene la pizarra, del lado
// del servidor, donde un error no se ve en pantalla: el número saldría mal y
// parecería normal. Por eso se prueban acá con casos de valor conocido.
//
// El día se pasa siempre a mano (hoyIso) para que las pruebas no dependan del
// reloj.
const HOY = "2026-08-15";

// Una factura de 10 andamios a $5.000 el día por 10 días: $500.000 redondos,
// despachados el 10 y con vencimiento el 20.
const factura = ({
  cantidad = 10,
  devueltos = 0,
  valorDia = 5000,
  fechaDespacho = "2026-08-10",
  fechaVencimiento = "2026-08-20",
  pagado = 0,
  abonos = [],
} = {}) => {
  const linea = (unidades, devuelto) =>
    (devuelto ? unEquipoDevuelto : unEquipo)({
      nombre: "Andamio",
      cantidad: unidades,
      valorDia,
      // La línea que volvió lleva los días que de verdad estuvo afuera: se
      // devuelve el mismo día que sale, así que es 1, no los 10 pactados.
      dias: devuelto ? 1 : 10,
      fechaDespacho,
      fechaVencimiento,
      ...(devuelto ? { fechaDevolucion: fechaDespacho } : {}),
    });

  // Devolver una parte no baja una cantidad: parte la línea en dos, y la que
  // volvió se queda con los días que de verdad estuvo afuera.
  const equipos = [];
  if (devueltos > 0) equipos.push(linea(devueltos, true));
  if (cantidad - devueltos > 0) equipos.push(linea(cantidad - devueltos, false));

  return unaFactura({
    fechaCreacion: fechaDespacho,
    equipos,
    pagos: pagado ? [{ medio: "Efectivo", monto: pagado }] : [],
    abonos,
  });
};

describe("calcularAporteFactura", () => {
  it("una factura activa aporta sus equipos afuera y su saldo", () => {
    const aporte = calcularAporteFactura(factura(), HOY);

    expect(aporte.equiposActivos).toBe(10);
    expect(aporte.pagosPendientes).toBe(500000);
  });

  it("descuenta los equipos que ya volvieron", () => {
    const aporte = calcularAporteFactura(
      factura({ cantidad: 10, devueltos: 4 }),
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
    // Volvieron el mismo día que salieron: 1 día × 10 × $5.000 = $50.000.
    const aporte = calcularAporteFactura(
      factura({ devueltos: 10, pagado: 50000 }),
      HOY,
    );

    expect(aporte).toEqual({ equiposActivos: 0, pagosPendientes: 0 });
  });

  it("si devolvió todo pero debe plata, aporta solo el saldo", () => {
    const aporte = calcularAporteFactura(
      factura({ devueltos: 10, pagado: 20000 }),
      HOY,
    );

    expect(aporte.equiposActivos).toBe(0);
    expect(aporte.pagosPendientes).toBe(30000);
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
        factura({ cantidad: 3, valorDia: 2000 }),
        // Cerrada: no suma nada.
        factura({ devueltos: 10, pagado: 50000 }),
      ],
      HOY,
    );

    expect(totales.equiposActivos).toBe(13);
    // $500.000 de la primera y 3 × $2.000 × 10 días = $60.000 de la segunda.
    expect(totales.pagosPendientes).toBe(560000);
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
    const facturas = [factura(), factura({ cantidad: 7, valorDia: 3000 })];

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
