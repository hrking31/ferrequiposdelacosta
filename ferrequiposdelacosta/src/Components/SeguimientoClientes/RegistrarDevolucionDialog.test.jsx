import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import {
  calcularVencimiento,
  obtenerFechaHoyBogota,
  cubiertoHasta,
  calcularEquipo,
  calcularEstadoEquipo,
} from "../ClienteDetalle/facturaUtils";
import RegistrarDevolucionDialog from "./RegistrarDevolucionDialog";
import { formatearFechaLegible, formatearMoneda } from "../../Utils/formato";
import {
  grupoAgregados,
  unEquipo,
  unGrupo,
  unTramoVencido,
  unaFactura,
} from "../../test/facturas";

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
  // Si el equipo vencido que vuelve paga el día de hoy. En la app lo decide
  // el reloj —antes de las 3 p.m. no—; acá se fija, para que estas pruebas
  // den lo mismo a cualquier hora que se corran.
  cobraHoy: vi.fn(() => true),
}));

vi.mock("../ClienteDetalle/facturaUtils", async (importOriginal) => ({
  ...(await importOriginal()),
  seCobraElDiaAlDevolver: () => bd.cobraHoy(),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db, ...partes) => partes.join("/"),
  doc: (_db, ...partes) => partes.join("/"),
  getDocs: bd.getDocs,
  writeBatch: () => ({ update: bd.update, commit: bd.commit }),
}));

const HOY = obtenerFechaHoyBogota();

// Un importe tal como sale en pantalla: el formato de pesos separa el "$" con
// un espacio especial, que al leer la pantalla cuenta como uno normal.
const enPantalla = (valor) => formatearMoneda(valor).replace(/\s/g, " ");

const cliente = { id: "cli1", tipo: "persona", nombres: "Aida", apellido: "Pérez" };

const andamio = (extra = {}) =>
  unEquipo({
    nombre: "ANDAMIO",
    cantidad: 5,
    dias: 3,
    valorDia: 20000,
    fechaDespacho: "2026-08-01",
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
      andamio({ fechaDespacho: HOY, dias: 10 }),
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

// El paso 1 del diálogo: qué pasó con el equipo. Hasta que no se elige no se
// muestra nada más, así que casi todas las pruebas arrancan por acá.
const elegir = (usuario, decision) =>
  usuario.click(screen.getByRole("button", { name: decision }));
const llego = (usuario) => elegir(usuario, "Llegó a bodega");

// Lo más común: el equipo llegó y se anota cuántos. Elegir de nuevo la misma
// decisión no borra lo escrito, así que se puede llamar más de una vez.
const devolver = async (usuario, cantidad) => {
  await llego(usuario);
  await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), cantidad);
};

const guardar = (usuario) =>
  usuario.click(screen.getByRole("button", { name: "Guardar" }));

const loGuardadoEnLaFactura = () => bd.update.mock.calls[0][1];
// Los equipos de todos los despachos, aplanados: casi todas estas pruebas
// miran una sola línea y no les importa de qué grupo salió.
const equiposGuardados = () =>
  loGuardadoEnLaFactura().grupos.flatMap((grupo) => grupo.equipos);

const exito = () => screen.findByText("Devolución registrada correctamente.");

// Los renglones del paso 3, "Así queda", tal como se leen: rótulo y valor.
const asiQueda = () =>
  [...document.querySelectorAll(".MuiPaper-root .fila")].map((fila) =>
    [...fila.children].map((celda) => celda.textContent.replace(/\s/g, " ")).join(" "),
  );

beforeEach(() => {
  vi.clearAllMocks();
  bd.getDocs.mockResolvedValue({ docs: [] });
  // Por defecto, pasadas las 3 p.m.: el día de hoy se cobra, como siempre.
  bd.cobraHoy.mockReturnValue(true);
});

// EL DIÁLOGO POR PASOS, como el de abono: primero la decisión, después lo que
// esa decisión pide y al final cómo queda. Pedido del dueño, 2026-10-13.
describe("RegistrarDevolucionDialog — primero la decisión", () => {
  it("hasta que no se elige no muestra los equipos ni deja guardar", async () => {
    const { usuario } = abrir();

    expect(screen.getByText("¿Qué pasó con los equipos?")).toBeInTheDocument();
    expect(screen.queryByText(/ANDAMIO/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Cantidad que devuelve hoy")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();

    await llego(usuario);

    expect(screen.getByText("¿Qué llegó?")).toBeInTheDocument();
    expect(screen.getByText(/ANDAMIO/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });

  it("solo ofrece lo que se puede hacer: sin nada por recoger no hay entrega que anular", () => {
    abrir();

    expect(screen.getByRole("button", { name: "Llegó a bodega" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrega pactada" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "No entregó" })).not.toBeInTheDocument();
  });

  it("cambiar de decisión borra lo que se había escrito", async () => {
    const { usuario } = abrir();

    await devolver(usuario, "5");
    await elegir(usuario, "Entrega pactada");

    expect(screen.getByLabelText("Cantidad con entrega pactada")).toHaveValue(null);
  });
});

describe("RegistrarDevolucionDialog — antes de guardar", () => {
  it("sin cantidad no registra nada", async () => {
    const { usuario } = abrir();

    await llego(usuario);
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

    await devolver(usuario, "5");
    // "Volvió todo completo y en buen estado" ya viene marcado: es el caso
    // normal, y tocarlo sería decir que hay algo que retener.
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();

    const equipos = equiposGuardados();
    expect(equipos).toHaveLength(1);
    expect(equipos[0].devolucion.fechaDevolucion).toBe(HOY);

    // Los días del alta NO se pisan: siguen siendo los 3 del contrato. Lo
    // que el equipo estuvo de más vive en su tramo, y la cuenta se corta
    // sola en la fecha de devolución.
    expect(equipos[0].diasAlquilados).toBe(3);

    expect(loGuardadoEnLaFactura().gestiones[0].tipo).toBe("devolucionTotal");
    expect(loGuardadoEnLaFactura().gestiones[0].unidades).toBe(5);
  });

  it("con el último equipo de vuelta se resuelve el depósito", async () => {
    const { usuario } = abrir();

    await devolver(usuario, "5");
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

    await devolver(usuario, "5");
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

    await devolver(usuario, "5");
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

    await devolver(usuario, "5");
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
// Con el último equipo de vuelta el diálogo cierra diciendo qué pasa con el
// depósito. Antes decía "Volvió todo completo y en buen estado", que repetía
// la casilla de arriba y no decía qué pasaba con la plata (2026-10-01).
describe("RegistrarDevolucionDialog — qué pasa con el depósito", () => {
  // La misma factura, con los $100.000 del depósito pagados en el despacho.
  const facturaConDepositoPagado = {
    ...factura,
    ...unaFactura({
      numeroFactura: "1573",
      fechaCreacion: "2026-08-01",
      valorDeposito: 100000,
      pagos: [{ medio: "Efectivo", monto: 100000 }],
      equipos: [andamio()],
    }),
  };

  it("si todo vuelve bien, se le devuelve completo", async () => {
    const { usuario } = abrir({ factura: facturaConDepositoPagado });

    await devolver(usuario, "5");

    expect(
      screen.getByText(`Depósito: ${enPantalla(100000)} · Se devuelve todo`),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Volvió todo completo/)).not.toBeInTheDocument();
  });

  it("con daños, dice cuánto se retiene y cuánto se le devuelve", async () => {
    const { usuario } = abrir({ factura: facturaConDepositoPagado });

    await devolver(usuario, "5");
    await usuario.click(screen.getByLabelText(/en buen estado/));
    await usuario.type(screen.getByLabelText("Qué le pasó"), "Andamio rayado");
    await usuario.type(screen.getByLabelText("Se retiene del depósito"), "30000");

    expect(
      screen.getByText(
        `Depósito: ${enPantalla(100000)} · Se le devuelven ${enPantalla(70000)} al cliente`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Se retienen ${enPantalla(30000)} por daños, que pasan a la factura como cargo:`,
      ),
    ).toBeInTheDocument();
  });

  // No se le puede prometer al cliente una plata que nunca dejó.
  it("si el depósito no se pagó, no promete devolverlo", async () => {
    const { usuario } = abrir();

    await devolver(usuario, "5");

    expect(
      screen.getByText(`Depósito: ${enPantalla(100000)} · No queda nada por devolverle`),
    ).toBeInTheDocument();
  });
});

describe("RegistrarDevolucionDialog — un depósito por despacho", () => {
  // Desde el 2026-10-21 el depósito va una vez, en el título de su despacho,
  // y no repetido en cada equipo.
  it("cada despacho lleva su título con su propio depósito", async () => {
    const { usuario } = abrir({ factura: facturaConDosDepositos });
    await llego(usuario);

    expect(screen.getByText(/^Despacho del /)).toBeInTheDocument();
    expect(screen.getByText("Agregado el 02/08/2026")).toBeInTheDocument();
    // Con regex y no con el texto exacto: el formateador de moneda separa el
    // signo con un espacio duro, que no se ve pero no es el espacio común.
    expect(screen.getByText(/^Depósito .*100\.000/)).toBeInTheDocument();
    expect(screen.getByText(/^Depósito .*50\.000/)).toBeInTheDocument();
  });

  it("no deja retener de un equipo más de lo que dejó su despacho", async () => {
    const { usuario } = abrir({ factura: facturaConDosDepositos });

    // La rana es el segundo equipo: dejó $50.000 y se intentan retener 80.000,
    // que sí caben en los $150.000 de la factura entera.
    await llego(usuario);
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

    await llego(usuario);
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

  // Con dos garantías o más se dibuja el desglose que dice cuál cubre a quién.
  // Ninguna prueba llegaba hasta acá —todas devolvían una sola línea— y el
  // renglón buscaba los equipos y el monto donde vivían antes de que la
  // factura guardara un nodo por despacho: tumbaba el diálogo entero.
  // El desglose nombra cada despacho igual que su título de arriba: el nombre
  // aparece dos veces, una en el título y otra en la liquidación.
  it("al volver todo, el desglose dice qué despacho cubre cada garantía", async () => {
    const { usuario } = abrir({ factura: facturaConDosDepositos });

    await llego(usuario);
    expect(screen.getAllByText("Agregado el 02/08/2026")).toHaveLength(1);

    const cantidades = screen.getAllByLabelText("Cantidad que devuelve hoy");
    await usuario.type(cantidades[0], "5");
    await usuario.type(cantidades[1], "1");

    // Esta factura no tiene pagos: lo que se diga del depósito no es lo que
    // se mira acá, sino de dónde sale.
    expect(screen.getByText(/^Depósito: .*150\.000.* · /)).toBeInTheDocument();
    expect(screen.getAllByText(/^Despacho del /)).toHaveLength(2);
    expect(screen.getAllByText("Agregado el 02/08/2026")).toHaveLength(2);
  });

  it("y con el último de vuelta liquida las dos juntas", async () => {
    const { usuario } = abrir({ factura: facturaConDosDepositos });

    await llego(usuario);
    const cantidades = screen.getAllByLabelText("Cantidad que devuelve hoy");
    await usuario.type(cantidades[0], "5");
    await usuario.type(cantidades[1], "1");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    expect(loGuardadoEnLaFactura()["factura.depositoResuelto"]).toEqual({
      retenido: 0,
      motivo: "",
      fecha: HOY,
    });
  });
});

// LA REGLA: la factura no se cierra hasta que vuelve el ÚLTIMO equipo, aunque
// esta pantalla muestre solo una parte de ellos. Cartera ofrece lo vencido y la
// ficha lo que está en plazo: ninguna de las dos ve la factura entera, y la
// garantía es de la factura entera.
describe("RegistrarDevolucionDialog — la garantía espera al último equipo", () => {
  it("devolver el único vencido no liquida el depósito si queda otro afuera", async () => {
    const { usuario } = abrir({ factura: facturaVencidaConEquipoEnPlazo });

    // Cartera solo ofrece el ANDAMIO, que es el vencido; la MEZCLADORA sigue
    // afuera con días por delante.
    await devolver(usuario, "5");

    expect(screen.queryByText(/Volvió todo completo/)).not.toBeInTheDocument();

    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    expect(loGuardadoEnLaFactura()["factura.depositoResuelto"]).toBeUndefined();
  });

  it("desde la ficha tampoco, con un equipo vencido todavía afuera", async () => {
    const { usuario } = abrir({
      factura: facturaVencidaConEquipoEnPlazo,
      desdeLaFicha: true,
    });

    // Acá se ofrece la MEZCLADORA, la que está en plazo. El ANDAMIO vencido no
    // se ve en esta pantalla, pero sigue en la calle.
    await devolver(usuario, "1");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    expect(loGuardadoEnLaFactura()["factura.depositoResuelto"]).toBeUndefined();
  });

  it("y la devolución del equipo sí queda escrita igual", async () => {
    const { usuario } = abrir({ factura: facturaVencidaConEquipoEnPlazo });

    await devolver(usuario, "5");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const andamio = equiposGuardados().find(
      (equipo) => equipo.nombre === "ANDAMIO",
    );
    expect(andamio.devolucion.fechaDevolucion).toBe(HOY);
  });
});

// Al recibir un equipo atrasado hay que saber de qué tamaño es el atraso, y
// restar a mano contra el día de hoy no es forma.
describe("RegistrarDevolucionDialog — los días vencidos en la fila", () => {
  it("muestra la fecha del último acuerdo y cuántos días se pasó", async () => {
    const { usuario } = abrir({
      factura: {
        ...factura,
        ...unaFactura({
          numeroFactura: "1573",
          equipos: [
            andamio({
              vencidos: [unTramoVencido({ desde: "2026-08-04", hasta: null })],
            }),
          ],
        }),
      },
    });
    await llego(usuario);

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

    await devolver(usuario, "2");

    // Quedan 3 andamios afuera y la casilla del estado igual está.
    expect(screen.getByLabelText(/en buen estado/)).toBeInTheDocument();
    // El depósito, en cambio, no se liquida hasta que vuelva todo.
    expect(screen.queryByText(/al liquidar la factura/)).not.toBeInTheDocument();
  });

  it("el estado queda en la parte que volvió, no en la que sigue afuera", async () => {
    const { usuario } = abrir();

    await devolver(usuario, "2");
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

    await devolver(usuario, "3");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();

    const equipos = equiposGuardados();
    expect(equipos).toHaveLength(2);

    // La primera queda cerrada con las 3 que volvieron hoy. Sus días del alta
    // quedan como estaban: lo que se le cobra lo decide la cuenta, que se
    // corta en la devolución.
    expect(equipos[0]).toMatchObject({
      cantidadEquipos: 3,
      diasAlquilados: 3,
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
              }),
            ],
          }),
        ],
      }),
    };

    const { usuario } = abrir({ factura: facturaConLote });

    await devolver(usuario, "4");
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

    await devolver(usuario, "3");
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

    await devolver(usuario, "3");
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

    await devolver(usuario, "3");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    expect(loGuardadoEnLaFactura().gestiones).toEqual([]);
  });

  // POR QUÉ DEVUELVE. Solo se pregunta desde la ficha: ahí lo que vuelve está
  // en plazo, así que devolver es una decisión del cliente y el motivo es un
  // dato. Desde Seguimiento el equipo ya venció y el motivo es el vencimiento.
  it("desde la ficha se pregunta por qué devuelve", async () => {
    const { usuario } = abrir({ factura: facturaAlDia, desdeLaFicha: true });
    await llego(usuario);

    expect(
      screen.getByLabelText("Motivo de la devolución (opcional)"),
    ).toBeInTheDocument();
  });

  it("desde Seguimiento no se pregunta", async () => {
    const { usuario } = abrir({ factura });
    await llego(usuario);

    expect(
      screen.queryByLabelText("Motivo de la devolución (opcional)"),
    ).not.toBeInTheDocument();
  });

  it("el motivo queda escrito en cada equipo que volvió", async () => {
    const { usuario } = abrir({ factura: facturaAlDia, desdeLaFicha: true });

    await llego(usuario);
    await usuario.type(
      screen.getByLabelText("Motivo de la devolución (opcional)"),
      "terminó la obra",
    );
    await devolver(usuario, "3");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const [despacho] = loGuardadoEnLaFactura().grupos;
    const devuelto = despacho.equipos.find((equipo) => equipo.devolucion);
    expect(devuelto.devolucion.motivoDevolucion).toBe("terminó la obra");
    // Y no se confunde con lo otro: el equipo volvió bien, así que "qué le
    // pasó" queda vacío.
    expect(devuelto.devolucion.buenEstado).toBe(true);
    expect(devuelto.devolucion.motivo).toBe("");
  });

  it("sin motivo escrito, el campo no se guarda", async () => {
    const { usuario } = abrir({ factura: facturaAlDia, desdeLaFicha: true });

    await devolver(usuario, "3");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const [despacho] = loGuardadoEnLaFactura().grupos;
    const devuelto = despacho.equipos.find((equipo) => equipo.devolucion);
    expect(devuelto.devolucion).not.toHaveProperty("motivoDevolucion");
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

    await devolver(usuario, "1");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    expect(loGuardadoEnLaFactura().gestiones).toEqual([]);
  });

  // Darle más días a lo que el cliente se queda es una decisión de cobranza:
  // se pacta con quien ya está vencido y queda anotada en Seguimiento. Desde
  // la ficha solo se registra lo que volvió.
  it("desde la ficha no pregunta qué hacer con lo que queda afuera", async () => {
    const { usuario } = abrir({ factura: facturaAlDia, desdeLaFicha: true });

    await devolver(usuario, "3");

    expect(screen.queryByLabelText("Días a ampliar")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Dejar indefinida (el cliente avisará)"),
    ).not.toBeInTheDocument();
  });

  it("desde Seguimiento sí lo pregunta", async () => {
    const { usuario } = abrir();

    await devolver(usuario, "3");

    expect(screen.getByLabelText("Días a ampliar")).toBeInTheDocument();
  });

  it("desde la ficha no ofrece los equipos que ya vencieron", async () => {
    const { usuario } = abrir({
      factura: facturaVencidaConEquipoEnPlazo,
      desdeLaFicha: true,
    });
    await llego(usuario);

    expect(await screen.findByText(/MEZCLADORA/)).toBeInTheDocument();
    expect(screen.queryByText(/ANDAMIO/)).not.toBeInTheDocument();
  });

  // La otra mitad de la regla: no anotar la gestión no puede significar perder
  // la devolución. Queda en el equipo, que es de donde la ficha del cliente
  // saca lo devuelto y cuándo.
  it("la de una factura al día sí queda registrada en el equipo", async () => {
    const { usuario } = abrir({ factura: facturaAlDia, desdeLaFicha: true });

    await devolver(usuario, "3");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const devuelto = equiposGuardados().find((equipo) => equipo.devolucion);
    expect(devuelto.cantidadEquipos).toBe(3);
    expect(devuelto.devolucion.fechaDevolucion).toBe(HOY);
    // Devolvió el mismo día que salió: la CUENTA le cobra 1 día, no los 10
    // pactados. Los del alta siguen ahí, intactos.
    expect(devuelto.diasAlquilados).toBe(10);
    expect(calcularEquipo(devuelto, HOY).dias).toBe(1);
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
          equipos: [
            andamio({
              // Sus 3 días del alta terminan AYER, y la madrugada de hoy le
              // abrió su tramo.
              fechaDespacho: calcularVencimiento(AYER, -2),
              vencidos: [unTramoVencido({ desde: HOY, hasta: null })],
            }),
          ],
        }),
      },
    });

    await devolver(usuario, "3");
    await usuario.type(screen.getByLabelText("Días a ampliar"), "2");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();

    const restante = equiposGuardados()[1];
    // Los 2 días arrancan MAÑANA: mismo criterio que en
    // AmpliarVencimientoDialog.
    expect(cubiertoHasta(restante)).toBe(calcularVencimiento(HOY, 2));
    expect(restante.ampliaciones[0]).toMatchObject({
      fecha: HOY,
      dias: 2,
      desde: calcularVencimiento(HOY, 1),
      hasta: calcularVencimiento(HOY, 2),
    });
    // Y el día que ya estaba vencido no se pierde ni se disfraza de día
    // ampliado: queda en su tramo, cerrado hoy.
    expect(restante.vencidos.at(-1)).toMatchObject({
      desde: HOY,
      hasta: HOY,
    });
  });

  // Antes las dos mitades se llevaban el descuento entero: 5 andamios con
  // $50.000 de descuento, vuelven 2, y la factura restaba $100.000.
  it("al partir la línea, el descuento se reparte según la cantidad", async () => {
    const { usuario } = abrir({
      factura: {
        ...factura,
        ...unaFactura({
          numeroFactura: "1573",
          valorDeposito: 100000,
          equipos: [
            andamio({
              ampliaciones: [
                {
                  fecha: "2026-08-03",
                  dias: 2,
                  desde: "2026-08-04",
                  hasta: "2026-08-05",
                  descuento: 50000,
                },
              ],
            }),
          ],
        }),
      },
    });

    await devolver(usuario, "2");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const [devuelto, afuera] = equiposGuardados();
    expect(devuelto.ampliaciones[0].descuento).toBe(20000);
    expect(afuera.ampliaciones[0].descuento).toBe(30000);
  });

  it("a lo que queda afuera se le puede descontar el día vencido", async () => {
    const AYER = calcularVencimiento(HOY, -1);
    const { usuario } = abrir({
      factura: {
        ...factura,
        ...unaFactura({
          numeroFactura: "1573",
          valorDeposito: 100000,
          equipos: [
            andamio({
              fechaDespacho: calcularVencimiento(AYER, -2),
              vencidos: [unTramoVencido({ desde: HOY, hasta: null })],
            }),
          ],
        }),
      },
    });

    await devolver(usuario, "3");
    await usuario.type(screen.getByLabelText("Días a ampliar"), "2");

    // La base es lo que se queda afuera: 2 andamios, no los 5.
    expect(
      screen.getByText(`Valor del día: 2 × ${enPantalla(20000)} = ${enPantalla(40000)}`),
    ).toBeInTheDocument();

    await usuario.type(screen.getByLabelText("Descuento en el día vencido"), "10000");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const [devuelto, restante] = equiposGuardados();
    expect(restante.vencidos.at(-1)).toMatchObject({
      desde: HOY,
      hasta: HOY,
      descuento: 10000,
    });
    // Lo que volvió paga su día vencido completo.
    expect(devuelto.vencidos.at(-1).descuento).toBeUndefined();
  });

  it("no se puede devolver más de lo que hay afuera", async () => {
    const { usuario } = abrir();

    // Se cargan 9 sobre 5 pendientes: se toman 5, no se inventan devoluciones.
    await devolver(usuario, "9");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const equipos = equiposGuardados();
    expect(equipos).toHaveLength(1);
    expect(equipos[0].cantidadEquipos).toBe(5);
    expect(equipos[0].devolucion).toBeTruthy();
  });
});

// Pedido del dueño el 2026-10-01: al ampliar se le puede perdonar al cliente
// parte de sus días vencidos, pero si en vez de pedir más días los DEVOLVÍA,
// el diálogo cobraba todo. Ahora la devolución trae la misma casilla.
//
// 5 andamios a $20.000 que vencieron ayer: hoy llevan 1 día vencido, que para
// los 5 vale $100.000.
describe("RegistrarDevolucionDialog — el descuento de los días vencidos", () => {
  const AYER = calcularVencimiento(HOY, -1);
  const facturaVencidaAyer = {
    ...factura,
    ...unaFactura({
      numeroFactura: "1573",
      valorDeposito: 100000,
      equipos: [
        andamio({
          fechaDespacho: calcularVencimiento(AYER, -2),
          vencidos: [unTramoVencido({ desde: HOY, hasta: null })],
        }),
      ],
    }),
  };

  it("devolviendo todo, el descuento queda en el día vencido que se cierra", async () => {
    const { usuario } = abrir({ factura: facturaVencidaAyer });

    await devolver(usuario, "5");
    expect(
      screen.getByText(`El ${formatearFechaLegible(HOY)} · Valor ${enPantalla(100000)}`),
    ).toBeInTheDocument();

    await usuario.type(screen.getByLabelText("Descuento del día vencido"), "30000");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const [devuelto] = equiposGuardados();
    expect(devuelto.vencidos.at(-1)).toMatchObject({
      desde: HOY,
      hasta: HOY,
      descuento: 30000,
    });
    // Y la cuenta lo resta: $100.000 del día, menos $30.000.
    expect(calcularEquipo(devuelto, HOY).netoVencido).toBe(70000);
  });

  it("el tope es lo que vale el día de lo que VUELVE, no de toda la línea", async () => {
    const { usuario } = abrir({ factura: facturaVencidaAyer });

    await devolver(usuario, "2");
    await usuario.type(
      screen.getByLabelText("Descuento del día vencido"),
      "40001",
    );

    expect(screen.getByText(`No puede pasar de ${enPantalla(40000)}`)).toBeInTheDocument();

    await guardar(usuario);
    expect(
      await screen.findByText("Un descuento pasa de lo que valen sus días."),
    ).toBeInTheDocument();
    expect(bd.commit).not.toHaveBeenCalled();
  });

  it("al devolver una parte y ampliar el resto, cada parte lleva el suyo", async () => {
    const { usuario } = abrir({ factura: facturaVencidaAyer });

    await devolver(usuario, "3");
    await usuario.type(
      screen.getByLabelText("Descuento del día vencido"),
      "10000",
    );
    await usuario.type(screen.getByLabelText("Días a ampliar"), "2");
    await usuario.type(screen.getByLabelText("Descuento en el día vencido"), "5000");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    const [devuelto, restante] = equiposGuardados();
    expect(devuelto.vencidos.at(-1).descuento).toBe(10000);
    expect(restante.vencidos.at(-1).descuento).toBe(5000);
  });

  it("desde la ficha no aparece: ahí solo vuelve lo que está en plazo", async () => {
    const { usuario } = abrir({ factura: facturaAlDia, desdeLaFicha: true });

    await devolver(usuario, "5");

    expect(screen.queryByLabelText(/^Descuento en/)).not.toBeInTheDocument();
  });
});

// EL DÍA DE HOY. El vencido que vuelve antes de las 3 p.m. no lo paga: no
// alcanzó a usarlo. Es la misma hora de corte del despacho, y vale solo para
// los días vencidos. Regla del dueño, 2026-10-13.
describe("RegistrarDevolucionDialog — el día de hoy, antes de las 3 p.m.", () => {
  const AYER = calcularVencimiento(HOY, -1);

  // 5 andamios a $20.000 que vencieron anteayer: llevan 2 días de mora, el
  // de ayer y el de hoy.
  const vencida = {
    id: "f1",
    ...unaFactura({
      numeroFactura: "0729",
      equipos: [
        andamio({
          fechaDespacho: calcularVencimiento(HOY, -4),
          dias: 3,
          vencidos: [unTramoVencido({ desde: AYER, hasta: null })],
        }),
      ],
    }),
  };

  it("antes de las 3 la casilla viene apagada y hoy no se cobra", async () => {
    bd.cobraHoy.mockReturnValue(false);
    const { usuario } = abrir({ factura: vencida });

    await llego(usuario);
    expect(screen.getByRole("checkbox", { name: /se cobra$/ })).not.toBeChecked();

    await devolver(usuario, "5");
    expect(screen.getByRole("checkbox", { name: "No se cobra" })).toBeInTheDocument();
    // El paso de "Así queda" lo dice entero: se cobra hasta ayer, un solo
    // día vencido.
    expect(asiQueda()).toEqual([
      `Se cobra hasta ${formatearFechaLegible(AYER)}`,
      `1 día vencido ${enPantalla(100000)}`,
    ]);

    await guardar(usuario);
    expect(await exito()).toBeInTheDocument();

    const [devuelto] = equiposGuardados();
    // Volvió hoy, pero su mora se cerró ayer.
    expect(devuelto.devolucion.fechaDevolucion).toBe(HOY);
    expect(devuelto.devolucion.diaCobrado).toBe(false);
    expect(devuelto.vencidos).toEqual([
      { desde: AYER, hasta: AYER, indefinida: false },
    ]);
    expect(calcularEquipo(devuelto, HOY).diasVencidos).toBe(1);
  });

  it("desde las 3 viene marcada y hoy se cobra, como siempre", async () => {
    const { usuario } = abrir({ factura: vencida });

    await llego(usuario);
    expect(screen.getByRole("checkbox", { name: /se cobra$/ })).toBeChecked();

    await devolver(usuario, "5");
    expect(asiQueda()).toEqual([
      `Se cobra hasta ${formatearFechaLegible(HOY)}`,
      `2 días vencidos ${enPantalla(200000)}`,
    ]);
    await guardar(usuario);
    expect(await exito()).toBeInTheDocument();

    const [devuelto] = equiposGuardados();
    expect(devuelto.devolucion.diaCobrado).toBeUndefined();
    expect(devuelto.vencidos).toEqual([
      { desde: AYER, hasta: HOY, indefinida: false },
    ]);
    expect(calcularEquipo(devuelto, HOY).diasVencidos).toBe(2);
  });

  it("se puede cambiar a mano: entregó temprano y lo anotan en la tarde", async () => {
    const { usuario } = abrir({ factura: vencida });

    await llego(usuario);
    await usuario.click(screen.getByRole("checkbox", { name: /se cobra$/ }));
    await devolver(usuario, "5");
    await guardar(usuario);
    expect(await exito()).toBeInTheDocument();

    expect(calcularEquipo(equiposGuardados()[0], HOY).diasVencidos).toBe(1);
  });

  it("con descuento, el paso 3 muestra los vencidos, lo que se perdona y lo que queda", async () => {
    const { usuario } = abrir({ factura: vencida });

    await devolver(usuario, "5");
    await usuario.type(
      screen.getByLabelText("Descuento de los 2 días vencidos"),
      "50000",
    );

    expect(asiQueda()).toEqual([
      `Se cobra hasta ${formatearFechaLegible(HOY)}`,
      `2 días vencidos ${enPantalla(200000)}`,
      `Descuento −${enPantalla(50000)}`,
      `Vencidos por cobrar ${enPantalla(150000)}`,
    ]);
  });

  it("el tope del descuento son los días que de verdad se cobran", async () => {
    bd.cobraHoy.mockReturnValue(false);
    const { usuario } = abrir({ factura: vencida });

    await devolver(usuario, "5");

    // Un solo día vencido —el de ayer—, no dos.
    expect(screen.getByLabelText("Descuento del día vencido")).toBeInTheDocument();
  });

  it("desde la ficha no se pregunta: lo que vuelve en plazo paga el día", async () => {
    bd.cobraHoy.mockReturnValue(false);
    const { usuario } = abrir({ factura: facturaAlDia, desdeLaFicha: true });

    await llego(usuario);
    expect(screen.queryByRole("checkbox", { name: /se cobra$/ })).not.toBeInTheDocument();

    await devolver(usuario, "5");
    // En plazo no hay días vencidos que mostrar: solo hasta cuándo se cobra.
    expect(asiQueda()).toEqual([`Se cobra hasta ${formatearFechaLegible(HOY)}`]);
    await guardar(usuario);
    expect(await exito()).toBeInTheDocument();

    const [devuelto] = equiposGuardados();
    expect(devuelto.devolucion.diaCobrado).toBeUndefined();
    // Salió hoy y volvió hoy: un día.
    expect(calcularEquipo(devuelto, HOY).dias).toBe(1);
  });
});

// LA ENTREGA PACTADA. El cliente avisa que ya terminó y el equipo llega a la
// bodega después: la cuenta se detiene el día del aviso —que no se cobra, sea
// la hora que sea— y el equipo queda por recoger. Regla del dueño, 2026-10-13.
describe("RegistrarDevolucionDialog — entrega pactada", () => {
  const AYER = calcularVencimiento(HOY, -1);

  const pactar = async (usuario, cantidad) => {
    await elegir(usuario, "Entrega pactada");
    await usuario.type(
      screen.getByLabelText("Cantidad con entrega pactada"),
      String(cantidad),
    );
  };

  it("detiene la cuenta ayer y deja el equipo afuera, por recoger", async () => {
    const { usuario } = abrir();

    await pactar(usuario, 5);
    // Nadie vio el equipo todavía: no se pregunta cómo volvió.
    expect(screen.queryByLabelText(/en buen estado/)).not.toBeInTheDocument();
    // Y la casilla del día de hoy no aplica: ese día nunca se cobra.
    expect(screen.queryByRole("checkbox", { name: /se cobra$/ })).not.toBeInTheDocument();

    await guardar(usuario);
    expect(await screen.findByText("Entrega pactada registrada.")).toBeInTheDocument();

    const [pactado] = equiposGuardados();
    expect(pactado.devolucion).toBeUndefined();
    expect(pactado.entregaPactada).toEqual({ fecha: HOY });
    // Vencía el 03/08: su mora corre del 04/08 a ayer.
    expect(pactado.vencidos).toEqual([
      { desde: "2026-08-04", hasta: AYER, indefinida: false },
    ]);
    expect(calcularEstadoEquipo(pactado, HOY)).toBe("porRecoger");

    // Sigue afuera: el depósito no se toca.
    expect(loGuardadoEnLaFactura()["factura.depositoResuelto"]).toBeUndefined();
    expect(loGuardadoEnLaFactura().gestiones.at(-1)).toMatchObject({
      tipo: "entregaPactada",
      unidades: 5,
    });
  });

  it("no depende de la hora: de tarde tampoco se cobra el día del aviso", async () => {
    // cobraHoy viene en true (pasadas las 3 p.m.) y aun así corta ayer.
    const { usuario } = abrir();

    await pactar(usuario, 5);
    expect(asiQueda()[0]).toBe(`Se cobra hasta ${formatearFechaLegible(AYER)}`);
    await guardar(usuario);
    await screen.findByText("Entrega pactada registrada.");

    expect(equiposGuardados()[0].vencidos.at(-1).hasta).toBe(AYER);
  });

  it("pactar una parte: esas quedan por recoger y las otras siguen corriendo", async () => {
    const { usuario } = abrir();

    await pactar(usuario, 2);
    await guardar(usuario);
    await screen.findByText("Entrega pactada registrada.");

    const [pactados, siguen] = equiposGuardados();
    expect(pactados.cantidadEquipos).toBe(2);
    expect(pactados.entregaPactada).toEqual({ fecha: HOY });
    expect(siguen.cantidadEquipos).toBe(3);
    expect(siguen.entregaPactada).toBeUndefined();
    expect(siguen.devolucion).toBeUndefined();
  });

  it("desde la ficha también se anota la gestión: es lo que la lleva a Seguimiento", async () => {
    const { usuario } = abrir({ factura: facturaAlDia, desdeLaFicha: true });

    await pactar(usuario, 5);
    await guardar(usuario);
    await screen.findByText("Entrega pactada registrada.");

    expect(loGuardadoEnLaFactura().gestiones.at(-1).tipo).toBe("entregaPactada");
  });

  describe("cuando el equipo ya tenía la entrega pactada", () => {
    const ANTEAYER = calcularVencimiento(HOY, -2);
    const TRES_DIAS = calcularVencimiento(HOY, -3);

    // 5 andamios que salieron hace 6 días por 3: se vencieron un día, y
    // anteayer el cliente avisó que los entregaba.
    const porRecoger = {
      id: "f1",
      ...unaFactura({
        numeroFactura: "0729",
        valorDeposito: 100000,
        equipos: [
          andamio({
            fechaDespacho: calcularVencimiento(HOY, -6),
            dias: 3,
            vencidos: [unTramoVencido({ desde: TRES_DIAS, hasta: TRES_DIAS })],
            entregaPactada: { fecha: ANTEAYER },
          }),
        ],
      }),
    };

    it("no ofrece pactar de nuevo y dice desde cuándo está detenida", async () => {
      const { usuario } = abrir({ factura: porRecoger });

      // Lo que sí se puede decidir de un equipo por recoger: llegó o no.
      expect(
        screen.queryByRole("button", { name: "Entrega pactada" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "No entregó" })).toBeInTheDocument();

      await llego(usuario);
      // Su cuenta ya estaba detenida: la casilla del día de hoy no aplica.
      expect(screen.queryByRole("checkbox", { name: /se cobra$/ })).not.toBeInTheDocument();
      expect(
        screen.getByText(
          `Entrega pactada el ${formatearFechaLegible(ANTEAYER)} · cuenta detenida`,
        ),
      ).toBeInTheDocument();
    });

    it("al llegar a la bodega se devuelve sin sumar ni un día", async () => {
      const { usuario } = abrir({ factura: porRecoger });

      await devolver(usuario, "5");
      await guardar(usuario);
      expect(await exito()).toBeInTheDocument();

      const [devuelto] = equiposGuardados();
      expect(devuelto.devolucion.fechaDevolucion).toBe(HOY);
      // Su mora quedó como estaba: el único día vencido de antes del aviso.
      expect(devuelto.vencidos).toEqual([
        { desde: TRES_DIAS, hasta: TRES_DIAS, indefinida: false },
      ]);
      // 3 del alta + 1 vencido, aunque estuvo afuera 7.
      expect(calcularEquipo(devuelto, HOY).dias).toBe(4);
      // Ya no queda nada afuera: ahora sí se define el depósito.
      expect(loGuardadoEnLaFactura()["factura.depositoResuelto"]).toBeDefined();
    });

    it("anularla vuelve a abrirle la mora desde el día del aviso", async () => {
      const { usuario } = abrir({ factura: porRecoger });

      // Elegir "No entregó" ya trae marcado el equipo: es lo que se dijo.
      await elegir(usuario, "No entregó");
      expect(screen.getByLabelText("Anular la entrega pactada")).toBeChecked();
      // Vuelve a correr desde el aviso: anteayer, ayer y hoy, 5 × $20.000.
      expect(asiQueda()).toEqual([
        `Vuelve a correr desde ${formatearFechaLegible(ANTEAYER)}`,
        `3 días vencidos ${enPantalla(300000)}`,
      ]);

      await guardar(usuario);
      expect(await screen.findByText("Entrega pactada anulada.")).toBeInTheDocument();

      const [anulado] = equiposGuardados();
      expect(anulado.entregaPactada).toEqual({ fecha: ANTEAYER, anuladaEl: HOY });
      expect(anulado.devolucion).toBeUndefined();
      expect(anulado.vencidos.at(-1)).toEqual({
        desde: ANTEAYER,
        hasta: null,
        indefinida: false,
      });
      // El de antes + anteayer, ayer y hoy.
      expect(calcularEquipo(anulado, HOY).diasVencidos).toBe(4);
      expect(loGuardadoEnLaFactura().gestiones.at(-1).tipo).toBe("entregaAnulada");
    });
  });
});

// LA FECHA DE LO QUE SE ANOTA. Viene con hoy y se puede atrasar: la factura
// digitada días después de terminada, el equipo que volvió el viernes y se
// anota el lunes. Antes la devolución quedaba siempre con la fecha de hoy, y
// al cliente se le cobraba la demora en anotarla. Pedido del dueño, 2026-10-13.
describe("RegistrarDevolucionDialog — la fecha de lo que se anota", () => {
  const hace = (dias) => calcularVencimiento(HOY, -dias);

  // 5 andamios a $20.000 que salieron hace 40 días por 7: cubiertos hasta
  // hace 34, y con la mora corriendo desde hace 33.
  const vieja = (extra = {}) => ({
    id: "f1",
    ...unaFactura({
      numeroFactura: "0412",
      fechaCreacion: hace(40),
      equipos: [
        andamio({
          fechaDespacho: hace(40),
          dias: 7,
          vencidos: [unTramoVencido({ desde: hace(33), hasta: null })],
          ...extra,
        }),
      ],
    }),
  });

  const ponerFecha = async (usuario, etiqueta, fecha) => {
    await usuario.clear(screen.getByLabelText(etiqueta));
    await usuario.type(screen.getByLabelText(etiqueta), fecha);
  };

  it("viene con la fecha de hoy", async () => {
    const { usuario } = abrir({ factura: vieja() });

    await llego(usuario);

    expect(screen.getByLabelText("Fecha en que llegó a bodega")).toHaveValue(HOY);
  });

  it("si volvió a tiempo hace un mes, no se le cobra ni un día de mora", async () => {
    const { usuario } = abrir({ factura: vieja() });

    await llego(usuario);
    await ponerFecha(usuario, "Fecha en que llegó a bodega", hace(34));
    await devolver(usuario, "5");

    // Ese día todavía estaba en plazo: no hay días vencidos que mostrar.
    expect(asiQueda()).toEqual([`Se cobra hasta ${formatearFechaLegible(hace(34))}`]);

    await guardar(usuario);
    expect(await exito()).toBeInTheDocument();

    const [devuelto] = equiposGuardados();
    expect(devuelto.devolucion.fechaDevolucion).toBe(hace(34));
    expect(devuelto.vencidos).toEqual([]);
    expect(calcularEquipo(devuelto, HOY)).toMatchObject({ dias: 7, diasVencidos: 0 });
  });

  // La casilla del día sigue al reloj aunque la fecha sea otra (pedido del
  // dueño, 2026-10-21); con otra fecha, la pregunta habla del día que llegó.
  const casillaDelDia = () => {
    expect(screen.getByText("¿Se cobra el día que llegó?")).toBeInTheDocument();
    return screen.getByRole("checkbox", { name: /se cobra$/ });
  };

  it("si volvió tarde, la mora llega hasta el día en que volvió y no hasta hoy", async () => {
    // Se anota después de las 3 p.m.: la casilla viene marcada.
    bd.cobraHoy.mockReturnValue(true);
    const { usuario } = abrir({ factura: vieja() });

    await llego(usuario);
    await ponerFecha(usuario, "Fecha en que llegó a bodega", hace(20));
    expect(casillaDelDia()).toBeChecked();

    await devolver(usuario, "5");
    // De hace 33 a hace 20: 14 días a $100.000.
    expect(asiQueda()).toEqual([
      `Se cobra hasta ${formatearFechaLegible(hace(20))}`,
      `14 días vencidos ${enPantalla(1400000)}`,
    ]);

    await guardar(usuario);
    expect(await exito()).toBeInTheDocument();
    expect(equiposGuardados()[0].vencidos).toEqual([
      { desde: hace(33), hasta: hace(20), indefinida: false },
    ]);
  });

  it("anotado antes de las 3 p.m., la casilla viene desmarcada y ese día no se cobra", async () => {
    bd.cobraHoy.mockReturnValue(false);
    const { usuario } = abrir({ factura: vieja() });

    await llego(usuario);
    await ponerFecha(usuario, "Fecha en que llegó a bodega", hace(20));
    expect(casillaDelDia()).not.toBeChecked();

    await devolver(usuario, "5");
    // De hace 33 a hace 21: 13 días; el de la devolución no se cobra.
    expect(asiQueda()).toEqual([
      `Se cobra hasta ${formatearFechaLegible(hace(21))}`,
      `13 días vencidos ${enPantalla(1300000)}`,
    ]);

    await guardar(usuario);
    expect(await exito()).toBeInTheDocument();
    const [devuelto] = equiposGuardados();
    expect(devuelto.devolucion).toMatchObject({ fechaDevolucion: hace(20), diaCobrado: false });
    expect(devuelto.vencidos).toEqual([
      { desde: hace(33), hasta: hace(21), indefinida: false },
    ]);
  });

  // Varios equipos en la misma tanda: "Así queda" suma sus días vencidos, y
  // el detalle, plegado, dice de dónde sale la suma (2026-10-21).
  it("con dos equipos vencidos, el detalle plegado muestra cada uno y la suma", async () => {
    const { usuario } = abrir({ factura: facturaConDosDepositos });

    await llego(usuario);
    const [cantidadAndamio, cantidadRana] = screen.getAllByLabelText("Cantidad que devuelve hoy");
    await usuario.type(cantidadAndamio, "5");
    await usuario.type(cantidadRana, "1");

    expect(screen.queryByText("Días vencidos equipos")).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Ver detalle" }));

    // Un renglón de fechas por equipo (sin el "· Valor" de la ayuda del
    // descuento), y la suma al final.
    expect(screen.getAllByText(/^(Del [\d/]+ al|El) [\d/]+$/)).toHaveLength(2);
    expect(screen.getByText("Días vencidos equipos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ocultar detalle" })).toBeInTheDocument();
  });

  it("con un solo equipo vencido no hay detalle que abrir", async () => {
    const { usuario } = abrir();

    await devolver(usuario, "5");

    expect(screen.queryByRole("button", { name: "Ver detalle" })).not.toBeInTheDocument();
  });

  it("la entrega pactada también: la cuenta se detiene el día del aviso", async () => {
    const { usuario } = abrir({ factura: vieja() });

    await elegir(usuario, "Entrega pactada");
    await ponerFecha(usuario, "Fecha en que el cliente avisó", hace(20));
    await usuario.type(screen.getByLabelText("Cantidad con entrega pactada"), "5");
    await guardar(usuario);
    await screen.findByText("Entrega pactada registrada.");

    const [pactado] = equiposGuardados();
    expect(pactado.entregaPactada).toEqual({ fecha: hace(20) });
    expect(pactado.vencidos).toEqual([
      { desde: hace(33), hasta: hace(21), indefinida: false },
    ]);
  });

  it("no acepta una fecha futura", async () => {
    const { usuario } = abrir({ factura: vieja() });

    await llego(usuario);
    await ponerFecha(usuario, "Fecha en que llegó a bodega", calcularVencimiento(HOY, 1));
    await devolver(usuario, "5");

    // Lo dice debajo del campo y no deja guardar.
    expect(
      screen.getByText(`No puede ser una fecha futura: hoy es ${formatearFechaLegible(HOY)}.`),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(bd.commit).not.toHaveBeenCalled();
  });

  // Lo que vino después se apoya en lo de antes: meter una devolución antes
  // de una ampliación ya anotada es corregir la factura, y eso es del
  // administrador.
  it("ni una anterior a lo último que ya tiene anotado el equipo", async () => {
    const ampliado = vieja({
      vencidos: [unTramoVencido({ desde: hace(33), hasta: hace(30) })],
      ampliaciones: [
        { fecha: hace(30), dias: 5, desde: hace(29), hasta: hace(25), descuento: 0 },
      ],
    });
    const { usuario } = abrir({ factura: ampliado });

    await llego(usuario);
    await ponerFecha(usuario, "Fecha en que llegó a bodega", hace(32));
    await devolver(usuario, "5");

    expect(
      screen.getByText(
        `Tiene que ser el ${formatearFechaLegible(hace(30))} o después: ese día se le ` +
          "anotó algo a ANDAMIO. Si de verdad llegó antes, es una corrección y la hace " +
          "un administrador.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(bd.commit).not.toHaveBeenCalled();
  });
});
