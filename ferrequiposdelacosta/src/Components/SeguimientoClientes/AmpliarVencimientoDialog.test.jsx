import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import {
  calcularVencimiento,
  obtenerFechaHoyBogota,
} from "../ClienteDetalle/facturaUtils";
import AmpliarVencimientoDialog from "./AmpliarVencimientoDialog";

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

const factura = {
  id: "f1",
  numeroFactura: 1573,
  fecha: "2026-08-01",
  valorTotal: 300000,
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

// El mismo andamio pero vencido AYER, para las pruebas que miran cómo se
// consolidan los días vencidos al dar plazo nuevo. Va relativo a hoy y no con
// fechas fijas: el plazo nuevo se cuenta desde el día en que se pacta, así que
// una fecha de agosto daría un resultado distinto cada día que pasa.
const HOY = obtenerFechaHoyBogota();
const AYER = calcularVencimiento(HOY, -1);
const facturaVencidaAyer = {
  ...factura,
  equipos: [{ ...factura.equipos[0], fechaVencimiento: AYER }],
};

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
      factura: {
        ...factura,
        equipos: [
          factura.equipos[0],
          // Ya volvió: no hay vencimiento que ampliar.
          {
            ...factura.equipos[0],
            nombre: "PLUMA",
            cantidad: 2,
            cantidadDevuelta: 2,
            fechaDevolucion: "2026-08-02",
          },
          // Todavía en fecha: se le amplía cuando venza, si hace falta.
          {
            ...factura.equipos[0],
            nombre: "MEZCLADORA",
            fechaVencimiento: "2099-01-01",
          },
        ],
      },
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

    const equipo = loGuardadoEnLaFactura().equipos[0];

    // Los 2 días prometidos se cuentan desde HOY. Sumarlos a la fecha vencida
    // daba una fecha ya pasada, y el cliente no tenía el plazo prometido.
    expect(equipo.fechaVencimiento).toBe(calcularVencimiento(HOY, 2));
    // Y la ampliación registra los 3 días que la fecha corrió de verdad,
    // diciendo cuál de ellos ya estaba vencido: sin eso, el día que el equipo
    // estuvo afuera dejaría de cobrarse.
    expect(equipo.ampliaciones).toEqual([
      {
        fechaAnterior: AYER,
        fechaNueva: calcularVencimiento(HOY, 2),
        dias: 3,
        diasVencidos: 1,
        diasPactados: 2,
        descuento: 0,
      },
    ]);
    // La fecha original se guarda una sola vez, para las vistas viejas.
    expect(equipo.fechaVencimientoOriginal).toBe(AYER);
  });

  it("guarda el descuento que se le hizo a esos días", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Días a ampliar"), "2");
    // El campo de descuento aparece recién cuando hay días cargados.
    await usuario.type(screen.getByLabelText("Descuento sobre esos días"), "50000");
    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();
    expect(loGuardadoEnLaFactura().equipos[0].ampliaciones[0].descuento).toBe(50000);
  });

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
      fechaAnterior: "2026-08-01",
      fechaNueva: AYER,
      dias: 2,
      descuento: 0,
    };
    const { usuario } = abrir({
      factura: {
        ...facturaVencidaAyer,
        equipos: [{ ...facturaVencidaAyer.equipos[0], ampliaciones: [anterior] }],
      },
    });

    await usuario.type(screen.getByLabelText("Días a ampliar"), "1");
    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();
    const ampliaciones = loGuardadoEnLaFactura().equipos[0].ampliaciones;
    expect(ampliaciones).toHaveLength(2);
    expect(ampliaciones[0]).toEqual(anterior);
    expect(ampliaciones[1].fechaNueva).toBe(calcularVencimiento(HOY, 1));
  });
});

describe("AmpliarVencimientoDialog — entrega indefinida", () => {
  it("al marcarla, el equipo queda sin fecha y no se puede cargar días", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByLabelText(/Dejar indefinida/));

    expect(screen.getByLabelText("Días a ampliar")).toBeDisabled();

    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();
    const equipo = loGuardadoEnLaFactura().equipos[0];
    expect(equipo.vencimientoIndefinido).toBe(true);
    // No se le inventa una fecha nueva ni una ampliación: el cliente avisará.
    expect(equipo.fechaVencimiento).toBe("2026-08-03");
    expect(equipo.ampliaciones).toBeUndefined();
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
    abrir();

    expect(screen.getByText(/Vence: 03\/08\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/días vencidos/)).toBeInTheDocument();
  });

  it("después de ampliar, la fecha que muestra es la nueva", () => {
    // El mismo andamio pero ya con una ampliación encima: venció el 03, se le
    // dieron 4 días y quedó para el 07. La fila tiene que hablar del 07, que
    // es el acuerdo vigente, y no del 03, que ya se resolvió.
    abrir({
      factura: {
        ...factura,
        equipos: [
          {
            ...factura.equipos[0],
            fechaVencimientoOriginal: "2026-08-03",
            fechaVencimiento: "2026-08-07",
            ampliaciones: [
              {
                fechaAnterior: "2026-08-03",
                fechaNueva: "2026-08-07",
                dias: 4,
                descuento: 0,
              },
            ],
          },
        ],
      },
    });

    expect(screen.getByText(/Vence: 07\/08\/2026/)).toBeInTheDocument();
    expect(screen.queryByText(/Vence: 03\/08\/2026/)).not.toBeInTheDocument();
  });
});
