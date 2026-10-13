import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import FacturaFormDialog from "./FacturaFormDialog";

// El formulario con el que se crea una factura: el que decide qué queda
// escrito en la base sobre la plata de un alquiler. (Corregir una ya cargada
// es de CorregirFacturaDialog, que tiene sus propias pruebas.)
//
// Lo que se fija acá no son las cuentas —eso ya está probado en
// facturaCuentas.test.js— sino las decisiones de este formulario:
//
//   · qué NO deja guardar,
//   · qué escribe exactamente al crear,
//   · y que lo entregado de más se guarde como abono y no como pago.
const bd = vi.hoisted(() => ({
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  collection: (_db, ...partes) => partes.join("/"),
  doc: (primero, ...partes) => (partes.length ? partes.join("/") : `${primero}/nueva`),
  getDocs: bd.getDocs,
  writeBatch: () => ({ set: bd.set, update: bd.update, commit: bd.commit }),
}));

const cliente = { id: "cli1", tipo: "persona", nombres: "Aida", apellido: "Pérez" };

// El catálogo va precargado: si queda vacío, el formulario sale a buscarlo a
// Firestore al abrirse y la prueba estaría probando también esa consulta.
const estadoInicial = {
  equipos: { equipos: [{ id: "e1", name: "ANDAMIO" }], loading: false, error: null },
};

const abrir = (props = {}) =>
  renderConProviders(
    <FacturaFormDialog open onClose={() => {}} cliente={cliente} {...props} />,
    { estadoInicial },
  );

const botonGuardar = () => screen.getByRole("button", { name: "Crear Factura" });

// Carga un equipo completo en el formulario, que es el paso previo a casi todo.
const cargarEquipo = async (usuario, { dias = "3", despacho = "2026-08-10" } = {}) => {
  await usuario.type(screen.getByLabelText("Equipo (del catálogo o nuevo)"), "ANDAMIO");
  await usuario.type(screen.getByLabelText("Cantidad"), "4");
  await usuario.type(screen.getByLabelText("Días"), dias);
  await usuario.type(screen.getByLabelText("Precio por día"), "20000");
  await usuario.clear(screen.getByLabelText("Fecha despacho"));
  await usuario.type(screen.getByLabelText("Fecha despacho"), despacho);
  await usuario.click(screen.getByRole("button", { name: "Agregar equipo" }));
};

beforeEach(() => {
  vi.clearAllMocks();
  bd.getDocs.mockResolvedValue({ docs: [] });
});

describe("FacturaFormDialog — lo que no deja guardar", () => {
  it("pide número de factura y al menos un equipo", async () => {
    const { usuario } = abrir();

    await usuario.click(botonGuardar());

    expect(screen.getByText("Este campo es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("Agregá al menos un equipo.")).toBeInTheDocument();
    expect(bd.commit).not.toHaveBeenCalled();
  });

  it("no agrega un equipo a medio llenar, y dice qué le falta a cada campo", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByRole("button", { name: "Agregar equipo" }));

    expect(screen.getByText("Elegí o escribí un equipo.")).toBeInTheDocument();
    expect(screen.getByText("Cantidad inválida.")).toBeInTheDocument();
    expect(screen.getByText("Días inválidos.")).toBeInTheDocument();
    expect(screen.getByText("Precio inválido.")).toBeInTheDocument();
  });
});

describe("FacturaFormDialog — crear", () => {
  it("guarda la factura, calcula la entrega de cada equipo y actualiza al cliente", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("N° de factura"), "1600");
    await cargarEquipo(usuario);
    await usuario.click(botonGuardar());

    expect(bd.set).toHaveBeenCalledTimes(1);
    const [ruta, documento] = bd.set.mock.calls[0];
    expect(ruta).toBe("clientes/cli1/facturas/nueva");
    expect(documento.factura.numeroFactura).toBe("1600");

    // El documento nace con sus cuatro nodos y nada suelto en la raíz.
    expect(Object.keys(documento).sort()).toEqual([
      "abonos",
      "entregas",
      "factura",
      "grupos",
      "gestiones",
    ].sort());

    // Un solo despacho, el del alta, con el equipo adentro.
    expect(documento.grupos).toHaveLength(1);
    expect(documento.grupos[0].grupo).toBe("grupo-inicial");

    // El equipo queda con lo que se cargó y con su fecha de entrega YA
    // calculada: despacho + días − 1. Nadie la digita.
    expect(documento.grupos[0].equipos).toHaveLength(1);
    expect(documento.grupos[0].equipos[0]).toMatchObject({
      nombre: "ANDAMIO",
      cantidadEquipos: 4,
      diasAlquilados: 3,
      valorDia: 20000,
      fechaDespacho: "2026-08-10",
    });

    // El nodo `factura` no lleva plata: el subtotal, el IVA y el total se
    // calculan al mostrarlos, porque suben solos con cada día que un equipo
    // sigue afuera. Guardados, mentían al día siguiente.
    expect(documento.factura).not.toHaveProperty("subtotal");
    expect(documento.factura).not.toHaveProperty("valorIva");
    expect(documento.factura).not.toHaveProperty("total");

    // Y el tipo de pago es del despacho, no de la factura: el alta puede ir
    // pagada y el lote que se agregue después quedar a deber.
    expect(documento.factura).not.toHaveProperty("tipoPago");
    expect(documento.grupos[0].pagos.tipoPago).toBeTruthy();

    // Y la marca del IVA queda en cada equipo, no arriba.
    expect(documento.factura).not.toHaveProperty("aplicaIva");
    expect(documento.factura).not.toHaveProperty("valorIva");
    expect(documento.grupos[0].equipos[0]).toHaveProperty("aplicaIva");

    // Nace abierta: se emitió y todavía no se pagó ni se devolvió nada.
    expect(documento.factura.cerrada).toBe(false);

    // El estado del cliente sí se guarda, para que la lista pueda filtrar sin
    // leer las facturas de todos.
    expect(bd.update).toHaveBeenCalledWith("clientes/cli1", {
      estado: expect.any(String),
    });
    expect(bd.commit).toHaveBeenCalledTimes(1);
  });

  it("el saldo no se guarda: solo los hechos", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("N° de factura"), "1601");
    await cargarEquipo(usuario);
    await usuario.click(botonGuardar());

    const [, documento] = bd.set.mock.calls[0];
    // Ni el saldo ni el estado ni lo pagado acumulado: se calculan al mostrar.
    expect(documento.factura).not.toHaveProperty("saldoPendiente");
    expect(documento.factura).not.toHaveProperty("estado");
    expect(documento.factura).not.toHaveProperty("montoPagado");
  });
});

describe("FacturaFormDialog — los medios de pago", () => {
  it("lo que el cliente entregó de más se guarda como abono, no como pago", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("N° de factura"), "1602");
    await cargarEquipo(usuario);
    // 4 x 3 x 20.000 + IVA = 285.600, y el cliente entrega 300.000: sobran
    // 14.400.
    await usuario.click(screen.getByRole("combobox", { name: "Tipo de pago" }));
    await usuario.click(screen.getByRole("option", { name: "Parcial" }));
    await usuario.click(screen.getByRole("combobox", { name: "Medio de pago" }));
    await usuario.click(screen.getByRole("option", { name: "Efectivo" }));
    await usuario.type(screen.getByLabelText("Monto"), "300000");
    await usuario.click(botonGuardar());

    const [, documento] = bd.set.mock.calls[0];
    // El pago queda recortado justo hasta cubrir el total…
    const { medios } = documento.grupos[0].pagos;
    expect(medios.reduce((suma, pago) => suma + Number(pago.monto), 0)).toBe(285600);
    // …y el sobrante pasa a ser un abono con la fecha de la factura. Lo dedujo
    // la app del pago, así que el tipo es "sistema".
    expect(documento.abonos).toEqual([
      { fecha: documento.factura.fechaCreacion, medio: "Efectivo", monto: 14400, tipo: "sistema" },
    ]);
  });

  // Con pago TOTAL los medios tienen que sumar una cifra conocida, así que al
  // escribir uno el otro absorbe la diferencia. Con PARCIAL no: el cliente
  // entrega lo que puede, y completarle el segundo medio le inventaba plata
  // que nadie recibió.
  it("en Parcial, escribir un medio no le pone monto al otro", async () => {
    const { usuario } = abrir();
    await cargarEquipo(usuario);

    await usuario.click(screen.getByRole("combobox", { name: "Tipo de pago" }));
    await usuario.click(screen.getByRole("option", { name: "Parcial" }));

    await usuario.click(screen.getByRole("button", { name: "Medio de pago" }));

    const montos = screen.getAllByLabelText("Monto");
    expect(montos).toHaveLength(2);

    // Menos que el total (4 x 3 x 20.000 + IVA = 285.600), que es de lo que
    // se trata un pago parcial. Con el reparto viejo el segundo medio se
    // completaba solo con los 185.600 que faltaban.
    await usuario.type(montos[0], "100000");

    expect(montos[0]).toHaveValue("100.000");
    expect(montos[1]).toHaveValue("");
  });

  // "Pago con abono" es entregar MÁS de lo que vale: eso pasa al agregarle un
  // equipo a una factura viva, no al emitirla. Vive en AgregarEquipoDialog.
  it("no ofrece Pago con abono al emitir una factura", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByRole("combobox", { name: "Tipo de pago" }));

    expect(screen.getByRole("option", { name: "Pago total" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Parcial" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sin pago" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Pago con abono" })).toBeNull();
  });
});
