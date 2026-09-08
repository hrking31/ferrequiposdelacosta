import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import AgregarEquipoDialog from "./AgregarEquipoDialog";
import { unEquipo, unaFactura } from "../../test/facturas";

// Sumarle equipos a una factura que ya existe, sin abrir otra. Los equipos que
// se piden juntos forman un DESPACHO —un grupo—, con su propio pago, su
// transporte y su depósito arriba.
//
// Lo que se prueba: que el despacho nuevo entre sin tocar los que ya estaban,
// que sus equipos queden adentro con su fecha de entrega calculada, que la
// foto de lo emitido crezca con lo que se sumó, y que el pago del despacho
// viaje UNA sola vez.
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
// directo, y con el alta ya paga.
const factura = {
  id: "f1",
  ...unaFactura({
    numeroFactura: "1573",
    fechaCreacion: "2026-08-01",
    tipoPago: "total",
    equipos: [
      unEquipo({
        nombre: "ANDAMIO",
        cantidad: 5,
        dias: 3,
        valorDia: 20000,
        fechaDespacho: "2026-08-01",
        fechaVencimiento: "2026-08-03",
      }),
    ],
    pagos: [{ medio: "Efectivo", monto: 300000 }],
  }),
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

// Carga un equipo en la lista del despacho (todavía no lo guarda en la factura).
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
// El despacho recién creado: el último de la lista.
const despachoNuevo = () => loGuardado().grupos.at(-1);

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
  it("abre un despacho nuevo sin tocar el que ya estaba", async () => {
    const { usuario } = abrir();

    await cargarEquipo(usuario);
    await guardar(usuario);

    const grupos = loGuardado().grupos;
    expect(grupos).toHaveLength(2);

    // El del alta queda igual que antes, con su equipo y su pago.
    expect(grupos[0].grupo).toBe("grupo-inicial");
    expect(grupos[0].equipos[0]).toMatchObject({ nombre: "ANDAMIO", cantidadEquipos: 5 });

    // Y el nuevo se numera solo.
    expect(grupos[1].grupo).toBe("grupo-agregados-1");
    expect(grupos[1].equipos[0]).toMatchObject({
      nombre: "MEZCLADORA",
      cantidadEquipos: 2,
      diasAlquilados: 4,
      valorDia: 30000,
    });
  });

  it("el despacho dice cuándo se pidió y le calcula la entrega a su equipo", async () => {
    const { usuario } = abrir();

    await cargarEquipo(usuario);
    await guardar(usuario);

    const despacho = despachoNuevo();
    // La fecha del pedido es del despacho entero, no de cada equipo.
    expect(despacho.fechaSolicitud).toBeTruthy();
    // Despacho 10 + 4 días − 1.
    expect(despacho.equipos[0].fechaVencimiento).toBe("2026-08-13");
  });

  it("no escribe plata en el nodo factura", async () => {
    const { usuario } = abrir();

    await cargarEquipo(usuario);
    await guardar(usuario);

    // El subtotal, el IVA y el total se calculan al mostrarlos. Guardados
    // nacían vencidos: suben solos con cada día que un equipo sigue afuera.
    //
    // Se compara contra las claves y no con toHaveProperty: acá los nombres
    // llevan un punto adentro —son rutas de Firestore, "factura.subtotal"— y
    // toHaveProperty leería ese punto como si fuera un objeto anidado, así
    // que pasaría incluso con el campo escrito.
    const claves = Object.keys(loGuardado());
    expect(claves).not.toContain("factura.subtotal");
    expect(claves).not.toContain("factura.valorIva");
    expect(claves).not.toContain("factura.total");
    expect(claves).not.toContain("factura.tipoPago");
  });

  it("el despacho guarda cómo se pagó ÉL, sin pisar al del alta", async () => {
    const { usuario } = abrir();

    await cargarEquipo(usuario);
    // Estos equipos se llevan sin pagar, aunque el alta se pagó completa.
    await usuario.click(screen.getByRole("combobox", { name: "Pago de estos equipos" }));
    await usuario.click(screen.getByRole("option", { name: "Sin pago" }));
    await guardar(usuario);

    const grupos = loGuardado().grupos;
    expect(grupos[0].pagos.tipoPago).toBe("total"); // el alta, intacta
    expect(grupos[1].pagos.tipoPago).toBe("sinPago"); // lo recién agregado
  });

  it("el tipo de pago elegido es el que queda en el despacho", async () => {
    const { usuario } = abrir();

    await cargarEquipo(usuario);
    await guardar(usuario);

    // Sin tocar el selector se queda en "total", que es su valor de arranque.
    expect(despachoNuevo().pagos.tipoPago).toBe("total");
  });

  it("dos equipos pedidos el mismo día comparten el despacho, y su pago va una sola vez", async () => {
    const { usuario } = abrir();

    await cargarEquipo(usuario);
    await cargarEquipo(usuario, { cantidad: "1", dias: "2", valor: "10000" });
    await guardar(usuario);

    const despacho = despachoNuevo();
    expect(despacho.equipos).toHaveLength(2);

    // El pago, el flete y el depósito viven ARRIBA, en el despacho. Antes
    // colgaban del primer equipo del lote y había que acordarse de no
    // copiarlos al partir una línea; si se copiaban, la factura contaba el
    // pago dos veces y se inventaba un saldo a favor.
    expect(despacho).toHaveProperty("pagos");
    expect(despacho).toHaveProperty("adicionales");
    despacho.equipos.forEach((equipo) => {
      expect(equipo).not.toHaveProperty("pagos");
      expect(equipo).not.toHaveProperty("valorTransporte");
      expect(equipo).not.toHaveProperty("deposito");
    });
  });
});
