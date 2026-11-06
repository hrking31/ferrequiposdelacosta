import generarFacturaPdf from "./VistaFacturaPdf";
import generarReporteFacturasPdf from "./VistaReporteClientePdf";
import generarCuentaCobro from "./VistaCcPdf";
import generarCotizacion from "./VistaCotPdf";
import { unEquipoDevuelto, unaFactura } from "../../test/facturas";

// LO QUE DICEN LOS TRES PDF DE COBRO (2026-11-04). No se mira cómo se ven, sino
// qué tablas arman, en qué orden y con qué renglones: el papel falso anota lo
// que le piden dibujar.
const papel = vi.hoisted(() => ({ tablas: [], textos: [], hojasNuevas: 0, altoTabla: 10 }));

vi.mock("jspdf", () => ({
  default: class PapelFalso {
    internal = {
      pageSize: { getWidth: () => 215.9, getHeight: () => 279.4 },
      getNumberOfPages: () => 1,
    };
    text(texto) {
      papel.textos.push(texto);
    }
    addPage() {
      papel.hojasNuevas += 1;
    }
    setFontSize() {}
    setTextColor() {}
    setFont() {}
    setPage() {}
    addImage() {}
    save() {}
  },
}));

vi.mock("jspdf-autotable", () => ({
  default: (doc, opciones) => {
    papel.tablas.push(opciones);
    doc.lastAutoTable = { finalY: (opciones.startY || 0) + papel.altoTabla };
  },
}));

const cliente = { tipo: "persona", nombres: "ANA", apellido: "PÉREZ" };

const conPlata = (extra = {}) => ({
  id: "f1",
  ...unaFactura({
    numeroFactura: "0783",
    fechaCreacion: "2026-10-01",
    transporte: "Ida y vuelta",
    valorTransporte: 40000,
    equipos: [
      unEquipoDevuelto({
        nombre: "RANA",
        cantidad: 1,
        dias: 3,
        valorDia: 112000,
        fechaDespacho: "2026-10-01",
        fechaDevolucion: "2026-10-03",
      }),
    ],
    ...extra,
  }),
});

const conDescuentos = () => ({
  ...unaFactura({
    numeroFactura: "1001",
    fechaCreacion: "2026-10-01",
    pagos: [{ medio: "Efectivo", monto: 250000 }],
    equipos: [
      unEquipoDevuelto({
        nombre: "RANA",
        cantidad: 1,
        dias: 10,
        valorDia: 40000,
        fechaDespacho: "2026-10-01",
        fechaDevolucion: "2026-10-10",
        ampliaciones: [
          { fecha: "2026-10-08", dias: 2, desde: "2026-10-09", hasta: "2026-10-10", descuento: 50000 },
        ],
      }),
    ],
  }),
  id: "f2",
  descuentos: [{ fecha: "2026-10-12", monto: 20000, tipo: "sistema" }],
});

const rotulos = (tabla) => tabla.body.map((fila) => fila[0]);
const valorDe = (tabla, rotulo) => tabla.body.find((fila) => fila[0] === rotulo)?.[1];
const tablaCon = (rotulo) => papel.tablas.find((tabla) => tabla.body?.some((fila) => fila[0] === rotulo));
const posicionDe = (rotulo) => papel.tablas.indexOf(tablaCon(rotulo));

beforeEach(() => {
  papel.tablas = [];
  papel.textos = [];
  papel.hojasNuevas = 0;
  papel.altoTabla = 10;
});

describe("el PDF de una factura", () => {
  it("el depósito ya entregado no entra en la suma y va antes de los totales", () => {
    generarFacturaPdf({
      cliente,
      factura: conPlata({ valorDeposito: 100000, pagos: [{ medio: "Efectivo", monto: 350000 }] }),
    });

    const totales = tablaCon("TOTAL FACTURA");
    expect(rotulos(totales)).toEqual([
      "Subtotal",
      "Transporte",
      "TOTAL FACTURA",
      "Pagado",
      "SALDO PENDIENTE",
    ]);
    expect(valorDe(totales, "TOTAL FACTURA")).toContain("376.000");
    expect(valorDe(totales, "Pagado")).toMatch(/^- .*250\.000/);
    expect(valorDe(totales, "SALDO PENDIENTE")).toContain("126.000");

    expect(posicionDe("Recibido")).toBeLessThan(posicionDe("TOTAL FACTURA"));
    expect(rotulos(tablaCon("Recibido"))).toEqual(["Recibido", "En garantía"]);
  });

  it("el depósito sin entregar se suma al saldo con su signo", () => {
    generarFacturaPdf({ cliente, factura: conPlata({ valorDeposito: 100000 }) });

    const totales = tablaCon("TOTAL FACTURA");
    expect(rotulos(totales)).not.toContain("Pagado");
    expect(valorDe(totales, "Depósito por cobrar")).toMatch(/^\+ .*100\.000/);
    expect(valorDe(totales, "SALDO PENDIENTE")).toContain("476.000");
  });

  it("el equipo con descuento muestra el valor completo y, abajo, el rebajado", () => {
    generarFacturaPdf({ cliente, factura: conDescuentos() });

    const equipos = papel.tablas.find((tabla) => tabla.head?.[0]?.includes("Valor/día"));
    expect(equipos.body[0][6]).toContain("400.000");
    expect(equipos.body[1][1]).toContain("Descuento");
    expect(equipos.body[1][1]).toContain("50.000");
    expect(equipos.body[1][6]).toContain("350.000");
  });

  it("el único Descuento de los totales es el del cobro, y lleva signo", () => {
    generarFacturaPdf({ cliente, factura: conDescuentos() });

    const totales = tablaCon("TOTAL FACTURA");
    expect(rotulos(totales).filter((rotulo) => rotulo === "Descuento")).toHaveLength(1);
    expect(rotulos(totales).indexOf("Descuento")).toBeGreaterThan(
      rotulos(totales).indexOf("TOTAL FACTURA"),
    );
    expect(valorDe(totales, "Descuento")).toMatch(/^- .*20\.000/);
    expect(valorDe(totales, "SALDO PENDIENTE")).toContain("80.000");
  });

  it("si los totales no caben, pasan completos a otra hoja", () => {
    papel.altoTabla = 60;

    generarFacturaPdf({
      cliente,
      factura: conPlata({ valorDeposito: 100000, pagos: [{ medio: "Efectivo", monto: 350000 }] }),
    });

    expect(papel.hojasNuevas).toBeGreaterThan(0);
  });
});

describe("el reporte de varias facturas", () => {
  const generar = () =>
    generarReporteFacturasPdf({
      cliente,
      facturas: [
        conPlata({ valorDeposito: 100000, pagos: [{ medio: "Efectivo", monto: 350000 }] }),
        { ...conPlata({ numeroFactura: "0784", valorDeposito: 50000 }), id: "f3" },
      ],
    });

  it("cada factura y el resumen llevan Pagado sin depósito y el saldo que cuadra", () => {
    generar();

    const primera = tablaCon("TOTAL FACTURA");
    expect(valorDe(primera, "Pagado")).toMatch(/^- .*250\.000/);
    expect(valorDe(primera, "SALDO PENDIENTE")).toContain("126.000");

    const resumen = tablaCon("TOTAL FACTURAS");
    expect(valorDe(resumen, "Pagado")).toMatch(/^- .*250\.000/);
    expect(valorDe(resumen, "Depósito por cobrar")).toMatch(/^\+ .*50\.000/);
    // 752.000 de total - 250.000 pagado + 50.000 de depósito por cobrar.
    expect(valorDe(resumen, "SALDO PENDIENTE")).toContain("552.000");
  });

  it("no suma el renglón viejo de Depósito ni deja Depósito por devolver", () => {
    generar();

    const todos = papel.tablas.flatMap((tabla) => tabla.body.map((fila) => fila[0]));
    expect(todos).not.toContain("Depósito");
    expect(todos).not.toContain("Depósito por devolver");
  });

  it("el depósito va antes de los totales, en cada factura y en el resumen", () => {
    generar();

    const conTotales = papel.tablas
      .map((tabla, indice) => ({ tabla, indice }))
      .filter(({ tabla }) => tabla.body.some((fila) => /^TOTAL FACTURAS?$/.test(fila[0])));
    expect(conTotales).toHaveLength(3);
    conTotales.forEach(({ indice }) => {
      expect(papel.tablas[indice - 1].body[0][0]).toBe("Recibido");
    });
  });

  it("dice solo Descuento, con signo, y una sola vez en los totales", () => {
    generarReporteFacturasPdf({ cliente, facturas: [conDescuentos()] });

    const totales = tablaCon("TOTAL FACTURA");
    expect(rotulos(totales).filter((rotulo) => rotulo === "Descuento")).toHaveLength(1);
    expect(valorDe(totales, "Descuento")).toMatch(/^- .*20\.000/);

    const todos = papel.tablas.flatMap((tabla) => tabla.body.map((fila) => fila[0]));
    expect(todos).not.toContain("Descuento al cobrar");
    expect(valorDe(tablaCon("TOTAL FACTURAS"), "Descuento")).toMatch(/^- .*20\.000/);
  });

  it("el equipo con descuento se ve igual que en el PDF de una factura", () => {
    generarReporteFacturasPdf({ cliente, facturas: [conDescuentos()] });

    const equipos = papel.tablas.find((tabla) => tabla.head?.[0]?.includes("Valor/día"));
    expect(equipos.body[0][6]).toContain("400.000");
    expect(equipos.body[1][6]).toContain("350.000");
  });
});

describe("el PDF de la cuenta de cobro", () => {
  const item = (extra = {}) => ({
    factura: "",
    description: "RETROEXCAVADORA",
    quantity: 1,
    day: 8,
    price: 50000,
    subtotal: 400000,
    ...extra,
  });

  const cuenta = (extra = {}) => ({
    tipo: "persona",
    cuentaCobroId: "CC-1",
    empresa: "ANA PÉREZ",
    nit: "123",
    fecha: "2026-11-04",
    concepto: "ALQUILER",
    iva: false,
    subtotalNumero: 400000,
    total: 400000,
    pagado: 0,
    abonos: 0,
    valorDeposito: 0,
    items: [item()],
    ...extra,
  });

  const tablaDeEquipos = () => papel.tablas[0];

  it.each([
    ["solo días", [item({ unidad: "dias" })], "Días", 8],
    ["solo horas", [item({ unidad: "horas" })], "Horas", "8"],
    ["días y horas", [item({ unidad: "horas" }), item({ day: 3, unidad: "dias" })], "Duración", "8 horas"],
  ])("con %s la columna se llama como corresponde", (_caso, items, titulo, primerValor) => {
    generarCuentaCobro({ value: cuenta({ items }) });

    const [encabezado] = tablaDeEquipos().head;
    expect(encabezado[2]).toBe(titulo);
    expect(tablaDeEquipos().body[0][2]).toBe(primerValor);
  });

  it("a una empresa no le dibuja la columna Factura, aunque un ítem traiga número", () => {
    generarCuentaCobro({ value: cuenta({ tipo: "empresa", items: [item({ factura: "0783" })] }) });
    expect(tablaDeEquipos().head[0]).not.toContain("Factura");
  });

  it("a una persona sí se la dibuja", () => {
    generarCuentaCobro({ value: cuenta({ items: [item({ factura: "0783" })] }) });
    expect(tablaDeEquipos().head[0]).toContain("Factura");
  });

  it("el depósito va antes de los totales y fuera de la suma", () => {
    generarCuentaCobro({ value: cuenta({ valorDeposito: 100000, pagado: 350000 }) });

    expect(posicionDe("Recibido")).toBeLessThan(posicionDe("Total a Cancelar"));
    expect(papel.textos).toContain("DEPÓSITO");
    const totales = tablaCon("Total a Cancelar");
    expect(valorDe(totales, "Pagado")).toMatch(/^- .*250\.000/);
    expect(valorDe(totales, "Total a Cancelar")).toContain("150.000");
    expect(rotulos(totales)).not.toContain("Depósito");
    expect(papel.textos.join(" ")).toContain("LA SUMA DE");
    expect(papel.textos.find((texto) => String(texto).startsWith("LA SUMA DE"))).toContain("150.000");
  });
});

describe("el PDF de la cotización", () => {
  const cotizacionPdf = (extra = {}) => ({
    cotizacionId: "COT-1",
    tipo: "persona",
    empresa: "ANA",
    fecha: "2026-11-05",
    transporte: "Ida y vuelta",
    valorTransporte: 40000,
    iva: false,
    deposito: true,
    valorDeposito: 100000,
    // El total guardado: el PDF lo calcula desde las partes y no lo lee.
    total: "$ 380.000",
    items: [{ description: "ANDAMIO", quantity: 4, day: 3, price: 20000, subtotal: "$ 240.000" }],
    ...extra,
  });
  const renglones = () => papel.tablas[0].body;
  const fila = (rotulo) => renglones().find((r) => r[1] === rotulo || r[0] === rotulo);

  it("el depósito va entre el IVA y el transporte, y el TOTAL lo suma", () => {
    generarCotizacion(cotizacionPdf({ total: "$ 1" }));

    // El rótulo va en la primera columna o, si está vacía, en la segunda.
    const orden = renglones().map((r) => r[0] || r[1]);
    const cuenta = orden.slice(orden.indexOf("Subtotal"));
    expect(cuenta).toEqual(["Subtotal", "IVA", "Depósito", "Transporte", "TOTAL"]);
    expect(fila("Depósito")[1]).toBe("Se devuelve al recibir los equipos");
    expect(fila("Depósito")[2]).toContain("100.000");
    // 240.000 de equipos + 100.000 de depósito + 40.000 de transporte; no el
    // total guardado.
    expect(fila("TOTAL")[2]).toContain("380.000");
  });

  it("sin depósito el renglón va igual, en cero, y el total no lo suma", () => {
    generarCotizacion(cotizacionPdf({ deposito: false }));

    expect(fila("Depósito")[2]).toMatch(/\$\s*0(,00)?$/);
    expect(fila("TOTAL")[2]).toContain("280.000");
  });
});
