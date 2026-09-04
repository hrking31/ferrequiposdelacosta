import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import AgregarEquipoDialog from "./AgregarEquipoDialog";

// Sumarle equipos a una factura que ya existe, sin abrir otra. Los equipos que
// se piden juntos forman un LOTE, con su propio pago, transporte y depósito.
//
// Lo que se prueba: que los equipos nuevos entren sin pisar a los que ya
// estaban, que queden marcados como agregados después (si no, se confunden con
// los del alta), que el total de la factura se rehaga, y que el pago del lote
// viaje con el lote y no se sume dos veces.
const bd = vi.hoisted(() => ({
  update: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db, ...partes) => partes.join("/"),
  doc: (_db, ...partes) => partes.join("/"),
  writeBatch: () => ({ update: bd.update, commit: bd.commit }),
}));

const cliente = { id: "cli1", tipo: "persona", nombres: "Aida", apellido: "Pérez" };

// Una factura con un equipo del alta, sin IVA para que las cuentas se lean
// directo.
const factura = {
  id: "f1",
  numeroFactura: 1573,
  fecha: "2026-08-01",
  valores: {
    aplicaIva: false,
    subtotal: 300000,
    valorTotal: 300000,
  },
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
  pagos: [{ medio: "Efectivo", monto: 300000 }],
  abonos: [],
};

const estadoInicial = {
  equipos: { equipos: [{ id: "e1", name: "MEZCLADORA" }], loading: false, error: null },
};

const abrir = (props = {}) =>
  renderConProviders(
    <AgregarEquipoDialog
      open
      onClose={() => {}}
      cliente={cliente}
      factura={factura}
      facturas={[factura]}
      {...props}
    />,
    { estadoInicial },
  );

// Carga un equipo en la lista del lote (todavía no lo guarda en la factura).
const cargarEquipo = async (usuario, { cantidad = "2", dias = "4", valor = "30000" } = {}) => {
  await usuario.type(screen.getByLabelText("Equipo (del catálogo o nuevo)"), "MEZCLADORA");
  await usuario.type(screen.getByLabelText("Cantidad"), cantidad);
  await usuario.type(screen.getByLabelText("Días"), dias);
  await usuario.type(screen.getByLabelText("Precio por día"), valor);
  await usuario.clear(screen.getByLabelText("Fecha despacho"));
  await usuario.type(screen.getByLabelText("Fecha despacho"), "2026-08-10");
  await usuario.click(screen.getByRole("button", { name: "Agregar equipo" }));
};

const guardar = (usuario) =>
  usuario.click(screen.getByRole("button", { name: "Guardar en la factura" }));

const loGuardado = () => bd.update.mock.calls[0][1];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AgregarEquipoDialog — antes de guardar", () => {
  it("sin equipos en la lista no guarda nada", async () => {
    const { usuario } = abrir();

    await guardar(usuario);

    expect(await screen.findByText("Agregá al menos un equipo a la lista.")).toBeInTheDocument();
    expect(bd.commit).not.toHaveBeenCalled();
  });
});

describe("AgregarEquipoDialog — al sumar equipos", () => {
  it("los agrega sin tocar los que ya estaban", async () => {
    const { usuario } = abrir();

    await cargarEquipo(usuario);
    await guardar(usuario);

    const guardado = loGuardado();
    expect(guardado.equipos).toHaveLength(2);
    // El del alta queda igual que antes.
    expect(guardado.equipos[0]).toMatchObject({ nombre: "ANDAMIO", cantidad: 5 });
    expect(guardado.equipos[1]).toMatchObject({
      nombre: "MEZCLADORA",
      cantidad: 2,
      dias: 4,
      valor: 30000,
    });
  });

  it("marca al equipo nuevo como agregado después y le calcula su entrega", async () => {
    const { usuario } = abrir();

    await cargarEquipo(usuario);
    await guardar(usuario);

    const nuevo = loGuardado().equipos[1];
    // Sin esta marca, en el historial se confundiría con los del alta.
    expect(nuevo.agregadoPosteriormente).toBe(true);
    // Despacho 10 + 4 días − 1.
    expect(nuevo.fechaVencimiento).toBe("2026-08-13");
    // Y el lote, que es lo que después permite agrupar lo que se pidió junto.
    expect(nuevo.loteId).toBeTruthy();
  });

  it("rehace el total de la factura con lo que se sumó", async () => {
    const { usuario } = abrir();

    // 2 mezcladoras × 4 días × $30.000 = $240.000, sobre los $300.000 que ya había.
    await cargarEquipo(usuario);
    await guardar(usuario);

    // Se escribe con la ruta completa, campo por campo: escribir el nodo
    // `valores` entero borraría el transporte y el depósito, que acá no se
    // tocan.
    const guardado = loGuardado();
    expect(guardado["valores.subtotal"]).toBe(540000);
    expect(guardado["valores.valorTotal"]).toBe(540000);
  });

  it("la factura vuelve a quedar parcial: lo nuevo todavía no está pagado", async () => {
    const { usuario } = abrir();

    await cargarEquipo(usuario);
    await guardar(usuario);

    // El alta estaba paga, pero lo que se acaba de agregar no.
    expect(loGuardado().tipoPago).toBe("parcial");
  });

  it("dos equipos pedidos el mismo día comparten el lote", async () => {
    const { usuario } = abrir();

    await cargarEquipo(usuario);
    await cargarEquipo(usuario, { cantidad: "1", dias: "2", valor: "10000" });
    await guardar(usuario);

    const equipos = loGuardado().equipos;
    expect(equipos).toHaveLength(3);
    expect(equipos[1].loteId).toBe(equipos[2].loteId);
    // El pago del lote viaja SOLO en el primero: contarlo en los dos haría que
    // el pagado de la factura suba el doble.
    expect(equipos[2].pagos).toBeUndefined();
  });
});
