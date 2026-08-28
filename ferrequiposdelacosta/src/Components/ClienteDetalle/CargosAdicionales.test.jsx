import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import { formatearMoneda } from "../../Utils/formato";
import CargosAdicionales from "./CargosAdicionales";

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

// El IVA de un renglón: va pegado a su nombre, en la celda de al lado.
const ivaDelRenglon = (etiqueta) =>
  sinEspacioDuro(screen.getByText(etiqueta).nextElementSibling.textContent);

// Los totales viven en su propia columna —la que cae bajo "Total
// adicionales"—, así que no son hermanos del nombre: se buscan por su cifra.
const hayTotal = (monto) => screen.getByText(dinero(monto));
const vecesQueAparece = (monto) => screen.getAllByText(dinero(monto)).length;

// Los nombres del desglose, en el orden en que se leen en pantalla.
const renglonesEnPantalla = () =>
  screen.getAllByText(/^1 (BENITIN|ANDAMIO)/).map((fila) => fila.textContent);

// 1 equipo, 5 días a $100.000, con IVA: $500.000 de renta inicial, $95.000 de
// IVA. Ya devuelto, para que la cuenta se corte en una fecha fija.
const equipoBase = {
  nombre: "BENITIN",
  cantidad: 1,
  dias: 5,
  valor: 100000,
  aplicaIva: true,
  fechaDespacho: "2026-08-06",
  cantidadDevuelta: 1,
};

// Venció el 10 y volvió el 13: tres días vencidos, $300.000 más $57.000 de IVA.
const conTresDiasVencidos = {
  ...equipoBase,
  fechaVencimiento: "2026-08-10",
  fechaDevolucion: "2026-08-13",
};

// Un segundo equipo del mismo despacho: 2 días a $50.000, $19.000 de IVA.
const otroEquipo = {
  ...equipoBase,
  nombre: "ANDAMIO",
  dias: 2,
  valor: 50000,
  fechaVencimiento: "2026-08-08",
  fechaDevolucion: "2026-08-08",
};

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

    expect(screen.getByText("1 BENITIN · días vencidos")).toBeInTheDocument();
    expect(
      screen.queryByText("1 BENITIN · días ampliados"),
    ).not.toBeInTheDocument();
  });

  it("llama ampliados a los días que sí se pactaron", () => {
    // Se le agregaron 2 días y devolvió en la fecha nueva: nada vencido.
    dibujar([
      {
        ...equipoBase,
        ampliaciones: [{ dias: 2, descuento: 0 }],
        fechaVencimiento: "2026-08-12",
        fechaDevolucion: "2026-08-12",
      },
    ]);

    expect(screen.getByText("1 BENITIN · días ampliados")).toBeInTheDocument();
    expect(
      screen.queryByText("1 BENITIN · días vencidos"),
    ).not.toBeInTheDocument();
  });

  it("separa en dos renglones lo pactado y lo vencido cuando hay de los dos", () => {
    // Se le agregaron 2 días hasta el 12, y aun así devolvió el 15.
    dibujar([
      {
        ...equipoBase,
        ampliaciones: [{ dias: 2, descuento: 0 }],
        fechaVencimiento: "2026-08-12",
        fechaDevolucion: "2026-08-15",
      },
    ]);

    // $200.000 pactados y $300.000 vencidos, cada uno con su IVA.
    expect(ivaDelRenglon("1 BENITIN · días ampliados")).toBe(
      dinero(38000),
    );
    expect(ivaDelRenglon("1 BENITIN · días vencidos")).toBe(
      dinero(57000),
    );
  });

  it("muestra el IVA que le toca a cada renglón", () => {
    dibujar([conTresDiasVencidos]);

    expect(ivaDelRenglon("1 BENITIN")).toBe(dinero(95000));
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
      "1 BENITIN",
    ]);
  });

  it("acumula el historial cuando el lote tiene varios equipos", () => {
    // El alta de los dos equipos y después los días vencidos del primero:
    // $795.000, $814.000 y el vigente, que no se repite.
    dibujar([conTresDiasVencidos, otroEquipo], conCargosDelLote);

    expect(hayTotal(795000)).toBeInTheDocument();
    expect(hayTotal(814000)).toBeInTheDocument();
    expect(vecesQueAparece(871000)).toBe(1);
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
      {
        ...equipoBase,
        fechaVencimiento: "2026-08-10",
        fechaDevolucion: "2026-08-08",
      },
      otroEquipo,
    ]);

    expect(ivaDelRenglon("1 BENITIN")).toBe(dinero(57000));
    expect(
      screen.queryByText("1 BENITIN · días sin usar"),
    ).not.toBeInTheDocument();
  });

  it("no ofrece detalle cuando un equipo solo tiene su renta inicial", () => {
    // Devolvió el día que vencía: no hay días de más ni de menos que explicar,
    // y el renglón solo repetiría el total que ya está arriba.
    dibujar([
      {
        ...equipoBase,
        fechaVencimiento: "2026-08-10",
        fechaDevolucion: "2026-08-10",
      },
    ]);

    expect(screen.queryByText("IVA POR EQUIPO")).not.toBeInTheDocument();
  });
});
