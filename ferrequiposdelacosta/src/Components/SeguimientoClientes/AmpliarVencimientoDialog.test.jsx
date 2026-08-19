import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
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
  it("corre la fecha y deja anotada la ampliación con su fecha anterior", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Días a ampliar"), "2");
    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();

    const guardado = loGuardadoEnLaFactura();
    const equipo = guardado.equipos[0];

    // Vencía el 3; con 2 días más, vence el 5.
    expect(equipo.fechaVencimiento).toBe("2026-08-05");
    // Y queda el registro de por qué se corrió, que es lo que después permite
    // contar la historia en tres tramos.
    expect(equipo.ampliaciones).toEqual([
      { fechaAnterior: "2026-08-03", fechaNueva: "2026-08-05", dias: 2, descuento: 0 },
    ]);
    // La fecha original se guarda una sola vez, para las vistas viejas.
    expect(equipo.fechaVencimientoOriginal).toBe("2026-08-03");
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
      fechaNueva: "2026-08-03",
      dias: 2,
      descuento: 0,
    };
    const { usuario } = abrir({
      factura: {
        ...factura,
        equipos: [{ ...factura.equipos[0], ampliaciones: [anterior] }],
      },
    });

    await usuario.type(screen.getByLabelText("Días a ampliar"), "1");
    await guardar(usuario);

    expect(await screen.findByText("Vencimiento actualizado correctamente.")).toBeInTheDocument();
    const ampliaciones = loGuardadoEnLaFactura().equipos[0].ampliaciones;
    expect(ampliaciones).toHaveLength(2);
    expect(ampliaciones[0]).toEqual(anterior);
    expect(ampliaciones[1].fechaNueva).toBe("2026-08-04");
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
