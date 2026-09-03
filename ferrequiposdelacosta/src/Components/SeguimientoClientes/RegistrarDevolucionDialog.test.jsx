import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import {
  calcularVencimiento,
  obtenerFechaHoyBogota,
} from "../ClienteDetalle/facturaUtils";
import RegistrarDevolucionDialog from "./RegistrarDevolucionDialog";

// Registrar que el cliente devolvió equipos. Es la operación que corta la
// cuenta: desde el día de la devolución el equipo deja de sumar días.
//
// Lo más delicado es la devolución PARCIAL: la línea del equipo se parte en
// dos, una cerrada con lo que volvió y otra que sigue corriendo con lo que el
// cliente se queda. Si eso se hace mal, o se cobra de menos lo que sigue
// afuera, o se sigue cobrando lo que ya volvió.
const bd = vi.hoisted(() => ({
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  update: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db, ...partes) => partes.join("/"),
  doc: (_db, ...partes) => partes.join("/"),
  getDocs: bd.getDocs,
  writeBatch: () => ({ update: bd.update, commit: bd.commit }),
}));

const HOY = obtenerFechaHoyBogota();

const cliente = { id: "cli1", tipo: "persona", nombres: "Aida", apellido: "Pérez" };

// 5 andamios afuera, ninguno devuelto todavía.
const factura = {
  id: "f1",
  numeroFactura: 1573,
  fecha: "2026-08-01",
  valorTotal: 300000,
  deposito: 100000,
  equipos: [
    {
      nombre: "ANDAMIO",
      cantidad: 5,
      dias: 3,
      valor: 20000,
      fechaDespacho: "2026-08-01",
      fechaVencimiento: "2026-08-03",
    },
  ],
  pagos: [],
  abonos: [],
};

// La misma factura pero todavía al día: salió hoy y vence dentro de 10 días.
// Sirve para el caso en que la devolución se registra desde Detalle Cliente,
// antes de que la factura entre a Seguimiento.
const facturaAlDia = {
  ...factura,
  equipos: [
    {
      ...factura.equipos[0],
      fechaDespacho: HOY,
      fechaVencimiento: calcularVencimiento(HOY, 10),
    },
  ],
};

// Vencida por el ANDAMIO, pero con una MEZCLADORA agregada después que
// todavía tiene días por delante.
const facturaVencidaConEquipoEnPlazo = {
  ...factura,
  equipos: [
    factura.equipos[0],
    {
      nombre: "MEZCLADORA",
      cantidad: 1,
      dias: 5,
      valor: 50000,
      fechaDespacho: HOY,
      fechaVencimiento: calcularVencimiento(HOY, 5),
    },
  ],
};

const abrir = (props = {}) =>
  renderConProviders(
    <RegistrarDevolucionDialog
      open
      onClose={() => {}}
      cliente={cliente}
      factura={factura}
      {...props}
    />,
  );

const guardar = (usuario) =>
  usuario.click(screen.getByRole("button", { name: "Guardar" }));

const loGuardadoEnLaFactura = () => bd.update.mock.calls[0][1];

const exito = () => screen.findByText("Devolución registrada correctamente.");

beforeEach(() => {
  vi.clearAllMocks();
  bd.getDocs.mockResolvedValue({ docs: [] });
});

describe("RegistrarDevolucionDialog — antes de guardar", () => {
  it("sin cantidad no registra nada", async () => {
    const { usuario } = abrir();

    await guardar(usuario);

    expect(
      await screen.findByText("Ingresá la cantidad que devuelve al menos un equipo."),
    ).toBeInTheDocument();
    expect(bd.commit).not.toHaveBeenCalled();
  });
});

describe("RegistrarDevolucionDialog — devuelve todo", () => {
  it("cierra la línea con la fecha de hoy y la anota como devolución total", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "5");
    // "Volvió todo completo y en buen estado" ya viene marcado: es el caso
    // normal, y tocarlo sería decir que hay algo que retener.
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();

    const guardado = loGuardadoEnLaFactura();
    expect(guardado.equipos).toHaveLength(1);
    expect(guardado.equipos[0].cantidadDevuelta).toBe(5);
    expect(guardado.equipos[0].fechaDevolucion).toBe(HOY);

    expect(guardado.gestiones[0].tipo).toBe("total");
    expect(guardado.gestiones[0].unidades).toBe(5);
  });

  it("con el último equipo de vuelta se resuelve el depósito", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "5");
    // "Volvió todo completo y en buen estado" ya viene marcado: es el caso
    // normal, y tocarlo sería decir que hay algo que retener.
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    // Volvió bien: no se retiene nada, se le devuelve todo.
    expect(loGuardadoEnLaFactura().depositoResuelto).toEqual({
      retenido: 0,
      motivo: "",
      fecha: HOY,
    });
  });

  it("si un equipo volvió mal, exige decir qué le pasó", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "5");
    // Se destilda "volvieron en buen estado": recién ahí aparece qué pasó.
    await usuario.click(screen.getByLabelText(/en buen estado/));
    await usuario.type(screen.getByLabelText("Se retiene del depósito"), "30000");
    await guardar(usuario);

    expect(
      await screen.findByText("Escribí qué le pasó al ANDAMIO."),
    ).toBeInTheDocument();
    expect(bd.commit).not.toHaveBeenCalled();
  });

  it("guarda el estado en la línea del equipo y liquida el depósito con eso", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "5");
    await usuario.click(screen.getByLabelText(/en buen estado/));
    await usuario.type(screen.getByLabelText("Qué le pasó"), "Andamio rayado");
    await usuario.type(screen.getByLabelText("Se retiene del depósito"), "30000");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();

    // El estado queda pegado al equipo que volvió, con su fecha.
    expect(loGuardadoEnLaFactura().equipos[0].estadoDevolucion).toEqual({
      buenEstado: false,
      motivo: "Andamio rayado",
      retenido: 30000,
      fecha: HOY,
    });

    // Y el depósito se liquida con lo anotado, diciendo por CUÁL equipo.
    expect(loGuardadoEnLaFactura().depositoResuelto).toEqual({
      retenido: 30000,
      motivo: "ANDAMIO: Andamio rayado",
      fecha: HOY,
    });
  });

  it("cuando vuelve bien, deja anotado que volvió sin novedad", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "5");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    expect(loGuardadoEnLaFactura().equipos[0].estadoDevolucion).toEqual({
      buenEstado: true,
      motivo: "",
      retenido: 0,
      fecha: HOY,
    });
  });
});

// Lo que motivó todo esto: el cliente devuelve UNO de siete equipos hoy y el
// resto en tres semanas. Calificar cómo volvió el de hoy no puede esperar al
// último, porque para entonces no hay quién lo recuerde.
describe("RegistrarDevolucionDialog — calificar sin devolver todo", () => {
  it("pregunta por el estado aunque queden equipos afuera", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "2");

    // Quedan 3 andamios afuera y la casilla del estado igual está.
    expect(screen.getByLabelText(/en buen estado/)).toBeInTheDocument();
    // El depósito, en cambio, no se liquida hasta que vuelva todo.
    expect(screen.queryByText(/al liquidar la factura/)).not.toBeInTheDocument();
  });

  it("el estado queda en la parte que volvió, no en la que sigue afuera", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "2");
    await usuario.click(screen.getByLabelText(/en buen estado/));
    await usuario.type(screen.getByLabelText("Qué le pasó"), "Uno llegó torcido");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();

    const [devuelto, afuera] = loGuardadoEnLaFactura().equipos;
    expect(devuelto.cantidadDevuelta).toBe(2);
    expect(devuelto.estadoDevolucion.motivo).toBe("Uno llegó torcido");
    // La línea que sigue afuera no volvió: no hay nada que calificar en ella.
    expect(afuera.cantidad).toBe(3);
    expect(afuera.estadoDevolucion).toBeUndefined();
    // Y el depósito sigue sin resolverse.
    expect(loGuardadoEnLaFactura().depositoResuelto).toBeUndefined();
  });
});

describe("RegistrarDevolucionDialog — devuelve una parte", () => {
  it("parte la línea en dos: lo que volvió y lo que sigue afuera", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "3");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();

    const equipos = loGuardadoEnLaFactura().equipos;
    expect(equipos).toHaveLength(2);

    // La primera queda cerrada con las 3 que volvieron hoy.
    expect(equipos[0]).toMatchObject({
      cantidad: 3,
      cantidadDevuelta: 3,
      fechaDevolucion: HOY,
    });

    // La segunda sigue corriendo con las 2 que el cliente se quedó, y no
    // arrastra la fecha de devolución de la otra.
    expect(equipos[1]).toMatchObject({ cantidad: 2, cantidadDevuelta: 0 });
    expect(equipos[1].fechaDevolucion).toBeUndefined();
  });

  // El caso de la factura 1234: un lote de 10 gatos agregado después del alta,
  // con su pago, su transporte y su depósito. Al devolver 4, la línea se parte
  // — y si las dos mitades se quedan con esos cargos, la factura cuenta el
  // pago dos veces y termina mostrando un saldo a favor que no existe.
  it("los cargos del lote no se duplican al partir la línea", async () => {
    const facturaConLote = {
      ...factura,
      equipos: [
        {
          nombre: "GATOS METALICOS",
          cantidad: 10,
          dias: 10,
          valor: 1500,
          fechaDespacho: "2026-08-01",
          fechaVencimiento: "2026-08-10",
          agregadoPosteriormente: true,
          loteId: "lote-1",
          tipoPago: "total",
          pagos: [{ medio: "Bancolombia", monto: 198500 }],
          transporte: "Solo ida",
          valorTransporte: 20000,
          deposito: 50000,
        },
      ],
    };

    const { usuario } = abrir({ factura: facturaConLote });

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "4");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();

    const equipos = loGuardadoEnLaFactura().equipos;
    expect(equipos).toHaveLength(2);

    // Los cargos del lote se quedan en la línea que volvió...
    expect(equipos[0]).toMatchObject({
      cantidad: 4,
      pagos: [{ medio: "Bancolombia", monto: 198500 }],
      valorTransporte: 20000,
      deposito: 50000,
    });

    // ...y la que sigue afuera arrastra solo lo suyo.
    expect(equipos[1].cantidad).toBe(6);
    expect(equipos[1].pagos).toBeUndefined();
    expect(equipos[1].tipoPago).toBeUndefined();
    expect(equipos[1].transporte).toBeUndefined();
    expect(equipos[1].valorTransporte).toBeUndefined();
    expect(equipos[1].deposito).toBeUndefined();
  });

  it("queda anotada como devolución parcial, con cuántas unidades volvieron", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "3");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    expect(loGuardadoEnLaFactura().gestiones[0]).toMatchObject({
      tipo: "parcial",
      unidades: 3,
    });
  });

  // Los andamios vencían el 3 de agosto, así que esta factura ya está en
  // Seguimiento: la devolución sí es una gestión de cobranza y va sin marca.
  it("la de una factura vencida cuenta como gestión de cobranza", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "3");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    expect(loGuardadoEnLaFactura().gestiones[0].enSeguimiento).toBeUndefined();
  });

  // El mismo diálogo se abre desde Detalle Cliente, donde la factura puede
  // estar vigente. Devolver antes de tiempo NO es gestión de cobranza y no se
  // anota: si se anotara, el día que la factura se venza entraría a
  // Seguimiento rotulada como trabajada, cuando nadie la ha trabajado.
  it("la de una factura al día no se anota como gestión", async () => {
    const { usuario } = abrir({ factura: facturaAlDia, desdeLaFicha: true });

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "3");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    expect(loGuardadoEnLaFactura().gestiones).toEqual([]);
  });

  // Una factura vencida puede tener equipos agregados después que todavía
  // están en plazo. Esos se devuelven desde la ficha, y esa devolución
  // tampoco es cobranza: el equipo no venció, nadie hizo nada para
  // conseguirlo. Lo vencido se sigue devolviendo desde Seguimiento.
  it("lo devuelto en plazo no se anota, aunque la factura esté vencida", async () => {
    const { usuario } = abrir({
      factura: facturaVencidaConEquipoEnPlazo,
      desdeLaFicha: true,
    });

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "1");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    expect(loGuardadoEnLaFactura().gestiones).toEqual([]);
  });

  // Darle más días a lo que el cliente se queda es una decisión de cobranza:
  // se pacta con quien ya está vencido y queda anotada en Seguimiento. Desde
  // la ficha solo se registra lo que volvió.
  it("desde la ficha no pregunta qué hacer con lo que queda afuera", async () => {
    const { usuario } = abrir({ factura: facturaAlDia, desdeLaFicha: true });

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "3");

    expect(screen.queryByLabelText("Días a ampliar")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Dejar indefinida (el cliente avisará)"),
    ).not.toBeInTheDocument();
  });

  it("desde Seguimiento sí lo pregunta", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "3");

    expect(screen.getByLabelText("Días a ampliar")).toBeInTheDocument();
  });

  it("desde la ficha no ofrece los equipos que ya vencieron", async () => {
    abrir({
      factura: facturaVencidaConEquipoEnPlazo,
      desdeLaFicha: true,
    });

    expect(await screen.findByText(/MEZCLADORA/)).toBeInTheDocument();
    expect(screen.queryByText(/ANDAMIO/)).not.toBeInTheDocument();
  });

  // La otra mitad de la regla: no anotar la gestión no puede significar perder
  // la devolución. Queda en el equipo, que es de donde la ficha del cliente
  // saca lo devuelto y cuándo.
  it("la de una factura al día sí queda registrada en el equipo", async () => {
    const { usuario } = abrir({ factura: facturaAlDia, desdeLaFicha: true });

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "3");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const devuelto = loGuardadoEnLaFactura().equipos.find(
      (equipo) => Number(equipo.cantidadDevuelta) > 0,
    );
    expect(devuelto).toMatchObject({ cantidadDevuelta: 3, fechaDevolucion: HOY });
  });

  it("a lo que sigue afuera se le puede dar más plazo en el mismo paso", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "3");
    await usuario.type(screen.getByLabelText("Días a ampliar"), "2");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();

    const restante = loGuardadoEnLaFactura().equipos[1];
    // Vencía el 3; con 2 días más, el 5. Y queda el registro de la ampliación.
    expect(restante.fechaVencimiento).toBe("2026-08-05");
    expect(restante.ampliaciones[0]).toMatchObject({
      fechaAnterior: "2026-08-03",
      fechaNueva: "2026-08-05",
      dias: 2,
    });
  });

  it("no se puede devolver más de lo que hay afuera", async () => {
    const { usuario } = abrir();

    // Se cargan 9 sobre 5 pendientes: se toman 5, no se inventan devoluciones.
    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "9");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const equipos = loGuardadoEnLaFactura().equipos;
    expect(equipos).toHaveLength(1);
    expect(equipos[0].cantidadDevuelta).toBe(5);
  });
});
