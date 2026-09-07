import construirCuentaCobroDesdeFacturas from "./cuentaCobroDesdeFacturas";
import {
  grupoAgregados,
  unEquipo,
  unEquipoDevuelto,
  unGrupo,
  unaFactura,
} from "../../test/facturas";

// La fecha de hoy se inyecta para que las pruebas no dependan del reloj real:
// hay equipos cuyos días corren hasta hoy (los de devolución indefinida).
const HOY = "2026-08-15";

const cliente = {
  tipo: "persona",
  nombres: "Ana",
  apellido: "Pérez",
  nit: "12345678",
  obra: "Torre 3",
  direccion: "Calle 45 # 20-10",
  telefono: "3001234567",
};

const empresa = {
  tipo: "empresa",
  razonSocial: "Constructora del Norte SAS",
  nit: "900427333-6",
  obra: "Bodega 7",
  direccion: "Vía 40 # 79-100",
};

// La rana del alta: 3 días a $100.000, devuelta el día que vencía.
//
// Se devuelve a propósito: un equipo que sigue afuera pasada la fecha acumula
// días de alquiler solo con el calendario, y eso ensuciaría todas las cuentas
// de acá abajo con días que estas pruebas no están mirando.
const rana = (extra = {}) =>
  unEquipoDevuelto({
    nombre: "RANA",
    cantidad: 1,
    dias: 3,
    valorDia: 100000,
    fechaDespacho: "2026-08-05",
    fechaVencimiento: "2026-08-07",
    fechaDevolucion: "2026-08-07",
    ...extra,
  });

const facturaCon = ({ equipos = [rana()], ...resto } = {}) => ({
  id: "f1",
  ...unaFactura({
    numeroFactura: "1234",
    fechaCreacion: "2026-08-05",
    aplicaIva: true,
    equipos,
    ...resto,
  }),
});

const facturaBase = facturaCon();

const construir = (facturas, quien = cliente) =>
  construirCuentaCobroDesdeFacturas({ cliente: quien, facturas, hoyIso: HOY });

describe("datos del cliente", () => {
  it("copia nombre, NIT, obra y dirección, y deja el concepto en blanco", () => {
    const cuenta = construir([facturaBase]);

    expect(cuenta.tipo).toBe("persona");
    expect(cuenta.empresa).toBe("Ana Pérez");
    expect(cuenta.nit).toBe("12345678");
    expect(cuenta.obra).toBe("Torre 3");
    expect(cuenta.direccion).toBe("Calle 45 # 20-10");
    // El concepto lo escribe quien emite el documento.
    expect(cuenta.concepto).toBe("");
    expect(cuenta.fecha).toBe(HOY);
  });

  it("de una empresa toma la razón social", () => {
    expect(construir([facturaBase], empresa).empresa).toBe(
      "Constructora del Norte SAS",
    );
  });

  it("no copia el teléfono: la cuenta de cobro no lo lleva", () => {
    expect(construir([facturaBase])).not.toHaveProperty("telefono");
  });
});

describe("la columna del número de factura", () => {
  it("a una persona le llena el número, aparte de la descripción", () => {
    const [item] = construir([facturaBase]).items;
    expect(item.factura).toBe("1234");
    expect(item.description).toBe("RANA");
  });

  it("a una empresa la deja vacía: ahí el documento no dibuja la columna", () => {
    const [item] = construir([facturaBase], empresa).items;
    expect(item.factura).toBe("");
    expect(item.description).toBe("RANA");
  });

  it("una factura sin número se rotula s/n", () => {
    const sinNumero = facturaCon();
    delete sinNumero.factura.numeroFactura;
    expect(construir([sinNumero]).items[0].factura).toBe("s/n");
  });

  it("el mismo número se repite en cada equipo de esa factura", () => {
    const dosEquipos = facturaCon({
      equipos: [rana(), rana({ nombre: "ANDAMIO" })],
    });

    expect(construir([dosEquipos]).items.map((i) => i.factura)).toEqual([
      "1234",
      "1234",
    ]);
  });
});

describe("los equipos como ítems", () => {
  it("copia cantidad, días, valor y las dos fechas", () => {
    const [item] = construir([facturaBase]).items;

    expect(item.quantity).toBe(1);
    expect(item.day).toBe(3);
    expect(item.price).toBe(100000);
    expect(item.subtotal).toBe(300000);
    expect(item.fechaDespacho).toBe("2026-08-05");
    expect(item.fechaDevolucion).toBe("2026-08-07");
  });

  it("suma los días de las renovaciones a los del alquiler", () => {
    // Se le dieron 2 días más y volvió el 09: estuvo 5 días afuera, y eso es
    // lo que quedó escrito en la línea al cerrarla.
    const conAmpliacion = facturaCon({
      equipos: [
        rana({
          dias: 5,
          fechaVencimiento: "2026-08-09",
          fechaDevolucion: "2026-08-09",
          ampliaciones: [
            {
              fechaAnterior: "2026-08-07",
              fechaNueva: "2026-08-09",
              diasAmpliados: 2,
              descuentoRealizado: 0,
            },
          ],
        }),
      ],
    });

    const [item] = construir([conAmpliacion]).items;
    expect(item.day).toBe(5);
    expect(item.subtotal).toBe(500000);
    expect(item.fechaDevolucion).toBe("2026-08-09");
  });

  it("al equipo con devolución indefinida le cobra los días hasta hoy", () => {
    const indefinido = facturaCon({
      equipos: [
        // Sigue afuera: por eso los días corren hasta hoy.
        unEquipo({
          nombre: "RANA",
          cantidad: 1,
          dias: 3,
          valorDia: 100000,
          fechaDespacho: "2026-08-05",
          fechaVencimiento: "2026-08-07",
          vencimientoIndefinido: true,
        }),
      ],
    });

    const [item] = construir([indefinido]).items;
    // Del 5 al 15 de agosto, contando el día de salida, son 11 días.
    expect(item.day).toBe(11);
    expect(item.fechaDevolucion).toBe(HOY);
    expect(item.subtotal).toBe(1100000);
  });

  it("pone primero los equipos del alta y después los agregados", () => {
    const conAgregado = facturaCon({
      grupos: [
        unGrupo({ fechaSolicitud: "2026-08-05", equipos: [rana()] }),
        unGrupo({
          grupo: grupoAgregados(1),
          fechaSolicitud: "2026-08-06",
          equipos: [rana({ nombre: "ANDAMIO" })],
        }),
      ],
    });

    expect(construir([conAgregado], empresa).items.map((i) => i.description)).toEqual([
      "RANA",
      "ANDAMIO",
    ]);
  });
});

describe("el resumen", () => {
  it("suma subtotal, IVA, depósito y transporte de todas las facturas", () => {
    const otra = {
      ...facturaCon({
        numeroFactura: "1235",
        valorDeposito: 120000,
        valorTransporte: 80000,
        transporte: "Ida y vuelta",
        equipos: [
          unEquipoDevuelto({
            nombre: "ANDAMIO",
            cantidad: 2,
            dias: 1,
            valorDia: 50000,
            fechaDespacho: "2026-08-10",
            fechaVencimiento: "2026-08-10",
            fechaDevolucion: "2026-08-10",
          }),
        ],
      }),
      id: "f2",
    };

    const cuenta = construir([facturaBase, otra]);

    expect(cuenta.subtotalNumero).toBe(400000); // 300.000 + 100.000
    // El IVA sale del ALQUILER de cada factura, y de nada más: los $80.000 de
    // flete de la segunda no tributan, ni tributa el depósito.
    expect(cuenta.ivaNumero).toBeCloseTo(300000 * 0.19 + 100000 * 0.19, 2);
    expect(cuenta.valorDeposito).toBe(120000);
    expect(cuenta.valorTransporte).toBe(80000);
    expect(cuenta.iva).toBe(true);
    expect(cuenta.transporte).toBe("Ida y vuelta");
  });

  it("sin transporte cobrado deja el select en Sin transporte", () => {
    const cuenta = construir([facturaBase]);
    expect(cuenta.transporte).toBe("Sin transporte");
    expect(cuenta.valorTransporte).toBe(0);
  });

  it("suma el depósito y el transporte de todos los despachos", () => {
    const conAgregado = facturaCon({
      grupos: [
        unGrupo({
          fechaSolicitud: "2026-08-05",
          valorDeposito: 50000,
          transporte: "Solo ida",
          valorTransporte: 30000,
          equipos: [rana()],
        }),
        unGrupo({
          grupo: grupoAgregados(1),
          fechaSolicitud: "2026-08-06",
          valorDeposito: 20000,
          transporte: "Solo ida",
          valorTransporte: 10000,
          equipos: [rana({ nombre: "ANDAMIO" })],
        }),
      ],
    });

    const cuenta = construir([conAgregado]);
    expect(cuenta.valorDeposito).toBe(70000);
    expect(cuenta.valorTransporte).toBe(40000);
  });

  it("saca el descuento de las renovaciones a un renglón propio", () => {
    const conDescuento = facturaCon({
      equipos: [
        rana({
          dias: 5,
          fechaVencimiento: "2026-08-09",
          fechaDevolucion: "2026-08-09",
          ampliaciones: [
            {
              fechaAnterior: "2026-08-07",
              fechaNueva: "2026-08-09",
              diasAmpliados: 2,
              descuentoRealizado: 50000,
            },
          ],
        }),
      ],
    });

    const cuenta = construir([conDescuento]);
    // El ítem va a precio de lista: 5 días x $100.000.
    expect(cuenta.items[0].subtotal).toBe(500000);
    expect(cuenta.subtotalNumero).toBe(500000);
    expect(cuenta.descuento).toBe(50000);
    // Y el subtotal ya descontado es el que lleva IVA.
    expect(cuenta.ivaNumero).toBeCloseTo((500000 - 50000) * 0.19, 2);
  });

  it("sin descuentos el renglón queda en cero", () => {
    expect(construir([facturaBase]).descuento).toBe(0);
  });
});

describe("lo que se cobra es el saldo", () => {
  it("descuenta lo pagado y los abonos del total", () => {
    const conPagos = facturaCon({
      pagos: [{ medio: "Efectivo", monto: 200000 }],
      abonos: [{ fecha: "2026-08-10", medio: "Nequi", monto: 57000, tipo: "cliente" }],
    });

    const cuenta = construir([conPagos]);

    // 3 días × $100.000 más el 19%.
    expect(cuenta.total).toBe(357000);
    expect(cuenta.pagado).toBe(200000);
    expect(cuenta.abonos).toBe(57000);
    expect(cuenta.saldo).toBe(100000);
  });

  it("si el cliente pagó de más, el saldo no baja de cero", () => {
    const sobrepagada = facturaCon({
      pagos: [{ medio: "Efectivo", monto: 400000 }],
    });

    expect(construir([sobrepagada]).saldo).toBe(0);
  });

  it("sin pagos, el saldo es el total", () => {
    const cuenta = construir([facturaBase]);
    expect(cuenta.pagado).toBe(0);
    expect(cuenta.abonos).toBe(0);
    expect(cuenta.saldo).toBe(cuenta.total);
  });

  it("el desglose cuadra con el total de las facturas", () => {
    const completa = facturaCon({
      valorDeposito: 120000,
      valorTransporte: 80000,
      transporte: "Ida y vuelta",
    });

    const cuenta = construir([completa]);
    const desglose =
      cuenta.subtotalNumero -
      cuenta.descuento +
      cuenta.ivaNumero +
      cuenta.valorDeposito +
      cuenta.valorTransporte;

    expect(desglose).toBeCloseTo(cuenta.total, 2);
  });
});

describe("marca de origen", () => {
  it("queda marcada como traída de las facturas", () => {
    expect(construir([facturaBase]).desdeFacturas).toBe(true);
  });

  it("sin facturas devuelve una cuenta vacía pero con los datos del cliente", () => {
    const cuenta = construir([]);
    expect(cuenta.items).toEqual([]);
    expect(cuenta.total).toBe(0);
    expect(cuenta.saldo).toBe(0);
    expect(cuenta.iva).toBe(false);
    expect(cuenta.empresa).toBe("Ana Pérez");
  });
});
