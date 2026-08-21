import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import { obtenerFechaHoyBogota } from "../ClienteDetalle/facturaUtils";
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

  it("si se retiene parte del depósito, exige decir por qué", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "5");
    // Se destilda "volvió en buen estado": recién ahí aparece cuánto retener.
    await usuario.click(screen.getByLabelText(/Volvió todo completo y en buen estado/));
    await usuario.type(screen.getByLabelText("Se retiene"), "30000");
    await guardar(usuario);

    expect(
      await screen.findByText("Escribí por qué se retiene parte del depósito."),
    ).toBeInTheDocument();
    expect(bd.commit).not.toHaveBeenCalled();
  });

  it("con el motivo escrito, guarda cuánto se retuvo y por qué", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Cantidad que devuelve hoy"), "5");
    // Se destilda "volvió en buen estado": recién ahí aparece cuánto retener.
    await usuario.click(screen.getByLabelText(/Volvió todo completo y en buen estado/));
    await usuario.type(screen.getByLabelText("Se retiene"), "30000");
    await usuario.type(screen.getByLabelText("Motivo"), "Andamio rayado");
    await guardar(usuario);

    expect(await exito()).toBeInTheDocument();
    expect(loGuardadoEnLaFactura().depositoResuelto).toEqual({
      retenido: 30000,
      motivo: "Andamio rayado",
      fecha: HOY,
    });
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
