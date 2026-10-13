import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import {
  calcularVencimiento,
  cubiertoHasta,
  obtenerFechaHoyBogota,
} from "../ClienteDetalle/facturaUtils";
import AmpliarVencimientoDialog from "./AmpliarVencimientoDialog";
import { unEquipo, unEquipoDevuelto, unTramoVencido, unaFactura } from "../../test/facturas";
import { formatearFechaLegible, formatearMoneda } from "../../Utils/formato";

// Un importe tal como sale en pantalla: el formato de pesos separa el "$" con
// un espacio especial, que al leer la pantalla cuenta como uno normal.
const enPantalla = (valor) => formatearMoneda(valor).replace(/\s/g, " ");

// Darle más días al cliente. Es una operación de plata: los días que se agregan
// se cobran, salvo que se les haga un descuento, y la ampliación queda anotada
// equipo por equipo para poder reconstruir después por qué la fecha se corrió.
//
// Lo que se prueba: que no se guarde una ampliación vacía, que la fecha nueva y
// el registro de la ampliación queden bien escritos, que el descuento se
// guarde, y que "indefinida" y "días" sean caminos distintos y excluyentes.
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

const facturaCon = ({ equipos = [andamio()], ...resto } = {}) => ({
  id: "f1",
  ...unaFactura({
    numeroFactura: "1573",
    fechaCreacion: "2026-08-01",
    total: 300000,
    equipos,
    ...resto,
  }),
});

const factura = facturaCon();

// El mismo andamio pero vencido AYER, para las pruebas que miran cómo se
// consolidan los días vencidos al dar plazo nuevo. Va relativo a hoy y no con
// fechas fijas: el plazo nuevo se cuenta desde el día en que se pacta, así que
// una fecha de agosto daría un resultado distinto cada día que pasa.
const HOY = obtenerFechaHoyBogota();
const AYER = calcularVencimiento(HOY, -1);
// Se le corre la fecha de DESPACHO: sus 3 días del alta tienen que terminar
// AYER, porque hasta cuándo está cubierto ya no se guarda, se encadena.
const DESPACHO_VENCIDO_AYER = calcularVencimiento(AYER, -2);
const facturaVencidaAyer = facturaCon({
  equipos: [
    andamio({
      fechaDespacho: DESPACHO_VENCIDO_AYER,
      // La madrugada de hoy le abrió su tramo: lleva un día de más.
      vencidos: [unTramoVencido({ desde: HOY, hasta: null })],
    }),
  ],
});

const abrir = (props = {}) =>
  renderConProviders(
    <AmpliarVencimientoDialog
      open
      onClose={() => {}}
      cliente={cliente}
      factura={factura}
      {...props}
    />,
  );

const guardar = (usuario) =>
  usuario.click(screen.getByRole("button", { name: "Guardar" }));

// Lo que quedó escrito en la factura (la primera de las dos escrituras del
// lote; la segunda es el estado del cliente).
const loGuardadoEnLaFactura = () => bd.update.mock.calls[0][1];
// El primer equipo de la factura, sin importar en qué despacho esté.
const primerEquipo = () =>
  loGuardadoEnLaFactura().grupos.flatMap((grupo) => grupo.equipos)[0];

beforeEach(() => {
  vi.clearAllMocks();
  bd.getDocs.mockResolvedValue({ docs: [] });
});

describe("AmpliarVencimientoDialog — antes de guardar", () => {
  it("muestra el equipo y hasta cuándo vence hoy", () => {
    abrir();

    expect(screen.getByText("5 ANDAMIO")).toBeInTheDocument();
    expect(screen.getByText(/03\/08\/2026/)).toBeInTheDocument();
  });

  // Solo se le puede dar más plazo a lo que está afuera Y vencido. Un equipo
  // que ya volvió no tiene vencimiento que correr, y uno en fecha no necesita
  // que se lo corran: ofrecerlos era pedirle a quien cobra que decidiera sobre
  // equipos que no tienen nada que ver con el vencimiento que la trajo acá.
  it("solo ofrece los equipos vencidos que siguen afuera", () => {
    abrir({
      factura: facturaCon({
        equipos: [
          andamio(),
          // Ya volvió: no hay vencimiento que ampliar.
          unEquipoDevuelto({
            nombre: "PLUMA",
            cantidad: 2,
            dias: 2,
            valorDia: 20000,
            fechaDespacho: "2026-08-01",
            fechaDevolucion: "2026-08-02",
          }),
          // Todavía en fecha: se le amplía cuando venza, si hace falta.
          andamio({ nombre: "MEZCLADORA", fechaDespacho: HOY, dias: 30 }),
        ],
      }),
    });

    expect(screen.getByText(/ANDAMIO/)).toBeInTheDocument();
    expect(screen.queryByText(/PLUMA/)).not.toBeInTheDocument();
    expect(screen.queryByText(/MEZCLADORA/)).not.toBeInTheDocument();
  });

  it("sin marcar nada no guarda: no habría qué ampliar", async () => {
    const { usuario } = abrir();

    await guardar(usuario);

    expect(
      await screen.findByText("Marcá al menos un equipo para ampliar o dejar indefinido."),
    ).toBeInTheDocument();
    expect(bd.commit).not.toHaveBeenCalled();
  });
});

describe("AmpliarVencimientoDialog — al ampliar", () => {
  it("corre la fecha desde hoy y consolida los días ya vencidos", async () => {
    // El andamio venció AYER: lleva 1 día afuera. Las fechas se arman
    // relativas a hoy para que la prueba no dependa del día en que se corra.
    const { usuario } = abrir({ factura: facturaVencidaAyer });

    await usuario.type(screen.getByLabelText("Días a ampliar"), "2");
    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();

    const equipo = primerEquipo();

    // Los 2 días prometidos arrancan MAÑANA. Sumarlos a la fecha vencida
    // daba una fecha ya pasada, y el cliente no tenía el plazo prometido.
    expect(cubiertoHasta(equipo)).toBe(calcularVencimiento(HOY, 2));
    // La ampliación dice SOLO lo que el cliente pidió.
    expect(equipo.ampliaciones).toEqual([
      {
        fecha: HOY,
        dias: 2,
        desde: calcularVencimiento(HOY, 1),
        hasta: calcularVencimiento(HOY, 2),
        descuento: 0,
      },
    ]);
    // Y el día que se le había vencido queda cerrado en su tramo, con sus dos
    // fechas: eso es lo que antes se perdía al renovar.
    expect(equipo.vencidos).toEqual([
      { desde: HOY, hasta: HOY, indefinida: false },
    ]);
  });

  it("guarda el descuento que se le hizo a esos días", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Días a ampliar"), "2");
    // El campo de descuento aparece recién cuando hay días cargados.
    await usuario.type(screen.getByLabelText("Descuento en los 2 días nuevos"), "50000");
    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();
    expect(primerEquipo().ampliaciones[0].descuento).toBe(50000);
  });
});

// Pedido del dueño el 2026-09-28: el cliente pidió descuento al ampliar y el
// diálogo decía "Este equipo no tiene precio cargado" —era un dato que ya no
// existía—, no mostraba a cómo se cobraba el día y no dejaba elegir sobre qué
// días se descontaba.
describe("AmpliarVencimientoDialog — los descuentos", () => {
  it("muestra a cómo se cobra el día", async () => {
    const { usuario } = abrir({ factura: facturaVencidaAyer });

    await usuario.type(screen.getByLabelText("Días a ampliar"), "2");

    expect(
      screen.getByText(`Valor del día: 5 × ${enPantalla(20000)} = ${enPantalla(100000)}`),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no tiene precio/)).not.toBeInTheDocument();
    // Cada casilla dice cuánto valen sus días.
    expect(screen.getByText(`Valor ${enPantalla(200000)}`)).toBeInTheDocument();
    expect(
      screen.getByText(
        `Desde el ${formatearFechaLegible(HOY)} · Valor ${enPantalla(100000)}`,
      ),
    ).toBeInTheDocument();
  });

  it("el descuento de los vencidos queda en el tramo que se cierra hoy", async () => {
    const { usuario } = abrir({ factura: facturaVencidaAyer });

    await usuario.type(screen.getByLabelText("Días a ampliar"), "2");
    await usuario.type(screen.getByLabelText("Descuento en el día vencido"), "30000");
    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();
    const equipo = primerEquipo();
    expect(equipo.vencidos).toEqual([
      { desde: HOY, hasta: HOY, indefinida: false, descuento: 30000 },
    ]);
    // Y el de los días nuevos queda en cero: no se escribió nada.
    expect(equipo.ampliaciones[0].descuento).toBe(0);
  });

  it("no deja guardar un descuento que pasa de lo que valen sus días", async () => {
    const { usuario } = abrir({ factura: facturaVencidaAyer });

    await usuario.type(screen.getByLabelText("Días a ampliar"), "1");
    await usuario.type(screen.getByLabelText("Descuento en el día nuevo"), "100001");

    expect(screen.getByText(`No puede pasar de ${enPantalla(100000)}`)).toBeInTheDocument();

    await guardar(usuario);

    expect(
      await screen.findByText("Un descuento pasa de lo que valen sus días."),
    ).toBeInTheDocument();
    expect(bd.commit).not.toHaveBeenCalled();
  });
});

describe("AmpliarVencimientoDialog — la gestión", () => {

  it("anota la prórroga en la línea de tiempo de la factura", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Días a ampliar"), "2");
    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();
    const gestiones = loGuardadoEnLaFactura().gestiones;
    expect(gestiones).toHaveLength(1);
    expect(gestiones[0].tipo).toBe("prorroga");
    expect(gestiones[0].dias).toBe(2);
  });

  it("acumula la ampliación nueva sobre las que ya tenía", async () => {
    const anterior = {
      fecha: calcularVencimiento(AYER, -2),
      dias: 2,
      desde: calcularVencimiento(AYER, -1),
      hasta: AYER,
      descuento: 0,
    };
    const { usuario } = abrir({
      factura: facturaCon({
        equipos: [
          andamio({
            // 3 días del alta más los 2 de la ampliación anterior: para que
            // su cobertura termine AYER, tuvo que salir cuatro días antes.
            fechaDespacho: calcularVencimiento(AYER, -4),
            ampliaciones: [anterior],
            vencidos: [unTramoVencido({ desde: HOY, hasta: null })],
          }),
        ],
      }),
    });

    await usuario.type(screen.getByLabelText("Días a ampliar"), "1");
    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();
    const ampliaciones = primerEquipo().ampliaciones;
    expect(ampliaciones).toHaveLength(2);
    expect(ampliaciones[0]).toEqual(anterior);
    expect(ampliaciones[1].hasta).toBe(calcularVencimiento(HOY, 1));
  });
});

describe("AmpliarVencimientoDialog — entrega indefinida", () => {
  it("al marcarla, el equipo queda sin fecha y no se puede cargar días", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByLabelText(/Dejar indefinida/));

    expect(screen.getByLabelText("Días a ampliar")).toBeDisabled();

    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();
    const equipo = primerEquipo();
    expect(equipo.indefinida.activa).toBe(true);
    expect(equipo.indefinida.desde).toBe(HOY);
    // No se le inventa ninguna ampliación: el cliente avisará.
    expect(equipo.ampliaciones).toEqual([]);
  });

  // Al que YA quedó sin fecha la casilla le sale marcada y bloqueada: no hay
  // nada que volver a pactar, y vacía hacía parecer que el equipo tenía fecha.
  // Bloqueada ademas lo protege: volver a guardarla le correria a hoy el dia
  // en que se pacto, borrando desde cuando el cliente lo tiene.
  it("el que ya está sin fecha la muestra marcada y bloqueada", () => {
    abrir({
      factura: facturaCon({
        equipos: [
          andamio({ indefinida: { activa: true, desde: "2026-08-10", hasta: null } }),
        ],
      }),
    });

    const casilla = screen.getByLabelText(/Sin fecha de entrega desde el/);

    expect(casilla).toBeChecked();
    expect(casilla).toBeDisabled();
    expect(screen.queryByLabelText(/Dejar indefinida/)).not.toBeInTheDocument();
  });

  it("la prórroga queda anotada igual, marcada como indefinida", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByLabelText(/Dejar indefinida/));
    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();
    expect(loGuardadoEnLaFactura().gestiones[0].indefinida).toBe(true);
  });
});

// La misma regla que en el diálogo de devolución (ver PlazoEquipo): la fecha
// del último acuerdo y, si ya pasó, cuántos días lleva vencido. Al pactar el
// plazo nuevo hay que saber de qué tamaño es el atraso que se está perdonando.
describe("AmpliarVencimientoDialog — el plazo de cada equipo", () => {
  it("muestra la fecha vigente y los días vencidos", () => {
    abrir({
      factura: facturaCon({
        equipos: [
          andamio({
            vencidos: [unTramoVencido({ desde: "2026-08-04", hasta: null })],
          }),
        ],
      }),
    });

    expect(screen.getByText(/Vence: 03\/08\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/días vencidos/)).toBeInTheDocument();
  });

  it("después de ampliar, la fecha que muestra es la nueva", () => {
    // El mismo andamio pero ya con una ampliación encima: venció el 03, se le
    // dieron 4 días y quedó para el 07. La fila tiene que hablar del 07, que
    // es el acuerdo vigente, y no del 03, que ya se resolvió.
    abrir({
      factura: facturaCon({
        equipos: [
          andamio({
            ampliaciones: [
              {
                fecha: "2026-08-03",
                dias: 4,
                desde: "2026-08-04",
                hasta: "2026-08-07",
                descuento: 0,
              },
            ],
          }),
        ],
      }),
    });

    expect(screen.getByText(/Vence: 07\/08\/2026/)).toBeInTheDocument();
    expect(screen.queryByText(/Vence: 03\/08\/2026/)).not.toBeInTheDocument();
  });
});

// LA FECHA DEL ACUERDO. Viene con hoy y se puede atrasar: el cliente pidió los
// días el viernes y se anota el lunes. Los días nuevos arrancan después de esa
// fecha, no después del día en que se anotó. Pedido del dueño, 2026-10-13.
describe("AmpliarVencimientoDialog — la fecha del acuerdo", () => {
  const hace = (dias) => calcularVencimiento(HOY, -dias);

  // 5 andamios que salieron hace 20 días por 7: cubiertos hasta hace 14, con
  // la mora corriendo desde hace 13.
  const vencidaHaceDias = () =>
    facturaCon({
      equipos: [
        andamio({
          fechaDespacho: hace(20),
          dias: 7,
          vencidos: [unTramoVencido({ desde: hace(13), hasta: null })],
        }),
      ],
    });

  const ponerFecha = async (usuario, fecha) => {
    await usuario.clear(screen.getByLabelText("Fecha del acuerdo"));
    await usuario.type(screen.getByLabelText("Fecha del acuerdo"), fecha);
  };

  it("viene con la fecha de hoy", () => {
    abrir({ factura: vencidaHaceDias() });

    expect(screen.getByLabelText("Fecha del acuerdo")).toHaveValue(HOY);
  });

  it("los días nuevos arrancan después del día en que se pactó", async () => {
    const { usuario } = abrir({ factura: vencidaHaceDias() });

    // Se pactaron 30 días hace 10: llevaba 4 vencidos (de hace 13 a hace 10).
    await ponerFecha(usuario, hace(10));
    await usuario.type(screen.getByLabelText("Días a ampliar"), "30");
    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();
    const equipo = primerEquipo();
    expect(equipo.vencidos).toEqual([
      { desde: hace(13), hasta: hace(10), indefinida: false },
    ]);
    expect(equipo.ampliaciones.at(-1)).toMatchObject({
      fecha: hace(10),
      dias: 30,
      desde: hace(9),
      hasta: calcularVencimiento(hace(9), 29),
    });
  });

  // Los días que se pactaron ya se acabaron: el equipo sigue afuera y la mora
  // tiene que quedar corriendo desde ya, sin esperar a la madrugada.
  it("si el plazo pactado ya se venció, la mora nueva queda abierta", async () => {
    const { usuario } = abrir({ factura: vencidaHaceDias() });

    await ponerFecha(usuario, hace(10));
    await usuario.type(screen.getByLabelText("Días a ampliar"), "3");
    await guardar(usuario);

    await screen.findByText("Vencimiento actualizado correctamente.");
    // 3 días desde hace 9: cubierto hasta hace 7, vencido desde hace 6.
    expect(cubiertoHasta({ ...primerEquipo(), vencidos: [] })).toBe(hace(7));
    expect(primerEquipo().vencidos).toEqual([
      { desde: hace(13), hasta: hace(10), indefinida: false },
      { desde: hace(6), hasta: null, indefinida: false },
    ]);
  });

  // Se pactó cuando todavía estaba en plazo: la mora que la madrugada le fue
  // abriendo después nunca corrió.
  it("si ese día estaba en plazo, no se le cobra mora de antes del acuerdo", async () => {
    const { usuario } = abrir({ factura: vencidaHaceDias() });

    await ponerFecha(usuario, hace(15));
    await usuario.type(screen.getByLabelText("Días a ampliar"), "30");
    await guardar(usuario);

    await screen.findByText("Vencimiento actualizado correctamente.");
    const equipo = primerEquipo();
    expect(equipo.vencidos).toEqual([]);
    // Los 30 días siguen a los del alta, que terminaban hace 14.
    expect(equipo.ampliaciones.at(-1)).toMatchObject({ fecha: hace(15), desde: hace(13) });
  });

  it("no acepta una fecha futura", async () => {
    const { usuario } = abrir({ factura: vencidaHaceDias() });

    await ponerFecha(usuario, calcularVencimiento(HOY, 1));
    await usuario.type(screen.getByLabelText("Días a ampliar"), "3");
    await guardar(usuario);

    expect(await screen.findByText("La fecha no puede ser futura.")).toBeInTheDocument();
    expect(bd.commit).not.toHaveBeenCalled();
  });

  it("ni una anterior al despacho del equipo", async () => {
    const { usuario } = abrir({ factura: vencidaHaceDias() });

    await ponerFecha(usuario, hace(25));
    await usuario.type(screen.getByLabelText("Días a ampliar"), "3");
    await guardar(usuario);

    expect(
      await screen.findByText(
        `El ANDAMIO ya tiene algo anotado el ${formatearFechaLegible(
          hace(20),
        )}: la fecha no puede ser anterior.`,
      ),
    ).toBeInTheDocument();
    expect(bd.commit).not.toHaveBeenCalled();
  });
});
