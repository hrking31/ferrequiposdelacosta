import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import { formatearMoneda } from "../../Utils/formato";
import CargosAdicionales from "./CargosAdicionales";
import { unEquipoDevuelto } from "../../test/facturas";

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
// `dias` son los que de verdad estuvo afuera, que es lo que la línea guarda al
// cerrarse. Lo que se le había PROMETIDO lo dice su fecha de vencimiento, y de
// comparar los dos sale el desglose.
const benitin = ({ dias, fechaVencimiento, fechaDevolucion, ...extra } = {}) =>
  unEquipoDevuelto({
    nombre: "BENITIN",
    cantidad: 1,
    valorDia: 100000,
    aplicaIva: true,
    fechaDespacho: "2026-08-06",
    dias,
    fechaVencimiento,
    fechaDevolucion,
    ...extra,
  });

// Le habían dado hasta el 10 —5 días— y volvió el 13: estuvo 8, o sea 3 días
// vencidos: $300.000 más $57.000 de IVA.
const conTresDiasVencidos = benitin({
  dias: 8,
  fechaVencimiento: "2026-08-10",
  fechaDevolucion: "2026-08-13",
});

// Un segundo equipo del mismo despacho: 2 días a $50.000, $19.000 de IVA.
const otroEquipo = benitin({
  nombre: "ANDAMIO",
  valorDia: 50000,
  dias: 2,
  fechaVencimiento: "2026-08-07",
  fechaDevolucion: "2026-08-07",
});

// El despacho del ejemplo real: $500.000 de depósito y $200.000 de transporte.
const conCargosDelLote = {
  deposito: 500000,
  transporteTipo: "Ida y vuelta",
  transporteMonto: 200000,
};

const dibujar = (equipos, extras = {}) =>
  renderConProviders(
    <CargosAdicionales
      equipos={equipos}
      deposito={0}
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

    expect(screen.getByTitle("1 BENITIN · días vencidos")).toBeInTheDocument();
    expect(
      screen.queryByTitle("1 BENITIN · días ampliados"),
    ).not.toBeInTheDocument();
  });

  it("llama ampliados a los días que sí se pactaron", () => {
    // Salió por 5 días —hasta el 10—, se le agregaron 2 y devolvió el 12 en la
    // fecha nueva: estuvo 7 días y nada quedó vencido.
    dibujar([
      benitin({
        dias: 7,
        ampliaciones: [{ diasAmpliados: 2, descuentoRealizado: 0 }],
        fechaVencimiento: "2026-08-12",
        fechaDevolucion: "2026-08-12",
      }),
    ]);

    expect(screen.getByTitle("1 BENITIN · días ampliados")).toBeInTheDocument();
    expect(
      screen.queryByTitle("1 BENITIN · días vencidos"),
    ).not.toBeInTheDocument();
  });

  it("separa en dos renglones lo pactado y lo vencido cuando hay de los dos", () => {
    // Se le agregaron 2 días hasta el 12, y aun así devolvió el 15: 10 días
    // afuera, de los cuales 7 estaban pactados y 3 se pasaron.
    dibujar([
      benitin({
        dias: 10,
        ampliaciones: [{ diasAmpliados: 2, descuentoRealizado: 0 }],
        fechaVencimiento: "2026-08-12",
        fechaDevolucion: "2026-08-15",
      }),
    ]);

    // $200.000 pactados y $300.000 vencidos, cada uno con su IVA.
    expect(ivaDelRenglon("1 BENITIN · días ampliados")).toBe(
      dinero(38000),
    );
    expect(ivaDelRenglon("1 BENITIN · días vencidos")).toBe(
      dinero(57000),
    );
  });

  // Los días que se le vencieron y el cliente pagó dejan de contarse como
  // vencidos, pero se cobran igual: si el desglose no los nombrara, sumaría
  // menos que el total del equipo y la resta no cerraría por ningún lado.
  it("nombra y cobra los días vencidos que ya se pagaron", () => {
    // Le habían dado hasta el 10 —5 días—; el 13 pagó los 3 vencidos y esos
    // días quedaron sellados, así que volvió el 13 con 8 días y nada abierto.
    dibujar([
      benitin({
        dias: 8,
        ampliaciones: [
          {
            fechaAnterior: "2026-08-10",
            fechaNueva: "2026-08-13",
            diasAmpliados: 3,
            diasPedidos: 0,
            diasVencidos: 3,
            descuentoRealizado: 0,
            porPago: true,
          },
        ],
        fechaVencimiento: "2026-08-13",
        fechaDevolucion: "2026-08-13",
      }),
    ]);

    expect(
      screen.getByTitle("1 BENITIN · días vencidos pagados"),
    ).toBeInTheDocument();
    // No son días que alguien haya concedido, ni quedan abiertos.
    expect(screen.queryByTitle("1 BENITIN · días ampliados")).not.toBeInTheDocument();
    expect(screen.queryByTitle("1 BENITIN · días vencidos")).not.toBeInTheDocument();

    // Y la plata está toda: esos 3 días valen $300.000 y pagan $57.000 de IVA,
    // que es lo que los separa de no cobrarse.
    expect(ivaDelRenglon("1 BENITIN · días vencidos pagados")).toBe(dinero(57000));
    expect(ivaDelRenglon("1 BENITIN · renta inicial")).toBe(dinero(95000));
  });

  it("muestra el IVA que le toca a cada renglón", () => {
    dibujar([conTresDiasVencidos]);

    expect(ivaDelRenglon("1 BENITIN · renta inicial")).toBe(dinero(95000));
    expect(ivaDelRenglon("1 BENITIN · días vencidos")).toBe(
      dinero(57000),
    );
  });

  it("muestra a cuánto llegaba el total antes del último movimiento", () => {
    dibujar([conTresDiasVencidos], conCargosDelLote);

    // El alta dejó el total en $700.000 de despacho más $95.000 de IVA.
    expect(hayTotal(795000)).toBeInTheDocument();
  });

  it("no repite abajo el total que ya está arriba", () => {
    // Los días vencidos son el último movimiento: dejaron el total en
    // $852.000, que es el "Total adicionales" de arriba. Si el desglose lo
    // repitiera, el mismo número aparecería dos veces y el historial diría
    // que pasó algo después, cuando no pasó nada.
    dibujar([conTresDiasVencidos], conCargosDelLote);

    expect(vecesQueAparece(852000)).toBe(1);
  });

  it("deja el movimiento más reciente arriba y el alta abajo", () => {
    dibujar([conTresDiasVencidos], conCargosDelLote);

    expect(renglonesEnPantalla()).toEqual([
      "1 BENITIN · días vencidos",
      "1 BENITIN · renta inicial",
    ]);
  });

  // El nombre de un equipo de alquiler es largo —"1 COMPRESOR NEUMATICO
  // INGERSOLLRAND 185"— y repetido en cada renglón no entraba en una línea: al
  // partirse en dos descolocaba los totales de la derecha, que dejaban de caer
  // al lado del movimiento que explican.
  it("escribe el nombre del equipo una sola vez, encabezando sus renglones", () => {
    dibujar([conTresDiasVencidos], conCargosDelLote);

    expect(screen.getAllByText("1 BENITIN")).toHaveLength(1);
  });

  // Manda el orden en que pasó, no el equipo: por eso un equipo que se movió
  // en dos momentos distintos encabeza dos grupos en vez de juntar lo suyo.
  it("vuelve a escribir el nombre cuando el historial cambia de equipo", () => {
    dibujar([conTresDiasVencidos, otroEquipo], conCargosDelLote);

    // Los vencidos del BENITIN, y debajo las altas de los dos equipos: el
    // BENITIN aparece al principio y al final.
    expect(renglonesEnPantalla()).toEqual([
      "1 BENITIN · días vencidos",
      "1 ANDAMIO · renta inicial",
      "1 BENITIN · renta inicial",
    ]);
    expect(screen.getAllByText("1 BENITIN")).toHaveLength(2);
  });

  it("acumula el historial cuando el lote tiene varios equipos", () => {
    // El alta de los dos equipos y después los días vencidos del primero:
    // $795.000, $814.000 y el vigente, que no se repite.
    dibujar([conTresDiasVencidos, otroEquipo], conCargosDelLote);

    expect(hayTotal(795000)).toBeInTheDocument();
    expect(hayTotal(814000)).toBeInTheDocument();
    expect(vecesQueAparece(871000)).toBe(1);
  });

  // Un equipo que volvió TARDE sigue mostrando sus días vencidos aparte,
  // aunque ya esté de vuelta en la bodega. Sus días quedaron congelados en uno
  // solo al cerrar la línea, así que el desglose sale de compararlos con lo
  // que decía su fecha de vencimiento.
  it("al equipo devuelto tarde le separa igual los días vencidos", () => {
    dibujar([conTresDiasVencidos, otroEquipo]);

    expect(ivaDelRenglon("1 BENITIN · renta inicial")).toBe(dinero(95000));
    expect(ivaDelRenglon("1 BENITIN · días vencidos")).toBe(dinero(57000));
  });

  it("el Total adicionales de arriba no cambia con el desglose", () => {
    // El número que manda sigue siendo este: los $171.000 de IVA de los dos
    // equipos más los $700.000 del despacho, contado una sola vez.
    dibujar([conTresDiasVencidos, otroEquipo], conCargosDelLote);

    const bloqueTotal = screen.getByText("Total adicionales").closest("div");
    expect(sinEspacioDuro(bloqueTotal.textContent)).toContain(dinero(871000));
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
        fechaVencimiento: "2026-08-10",
        fechaDevolucion: "2026-08-08",
      }),
      otroEquipo,
    ]);

    expect(ivaDelRenglon("1 BENITIN · renta inicial")).toBe(dinero(57000));
    expect(
      screen.queryByTitle("1 BENITIN · días sin usar"),
    ).not.toBeInTheDocument();
  });

  it("no ofrece detalle cuando un equipo solo tiene su renta inicial", () => {
    // Devolvió el día que vencía: no hay días de más ni de menos que explicar,
    // y el renglón solo repetiría el total que ya está arriba.
    dibujar([
      benitin({
        dias: 5,
        fechaVencimiento: "2026-08-10",
        fechaDevolucion: "2026-08-10",
      }),
    ]);

    expect(screen.queryByText("IVA POR EQUIPO")).not.toBeInTheDocument();
  });
});
