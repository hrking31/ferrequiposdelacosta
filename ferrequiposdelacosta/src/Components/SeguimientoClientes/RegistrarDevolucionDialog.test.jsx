import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import {
  calcularVencimiento,
  diasDeAlquiler,
  obtenerFechaHoyBogota,
} from "../ClienteDetalle/facturaUtils";
import RegistrarDevolucionDialog from "./RegistrarDevolucionDialog";
import { grupoAgregados, unEquipo, unGrupo, unaFactura } from "../../test/facturas";

// Registrar que el cliente devolvió equipos. Es la operación que corta la
// cuenta: al volver, los días del equipo dejan de correr y quedan escritos.
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

const andamio = (extra = {}) =>
  unEquipo({
    nombre: "ANDAMIO",
    cantidad: 5,
    dias: 3,
    valorDia: 20000,
    fechaDespacho: "2026-08-01",
    fechaVencimiento: "2026-08-03",
    ...extra,
  });

// 5 andamios afuera y vencidos, con $100.000 de depósito en su despacho.
const factura = {
  id: "f1",
  ...unaFactura({
    numeroFactura: "1573",
    fechaCreacion: "2026-08-01",
    valorDeposito: 100000,
    equipos: [andamio()],
  }),
};

// La misma factura pero todavía al día: salió hoy y vence dentro de 10 días.
// Sirve para el caso en que la devolución se registra desde Detalle Cliente,
// antes de que la factura entre a Seguimiento.
const facturaAlDia = {
  ...factura,
  ...unaFactura({
    numeroFactura: "1573",
    valorDeposito: 100000,
    equipos: [
      andamio({ fechaDespacho: HOY, fechaVencimiento: calcularVencimiento(HOY, 10) }),
    ],
  }),
};

// Vencida por el ANDAMIO, pero con una MEZCLADORA agregada después que
// todavía tiene días por delante.
const facturaVencidaConEquipoEnPlazo = {
  ...factura,
  ...unaFactura({
    numeroFactura: "1573",
    valorDeposito: 100000,
    grupos: [
      unGrupo({ valorDeposito: 100000, equipos: [andamio()] }),
      unGrupo({
        grupo: grupoAgregados(1),
        fechaSolicitud: HOY,
        equipos: [
          unEquipo({
            nombre: "MEZCLADORA",
            cantidad: 1,
            dias: 5,
            valorDia: 50000,
            fechaDespacho: HOY,
            fechaVencimiento: calcularVencimiento(HOY, 5),
          }),
        ],
      }),
    ],
  }),
};

// Dos despachos con su propia garantía: el ANDAMIO salió con $100.000 y días
// después el cliente pidió una RANA y dejó otros $50.000. Los dos vencidos.
const facturaConDosDepositos = {
  ...factura,
  ...unaFactura({
    numeroFactura: "1573",
    grupos: [
      unGrupo({ valorDeposito: 100000, equipos: [andamio()] }),
      unGrupo({
        grupo: grupoAgregados(1),
        fechaSolicitud: "2026-08-02",
        valorDeposito: 50000,
        equipos: [
          unEquipo({
            nombre: "RANA",
            cantidad: 1,
            dias: 2,
            valorDia: 30000,
            fechaDespacho: "2026-08-02",
            fechaVencimiento: "2026-08-03",
          }),
        ],
      }),
    ],
  }),
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
// Los equipos de todos los despachos, aplanados: casi todas estas pruebas
// miran una sola línea y no les importa de qué grupo salió.
const equiposGuardados = () =>
  loGuardadoEnLaFactura().grupos.flatMap((grupo) => grupo.equipos);

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

    const equipos = equiposGuardados();
    expect(equipos).toHaveLength(1);
    expect(equipos[0].devolucion.fechaDevolucion).toBe(HOY);

    // Y sus días quedan congelados en los que de verdad estuvo afuera, no en
    // los 3 que decía el contrato: salió el 1 de agosto y volvió hoy.
    expect(equipos[0].diasAlquilados).toBe(diasDeAlquiler("2026-08-01", HOY));

    expect(loGuardadoEnLaFactura().gestiones[0].tipo).toBe("devolucionTotal");
    expect(loGuardadoEnLaFactura().gestiones[0].unidades).toBe(5);
  });

  it("con el último equipo de vuelta se resuelve el depósito", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "5");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    // Volvió bien: no se retiene nada, se le devuelve todo. Se escribe con la
    // ruta completa dentro del nodo de la factura: mandar el nodo entero
    // borraría el número, el total y el resto.
    expect(loGuardadoEnLaFactura()["factura.depositoResuelto"]).toEqual({
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
    expect(equiposGuardados()[0].devolucion).toEqual({
      fechaDevolucion: HOY,
      buenEstado: false,
      motivo: "Andamio rayado",
      valorRetenido: 30000,
    });

    // Y el depósito se liquida con lo anotado, diciendo por CUÁL equipo.
    expect(loGuardadoEnLaFactura()["factura.depositoResuelto"]).toEqual({
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
    expect(equiposGuardados()[0].devolucion).toEqual({
      fechaDevolucion: HOY,
      buenEstado: true,
      motivo: "",
      valorRetenido: 0,
    });
  });
});

// El depósito es de cada DESPACHO, no de la factura: el cliente dejó $100.000
// por el andamio y, cuando días después pidió la rana, otros $50.000.
describe("RegistrarDevolucionDialog — un depósito por despacho", () => {
  it("cada equipo muestra el depósito de su propio despacho", () => {
    abrir({ factura: facturaConDosDepositos });

    // Con regex y no con el texto exacto: el formateador de moneda separa el
    // signo con un espacio duro, que no se ve pero no es el espacio común.
    expect(screen.getByText(/Depósito:.*100\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Depósito:.*50\.000/)).toBeInTheDocument();
  });

  it("no deja retener de un equipo más de lo que dejó su despacho", async () => {
    const { usuario } = abrir({ factura: facturaConDosDepositos });

    // La rana es el segundo equipo: dejó $50.000 y se intentan retener 80.000,
    // que sí caben en los $150.000 de la factura entera.
    const cantidades = screen.getAllByLabelText("Cantidad que devuelve hoy");
    await usuario.type(cantidades[1], "1");
    await usuario.click(screen.getAllByLabelText(/en buen estado/)[0]);
    await usuario.type(screen.getByLabelText("Qué le pasó"), "Sin la manguera");
    await usuario.type(screen.getByLabelText("Se retiene del depósito"), "80000");
    await guardar(usuario);

    // Avisa en vez de recortarlo en silencio.
    expect(
      await screen.findByText(/Por la entrega del RANA el cliente dejó/),
    ).toBeInTheDocument();
    expect(bd.commit).not.toHaveBeenCalled();
  });

  it("hasta el depósito de su despacho sí lo guarda", async () => {
    const { usuario } = abrir({ factura: facturaConDosDepositos });

    const cantidades = screen.getAllByLabelText("Cantidad que devuelve hoy");
    await usuario.type(cantidades[1], "1");
    await usuario.click(screen.getAllByLabelText(/en buen estado/)[0]);
    await usuario.type(screen.getByLabelText("Qué le pasó"), "Sin la manguera");
    await usuario.type(screen.getByLabelText("Se retiene del depósito"), "50000");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const rana = equiposGuardados().find((equipo) => equipo.nombre === "RANA");
    expect(rana.devolucion.valorRetenido).toBe(50000);
  });
});

// Al recibir un equipo atrasado hay que saber de qué tamaño es el atraso, y
// restar a mano contra el día de hoy no es forma.
describe("RegistrarDevolucionDialog — los días vencidos en la fila", () => {
  it("muestra la fecha del último acuerdo y cuántos días se pasó", () => {
    abrir();

    // El andamio vencía el 03/08 y sigue afuera: la fila lo dice al lado de
    // la fecha, sin obligar a contar.
    expect(screen.getByText(/Vence: 03\/08\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/días vencidos/)).toBeInTheDocument();
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

    const [devuelto, afuera] = equiposGuardados();
    expect(devuelto.cantidadEquipos).toBe(2);
    expect(devuelto.devolucion.motivo).toBe("Uno llegó torcido");
    // La línea que sigue afuera no volvió: no hay nada que calificar en ella.
    expect(afuera.cantidadEquipos).toBe(3);
    expect(afuera.devolucion).toBeUndefined();
    // Y el depósito sigue sin resolverse.
    expect(loGuardadoEnLaFactura()["factura.depositoResuelto"]).toBeUndefined();
  });
});

describe("RegistrarDevolucionDialog — devuelve una parte", () => {
  it("parte la línea en dos: lo que volvió y lo que sigue afuera", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "3");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();

    const equipos = equiposGuardados();
    expect(equipos).toHaveLength(2);

    // La primera queda cerrada con las 3 que volvieron hoy, y con los días que
    // de verdad estuvieron afuera.
    expect(equipos[0]).toMatchObject({
      cantidadEquipos: 3,
      diasAlquilados: diasDeAlquiler("2026-08-01", HOY),
    });
    expect(equipos[0].devolucion.fechaDevolucion).toBe(HOY);

    // La segunda sigue corriendo con las 2 que el cliente se quedó, con sus
    // días originales, y no arrastra la devolución de la otra.
    expect(equipos[1]).toMatchObject({ cantidadEquipos: 2, diasAlquilados: 3 });
    expect(equipos[1].devolucion).toBeUndefined();
  });

  // El caso de la factura 1234: un despacho de 10 gatos agregado después del
  // alta, con su pago, su transporte y su depósito. Al devolver 4, la línea se
  // parte — y con esos cargos ADENTRO del equipo, las dos mitades se los
  // llevaban copiados: la factura contaba el pago dos veces y mostraba un
  // saldo a favor que no existía.
  it("los cargos del despacho no se pueden duplicar al partir la línea", async () => {
    const facturaConLote = {
      ...factura,
      ...unaFactura({
        numeroFactura: "1234",
        grupos: [
          unGrupo({
            grupo: grupoAgregados(1),
            fechaSolicitud: "2026-08-01",
            pagos: [{ medio: "Bancolombia", monto: 198500 }],
            transporte: "Solo ida",
            valorTransporte: 20000,
            valorDeposito: 50000,
            equipos: [
              unEquipo({
                nombre: "GATOS METALICOS",
                cantidad: 10,
                dias: 10,
                valorDia: 1500,
                fechaDespacho: "2026-08-01",
                fechaVencimiento: "2026-08-10",
              }),
            ],
          }),
        ],
      }),
    };

    const { usuario } = abrir({ factura: facturaConLote });

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "4");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();

    const [despacho] = loGuardadoEnLaFactura().grupos;
    expect(despacho.equipos).toHaveLength(2);
    expect(despacho.equipos[0].cantidadEquipos).toBe(4);
    expect(despacho.equipos[1].cantidadEquipos).toBe(6);

    // Los cargos siguen ARRIBA, en el despacho, intactos y una sola vez.
    expect(despacho.pagos.medios).toEqual([{ medio: "Bancolombia", monto: 198500 }]);
    expect(despacho.adicionales.valorTransporte).toBe(20000);
    expect(despacho.adicionales.valorDeposito).toBe(50000);

    // Y ninguna de las dos mitades los tiene: no hay nada que copiar.
    despacho.equipos.forEach((equipo) => {
      expect(equipo).not.toHaveProperty("pagos");
      expect(equipo).not.toHaveProperty("valorTransporte");
      expect(equipo).not.toHaveProperty("deposito");
    });
  });

  it("queda anotada como devolución parcial, con cuántas unidades volvieron", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "3");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    expect(loGuardadoEnLaFactura().gestiones[0]).toMatchObject({
      tipo: "devolucionParcial",
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
    const devuelto = equiposGuardados().find((equipo) => equipo.devolucion);
    expect(devuelto.cantidadEquipos).toBe(3);
    expect(devuelto.devolucion.fechaDevolucion).toBe(HOY);
    // Devolvió el mismo día que salió: se le cobra 1 día, no los 10 pactados.
    expect(devuelto.diasAlquilados).toBe(1);
  });

  it("a lo que sigue afuera se le puede dar más plazo en el mismo paso", async () => {
    // Vencido ayer: lleva 1 día afuera. Las fechas van relativas a hoy porque
    // el plazo nuevo se cuenta desde el día en que se pacta.
    const AYER = calcularVencimiento(HOY, -1);
    const { usuario } = abrir({
      factura: {
        ...factura,
        ...unaFactura({
          numeroFactura: "1573",
          valorDeposito: 100000,
          equipos: [andamio({ fechaVencimiento: AYER })],
        }),
      },
    });

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "3");
    await usuario.type(screen.getByLabelText("Días a ampliar"), "2");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();

    const restante = equiposGuardados()[1];
    // Los 2 días se cuentan desde hoy, y la ampliación consolida el día que ya
    // estaba vencido: mismo criterio que en AmpliarVencimientoDialog.
    expect(restante.fechaVencimiento).toBe(calcularVencimiento(HOY, 2));
    expect(restante.ampliaciones[0]).toMatchObject({
      fechaAnterior: AYER,
      fechaNueva: calcularVencimiento(HOY, 2),
      diasPedidos: 2,
    });
    // Los días que la fecha corre de verdad incluyen los ya vencidos, que se
    // consolidan: es lo que se cobra.
    expect(restante.ampliaciones[0].diasAmpliados).toBeGreaterThan(2);
  });

  it("no se puede devolver más de lo que hay afuera", async () => {
    const { usuario } = abrir();

    // Se cargan 9 sobre 5 pendientes: se toman 5, no se inventan devoluciones.
    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "9");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const equipos = equiposGuardados();
    expect(equipos).toHaveLength(1);
    expect(equipos[0].cantidadEquipos).toBe(5);
    expect(equipos[0].devolucion).toBeTruthy();
  });
});
