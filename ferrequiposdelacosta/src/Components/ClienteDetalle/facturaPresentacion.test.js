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
  ultimoAcuerdoEquipo,
} from "./facturaPresentacion";
import {
  unaAmpliacion,
  unEquipo,
  unEquipoDevuelto,
  unTramoVencido,
} from "../../test/facturas";

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
    // 3 días del alta: cubierto hasta el 05. La renovación le da 2 más, el
    // 06 y el 07, y desde el 08 le corre su tramo vencido.
    ampliaciones: [
      {
        fecha: "2026-08-05",
        dias: 2,
        desde: "2026-08-06",
        hasta: "2026-08-07",
        descuento: 0,
      },
    ],
    vencidos: [unTramoVencido({ desde: "2026-08-08", hasta: null })],
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
        ampliaciones: [
          { fecha: "2026-08-05", dias: 2, desde: "2026-08-06", hasta: "2026-08-07" },
          { fecha: "2026-08-07", dias: 4, desde: "2026-08-08", hasta: "2026-08-11" },
        ],
        vencidos: [],
      },
      HOY,
    );
    expect(textoDe(chips, "vencimiento-0")).toBe("1er vencimiento 05/08/2026");
    expect(textoDe(chips, "vencimiento-1")).toBe("2do vencimiento 07/08/2026");
  });

  // Los días vencidos se cuentan igual estén pagados o no: el equipo no sabe
  // de pagos, y el chip dice cuántos días se le cobran de más.
  it("los días de un tramo cerrado siguen contándose", () => {
    const compresor = unEquipo({
      cantidad: 1,
      valorDia: 150000,
      dias: 7,
      fechaDespacho: "2026-08-08",
      // Cubierto hasta el 14; el 15 se le venció y ese día el cliente pagó,
      // así que el tramo quedó cerrado ahí mismo.
      vencidos: [unTramoVencido({ desde: "2026-08-15", hasta: "2026-08-15" })],
    });
    const chips = describirFechasEquipo(compresor, HOY);

    expect(textoDe(chips, "diasVencidos")).toBe("1 día vencido $ 150.000");
    expect(textoDe(chips, "ampliacion")).toBeUndefined();
  });

  // Cerrado el tramo, el contador no vuelve a moverse hasta que la madrugada
  // abra otro. Lo que NO pasa es que se vuelvan a contar los días ya cobrados.
  it("el día siguiente suma UN día vencido, no todos otra vez", () => {
    const compresor = unEquipo({
      cantidad: 1,
      valorDia: 150000,
      dias: 7,
      fechaDespacho: "2026-08-08",
      vencidos: [
        unTramoVencido({ desde: "2026-08-15", hasta: "2026-08-15" }),
        unTramoVencido({ desde: "2026-08-16", hasta: null }),
      ],
    });
    const chips = describirFechasEquipo(compresor, "2026-08-16");

    expect(textoDe(chips, "diasVencidos")).toBe("2 días vencidos $ 300.000");
  });

  it("el día que vence va en alerta, no en urgente", () => {
    const chips = describirFechasEquipo(
      // Sale el 10 por 6 días: cubierto justo hasta hoy, el 15.
      unEquipo({ cantidad: 1, valorDia: 100, dias: 6 }),
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
        dias: 7,
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
        ampliaciones: [
          {
            fecha: "2026-08-07",
            dias: 4,
            desde: "2026-08-08",
            hasta: "2026-08-11",
            descuento: 80000,
          },
        ],
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
        // Salió el 10 por 3 días —cubierto hasta el 12— y volvió el 14: dos
        // días de más, que quedaron en su tramo.
        dias: 3,
        fechaDespacho: "2026-08-10",
        vencidos: [unTramoVencido({ desde: "2026-08-13", hasta: "2026-08-14" })],
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
        dias: 5,
        fechaDespacho: "2026-08-10",
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
        dias: 3,
        indefinida: { activa: true, desde: "2026-08-12", hasta: null },
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
    ampliaciones: [
      { fecha: "2026-08-05", dias: 2, desde: "2026-08-06", hasta: "2026-08-07" },
    ],
    vencidos: [unTramoVencido({ desde: "2026-08-08", hasta: null })],
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
        ampliaciones: [
          {
            fecha: "2026-08-07",
            dias: 4,
            desde: "2026-08-08",
            hasta: "2026-08-11",
            descuento: 80000,
          },
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
    // Estuvo sin fecha de entrega del 09 al 11.
    indefinida: { activa: false, desde: "2026-09-09", hasta: "2026-09-11" },
    // Sus dos tramos de mora, ya cerrados. El segundo corrió con permiso:
    // el cliente había avisado que no sabía cuándo devolvía.
    vencidos: [
      unTramoVencido({ desde: "2026-09-08", hasta: "2026-09-09" }),
      unTramoVencido({
        desde: "2026-09-10",
        hasta: "2026-09-11",
        indefinida: true,
      }),
    ],
    // Y lo único que pidió: 3 días, del 12 al 14.
    ampliaciones: [
      {
        fecha: "2026-09-11",
        dias: 3,
        desde: "2026-09-12",
        hasta: "2026-09-14",
        descuento: 0,
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
  it("el tramo vencido se fecha en su último día y vale sus días", () => {
    const tramo = buscar(compresor, "vencidos-0");
    expect(tramo.fecha).toBe("2026-09-09");
    // Solo los días: si el cliente los pagó no se dice acá.
    expect(tramo.detalle).toBe("2 días");
    // El COSTO sí se muestra, que es lo que deja confirmar la cuenta.
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
    const pactado = buscar(compresor, "pactado-0");
    expect(pactado.fecha).toBe("2026-09-11");
    expect(pactado.detalle).toBe("Se pactaron 3 días");
    // Los 3 días pedidos, no los 5 que corrió la fecha: los otros 2 ya están
    // contados en su propio tramo y sumarlos acá los cobraría dos veces.
    expect(pactado.valor).toBe(450000);
  });

  // El nodo de la entrega indefinida guarda las dos fechas: desde cuándo
  // estuvo sin fecha y hasta cuándo. La marca de arriba ya está apagada
  // —volvió a tener plazo— y aun así el hito se cuenta.
  it("recuerda el día en que quedó sin fecha de entrega, aunque ya no lo esté", () => {
    const acuerdo = buscar(compresor, "indefinida");
    expect(acuerdo.fecha).toBe("2026-09-09");
    expect(acuerdo.chip).toBe("indefinida");
    expect(compresor.indefinida.activa).toBe(false);
  });

  it("cierra con la fecha vigente y el estado del equipo", () => {
    const proximo = buscar(compresor, "proximo-vencimiento");
    expect(proximo.fecha).toBe("2026-09-14");
    expect(proximo.chip).toBe("ampliacion");
  });

  // Lo que todavía corre es lo único que se le reclama, y por eso es lo único
  // que va en rojo: los tramos ya cerrados son plata acordada.
  it("el tramo que sigue corriendo va en rojo y los cerrados en el acento", () => {
    // Cubierto hasta el 14; la madrugada del 15 le abrió otro tramo.
    const conTramoAbierto = {
      ...compresor,
      vencidos: [
        ...compresor.vencidos,
        unTramoVencido({ desde: "2026-09-15", hasta: null }),
      ],
    };
    const corriendo = historialEquipo(conTramoAbierto, "2026-09-16");
    expect(buscar(compresor, "vencidos-0").valorTono).toBe("acordado");
    expect(
      corriendo.find((hito) => hito.clave === "vencidos-hoy").valorTono,
    ).toBe("vencido");
  });

  // El caso de la 0123 de ReYaz: los gatos vencían el 11 y ese mismo 11 se les
  // pactaron 4 días. No se pasó ni un día, pero ese día el equipo ya estaba
  // vencido —así entra a cartera, para poder avisarle al cliente que vence
  // mañana— y el renglón tiene que decirlo.
  it("marca vencido el renglón del equipo que se renovó el día que vencía", () => {
    const renovadoEseDia = unEquipo({
      cantidad: 10,
      valorDia: 1500,
      dias: 3,
      fechaDespacho: "2026-09-09",
      // Cubierto hasta el 11, y ese mismo 11 se le pactaron 4 días. No se
      // pasó ni uno, pero ese día ya estaba vencido: queda un tramo que no
      // suma días y solo deja escrito que llegó a vencerse.
      vencidos: [unTramoVencido({ desde: "2026-09-12", hasta: "2026-09-11" })],
      ampliaciones: [
        {
          fecha: "2026-09-11",
          dias: 4,
          desde: "2026-09-12",
          hasta: "2026-09-15",
          descuento: 0,
        },
      ],
    });

    expect(buscar(renovadoEseDia, "vencimiento-inicial", "2026-09-12").chip).toBe(
      "vencido",
    );
  });

  // Y el espejo: al que le dieron más días antes de su fecha no se le venció
  // nada, así que su renglón no lleva chip.
  it("no marca vencido al que se renovó antes de su fecha", () => {
    const renovadoAntes = unEquipo({
      cantidad: 10,
      valorDia: 1500,
      dias: 3,
      fechaDespacho: "2026-09-09",
      // Se le dieron los 4 días el 10, un día ANTES de que se le acabara el
      // plazo: nunca se venció, así que no tiene ni un tramo.
      ampliaciones: [
        {
          fecha: "2026-09-10",
          dias: 4,
          desde: "2026-09-12",
          hasta: "2026-09-15",
          descuento: 0,
        },
      ],
    });

    expect(
      buscar(renovadoAntes, "vencimiento-inicial", "2026-09-12").chip,
    ).toBe(null);
  });

  it("al que todavía no sale le cuenta la salida como programada", () => {
    const porSalir = unEquipo({
      cantidad: 1,
      valorDia: 80000,
      dias: 5,
      fechaDespacho: "2026-09-20",
    });
    const salida = buscar(porSalir, "salida", "2026-09-12");
    expect(salida.titulo).toBe("Salida programada");
    expect(salida.detalle).toBe("Pendiente: se entrega por 5 días.");
  });

  // Lo que dijo el cliente al devolverlo cuelga del hito que explica, con su
  // fecha. Antes vivía suelto bajo el nombre del equipo, sin decir cuándo.
  it("el motivo de la devolución va en su hito", () => {
    const conMotivo = unEquipoDevuelto({
      cantidad: 1,
      valorDia: 150000,
      dias: 5,
      fechaDespacho: "2026-09-01",
      fechaVencimiento: "2026-09-07",
      fechaDevolucion: "2026-09-05",
    });
    // Ojo, son dos campos distintos: `motivo` es por qué volvió dañado;
    // `motivoDevolucion` es lo que dijo el cliente al devolverlo antes de
    // tiempo, que es el que se muestra acá.
    conMotivo.devolucion.motivoDevolucion = "ya no lo necesita";

    expect(buscar(conMotivo, "devolucion").detalle).toBe(
      "Cliente: ya no lo necesita",
    );
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

// Lo que cartera lee debajo del plazo, antes de llamar al cliente.
describe("ultimoAcuerdoEquipo", () => {
  it("al que nunca se le pactó nada no le inventa un antecedente", () => {
    expect(ultimoAcuerdoEquipo(unEquipo())).toBeNull();
  });

  it("dice cuántos días se le dieron y qué día fue", () => {
    const equipo = unEquipo({
      ampliaciones: [unaAmpliacion({ fecha: "2026-08-19", dias: 3 })],
    });

    expect(ultimoAcuerdoEquipo(equipo)).toEqual({
      fecha: "2026-08-19",
      texto: "Se le dieron 3 días",
    });
  });

  it("un solo día se lee en singular", () => {
    const equipo = unEquipo({
      ampliaciones: [unaAmpliacion({ fecha: "2026-08-19", dias: 1 })],
    });

    expect(ultimoAcuerdoEquipo(equipo).texto).toBe("Se le dieron 1 día");
  });

  it("con varias prórrogas muestra la última, no la primera", () => {
    const equipo = unEquipo({
      ampliaciones: [
        unaAmpliacion({ fecha: "2026-08-19", dias: 3 }),
        unaAmpliacion({ fecha: "2026-08-23", dias: 5 }),
      ],
    });

    expect(ultimoAcuerdoEquipo(equipo)).toEqual({
      fecha: "2026-08-23",
      texto: "Se le dieron 5 días",
    });
  });

  // El acuerdo vigente manda: es el que explica por qué este equipo no tiene
  // fecha, y reclamarle una sería reclamarle algo que se le concedió.
  it("sin fecha de entrega manda sobre la prórroga anterior", () => {
    const equipo = unEquipo({
      ampliaciones: [unaAmpliacion({ fecha: "2026-08-19", dias: 3 })],
      indefinida: { activa: true, desde: "2026-08-24", hasta: null },
    });

    expect(ultimoAcuerdoEquipo(equipo)).toEqual({
      fecha: "2026-08-24",
      texto: "Quedó sin fecha de entrega",
    });
  });

  it("la entrega indefinida que ya se cerró deja de mandar", () => {
    const equipo = unEquipo({
      ampliaciones: [unaAmpliacion({ fecha: "2026-08-25", dias: 2 })],
      indefinida: { activa: false, desde: "2026-08-24", hasta: "2026-08-25" },
    });

    expect(ultimoAcuerdoEquipo(equipo).texto).toBe("Se le dieron 2 días");
  });

  it("al equipo devuelto no le queda nada que acordar", () => {
    const equipo = unEquipoDevuelto({
      ampliaciones: [unaAmpliacion({ fecha: "2026-08-19", dias: 3 })],
    });

    expect(ultimoAcuerdoEquipo(equipo)).toBeNull();
  });
});
