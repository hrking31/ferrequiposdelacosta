// Las pruebas de lo que se DIBUJA: la historia de fechas de un equipo.
//
// Existen por un motivo concreto. Seguimiento y Detalle Cliente armaban sus
// chips por separado y terminaron contando cosas distintas de la misma
// factura: para 10 chazas con 2 días de renovación y 7 días vencidos, Detalle
// decía "+2 días · $400.000" y Seguimiento "+9 días · $1.800.000", con los 7
// días vencidos repetidos al lado en las dos. Se leía como si se cobraran
// $3.200.000 cuando eran $1.800.000.
//
// Ahora las dos piden la lista acá. Estas pruebas fijan QUÉ dice cada chip,
// que es lo que se separó; el color y la variante son de cada pantalla.
import { describe, it, expect } from "vitest";
import { agruparChipsFechas, describirFechasEquipo } from "./facturaPresentacion";

const HOY = "2026-08-15";

// Busca un chip por su clave y devuelve su texto, para no depender del orden
// en pruebas que solo miran uno.
//
// Los centavos y el espacio del "$" se normalizan a propósito: Node y el
// navegador no formatean los pesos igual —acá salen como "$ 400.000,00" y en
// pantalla como "$ 400.000"— y el separador que pone el formateador es un
// espacio duro (U+00A0), no uno común. Lo que estas pruebas cuidan es la
// CIFRA, no cómo la escribe cada motor.
const textoDe = (chips, clave) =>
  chips
    .find((chip) => chip.clave === clave)
    ?.label.replace(/,00(?!\d)/g, "")
    .replace(/\u00a0/g, " ");
const tonoDe = (chips, clave) => chips.find((chip) => chip.clave === clave)?.tono;

describe("describirFechasEquipo", () => {
  // El caso de la factura 1573, con los números reales que lo destaparon.
  const chazas = {
    cantidad: 10,
    valor: 20000,
    dias: 3,
    fechaDespacho: "2026-08-03",
    fechaVencimiento: "2026-08-07",
    ampliaciones: [
      { fechaAnterior: "2026-08-05", fechaNueva: "2026-08-07", dias: 2, descuento: 0 },
    ],
  };

  it("no mete los días vencidos dentro de los días pactados", () => {
    const chips = describirFechasEquipo(chazas, HOY);

    // Se renovó por 2 días: eso vale 10 × 2 × $20.000.
    expect(textoDe(chips, "ampliacion")).toBe("+2 días · $ 400.000");
    // Y desde el 7 al 15 corrieron 8 días más, que van aparte.
    expect(textoDe(chips, "diasVencidos")).toBe("8 días vencidos · $ 1.600.000");
  });

  it("la fecha vigente ya vencida es la única urgente; las anteriores quedan como historia", () => {
    const chips = describirFechasEquipo(chazas, HOY);

    expect(textoDe(chips, "vencimiento")).toBe("Venció 07/08/2026");
    expect(tonoDe(chips, "vencimiento")).toBe("urgente");

    // La fecha por la que pasó antes de la renovación: se resolvió dándole más
    // días, así que no compite con la vigente.
    expect(textoDe(chips, "vencimiento-0")).toBe("Vencía 05/08/2026");
    expect(tonoDe(chips, "vencimiento-0")).toBe("resuelto");
  });

  // Con una sola ampliación "Vencía 05/08" se entiende sin explicación. Recién
  // cuando hubo varias hace falta saber cuál fue primero.
  it("numera los vencimientos solo cuando hubo más de uno", () => {
    const chips = describirFechasEquipo(
      {
        ...chazas,
        fechaVencimiento: "2026-08-11",
        ampliaciones: [
          { fechaAnterior: "2026-08-05", fechaNueva: "2026-08-07", dias: 2, descuento: 0 },
          { fechaAnterior: "2026-08-07", fechaNueva: "2026-08-11", dias: 4, descuento: 0 },
        ],
      },
      HOY,
    );
    expect(textoDe(chips, "vencimiento-0")).toBe("1er vencimiento 05/08/2026");
    expect(textoDe(chips, "vencimiento-1")).toBe("2do vencimiento 07/08/2026");
  });

  it("el día que vence va en alerta, no en urgente", () => {
    const chips = describirFechasEquipo(
      { cantidad: 1, valor: 100, fechaVencimiento: HOY },
      HOY,
    );
    expect(textoDe(chips, "vencimiento")).toBe("Vence hoy 15/08/2026");
    expect(tonoDe(chips, "vencimiento")).toBe("alerta");
  });

  it("un equipo con plazo por delante no muestra nada urgente", () => {
    const chips = describirFechasEquipo(
      { cantidad: 1, valor: 100, fechaVencimiento: "2026-08-20" },
      HOY,
    );
    expect(textoDe(chips, "vencimiento")).toBe("Devuelve 20/08/2026");
    expect(tonoDe(chips, "vencimiento")).toBe("neutro");
    expect(textoDe(chips, "diasVencidos")).toBeUndefined();
  });

  it("el descuento se resta de los días pactados y además se muestra aparte", () => {
    const chips = describirFechasEquipo(
      {
        cantidad: 1,
        valor: 100000,
        fechaVencimiento: "2026-08-09",
        ampliaciones: [{ dias: 4, descuento: 80000 }],
      },
      HOY,
    );
    // 4 días × $100.000 = $400.000, menos los $80.000 de descuento.
    expect(textoDe(chips, "ampliacion")).toBe("+4 días · $ 320.000");
    expect(textoDe(chips, "descuento")).toBe("Descuento $ 80.000");
  });

  it("un equipo devuelto muestra la fecha de devolución y no la de vencimiento", () => {
    const chips = describirFechasEquipo(
      {
        cantidad: 1,
        valor: 100,
        cantidadDevuelta: 1,
        fechaVencimiento: "2026-08-12",
        fechaDevolucion: "2026-08-14",
      },
      HOY,
    );
    expect(textoDe(chips, "devuelto")).toBe("Devuelto 14/08/2026");
    // Ya volvió: no tiene sentido seguir diciendo hasta cuándo tenía plazo.
    expect(textoDe(chips, "vencimiento")).toBeUndefined();
    // Pero los días que se tomó de más siguen a la vista: se cobran igual.
    expect(textoDe(chips, "diasVencidos")).toBe("2 días vencidos · $ 200");
  });

  it("el que quedó sin fecha lo dice, en vez de aparentar que tiene plazo", () => {
    const chips = describirFechasEquipo(
      { cantidad: 1, valor: 100, vencimientoIndefinido: true, fechaVencimiento: "2026-08-12" },
      HOY,
    );
    expect(tonoDe(chips, "indefinido")).toBe("indefinido");
    expect(textoDe(chips, "vencimiento")).toBeUndefined();
  });

  it("mantiene el orden en que se lee la historia", () => {
    const claves = describirFechasEquipo(chazas, HOY).map((chip) => chip.clave);
    // Salió tal día por tantos, a tanto el día; vencía tal, se le dieron más
    // días, quedó para tal otro; y lleva tantos de más.
    expect(claves).toEqual([
      "despacho",
      "dias",
      "valorDia",
      "vencimiento-0",
      "ampliacion",
      "vencimiento",
      "diasVencidos",
    ]);
  });
});

describe("agruparChipsFechas", () => {
  const chazas = {
    cantidad: 10,
    valor: 20000,
    dias: 3,
    fechaDespacho: "2026-08-03",
    fechaVencimiento: "2026-08-07",
    ampliaciones: [{ dias: 2, descuento: 0, fechaAnterior: "2026-08-05" }],
  };

  it("reparte la historia en trayecto, plazo y vencido", () => {
    const tramos = agruparChipsFechas(describirFechasEquipo(chazas, HOY));

    expect(tramos.map((tramo) => tramo.map((chip) => chip.clave))).toEqual([
      ["despacho", "dias", "valorDia"],
      ["vencimiento-0", "ampliacion", "vencimiento"],
      ["diasVencidos"],
    ]);
  });

  // El agrupado no le agrega nada al caso simple, que es la mayoría de las
  // facturas: aparece cuando hay historia que contar.
  it("una factura al día y sin renovaciones tiene dos tramos", () => {
    const tramos = agruparChipsFechas(
      describirFechasEquipo(
        {
          cantidad: 4,
          valor: 30000,
          dias: 3,
          fechaDespacho: "2026-08-13",
          fechaVencimiento: "2026-08-20",
        },
        HOY,
      ),
    );

    expect(tramos.map((tramo) => tramo.map((chip) => chip.clave))).toEqual([
      ["despacho", "dias", "valorDia"],
      ["vencimiento"],
    ]);
  });

  // La flecha ata un eslabón con el anterior. Sin nada antes no ata nada, así
  // que la fecha sola de una factura sin renovaciones no la lleva.
  it("solo encadena los eslabones que vienen de algo", () => {
    const conHistoria = describirFechasEquipo(chazas, HOY);
    expect(conHistoria.find((chip) => chip.clave === "vencimiento").enCadena).toBe(true);

    const sinHistoria = describirFechasEquipo(
      { cantidad: 1, valor: 100, dias: 2, fechaVencimiento: "2026-08-20" },
      HOY,
    );
    expect(sinHistoria.find((chip) => chip.clave === "vencimiento").enCadena).toBe(false);
  });

  // El descuento va en el tramo del plazo pero no es un paso de la cadena: es
  // una condición de esos días, no un momento en el tiempo.
  it("el descuento va en el tramo del plazo, sin flecha", () => {
    const chips = describirFechasEquipo(
      {
        cantidad: 1,
        valor: 100000,
        dias: 3,
        fechaVencimiento: "2026-08-09",
        ampliaciones: [{ dias: 4, descuento: 80000, fechaAnterior: "2026-08-05" }],
      },
      HOY,
    );
    const descuento = chips.find((chip) => chip.clave === "descuento");
    expect(descuento.tramo).toBe(2);
    expect(descuento.enCadena).toBeUndefined();
  });
});
