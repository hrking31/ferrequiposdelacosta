import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import { formatearMoneda } from "../../Utils/formato";
import CargosAdicionales from "./CargosAdicionales";
import {
  unaAmpliacion,
  unEquipoDevuelto,
  unTramoVencido,
} from "../../test/facturas";

// El recuadro que explica lo que se cobra aparte del alquiler. Lo que se prueba
// acá es el desglose que abre la flecha: cómo se llama cada renglón, cuánto IVA
// muestra y el total que cae debajo del "Total adicionales".
//
// El nombre del renglón no es un detalle de estilo. "Días ampliados" cuenta que
// alguien autorizó esos días; "días vencidos" cuenta que el cliente no
// devolvió. Son dos historias distintas sobre la misma plata, y la pantalla las
// estaba contando todas como ampliaciones.
//
// Todos los equipos de estas pruebas ya están devueltos —con su cantidad y su
// fecha de devolución—, a propósito: así la cuenta se corta en una fecha
// guardada en vez de en "hoy", y las pruebas dan lo mismo el día que se corran.

// El espacio que Intl mete entre el signo y la cifra no es uno común, sino uno
// "duro" —el que no deja partir el renglón ahí—. Escrito como carácter suelto
// sería invisible en el código, y una prueba que compara contra un espacio
// normal fallaría sin que se vea por qué: por eso se nombra por su número.
const ESPACIO_DURO = String.fromCharCode(160);
const sinEspacioDuro = (texto) => texto.split(ESPACIO_DURO).join(" ");
const dinero = (monto) => sinEspacioDuro(formatearMoneda(monto));

// En pantalla el renglón muestra solo su concepto —"días vencidos"—, porque el
// nombre del equipo lo encabeza una vez arriba y no se repite. El nombre
// completo vive en el `title` de cada renglón, que es por donde se lo busca
// acá: dos equipos del mismo lote pueden tener el mismo concepto.
const ivaDelRenglon = (etiqueta) =>
  sinEspacioDuro(screen.getByTitle(etiqueta).nextElementSibling.textContent);

// Un renglón que NO debe estar. El concepto lleva su número de días adelante
// —"3 días vencidos"—, así que se busca por el final del texto: una cadena
// exacta pasaría sola el día que cambie el número, sin comprobar nada.
const noHayRenglon = (concepto) =>
  screen.queryByTitle(new RegExp(`· [0-9]+ ${concepto}$`));

// Los totales viven en su propia columna —la que cae bajo "Total
// adicionales"—, así que no son hermanos del nombre: se buscan por su cifra.
const hayTotal = (monto) => screen.getByText(dinero(monto));
const vecesQueAparece = (monto) => screen.getAllByText(dinero(monto)).length;

// Los renglones del desglose, en el orden en que se leen en pantalla.
const renglonesEnPantalla = () =>
  screen.getAllByTitle(/^1 (BENITIN|ANDAMIO)/).map((fila) => fila.title);

// 1 BENITIN a $100.000 el día, con IVA, despachado el 06 y ya devuelto — así
// la cuenta se corta en una fecha guardada y no en "hoy".
//
// `dias` son los del ALTA y no se tocan nunca. Lo que se le sumó después
// —los días que pidió, los que se pasó— va en sus propias listas, y de ahí
// sale el desglose.
const benitin = ({ dias, fechaDevolucion, ...extra } = {}) =>
  unEquipoDevuelto({
    nombre: "BENITIN",
    cantidad: 1,
    valorDia: 100000,
    aplicaIva: true,
    fechaDespacho: "2026-08-06",
    dias,
    fechaDevolucion,
    ...extra,
  });

// Le habían dado hasta el 10 —5 días— y volvió el 13: estuvo 8, o sea 3 días
// vencidos: $300.000 más $57.000 de IVA.
const conTresDiasVencidos = benitin({
  dias: 5,
  vencidos: [unTramoVencido({ desde: "2026-08-11", hasta: "2026-08-13" })],
  fechaDevolucion: "2026-08-13",
});

// EL CASO DE LA 8932 de Hernando Rey, que es el que destapó todo. Salió el 08
// por 4 días, se pasó tres —12, 13 y 14— y el 14 se le pactaron 5 más, hasta
// el 19. Lo ÚLTIMO que pasó fue el acuerdo, no el vencimiento.
const vencidoYDespuesPactado = benitin({
  fechaDespacho: "2026-09-08",
  dias: 4,
  vencidos: [unTramoVencido({ desde: "2026-09-12", hasta: "2026-09-14" })],
  ampliaciones: [
    unaAmpliacion({ fecha: "2026-09-14", dias: 5, desde: "2026-09-15" }),
  ],
  fechaDevolucion: "2026-09-19",
});

// Un segundo equipo del mismo despacho: 2 días a $50.000, $19.000 de IVA.
const otroEquipo = benitin({
  nombre: "ANDAMIO",
  valorDia: 50000,
  dias: 2,
  fechaDevolucion: "2026-08-07",
});

// El despacho del ejemplo real: $200.000 de transporte. Su depósito no va en
// este recuadro: no es un cargo (ver RecuadroDeposito).
const conCargosDelLote = {
  transporteTipo: "Ida y vuelta",
  transporteMonto: 200000,
};

const dibujar = (equipos, extras = {}) =>
  renderConProviders(
    <CargosAdicionales
      equipos={equipos}
      transporteTipo="Sin transporte"
      transporteMonto={0}
      aplicaIvaFactura
      abierto
      onToggle={() => {}}
      {...extras}
    />,
  );

describe("CargosAdicionales", () => {
  it("llama vencidos a los días que el equipo se quedó afuera, no ampliados", () => {
    dibujar([conTresDiasVencidos]);

    expect(screen.getByTitle("1 BENITIN · 3 días vencidos")).toBeInTheDocument();
    expect(
      noHayRenglon("días? ampliados?"),
    ).not.toBeInTheDocument();
  });

  it("llama ampliados a los días que sí se pactaron", () => {
    // Salió por 5 días —hasta el 10—, se le agregaron 2 y devolvió el 12 en la
    // fecha nueva: estuvo 7 días y nada quedó vencido.
    dibujar([
      benitin({
        dias: 5,
        ampliaciones: [
          {
            fecha: "2026-08-10",
            dias: 2,
            desde: "2026-08-11",
            hasta: "2026-08-12",
            descuento: 0,
          },
        ],
        fechaDevolucion: "2026-08-12",
      }),
    ]);

    expect(screen.getByTitle("1 BENITIN · 2 días ampliados")).toBeInTheDocument();
    expect(
      noHayRenglon("días? vencidos?"),
    ).not.toBeInTheDocument();
  });

  it("separa en dos renglones lo pactado y lo vencido cuando hay de los dos", () => {
    // Se le agregaron 2 días hasta el 12, y aun así devolvió el 15: 10 días
    // afuera, de los cuales 7 estaban pactados y 3 se pasaron.
    dibujar([
      benitin({
        dias: 5,
        ampliaciones: [
          {
            fecha: "2026-08-10",
            dias: 2,
            desde: "2026-08-11",
            hasta: "2026-08-12",
            descuento: 0,
          },
        ],
        vencidos: [unTramoVencido({ desde: "2026-08-13", hasta: "2026-08-15" })],
        fechaDevolucion: "2026-08-15",
      }),
    ]);

    // $200.000 pactados y $300.000 vencidos, cada uno con su IVA.
    expect(ivaDelRenglon("1 BENITIN · 2 días ampliados")).toBe(
      dinero(38000),
    );
    expect(ivaDelRenglon("1 BENITIN · 3 días vencidos")).toBe(
      dinero(57000),
    );
  });

  // Los días vencidos se cobran y se nombran igual haya pagado el cliente o
  // no: el equipo no sabe de pagos. Lo que importa acá es que el desglose
  // sume lo mismo que el total del equipo, o la resta no cierra por ningún
  // lado.
  it("el desglose nombra toda la plata del equipo", () => {
    dibujar([conTresDiasVencidos]);

    // 5 días del alta y 3 vencidos, cada uno con su IVA.
    expect(ivaDelRenglon("1 BENITIN · 5 días renta inicial")).toBe(dinero(95000));
    expect(ivaDelRenglon("1 BENITIN · 3 días vencidos")).toBe(dinero(57000));
    // Y no aparece ningún renglón de días ampliados: nadie le concedió nada.
    expect(noHayRenglon("días? ampliados?")).not.toBeInTheDocument();
  });

  it("muestra el IVA que le toca a cada renglón", () => {
    dibujar([conTresDiasVencidos]);

    expect(ivaDelRenglon("1 BENITIN · 5 días renta inicial")).toBe(dinero(95000));
    expect(ivaDelRenglon("1 BENITIN · 3 días vencidos")).toBe(
      dinero(57000),
    );
  });

  it("muestra a cuánto llegaba el total antes del último movimiento", () => {
    dibujar([conTresDiasVencidos], conCargosDelLote);

    // El alta dejó el total en $200.000 de flete más $95.000 de IVA.
    expect(hayTotal(295000)).toBeInTheDocument();
  });

  it("no repite abajo el total que ya está arriba", () => {
    // Los días vencidos son el último movimiento: dejaron el total en
    // $352.000, que es el "Total adicionales" de arriba. Si el desglose lo
    // repitiera, el mismo número aparecería dos veces y el historial diría
    // que pasó algo después, cuando no pasó nada.
    dibujar([conTresDiasVencidos], conCargosDelLote);

    expect(vecesQueAparece(352000)).toBe(1);
  });

  it("deja el movimiento más reciente arriba y el alta abajo", () => {
    dibujar([conTresDiasVencidos], conCargosDelLote);

    expect(renglonesEnPantalla()).toEqual([
      "1 BENITIN · 3 días vencidos",
      "1 BENITIN · 5 días renta inicial",
    ]);
  });

  // EL ORDEN SALE DE LAS FECHAS, no de la clase del tramo. Lo corriente es
  // alta → lo que pidió → lo que se pasó, pero este equipo se venció PRIMERO
  // y pidió días después: el acuerdo es lo más reciente y va arriba. Cuando el
  // orden se deducía de la clase, los 3 días vencidos salían encima de los 5
  // que se le habían pactado el 14 —tres días más tarde— y la cuenta del
  // equipo había que armarla de atrás para adelante.
  it("pone cada tramo en el día en que pasó, no en el orden de su clase", () => {
    dibujar([vencidoYDespuesPactado]);

    expect(renglonesEnPantalla()).toEqual([
      "1 BENITIN · 5 días ampliados",
      "1 BENITIN · 3 días vencidos",
      "1 BENITIN · 4 días renta inicial",
    ]);
  });

  // Y el reparto de la plata no se mueve: son los mismos días, cada uno en su
  // renglón. 4 del alta, 5 pactados y 3 vencidos a $100.000 el día.
  it("le pone a cada tramo el IVA que le toca aunque se hayan cruzado", () => {
    dibujar([vencidoYDespuesPactado]);

    expect(ivaDelRenglon("1 BENITIN · 4 días renta inicial")).toBe(
      dinero(76000),
    );
    expect(ivaDelRenglon("1 BENITIN · 5 días ampliados")).toBe(dinero(95000));
    expect(ivaDelRenglon("1 BENITIN · 3 días vencidos")).toBe(dinero(57000));
  });

  // El nombre de un equipo de alquiler es largo —"1 COMPRESOR NEUMATICO
  // INGERSOLLRAND 185"— y repetido en cada renglón no entraba en una línea: al
  // partirse en dos descolocaba los totales de la derecha, que dejaban de caer
  // al lado del movimiento que explican.
  it("escribe el nombre del equipo una sola vez, encabezando sus renglones", () => {
    dibujar([conTresDiasVencidos], conCargosDelLote);

    expect(screen.getAllByText("1 BENITIN")).toHaveLength(1);
  });

  // Cada equipo junta lo suyo: su nombre encabeza sus tramos una sola vez y
  // no vuelve a aparecer más abajo. Antes mandaba el orden del historial y un
  // equipo que se movió dos veces encabezaba dos grupos.
  it("junta los tramos de cada equipo bajo su nombre", () => {
    dibujar([conTresDiasVencidos, otroEquipo], conCargosDelLote);

    // El último equipo agregado primero, y dentro de cada uno lo más reciente
    // arriba.
    expect(renglonesEnPantalla()).toEqual([
      "1 ANDAMIO · 2 días renta inicial",
      "1 BENITIN · 3 días vencidos",
      "1 BENITIN · 5 días renta inicial",
    ]);
    expect(screen.getAllByText("1 BENITIN")).toHaveLength(1);
  });

  // LA CUENTA ES DE CADA EQUIPO, no una cadena que los encadena a todos. Dos
  // equipos que salieron en el MISMO despacho no ocurrieron uno después del
  // otro: encadenarlos mostraba un número que nunca existió —el total si el
  // otro equipo no hubiera salido—.
  it("le lleva a cada equipo su propia cuenta", () => {
    dibujar([conTresDiasVencidos, otroEquipo], conCargosDelLote);

    // El BENITIN: $200.000 del flete más su alta ($95.000) y después sus
    // vencidos ($57.000).
    expect(hayTotal(295000)).toBeInTheDocument();
    expect(hayTotal(352000)).toBeInTheDocument();
    // El ANDAMIO arranca de nuevo en los $200.000 del flete, no sigue la
    // cuenta del BENITIN: $219.000, y no $371.000.
    expect(hayTotal(219000)).toBeInTheDocument();
    // El total de arriba sigue apareciendo una sola vez.
    expect(vecesQueAparece(371000)).toBe(1);
  });

  // Un equipo que volvió TARDE sigue mostrando sus días vencidos aparte,
  // aunque ya esté de vuelta en la bodega. Sus días quedaron congelados en uno
  // solo al cerrar la línea, así que el desglose sale de compararlos con lo
  // que decía su fecha de vencimiento.
  it("al equipo devuelto tarde le separa igual los días vencidos", () => {
    dibujar([conTresDiasVencidos, otroEquipo]);

    expect(ivaDelRenglon("1 BENITIN · 5 días renta inicial")).toBe(dinero(95000));
    expect(ivaDelRenglon("1 BENITIN · 3 días vencidos")).toBe(dinero(57000));
  });

  it("el Total adicionales de arriba no cambia con el desglose", () => {
    // El número que manda sigue siendo este: los $171.000 de IVA de los dos
    // equipos más los $200.000 del flete, contado una sola vez.
    dibujar([conTresDiasVencidos, otroEquipo], conCargosDelLote);

    const bloqueTotal = screen.getByText("Total adicionales").closest("div");
    expect(sinEspacioDuro(bloqueTotal.textContent)).toContain(dinero(371000));
  });

  it("le resta al equipo los días que devolvió sin usar, sin renglón aparte", () => {
    // Salió por 5 días y devolvió 2 antes: se le cobran 3, o sea $300.000 y
    // $57.000 de IVA. Un renglón de $95.000 y otro de −$38.000 dirían lo
    // mismo, pero obligan a restar de cabeza para saber lo que se cobra.
    //
    // Va con un segundo equipo porque, fusionado el crédito, este solo tiene
    // un renglón: sin nadie más, no habría nada que desglosar.
    dibujar([
      benitin({
        dias: 3,
        fechaDevolucion: "2026-08-08",
      }),
      otroEquipo,
    ]);

    expect(ivaDelRenglon("1 BENITIN · 3 días renta inicial")).toBe(dinero(57000));
    expect(
      noHayRenglon("días? sin usar"),
    ).not.toBeInTheDocument();
  });

  it("no ofrece detalle cuando un equipo solo tiene su renta inicial", () => {
    // Devolvió el día que vencía: no hay días de más ni de menos que explicar,
    // y el renglón solo repetiría el total que ya está arriba.
    dibujar([
      benitin({
        dias: 5,
        fechaDevolucion: "2026-08-10",
      }),
    ]);

    expect(screen.queryByText("IVA POR EQUIPO")).not.toBeInTheDocument();
  });
});
