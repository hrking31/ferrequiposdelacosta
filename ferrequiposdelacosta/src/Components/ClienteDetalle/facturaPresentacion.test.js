// Las pruebas de lo que se DIBUJA: la historia de fechas de un equipo.
//
// Existen por un motivo concreto. Seguimiento y Detalle Cliente armaban sus
// chips por separado y terminaron contando cosas distintas de la misma
// factura: para 10 chazas con 2 días de renovación y 7 días vencidos, Detalle
// decía "+2 días $ 400.000" y Seguimiento "+9 días $ 1.800.000", con los 7
// días vencidos repetidos al lado en las dos. Se leía como si se cobraran
// $3.200.000 cuando eran $1.800.000.
//
// Ahora las dos piden la lista acá. Estas pruebas fijan QUÉ dice cada chip,
// que es lo que se separó; el color y la variante son de cada pantalla.
import { describe, it, expect } from "vitest";
import {
  agruparChipsFechas,
  describirFechasEquipo,
  historialEquipo,
} from "./facturaPresentacion";
import { sellarDiasVencidos } from "./facturaCuentas";
import { unEquipo, unEquipoDevuelto } from "../../test/facturas";

const HOY = "2026-08-15";

// Busca un chip por su clave y devuelve su texto, para no depender del orden
// en pruebas que solo miran uno.
//
// Los centavos y el espacio del "$" se normalizan a propósito: Node y el
// navegador no formatean los pesos igual —acá salen como "$ 400.000,00" y en
// pantalla como "$ 400.000"— y el separador que pone el formateador es un
// espacio duro (U+00A0), no uno común. Lo que estas pruebas cuidan es la
// CIFRA, no cómo la escribe cada motor.
//
// El espacio duro se nombra por su número: escrito como carácter suelto sería
// invisible en el código.
const ESPACIO_DURO = String.fromCharCode(160);
const textoDe = (chips, clave) =>
  chips
    .find((chip) => chip.clave === clave)
    ?.label.replace(/,00(?!\d)/g, "")
    .split(ESPACIO_DURO)
    .join(" ");
const tonoDe = (chips, clave) => chips.find((chip) => chip.clave === clave)?.tono;

describe("describirFechasEquipo", () => {
  // El caso de la factura 1573, con los números reales que lo destaparon.
  const chazas = unEquipo({
    nombre: "CHAZA",
    cantidad: 10,
    valorDia: 20000,
    dias: 3,
    fechaDespacho: "2026-08-03",
    fechaVencimiento: "2026-08-07",
    ampliaciones: [
      {
        fechaAnterior: "2026-08-05",
        fechaNueva: "2026-08-07",
        diasAmpliados: 2,
        descuentoRealizado: 0,
      },
    ],
  });

  it("no mete los días vencidos dentro de los días pactados", () => {
    const chips = describirFechasEquipo(chazas, HOY);

    // Se renovó por 2 días: eso vale 10 × 2 × $20.000.
    expect(textoDe(chips, "ampliacion")).toBe("+2 días $ 400.000");
    // Y desde el 7 al 15 corrieron 8 días más, que van aparte.
    expect(textoDe(chips, "diasVencidos")).toBe("8 días vencidos $ 1.600.000");
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
          { fechaAnterior: "2026-08-05", fechaNueva: "2026-08-07", diasAmpliados: 2 },
          { fechaAnterior: "2026-08-07", fechaNueva: "2026-08-11", diasAmpliados: 4 },
        ],
      },
      HOY,
    );
    expect(textoDe(chips, "vencimiento-0")).toBe("1er vencimiento 05/08/2026");
    expect(textoDe(chips, "vencimiento-1")).toBe("2do vencimiento 07/08/2026");
  });

  // Los días que se le vencieron y el cliente ya pagó: van en verde y con su
  // valor, porque esa cifra no reclama nada, cuenta lo que entró.
  it("los días vencidos ya pagados van aparte y en verde", () => {
    const compresor = unEquipo({
      cantidad: 1,
      valorDia: 150000,
      dias: 7,
      fechaDespacho: "2026-08-08",
    });
    const sellado = sellarDiasVencidos(compresor, HOY);
    const chips = describirFechasEquipo(sellado, HOY);

    expect(textoDe(chips, "diasVencidosPagados")).toBe("1 día vencido pagado $ 150.000");
    expect(tonoDe(chips, "diasVencidosPagados")).toBe("exito");
    // Y no quedan días vencidos abiertos ni se cuentan como días concedidos.
    expect(textoDe(chips, "diasVencidos")).toBeUndefined();
    expect(textoDe(chips, "ampliacion")).toBeUndefined();
  });

  // Al día siguiente vuelve a correr el reloj: lo pagado se queda en verde y
  // lo nuevo sale en rojo, cada uno con lo suyo.
  it("el día siguiente al sellado suma UN día vencido, no todos otra vez", () => {
    const compresor = unEquipo({
      cantidad: 1,
      valorDia: 150000,
      dias: 7,
      fechaDespacho: "2026-08-08",
    });
    const chips = describirFechasEquipo(
      sellarDiasVencidos(compresor, HOY),
      "2026-08-16",
    );

    expect(textoDe(chips, "diasVencidosPagados")).toBe("1 día vencido pagado $ 150.000");
    expect(textoDe(chips, "diasVencidos")).toBe("1 día vencido $ 150.000");
  });

  it("el día que vence va en alerta, no en urgente", () => {
    const chips = describirFechasEquipo(
      unEquipo({ cantidad: 1, valorDia: 100, fechaVencimiento: HOY }),
      HOY,
    );
    expect(textoDe(chips, "vencimiento")).toBe("Vence hoy 15/08/2026");
    expect(tonoDe(chips, "vencimiento")).toBe("alerta");
  });

  it("un equipo con plazo por delante no muestra nada urgente", () => {
    const chips = describirFechasEquipo(
      unEquipo({
        cantidad: 1,
        valorDia: 100,
        fechaDespacho: "2026-08-14",
        fechaVencimiento: "2026-08-20",
      }),
      HOY,
    );
    expect(textoDe(chips, "vencimiento")).toBe("Devuelve 20/08/2026");
    expect(tonoDe(chips, "vencimiento")).toBe("neutro");
    expect(textoDe(chips, "diasVencidos")).toBeUndefined();
  });

  it("el descuento se resta de los días pactados y además se muestra aparte", () => {
    const chips = describirFechasEquipo(
      unEquipo({
        cantidad: 1,
        valorDia: 100000,
        dias: 3,
        fechaDespacho: "2026-08-05",
        fechaVencimiento: "2026-08-09",
        ampliaciones: [{ diasAmpliados: 4, descuentoRealizado: 80000 }],
      }),
      HOY,
    );
    // 4 días × $100.000 = $400.000, menos los $80.000 de descuento.
    expect(textoDe(chips, "ampliacion")).toBe("+4 días $ 320.000");
    expect(textoDe(chips, "descuento")).toBe("Descuento $ 80.000");
  });

  it("un equipo devuelto muestra la fecha de devolución y no la de vencimiento", () => {
    const chips = describirFechasEquipo(
      unEquipoDevuelto({
        cantidad: 1,
        valorDia: 100,
        // Salió el 10 con plazo hasta el 12 —3 días— y volvió el 14: 5 días
        // afuera, que es lo que queda escrito al cerrarlo.
        dias: 5,
        fechaDespacho: "2026-08-10",
        fechaVencimiento: "2026-08-12",
        fechaDevolucion: "2026-08-14",
      }),
      HOY,
    );
    expect(textoDe(chips, "devuelto")).toBe("Devuelto 14/08/2026");
    // Ya volvió: no tiene sentido seguir diciendo hasta cuándo tenía plazo.
    expect(textoDe(chips, "vencimiento")).toBeUndefined();
    // Pero los días que se tomó de más siguen a la vista: se cobran igual.
    expect(textoDe(chips, "diasVencidos")).toBe("2 días vencidos $ 200");
  });

  // El espejo del anterior: devolvió antes y esos días no se le cobran.
  it("un equipo devuelto antes de tiempo muestra los días que no se le cobran", () => {
    const chips = describirFechasEquipo(
      unEquipoDevuelto({
        cantidad: 10,
        valorDia: 20000,
        // Tenía hasta el 14 —5 días— y volvió el 12: estuvo 3.
        dias: 3,
        fechaDespacho: "2026-08-10",
        fechaVencimiento: "2026-08-14",
        fechaDevolucion: "2026-08-12",
      }),
      HOY,
    );
    expect(textoDe(chips, "devuelto")).toBe("Devuelto 12/08/2026");
    // Sin monto: esos días nunca entraron al cobro, así que no hay una plata a
    // favor que mostrar. El chip cuenta el hecho.
    expect(textoDe(chips, "diasSinUsar")).toBe("Devolvió 2 días antes");
    // Es algo a favor del cliente, no un cargo.
    expect(tonoDe(chips, "diasSinUsar")).toBe("exito");
    // Y no es lo mismo que un día vencido: ese chip no aparece.
    expect(textoDe(chips, "diasVencidos")).toBeUndefined();
  });

  it("el que devuelve justo el día que vence no tiene días sin usar", () => {
    const chips = describirFechasEquipo(
      unEquipoDevuelto({
        cantidad: 1,
        valorDia: 100,
        dias: 5,
        fechaDespacho: "2026-08-10",
        fechaVencimiento: "2026-08-14",
        fechaDevolucion: "2026-08-14",
      }),
      HOY,
    );
    expect(textoDe(chips, "diasSinUsar")).toBeUndefined();
    expect(textoDe(chips, "diasVencidos")).toBeUndefined();
  });

  it("el que quedó sin fecha lo dice, en vez de aparentar que tiene plazo", () => {
    const chips = describirFechasEquipo(
      unEquipo({
        cantidad: 1,
        valorDia: 100,
        vencimientoIndefinido: true,
        fechaVencimiento: "2026-08-12",
      }),
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
  const chazas = unEquipo({
    cantidad: 10,
    valorDia: 20000,
    dias: 3,
    fechaDespacho: "2026-08-03",
    fechaVencimiento: "2026-08-07",
    ampliaciones: [{ diasAmpliados: 2, fechaAnterior: "2026-08-05" }],
  });

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
        unEquipo({
          cantidad: 4,
          valorDia: 30000,
          dias: 3,
          fechaDespacho: "2026-08-13",
          fechaVencimiento: "2026-08-20",
        }),
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
      unEquipo({
        cantidad: 1,
        valorDia: 100,
        dias: 2,
        fechaDespacho: "2026-08-14",
        fechaVencimiento: "2026-08-20",
      }),
      HOY,
    );
    expect(sinHistoria.find((chip) => chip.clave === "vencimiento").enCadena).toBe(false);
  });

  // El descuento va en el tramo del plazo pero no es un paso de la cadena: es
  // una condición de esos días, no un momento en el tiempo.
  it("el descuento va en el tramo del plazo, sin flecha", () => {
    const chips = describirFechasEquipo(
      unEquipo({
        cantidad: 1,
        valorDia: 100000,
        dias: 3,
        fechaDespacho: "2026-08-05",
        fechaVencimiento: "2026-08-09",
        ampliaciones: [
          { diasAmpliados: 4, descuentoRealizado: 80000, fechaAnterior: "2026-08-05" },
        ],
      }),
      HOY,
    );
    const descuento = chips.find((chip) => chip.clave === "descuento");
    expect(descuento.tramo).toBe(2);
    expect(descuento.enCadena).toBeUndefined();
  });
});

// ── La historia de un equipo, hito por hito ────────────────────────────
//
// Lo que se prueba acá es QUÉ hitos salen y en qué orden, que es lo que los
// chips no podían contar: cuándo pasó cada cosa. El caso es el de la factura
// 5698 —el compresor de Aida—, con sus fechas y su plata reales.
describe("historialEquipo", () => {
  // Salió el 01/09 por 7 días, así que vencía el 07. Se le pasaron 2 días, el
  // 09 el cliente pagó esos días y quedó sin fecha de entrega; se le pasaron
  // otros 2 y el 11 se le pactaron 3 más, que corrieron desde ese día.
  const compresor = unEquipo({
    nombre: "COMPRESOR NEUMATICO INGERSOLLRAND 185",
    cantidad: 1,
    valorDia: 150000,
    dias: 7,
    fechaDespacho: "2026-09-01",
    fechaVencimiento: "2026-09-14",
    vencimientoIndefinido: false,
    indefinidaDesde: "2026-09-09",
    ampliaciones: [
      // El pago que selló los 2 días vencidos: no se le concedió ninguno.
      {
        fecha: "2026-09-09",
        fechaAnterior: "2026-09-07",
        fechaNueva: "2026-09-09",
        diasAmpliados: 2,
        diasPedidos: 0,
        diasVencidos: 2,
        descuentoRealizado: 0,
        porPago: true,
      },
      // Y la renovación: 3 días pedidos, con otros 2 vencidos consolidados.
      {
        fecha: "2026-09-11",
        fechaAnterior: "2026-09-09",
        fechaNueva: "2026-09-14",
        diasAmpliados: 5,
        diasPedidos: 3,
        diasVencidos: 2,
        descuentoRealizado: 0,
      },
    ],
  });

  const HOY_COMPRESOR = "2026-09-12";
  const titulos = (equipo, hoy = HOY_COMPRESOR) =>
    historialEquipo(equipo, hoy).map((hito) => hito.titulo);
  const buscar = (equipo, clave, hoy = HOY_COMPRESOR) =>
    historialEquipo(equipo, hoy).find((hito) => hito.clave === clave);

  it("cuenta la historia completa, en el orden en que pasó", () => {
    expect(titulos(compresor)).toEqual([
      "Salida en alquiler",
      "Vencimiento inicial",
      "Días vencidos",
      "Seguimiento con cliente",
      "Entrega indefinida",
      "Seguimiento con cliente",
      "Próximo vencimiento",
    ]);
  });

  it("la salida vale los días con los que se despachó", () => {
    const salida = buscar(compresor, "salida");
    expect(salida.fecha).toBe("2026-09-01");
    expect(salida.detalle).toBe("Se entregó el equipo por 7 días.");
    expect(salida.valor).toBe(1050000);
  });

  // La fecha del tramo es la del ÚLTIMO día contado, no la del primero: es
  // cuando el contador llegó a ese número. Con la del primero, el renglón se
  // leería como si ese día ya fueran dos.
  it("el tramo vencido se fecha en su último día y dice que se pagó", () => {
    const tramo = buscar(compresor, "vencidos-0");
    expect(tramo.fecha).toBe("2026-09-09");
    expect(tramo.detalle).toBe("2 días · pagados");
    expect(tramo.valor).toBe(300000);
  });

  // La entrega indefinida no es un estado aparte: el equipo está vencido
  // igual, solo que con permiso. Por eso el tramo posterior al acuerdo cambia
  // de NOMBRE y conserva el tono del vencimiento.
  it("después del acuerdo el tramo se llama entrega indefinida, sin cambiar de tono", () => {
    const tramo = buscar(compresor, "vencidos-1");
    expect(tramo.titulo).toBe("Entrega indefinida");
    expect(tramo.tono).toBe("vencido");
    expect(tramo.detalle).toBe("2 días");
  });

  it("lo pactado se cuenta por los días que se pidieron, no por los consolidados", () => {
    const pactado = buscar(compresor, "pactado-1");
    expect(pactado.fecha).toBe("2026-09-11");
    expect(pactado.detalle).toBe("Se pactaron 3 días");
    // Los 3 días pedidos, no los 5 que corrió la fecha: los otros 2 ya están
    // contados en su propio tramo y sumarlos acá los cobraría dos veces.
    expect(pactado.valor).toBe(450000);
  });

  // El día que quedó sin fecha es el único hito que necesita un dato
  // guardado: la marca se apaga al renovarle el plazo —acá ya está en false—
  // y sin él no quedaría rastro de que el equipo estuvo sin fecha.
  it("recuerda el día en que quedó sin fecha de entrega, aunque ya no lo esté", () => {
    const acuerdo = buscar(compresor, "indefinida");
    expect(acuerdo.fecha).toBe("2026-09-09");
    expect(acuerdo.chip).toBe("indefinida");
    expect(compresor.vencimientoIndefinido).toBe(false);
  });

  it("cierra con la fecha vigente y el estado del equipo", () => {
    const proximo = buscar(compresor, "proximo-vencimiento");
    expect(proximo.fecha).toBe("2026-09-14");
    expect(proximo.chip).toBe("ampliacion");
  });

  // Lo que todavía corre es lo único que se le reclama, y por eso es lo único
  // que va en rojo: los tramos ya cerrados son plata acordada.
  it("el tramo que sigue corriendo va en rojo y los cerrados en el acento", () => {
    const corriendo = historialEquipo(compresor, "2026-09-16");
    expect(buscar(compresor, "vencidos-0").valorTono).toBe("acordado");
    expect(
      corriendo.find((hito) => hito.clave === "vencidos-hoy").valorTono,
    ).toBe("vencido");
  });

  it("al que todavía no sale le cuenta la salida como programada", () => {
    const porSalir = unEquipo({
      cantidad: 1,
      valorDia: 80000,
      dias: 5,
      fechaDespacho: "2026-09-20",
      fechaVencimiento: "2026-09-24",
    });
    const salida = buscar(porSalir, "salida", "2026-09-12");
    expect(salida.titulo).toBe("Salida programada");
    expect(salida.detalle).toBe("Pendiente: se entrega por 5 días.");
  });

  it("al devuelto le agrega su vuelta a bodega y le saca el vencimiento", () => {
    const devuelto = unEquipoDevuelto({
      cantidad: 1,
      valorDia: 150000,
      dias: 7,
      fechaDespacho: "2026-09-01",
      fechaVencimiento: "2026-09-07",
      fechaDevolucion: "2026-09-07",
    });
    expect(titulos(devuelto)).toEqual(["Salida en alquiler", "Devolución"]);
  });
});
