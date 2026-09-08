import { describe, it, expect } from "vitest";
import {
  GRUPO_INICIAL,
  grupoAgregados,
  siguienteGrupoAgregados,
  datosFactura,
  gruposDe,
  grupoInicialDe,
  equiposDe,
  equiposAfuera,
  abonosDe,
  entregasDe,
  pagosDe,
  tipoPagoDe,
  adicionalesDe,
  estaDevuelto,
  sigueAfuera,
  nuevaFactura,
  nuevoGrupo,
} from "./facturaModelo";

// La factura del ejemplo: 1 benitín contratado, 10 gatos agregados después y
// 4 de ellos devueltos el mismo día.
const factura1240 = {
  // El nodo NO lleva plata ni tipo de pago ni marca de IVA: eso vive en el
  // despacho y en cada equipo.
  factura: {
    numeroFactura: "1240",
    fechaCreacion: "2026-09-01",
    depositoResuelto: false,
    cerrada: false,
  },
  grupos: [
    {
      grupo: GRUPO_INICIAL,
      fechaSolicitud: "2026-09-01",
      pagos: {
        tipoPago: "parcial",
        medios: [{ medio: "Bancolombia", monto: 500000 }],
      },
      adicionales: {
        transporte: "Ida y vuelta",
        valorTransporte: 150000,
        deposito: true,
        valorDeposito: 300000,
      },
      equipos: [
        {
          nombre: "BENITIN",
          cantidadEquipos: 1,
          valorDia: 90000,
          diasAlquilados: 10,
          fechaDespacho: "2026-09-01",
          fechaVencimiento: "2026-09-10",
          ampliaciones: [],
        },
      ],
    },
    {
      grupo: "grupo-agregados-1",
      fechaSolicitud: "2026-09-04",
      pagos: {
        tipoPago: "total",
        medios: [{ medio: "Efectivo", monto: 150000 }],
      },
      adicionales: {
        transporte: "Solo ida",
        valorTransporte: 80000,
        deposito: true,
        valorDeposito: 200000,
      },
      equipos: [
        {
          nombre: "GATOS METALICOS",
          cantidadEquipos: 4,
          valorDia: 1500,
          diasAlquilados: 1,
          fechaDespacho: "2026-09-04",
          fechaVencimiento: "2026-09-13",
          ampliaciones: [],
          devolucion: {
            fechaDevolucion: "2026-09-04",
            buenEstado: true,
            valorRetenido: 0,
          },
        },
        {
          nombre: "GATOS METALICOS",
          cantidadEquipos: 6,
          valorDia: 1500,
          diasAlquilados: 10,
          fechaDespacho: "2026-09-04",
          fechaVencimiento: "2026-09-13",
          ampliaciones: [],
        },
      ],
    },
  ],
  abonos: [{ fecha: "2026-09-18", medio: "Efectivo", monto: 400000, tipo: "agregado" }],
  entregas: [],
  gestiones: [],
};

describe("los atajos de lectura", () => {
  it("los datos del documento salen del nodo factura", () => {
    expect(datosFactura(factura1240).numeroFactura).toBe("1240");
    expect(datosFactura(factura1240).fechaCreacion).toBe("2026-09-01");
    // Y ahí no hay plata: el total es una conclusión, no un dato guardado.
    expect(datosFactura(factura1240)).not.toHaveProperty("total");
    expect(datosFactura(factura1240)).not.toHaveProperty("subtotal");
    expect(datosFactura(factura1240)).not.toHaveProperty("valorIva");
    expect(datosFactura(factura1240)).not.toHaveProperty("aplicaIva");
  });

  it("sin documento devuelven vacío en vez de reventar", () => {
    expect(datosFactura(undefined)).toEqual({});
    expect(gruposDe(null)).toEqual([]);
    expect(abonosDe(undefined)).toEqual([]);
    expect(entregasDe(undefined)).toEqual([]);
    expect(equiposDe(undefined)).toEqual([]);
  });

  it("encuentra el despacho inicial por su nombre", () => {
    expect(grupoInicialDe(factura1240).equipos[0].nombre).toBe("BENITIN");
  });

  // Cada equipo viaja con su grupo al lado: es lo que permite saber de qué
  // despacho salió sin volver a recorrer nada.
  it("los equipos vienen con su grupo", () => {
    const todos = equiposDe(factura1240);
    expect(todos).toHaveLength(3);
    expect(todos[0].equipo.nombre).toBe("BENITIN");
    expect(todos[0].grupo.grupo).toBe(GRUPO_INICIAL);
    expect(todos[1].grupo.grupo).toBe("grupo-agregados-1");
  });

  it("el tipo de pago y los medios salen del mismo nodo", () => {
    const [inicial, agregados] = gruposDe(factura1240);
    expect(tipoPagoDe(inicial)).toBe("parcial");
    expect(tipoPagoDe(agregados)).toBe("total");
    // Cada despacho el suyo: no hay un tipo de pago de la factura entera.
    expect(datosFactura(factura1240)).not.toHaveProperty("tipoPago");
  });

  it("un despacho sin pagar conserva su tipo, aunque no tenga medios", () => {
    // Es el caso que se perdía si el tipo colgara de cada medio: sin medios
    // no habría dónde anotarlo.
    const grupo = nuevoGrupo({
      grupo: GRUPO_INICIAL,
      fechaSolicitud: "2026-09-20",
      tipoPago: "sinPago",
    });
    expect(tipoPagoDe(grupo)).toBe("sinPago");
    expect(pagosDe(grupo)).toEqual([]);
  });

  it("la plata del despacho se lee del grupo, no del equipo", () => {
    const [, agregados] = gruposDe(factura1240);
    expect(pagosDe(agregados)[0].monto).toBe(150000);
    expect(adicionalesDe(agregados).valorTransporte).toBe(80000);
    expect(adicionalesDe(agregados).valorDeposito).toBe(200000);
    // Y no está duplicada abajo: eso es lo que hacía contar dos veces el pago.
    agregados.equipos.forEach((equipo) => {
      expect(equipo).not.toHaveProperty("pagos");
      expect(equipo).not.toHaveProperty("valorTransporte");
    });
  });
});

describe("quién está afuera", () => {
  // Una línea devuelta volvió entera: al devolver una parte la línea se parte
  // en dos, así que no hay que restar cantidades para saberlo.
  it("tener el nodo devolución ya es haber vuelto", () => {
    const [, agregados] = gruposDe(factura1240);
    const [cuatro, seis] = agregados.equipos;
    expect(estaDevuelto(cuatro)).toBe(true);
    expect(sigueAfuera(cuatro)).toBe(false);
    expect(estaDevuelto(seis)).toBe(false);
    expect(sigueAfuera(seis)).toBe(true);
  });

  it("los que siguen en la obra son el benitín y los 6 gatos", () => {
    const afuera = equiposAfuera(factura1240);
    expect(afuera).toHaveLength(2);
    expect(afuera.map(({ equipo }) => equipo.cantidadEquipos)).toEqual([1, 6]);
  });
});

describe("cómo se nombra el próximo despacho", () => {
  it("el primer agregado es el 1", () => {
    const soloInicial = { grupos: [{ grupo: GRUPO_INICIAL, equipos: [] }] };
    expect(siguienteGrupoAgregados(soloInicial)).toBe("grupo-agregados-1");
  });

  it("sigue contando desde los que ya hay", () => {
    expect(siguienteGrupoAgregados(factura1240)).toBe("grupo-agregados-2");
  });

  it("una factura sin grupos todavía arranca en el 1", () => {
    expect(siguienteGrupoAgregados(undefined)).toBe("grupo-agregados-1");
    expect(grupoAgregados(3)).toBe("grupo-agregados-3");
  });
});

describe("cómo se arma un documento nuevo", () => {
  it("una factura nace con su despacho y el resto vacío", () => {
    const doc = nuevaFactura({
      factura: { numeroFactura: "1300", total: 100000 },
      grupoInicial: nuevoGrupo({
        grupo: GRUPO_INICIAL,
        fechaSolicitud: "2026-09-20",
        equipos: [{ nombre: "ANDAMIO", cantidadEquipos: 4 }],
      }),
    });

    expect(doc.grupos).toHaveLength(1);
    expect(doc.grupos[0].equipos[0].nombre).toBe("ANDAMIO");
    expect(doc.abonos).toEqual([]);
    expect(doc.entregas).toEqual([]);
    expect(doc.gestiones).toEqual([]);
  });

  it("un grupo sin adicionales nace con los cuatro campos en cero", () => {
    const grupo = nuevoGrupo({ grupo: GRUPO_INICIAL, fechaSolicitud: "2026-09-20" });
    expect(grupo.adicionales).toEqual({
      transporte: "",
      valorTransporte: 0,
      deposito: false,
      valorDeposito: 0,
    });
    // Todo lo del pago junto: sin medios, pero con el tipo, que es el dato que
    // se perdería en un despacho "sin pago".
    expect(grupo.pagos).toEqual({ tipoPago: "sinPago", medios: [] });
    expect(grupo.equipos).toEqual([]);
  });
});
