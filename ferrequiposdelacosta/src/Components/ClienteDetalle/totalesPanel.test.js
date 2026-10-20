import {
  calcularAporteFactura,
  calcularTotalesFacturas,
  diferenciaPorEstado,
  diferenciaPorTipo,
} from "./facturaCuentas";
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

    expect(aporte).toEqual({
      equiposActivos: 0,
      pagosPendientes: 0,
      equiposPorTipo: {},
      pagosPorEstado: {},
    });
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
      equiposPorTipo: {},
      pagosPorEstado: {},
    });
  });
});

// El detalle de "Equipos activos": cuántos hay afuera de cada equipo.
describe("el detalle por equipo", () => {
  const conEquipos = (equipos, extra = {}) =>
    unaFactura({ fechaCreacion: "2026-08-10", equipos, ...extra });

  it("cuenta las unidades afuera de cada equipo, por su nombre", () => {
    const aporte = calcularAporteFactura(
      conEquipos([
        unEquipo({ nombre: "ANDAMIO", cantidad: 10 }),
        unEquipo({ nombre: "TABLÓN", cantidad: 4 }),
        unEquipo({ nombre: "ANDAMIO", cantidad: 2 }),
      ]),
      HOY,
    );

    expect(aporte.equiposPorTipo).toEqual({ ANDAMIO: 12, TABLÓN: 4 });
    expect(aporte.equiposActivos).toBe(16);
  });

  it("lo devuelto no está en el detalle", () => {
    const aporte = calcularAporteFactura(
      conEquipos([
        unEquipoDevuelto({ nombre: "ANDAMIO", cantidad: 4 }),
        unEquipo({ nombre: "ANDAMIO", cantidad: 6 }),
        unEquipoDevuelto({ nombre: "TABLÓN", cantidad: 3 }),
      ]),
      HOY,
    );

    expect(aporte.equiposPorTipo).toEqual({ ANDAMIO: 6 });
  });

  it("una factura que todavía no salió no aporta al detalle", () => {
    const aporte = calcularAporteFactura(
      factura({ fechaDespacho: "2026-09-01", fechaVencimiento: "2026-09-10" }),
      HOY,
    );

    expect(aporte.equiposPorTipo).toEqual({});
  });

  it("los nombres con puntos y espacios quedan tal cual", () => {
    const aporte = calcularAporteFactura(
      conEquipos([unEquipo({ nombre: " FORMALETAS 0.30 X 1.20 ", cantidad: 8 })]),
      HOY,
    );

    expect(aporte.equiposPorTipo).toEqual({ "FORMALETAS 0.30 X 1.20": 8 });
  });

  // El disparador suma diferencias y el repaso de madrugada recalcula de
  // cero: los dos tienen que dar el mismo detalle.
  it("el detalle de todas es la suma de los de cada una", () => {
    const totales = calcularTotalesFacturas(
      [
        conEquipos([unEquipo({ nombre: "ANDAMIO", cantidad: 10 })]),
        conEquipos([
          unEquipo({ nombre: "ANDAMIO", cantidad: 3 }),
          unEquipo({ nombre: "RUEDAS", cantidad: 8 }),
        ]),
      ],
      HOY,
    );

    expect(totales.equiposPorTipo).toEqual({ ANDAMIO: 13, RUEDAS: 8 });
    expect(totales.equiposActivos).toBe(21);
  });
});

describe("diferenciaPorTipo", () => {
  const conEquipos = (equipos) => unaFactura({ fechaCreacion: "2026-08-10", equipos });

  it("al devolver una parte, resta solo lo que volvió", () => {
    const antes = calcularAporteFactura(
      conEquipos([
        unEquipo({ nombre: "ANDAMIO", cantidad: 10 }),
        unEquipo({ nombre: "RUEDAS", cantidad: 4 }),
      ]),
      HOY,
    );
    const despues = calcularAporteFactura(
      conEquipos([
        unEquipoDevuelto({ nombre: "ANDAMIO", cantidad: 4 }),
        unEquipo({ nombre: "ANDAMIO", cantidad: 6 }),
        unEquipo({ nombre: "RUEDAS", cantidad: 4 }),
      ]),
      HOY,
    );

    // Las ruedas no se movieron: no aparecen.
    expect(diferenciaPorTipo(antes, despues)).toEqual({ ANDAMIO: -4 });
  });

  it("una factura nueva suma todo, y una borrada lo resta", () => {
    const doc = conEquipos([unEquipo({ nombre: "ANDAMIO", cantidad: 5 })]);
    const nada = calcularAporteFactura(null, HOY);
    const aporte = calcularAporteFactura(doc, HOY);

    expect(diferenciaPorTipo(nada, aporte)).toEqual({ ANDAMIO: 5 });
    expect(diferenciaPorTipo(aporte, nada)).toEqual({ ANDAMIO: -5 });
  });

  it("si no se movió ningún equipo, no hay nada que sumar", () => {
    const aporte = calcularAporteFactura(
      conEquipos([unEquipo({ nombre: "ANDAMIO", cantidad: 5 })]),
      HOY,
    );

    expect(diferenciaPorTipo(aporte, aporte)).toEqual({});
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
      equiposPorTipo: {},
      pagosPorEstado: {},
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

    expect(total).toEqual({
      ...sumaManual,
      equiposPorTipo: { Andamio: 17 },
      // Las dos están activas.
      pagosPorEstado: { activa: sumaManual.pagosPendientes },
    });
  });
});

// El detalle de "Pagos pendientes": cuánto se debe según el estado de la
// factura. Cada una pone su saldo entero en su casilla.
describe("el detalle por estado", () => {
  it("una activa pone su saldo en «activa»", () => {
    expect(calcularAporteFactura(factura(), HOY).pagosPorEstado).toEqual({ activa: 500000 });
  });

  it("la que devolvió todo y debe plata va en «cobro»", () => {
    const aporte = calcularAporteFactura(factura({ devueltos: 10, pagado: 20000 }), HOY);

    expect(aporte.pagosPorEstado).toEqual({ cobro: 30000 });
  });

  it("una vencida pone en «vencida» todo su saldo, con los días de más", () => {
    // Salió el 01 por 10 días: el 15 lleva varios vencida.
    const aporte = calcularAporteFactura(factura({ fechaDespacho: "2026-08-01" }), HOY);

    expect(aporte.pagosPorEstado).toEqual({ vencida: aporte.pagosPendientes });
  });

  it("la que todavía no salió y ya se debe va en «pendiente»", () => {
    const aporte = calcularAporteFactura(
      factura({ fechaDespacho: "2026-09-01", fechaVencimiento: "2026-09-10" }),
      HOY,
    );

    expect(aporte.pagosPorEstado).toEqual({ pendiente: 500000 });
  });

  it("la que no debe nada no tiene casilla", () => {
    const aporte = calcularAporteFactura(factura({ devueltos: 10, pagado: 50000 }), HOY);

    expect(aporte.pagosPorEstado).toEqual({});
  });

  // Las casillas tienen que sumar el número del recuadro: el detalle no puede
  // contradecir al total.
  it("las casillas de todas suman el total", () => {
    const totales = calcularTotalesFacturas(
      [
        factura(),
        factura({ cantidad: 3, valorDia: 2000 }),
        factura({ devueltos: 10, pagado: 20000 }),
        factura({ fechaDespacho: "2026-08-01" }),
      ],
      HOY,
    );
    const suma = Object.values(totales.pagosPorEstado).reduce((a, b) => a + b, 0);

    expect(Object.keys(totales.pagosPorEstado).sort()).toEqual(["activa", "cobro", "vencida"]);
    expect(totales.pagosPorEstado.activa).toBe(560000);
    expect(totales.pagosPorEstado.cobro).toBe(30000);
    expect(suma).toBe(totales.pagosPendientes);
  });
});

describe("diferenciaPorEstado", () => {
  it("al devolver todo debiendo plata, el saldo pasa de «activa» a «cobro»", () => {
    const antes = calcularAporteFactura(factura({ pagado: 20000 }), HOY);
    const despues = calcularAporteFactura(factura({ devueltos: 10, pagado: 20000 }), HOY);

    expect(diferenciaPorEstado(antes, despues)).toEqual({ activa: -480000, cobro: 30000 });
  });

  it("un abono solo baja su casilla", () => {
    const antes = calcularAporteFactura(factura(), HOY);
    const despues = calcularAporteFactura(factura({ abonos: [{ monto: 150000 }] }), HOY);

    expect(diferenciaPorEstado(antes, despues)).toEqual({ activa: -150000 });
  });

  it("si la plata no se movió, no hay nada que sumar", () => {
    const aporte = calcularAporteFactura(factura(), HOY);

    expect(diferenciaPorEstado(aporte, aporte)).toEqual({});
  });
});
