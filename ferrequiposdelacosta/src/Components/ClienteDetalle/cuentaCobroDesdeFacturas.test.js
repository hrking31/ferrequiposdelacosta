import construirCuentaCobroDesdeFacturas from "./cuentaCobroDesdeFacturas";

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

// Una factura simple: un equipo, 3 días a $100.000, con IVA y sin pagos.
//
// El equipo se devolvió el día que vencía, a propósito: un equipo que sigue
// afuera pasada la fecha acumula días de alquiler solos (ver
// calcularAmpliacionEquipo), y eso ensuciaría todas las cuentas de acá abajo
// con días que estas pruebas no están mirando.
const facturaBase = {
  id: "f1",
  numeroFactura: 1234,
  fecha: "2026-08-05",
  aplicaIva: true,
  subtotal: 300000,
  iva: 57000,
  valorTotal: 357000,
  equipos: [
    {
      nombre: "RANA",
      cantidad: 1,
      dias: 3,
      valor: 100000,
      cantidadDevuelta: 1,
      fechaDespacho: "2026-08-05",
      fechaVencimiento: "2026-08-07",
      fechaDevolucion: "2026-08-07",
    },
  ],
};

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
    const sinNumero = { ...facturaBase, numeroFactura: undefined };
    expect(construir([sinNumero]).items[0].factura).toBe("s/n");
  });

  it("el mismo número se repite en cada equipo de esa factura", () => {
    const dosEquipos = {
      ...facturaBase,
      equipos: [
        facturaBase.equipos[0],
        { ...facturaBase.equipos[0], nombre: "ANDAMIO" },
      ],
    };

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
    const conAmpliacion = {
      ...facturaBase,
      equipos: [
        {
          ...facturaBase.equipos[0],
          fechaVencimiento: "2026-08-09",
          // Devuelve el día que vence el plazo ya ampliado. Si quedara la
          // fecha del alta (el 07) sería una devolución anticipada de 2
          // días, y esta prueba mira las renovaciones, no ese crédito.
          fechaDevolucion: "2026-08-09",
          ampliaciones: [
            {
              fechaAnterior: "2026-08-07",
              fechaNueva: "2026-08-09",
              dias: 2,
              descuento: 0,
            },
          ],
        },
      ],
    };

    const [item] = construir([conAmpliacion]).items;
    expect(item.day).toBe(5);
    expect(item.subtotal).toBe(500000);
    expect(item.fechaDevolucion).toBe("2026-08-09");
  });

  it("al equipo con devolución indefinida le cobra los días hasta hoy", () => {
    const indefinido = {
      ...facturaBase,
      equipos: [
        {
          ...facturaBase.equipos[0],
          // Sigue afuera: por eso los días corren hasta hoy.
          cantidadDevuelta: 0,
          fechaDevolucion: undefined,
          vencimientoIndefinido: true,
          fechaVencimiento: "2026-08-07",
        },
      ],
    };

    const [item] = construir([indefinido]).items;
    // 3 días de alquiler + los 8 que van del 7 al 15 de agosto.
    expect(item.day).toBe(11);
    expect(item.fechaDevolucion).toBe(HOY);
    // Despacho + días - 1 tiene que dar la fecha de devolución mostrada.
    expect(item.subtotal).toBe(1100000);
  });

  it("pone primero los equipos del alta y después los agregados", () => {
    const conAgregado = {
      ...facturaBase,
      equipos: [
        { ...facturaBase.equipos[0], nombre: "ANDAMIO", agregadoPosteriormente: true },
        facturaBase.equipos[0],
      ],
    };

    expect(construir([conAgregado], empresa).items.map((i) => i.description)).toEqual([
      "RANA",
      "ANDAMIO",
    ]);
  });

  it("acepta las facturas viejas que guardan los equipos como nombres sueltos", () => {
    const vieja = { ...facturaBase, equipos: ["MEZCLADORA", "VIBRADOR"] };
    const items = construir([vieja], empresa).items;

    expect(items.map((i) => i.description)).toEqual(["MEZCLADORA", "VIBRADOR"]);
    // Sin datos para calcular: quedan en cero para completarlos a mano.
    expect(items[0].quantity).toBe(0);
    expect(items[0].subtotal).toBe(0);
  });
});

describe("el resumen", () => {
  it("suma subtotal, IVA, depósito y transporte de todas las facturas", () => {
    const otra = {
      ...facturaBase,
      id: "f2",
      numeroFactura: 1235,
      deposito: 120000,
      valorTransporte: 80000,
      transporte: "Ida y vuelta",
      valorTotal: 557000,
      equipos: [
        {
          nombre: "ANDAMIO",
          cantidad: 2,
          dias: 1,
          valor: 50000,
          cantidadDevuelta: 2,
          fechaDespacho: "2026-08-10",
          fechaVencimiento: "2026-08-10",
          fechaDevolucion: "2026-08-10",
        },
      ],
    };

    const cuenta = construir([facturaBase, otra]);

    expect(cuenta.subtotalNumero).toBe(400000); // 300.000 + 100.000
    expect(cuenta.ivaNumero).toBe(114000); // 57.000 de cada una
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

  it("suma el depósito y el transporte de los equipos agregados después", () => {
    const conAgregado = {
      ...facturaBase,
      deposito: 50000,
      valorTransporte: 30000,
      equipos: [
        facturaBase.equipos[0],
        {
          ...facturaBase.equipos[0],
          nombre: "ANDAMIO",
          agregadoPosteriormente: true,
          deposito: 20000,
          valorTransporte: 10000,
        },
      ],
    };

    const cuenta = construir([conAgregado]);
    expect(cuenta.valorDeposito).toBe(70000);
    expect(cuenta.valorTransporte).toBe(40000);
  });

  it("saca el descuento de las renovaciones a un renglón propio", () => {
    const conDescuento = {
      ...facturaBase,
      equipos: [
        {
          ...facturaBase.equipos[0],
          fechaVencimiento: "2026-08-09",
          // Igual que arriba: devuelve al vencer el plazo ampliado, para que
          // no se mezcle el crédito por días sin usar con el descuento.
          fechaDevolucion: "2026-08-09",
          ampliaciones: [
            {
              fechaAnterior: "2026-08-07",
              fechaNueva: "2026-08-09",
              dias: 2,
              descuento: 50000,
            },
          ],
        },
      ],
    };

    const cuenta = construir([conDescuento]);
    // El ítem va a precio de lista: 5 días x $100.000.
    expect(cuenta.items[0].subtotal).toBe(500000);
    expect(cuenta.subtotalNumero).toBe(500000);
    expect(cuenta.descuento).toBe(50000);
    // Y el subtotal ya descontado es el que llevó IVA en la factura.
    expect(cuenta.ivaNumero).toBeCloseTo((500000 - 50000) * 0.19, 2);
  });

  it("sin descuentos el renglón queda en cero", () => {
    expect(construir([facturaBase]).descuento).toBe(0);
  });
});

describe("lo que se cobra es el saldo", () => {
  it("descuenta lo pagado y los abonos del total", () => {
    const conPagos = {
      ...facturaBase,
      valorTotal: 357000,
      pagos: [{ medio: "Efectivo", monto: 200000 }],
      abonos: [{ fecha: "2026-08-10", medio: "Nequi", monto: 57000 }],
    };

    const cuenta = construir([conPagos]);

    expect(cuenta.total).toBe(357000);
    expect(cuenta.pagado).toBe(200000);
    expect(cuenta.abonos).toBe(57000);
    expect(cuenta.saldo).toBe(100000);
  });

  it("si el cliente pagó de más, el saldo no baja de cero", () => {
    const sobrepagada = {
      ...facturaBase,
      pagos: [{ medio: "Efectivo", monto: 400000 }],
    };

    expect(construir([sobrepagada]).saldo).toBe(0);
  });

  it("sin pagos, el saldo es el total", () => {
    const cuenta = construir([facturaBase]);
    expect(cuenta.pagado).toBe(0);
    expect(cuenta.abonos).toBe(0);
    expect(cuenta.saldo).toBe(cuenta.total);
  });

  it("el desglose cuadra con el total de las facturas", () => {
    const completa = {
      ...facturaBase,
      deposito: 120000,
      valorTransporte: 80000,
      transporte: "Ida y vuelta",
      valorTotal: 557000,
    };

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
