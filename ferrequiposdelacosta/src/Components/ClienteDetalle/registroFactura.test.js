import { describe, it, expect } from "vitest";
import { autorLegible, describirCambio } from "./registroFactura";
import { borradorDe, facturaCorregida } from "./correccionFactura";
import { abrirTramosFactura, partirLinea } from "./facturaCuentas";
import { formatearMoneda } from "../../Utils/formato";
import { unEquipo, unEquipoDevuelto, unTramoVencido, unaFactura } from "../../test/facturas";

// El registro de cambios, puesto en palabras. El servidor guarda la factura
// de antes y la de después; lo que se fija acá es que el renglón que lee el
// administrador diga lo que de verdad pasó.

// El 13/10/2026 a las 5:40 p. m. en Colombia.
const CUANDO = Date.UTC(2026, 9, 13, 22, 40);
const HOY = "2026-10-13";
const plata = (valor) => formatearMoneda(valor);

const cerchas = () =>
  unEquipoDevuelto({
    nombre: "CERCHAS METALICAS",
    cantidad: 6,
    valorDia: 1500,
    dias: 7,
    fechaDespacho: "2026-09-01",
    aplicaIva: false,
    vencidos: [unTramoVencido({ desde: "2026-09-08", hasta: "2026-10-10" })],
    fechaDevolucion: "2026-10-10",
  });

const factura = (extra = {}) =>
  unaFactura({
    numeroFactura: "0412",
    fechaCreacion: "2026-09-01",
    tipoPago: "total",
    pagos: [{ medio: "Efectivo", monto: 63000 }],
    equipos: [cerchas()],
    ...extra,
  });

const cambio = (antes, despues) =>
  describirCambio({ clase: "modificada", antes, despues, cuando: CUANDO });

describe("el registro de cambios — qué pasó", () => {
  it("dice cuando la factura se creó o se borró", () => {
    expect(describirCambio({ clase: "creada", antes: null, despues: factura() })).toEqual([
      "Se creó la factura.",
    ]);
    expect(describirCambio({ clase: "borrada", antes: factura(), despues: null })).toEqual([
      "Se borró la factura.",
    ]);
  });

  // La corrección que pidió todo esto, tal como la escribe la pantalla.
  it("la devolución corregida: la fecha de antes, la de después y el saldo", () => {
    const antes = factura();
    const borrador = borradorDe(antes);
    borrador.grupos[0].equipos[0].hechos = borrador.grupos[0].equipos[0].hechos.map(
      (hecho) => ({ ...hecho, fecha: "2026-09-07" }),
    );
    const despues = facturaCorregida(antes, borrador, HOY);

    expect(cambio(antes, despues)).toEqual([
      "CERCHAS METALICAS: devolución 10/10/2026 → 07/09/2026",
      `Saldo pendiente: ${plata(297000)} → ${plata(0)}`,
    ]);
  });

  it("los datos del equipo y del despacho, cada uno con su antes y su después", () => {
    const antes = factura();
    const despues = factura({
      numeroFactura: "0413",
      valorDeposito: 50000,
      pagos: [{ medio: "Nequi", monto: 113000 }],
      equipos: [{ ...cerchas(), cantidadEquipos: 4, valorDia: 2000 }],
    });

    expect(cambio(antes, despues)).toEqual([
      "Número: 0412 → 0413",
      `Despacho inicial: depósito ${plata(0)} → ${plata(50000)}`,
      `Despacho inicial: pago ${plata(63000)} → ${plata(113000)}`,
      "CERCHAS METALICAS: cantidad 6 → 4",
      `CERCHAS METALICAS: precio por día ${plata(1500)} → ${plata(2000)}`,
      // 4 cerchas a $2.000: 7 días del alta y 33 de mora son $320.000, y de
      // los $113.000 pagados, $50.000 fueron al depósito.
      `Saldo pendiente: ${plata(297000)} → ${plata(257000)}`,
    ]);
  });

  // Lo que pasó el 14/10 con una factura real: se movió solo la fecha de una
  // entrega, y como el registro llegó con los campos en otro orden, decía
  // también "pago $180.000 → $180.000", que cambió el abono y los días
  // vencidos.
  it("los mismos datos con los campos en otro orden no cuentan como cambio", () => {
    const alReves = (valor) =>
      Array.isArray(valor)
        ? valor.map(alReves)
        : valor && typeof valor === "object"
          ? Object.fromEntries(
              Object.keys(valor)
                .reverse()
                .map((clave) => [clave, alReves(valor[clave])]),
            )
          : valor;
    const conPlata = (fechaEntrega) =>
      factura({
        abonos: [
          { fecha: "2026-10-13", medio: "Cruce", monto: 20000, tipo: "cruce", desdeFactura: "0400" },
        ],
        entregas: [{ fecha: fechaEntrega, medio: "Efectivo", monto: 10000 }],
      });

    expect(cambio(conPlata("2026-10-13"), alReves(conPlata("2026-10-14")))).toEqual([
      "Entrega del 13/10/2026: fecha 13/10/2026 → 14/10/2026",
    ]);
  });

  it("un abono nuevo sale con su monto, su medio y su fecha", () => {
    const antes = factura();
    const despues = factura({
      abonos: [{ fecha: "2026-10-13", medio: "Nequi", monto: 100000, tipo: "cliente" }],
    });

    expect(cambio(antes, despues)).toEqual([
      `Abono de ${plata(100000)} por Nequi (13/10/2026)`,
      `Saldo pendiente: ${plata(297000)} → ${plata(197000)}`,
    ]);
  });

  it("un abono corregido dice qué se le corrigió", () => {
    const conAbono = (extra = {}) =>
      factura({
        abonos: [
          { fecha: "2026-10-13", medio: "Nequi", monto: 100000, tipo: "cliente", ...extra },
        ],
      });

    expect(cambio(conAbono(), conAbono({ medio: "Efectivo" }))).toEqual([
      "Abono del 13/10/2026: medio Nequi → Efectivo",
    ]);
    expect(cambio(conAbono(), conAbono({ fecha: "2026-10-12", monto: 120000 }))).toEqual([
      `Abono del 13/10/2026: fecha 13/10/2026 → 12/10/2026, ${plata(100000)} → ${plata(120000)}`,
      `Saldo pendiente: ${plata(197000)} → ${plata(177000)}`,
    ]);
    // El número nuevo de la factura de donde vino.
    expect(cambio(conAbono({ desdeFactura: "0412" }), conAbono({ desdeFactura: "0413" }))).toEqual([
      "Abono del 13/10/2026: cambió la factura que nombra",
    ]);
  });

  it("un abono que desaparece se nota en la suma", () => {
    const conAbono = factura({
      abonos: [{ fecha: "2026-10-13", medio: "Nequi", monto: 100000, tipo: "cliente" }],
    });

    expect(cambio(conAbono, factura())).toEqual([
      `Abonos: ${plata(100000)} → ${plata(0)}`,
      `Saldo pendiente: ${plata(197000)} → ${plata(297000)}`,
    ]);
  });

  it("quitar la devolución lo dice, con la fecha que tenía", () => {
    const antes = factura();
    const sinDevolver = { ...cerchas() };
    delete sinDevolver.devolucion;
    sinDevolver.vencidos = [unTramoVencido({ desde: "2026-09-08", hasta: null })];

    expect(cambio(antes, factura({ equipos: [sinDevolver] }))[0]).toBe(
      "CERCHAS METALICAS: se quitó la devolución del 10/10/2026",
    );
  });

  // Lo único que cambia sin que nadie haga nada.
  it("la mora que abre la madrugada se dice como lo que es", () => {
    const antes = factura({
      equipos: [
        unEquipo({ nombre: "ANDAMIO", dias: 3, fechaDespacho: "2026-10-01", aplicaIva: false }),
      ],
    });
    const despues = { ...antes, grupos: abrirTramosFactura(antes, HOY) };

    // Vencía el 03/10: del 04 al 13 son 10 días a $10.000. Lo pagado cubría
    // el alquiler y sobraba, así que recién ahora pasa a deber.
    expect(cambio(antes, despues)).toEqual([
      "ANDAMIO: empezó a correr la mora desde el 04/10/2026",
      `Saldo pendiente: ${plata(0)} → ${plata(67000)}`,
    ]);
  });

  // Al devolver una parte la línea se parte en dos: ya no se puede comparar
  // equipo por equipo, y se dice en unidades.
  it("una devolución parcial se cuenta en unidades", () => {
    const afuera = unEquipo({
      nombre: "ANDAMIO",
      cantidad: 5,
      dias: 30,
      fechaDespacho: "2026-10-01",
      aplicaIva: false,
    });
    const antes = factura({ equipos: [afuera] });
    const [vuelve, queda] = partirLinea(afuera, 2);
    const despues = factura({
      equipos: [
        { ...vuelve, devolucion: { fechaDevolucion: HOY, buenEstado: true, motivo: "", valorRetenido: 0 } },
        queda,
      ],
    });

    expect(cambio(antes, despues)[0]).toBe(
      "Despacho inicial: 5 → 5 unidades, 0 → 2 devueltas",
    );
  });

  it("si no cambió nada que sepa nombrar, lo dice igual", () => {
    const antes = factura();

    expect(cambio(antes, { ...antes, otroDato: true })).toEqual([
      "Cambió la factura, sin detalle que mostrar.",
    ]);
  });
});

describe("el registro de cambios — quién fue", () => {
  const usuarios = [
    { id: "uid-1", name: "Hernando Rey", email: "hernando@ejemplo.com" },
    { id: "uid-2", name: "", email: "aida@ejemplo.com" },
  ];

  it("busca al usuario de la app por su identificador o por su correo", () => {
    expect(autorLegible({ quien: "uid-1", tipoDeAutor: "app_user" }, usuarios)).toBe(
      "Hernando Rey",
    );
    expect(
      autorLegible({ quien: "hernando@ejemplo.com", tipoDeAutor: "unknown" }, usuarios),
    ).toBe("Hernando Rey");
    expect(autorLegible({ quien: "uid-2", tipoDeAutor: "app_user" }, usuarios)).toBe(
      "aida@ejemplo.com",
    );
  });

  it("sin persona detrás, dice que fue el sistema", () => {
    expect(autorLegible({ quien: null, tipoDeAutor: "system" }, usuarios)).toBe("El sistema");
    expect(
      autorLegible({ quien: "robot@proyecto.iam", tipoDeAutor: "service_account" }, usuarios),
    ).toBe("El sistema");
  });

  it("y si no lo reconoce, muestra lo que anotó el servidor en vez de callarlo", () => {
    expect(autorLegible({ quien: "uid-desconocido", tipoDeAutor: "app_user" }, usuarios)).toBe(
      "uid-desconocido",
    );
    expect(autorLegible({ quien: null, tipoDeAutor: "unknown" }, usuarios)).toBe(
      "Autor desconocido",
    );
  });
});
