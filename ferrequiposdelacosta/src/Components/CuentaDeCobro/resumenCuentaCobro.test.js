import resumenCuentaCobro, {
  columnaDeTiempo,
  textoDeTiempo,
  valorDeFila,
} from "./resumenCuentaCobro";

const etiquetas = (filas) => filas.map(({ etiqueta }) => etiqueta);
const fila = (filas, etiqueta) => filas.find((f) => f.etiqueta === etiqueta);

// Una cuenta escrita a mano: $376.000 sin IVA, como la 0783.
const aMano = (extra = {}) => ({
  subtotalNumero: 357000,
  valorTransporte: 19000,
  ivaNumero: 0,
  iva: false,
  descuento: 0,
  total: 376000,
  pagado: 0,
  abonos: 0,
  valorDeposito: 0,
  ...extra,
});

describe("el depósito va aparte del total", () => {
  it("pagó $350.000 y el depósito está completo: se cobran $126.000", () => {
    const { filas, filasDeposito, aCancelar } = resumenCuentaCobro(
      aMano({ pagado: 350000, valorDeposito: 100000 }),
    );

    expect(aCancelar).toBe(126000);
    expect(etiquetas(filas)).toEqual(["Subtotal", "Transporte", "Total", "Pagado"]);
    expect(fila(filas, "Pagado").valor).toBe(250000);
    expect(filasDeposito).toEqual([
      { etiqueta: "Recibido", valor: 100000, siempre: true },
      { etiqueta: "En garantía", valor: 100000 },
    ]);
  });

  it("sin ningún pago, el depósito se cobra y se ve en la suma", () => {
    const { filas, filasDeposito, aCancelar } = resumenCuentaCobro(
      aMano({ valorDeposito: 100000 }),
    );

    expect(aCancelar).toBe(476000);
    expect(etiquetas(filas)).toEqual([
      "Subtotal",
      "Transporte",
      "Total",
      "Depósito por cobrar",
    ]);
    expect(filasDeposito).toEqual([
      { etiqueta: "Recibido", valor: 0, siempre: true },
      { etiqueta: "Por cobrar", valor: 100000 },
    ]);
  });

  it("si pagó $60.000, todo cubre el depósito y solo se cobra lo que falta de él", () => {
    const { filas, filasDeposito, aCancelar } = resumenCuentaCobro(
      aMano({ pagado: 60000, valorDeposito: 100000 }),
    );

    expect(aCancelar).toBe(416000);
    expect(fila(filas, "Pagado")).toBeUndefined();
    expect(fila(filas, "Depósito por cobrar").valor).toBe(40000);
    expect(etiquetas(filasDeposito)).toEqual(["Recibido", "Por cobrar", "En garantía"]);
  });

  it("los abonos completan el depósito después de los pagos", () => {
    const { filas, aCancelar } = resumenCuentaCobro(
      aMano({ pagado: 60000, abonos: 50000, valorDeposito: 100000 }),
    );

    expect(fila(filas, "Abonos").valor).toBe(10000);
    expect(aCancelar).toBe(366000);
  });

  it("escribir el depósito no cambia el total", () => {
    const { filas } = resumenCuentaCobro(aMano({ pagado: 100000, valorDeposito: 50000 }));
    expect(fila(filas, "Total").valor).toBe(376000);
  });
});

describe("los renglones", () => {
  it("sin pagos ni depósito no repite el total", () => {
    const { filas, filasDeposito, aCancelar, hayMovimientos } = resumenCuentaCobro(aMano());

    expect(etiquetas(filas)).toEqual(["Subtotal", "Transporte"]);
    expect(filasDeposito).toEqual([]);
    expect(aCancelar).toBe(376000);
    expect(hayMovimientos).toBe(false);
  });

  it("el IVA y el descuento salen solo si tienen valor, antes del total", () => {
    const { filas } = resumenCuentaCobro(
      aMano({ iva: true, ivaNumero: 19000, descuento: 5000, pagado: 1000 }),
    );

    expect(etiquetas(filas)).toEqual([
      "Subtotal",
      "Descuento",
      "IVA (19%)",
      "Transporte",
      "Total",
      "Pagado",
    ]);
  });

  it("lo que resta y lo que suma llevan su signo", () => {
    const { filas } = resumenCuentaCobro(aMano({ pagado: 150000, valorDeposito: 100000 }));

    expect(valorDeFila(fila(filas, "Pagado"))).toMatch(/^- /);
    expect(valorDeFila(fila(filas, "Total"))).not.toMatch(/^[-+] /);
    const pendiente = resumenCuentaCobro(aMano({ valorDeposito: 100000 }));
    expect(valorDeFila(fila(pendiente.filas, "Depósito por cobrar"))).toMatch(/^\+ /);
  });

  it("si pagó de más, lo que se cobra no baja de cero", () => {
    expect(resumenCuentaCobro(aMano({ pagado: 500000 })).aCancelar).toBe(0);
  });
});

describe("el saldo a favor, como en la factura", () => {
  it("total $500.000 y pagó $550.000: cobra $0 y quedan $50.000 a favor", () => {
    const { aCancelar, saldoAFavor, cierre } = resumenCuentaCobro(
      aMano({ subtotalNumero: 500000, valorTransporte: 0, total: 500000, pagado: 550000 }),
    );

    expect(aCancelar).toBe(0);
    expect(saldoAFavor).toBe(50000);
    expect(cierre).toEqual({ etiqueta: "Saldo a favor", valor: 50000, aFavor: true });
  });

  it("con depósito: $100.000 quedan de garantía y lo demás sobra", () => {
    // Total $376.000, depósito $100.000, consignó $500.000: $400.000 pagan la
    // cuenta y quedan $24.000 a favor.
    const { aCancelar, saldoAFavor, filasDeposito } = resumenCuentaCobro(
      aMano({ pagado: 500000, valorDeposito: 100000 }),
    );

    expect(aCancelar).toBe(0);
    expect(saldoAFavor).toBe(24000);
    expect(fila(filasDeposito, "En garantía").valor).toBe(100000);
  });

  it("si debe, cierra con lo que se cobra y no hay saldo a favor", () => {
    const { saldoAFavor, cierre } = resumenCuentaCobro(aMano({ pagado: 300000 }));

    expect(saldoAFavor).toBe(0);
    expect(cierre).toEqual({ etiqueta: "Total a Cancelar", valor: 76000, aFavor: false });
  });

  it("pagado justo: cierra en $0 a cancelar, sin saldo a favor", () => {
    const { cierre } = resumenCuentaCobro(aMano({ pagado: 376000 }));
    expect(cierre).toEqual({ etiqueta: "Total a Cancelar", valor: 0, aFavor: false });
  });

  it("traída de las facturas: un pago de más de una factura queda a favor", () => {
    const { aCancelar, saldoAFavor } = resumenCuentaCobro(
      aMano({
        total: 200000,
        desgloseFacturas: {
          pagado: 230000,
          abonos: 0,
          retenido: 0,
          devueltoDeMas: 0,
          deposito: {
            recibido: 0,
            porCobrar: 0,
            aplicado: 0,
            devuelto: 0,
            enGarantia: 0,
            porDevolver: 0,
          },
        },
      }),
    );

    expect(aCancelar).toBe(0);
    expect(saldoAFavor).toBe(30000);
  });
});

describe("el tiempo de cada ítem", () => {
  it("dice la unidad, en singular o plural y con coma decimal", () => {
    expect(textoDeTiempo({ day: 8, unidad: "horas" })).toBe("8 horas");
    expect(textoDeTiempo({ day: "1", unidad: "horas" })).toBe("1 hora");
    expect(textoDeTiempo({ day: "1.5", unidad: "horas" })).toBe("1,5 horas");
    expect(textoDeTiempo({ day: 3, unidad: "dias" })).toBe("3 días");
    expect(textoDeTiempo({ day: 1 })).toBe("1 día");
  });

  it("el renglón sin tiempo, como el de los daños, queda vacío", () => {
    expect(textoDeTiempo({ day: "" })).toBe("");
  });

  it("si todo va por días, la columna queda como siempre", () => {
    const columna = columnaDeTiempo([{ day: 3, unidad: "dias" }, { day: 2 }]);

    expect(columna.titulo).toBe("Días");
    expect(columna.valorDe({ day: 3, unidad: "dias" })).toBe(3);
  });

  it("si todo va por horas, la columna se llama Horas y lleva solo el número", () => {
    const items = [
      { day: 8, unidad: "horas" },
      { day: "1.5", unidad: "horas" },
      // Los daños no llevan tiempo: no cuentan como días.
      { day: "", description: "DAÑOS" },
    ];
    const columna = columnaDeTiempo(items);

    expect(columna.titulo).toBe("Horas");
    expect(columna.valorDe(items[0])).toBe("8");
    expect(columna.valorDe(items[1])).toBe("1,5");
    expect(columna.valorDe(items[2])).toBe("");
  });

  it("solo al combinar días y horas, la columna dice la unidad de cada uno", () => {
    const columna = columnaDeTiempo([
      { day: 8, unidad: "horas" },
      { day: 3, unidad: "dias" },
    ]);

    expect(columna.titulo).toBe("Duración");
    expect(columna.valorDe({ day: 8, unidad: "horas" })).toBe("8 horas");
    expect(columna.valorDe({ day: 3, unidad: "dias" })).toBe("3 días");
  });
});

describe("la cuenta traída de las facturas", () => {
  const desgloseFacturas = {
    pagado: 250000,
    abonos: 26000,
    retenido: 30000,
    devueltoDeMas: 6000,
    deposito: {
      recibido: 100000,
      porCobrar: 0,
      aplicado: 26000,
      devuelto: 10000,
      enGarantia: 0,
      porDevolver: 34000,
    },
  };

  it("usa la cuenta de las facturas, no la regla de lo digitado", () => {
    const { filas, filasDeposito, aCancelar } = resumenCuentaCobro(
      aMano({
        total: 406000,
        pagado: 350000,
        abonos: 26000,
        valorDeposito: 100000,
        desgloseFacturas,
      }),
    );

    expect(fila(filas, "Pagado").valor).toBe(250000);
    expect(fila(filas, "Retenido por daños").valor).toBe(30000);
    expect(fila(filas, "Devuelto al cliente").valor).toBe(6000);
    // 406.000 - 250.000 - 26.000 - 30.000 + 6.000
    expect(aCancelar).toBe(106000);
    expect(etiquetas(filasDeposito)).toEqual([
      "Recibido",
      "Retenido por daños",
      "Aplicado a la factura",
      "Devuelto",
      "Por devolver",
    ]);
  });
});
