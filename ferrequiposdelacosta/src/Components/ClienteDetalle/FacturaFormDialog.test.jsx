import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import FacturaFormDialog from "./FacturaFormDialog";
import { unEquipo, unEquipoDevuelto, unaFactura } from "../../test/facturas";

// El formulario de alta y edición de una factura: el más grande de la app y el
// que decide qué queda escrito en la base sobre la plata de un alquiler.
//
// Lo que se fija acá no son las cuentas —eso ya está probado en
// facturaCuentas.test.js— sino las decisiones de este formulario:
//
//   · qué NO deja guardar,
//   · qué escribe exactamente al crear y al editar,
//   · que lo entregado de más se guarde como abono y no como pago,
//   · y que un equipo con historia encima no se pueda sacar de la lista.
const bd = vi.hoisted(() => ({
  updateDoc: vi.fn(() => Promise.resolve()),
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
  updateDoc: bd.updateDoc,
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

// El botón final cambia de nombre según el modo: "Crear Factura" al dar de alta
// y "Guardar Cambios" al editar. Se busca por los dos para que las pruebas no
// tengan que saber en cuál están.
const botonGuardar = () =>
  screen.getByRole("button", { name: /Crear Factura|Guardar Cambios/ });

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
      fechaVencimiento: "2026-08-12",
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

describe("FacturaFormDialog — editar", () => {
  const andamio = (extra = {}) =>
    unEquipo({
      nombre: "ANDAMIO",
      cantidad: 4,
      dias: 3,
      valorDia: 20000,
      fechaDespacho: "2026-08-01",
      fechaVencimiento: "2026-08-03",
      ...extra,
    });

  const existente = ({ equipos = [andamio()], ...resto } = {}) => ({
    id: "f1",
    ...unaFactura({
      numeroFactura: "1573",
      fechaCreacion: "2026-08-01",
      subtotal: 240000,
      total: 240000,
      equipos,
      ...resto,
    }),
  });

  const facturaExistente = existente();

  it("abre con los datos cargados y actualiza la factura que ya existe", async () => {
    const { usuario } = abrir({ factura: facturaExistente });

    expect(screen.getByLabelText("N° de factura")).toHaveValue("1573");

    await usuario.clear(screen.getByLabelText("N° de factura"));
    await usuario.type(screen.getByLabelText("N° de factura"), "1574");
    await usuario.click(botonGuardar());

    // Editar actualiza; no crea otra factura ni toca el estado del cliente
    // (de eso se encarga el servidor cuando la factura cambia).
    expect(bd.set).not.toHaveBeenCalled();
    const [ruta, documento] = bd.updateDoc.mock.calls[0];
    expect(ruta).toBe("clientes/cli1/facturas/f1");
    expect(documento.factura.numeroFactura).toBe("1574");
  });

  it("lo que el cliente entregó de más se guarda como abono, no como pago", async () => {
    // Total 240.000 y el cliente entregó 300.000: sobran 60.000.
    const { usuario } = abrir({
      factura: existente({
        tipoPago: "conAbono",
        pagos: [{ medio: "Efectivo", monto: 300000 }],
      }),
    });

    await usuario.click(botonGuardar());

    const [, documento] = bd.updateDoc.mock.calls[0];
    // El pago queda recortado justo hasta cubrir el total…
    const { medios } = documento.grupos[0].pagos;
    expect(medios.reduce((suma, p) => suma + Number(p.monto), 0)).toBe(240000);
    // …y el sobrante pasa a ser un abono con la fecha de la factura. Lo dedujo
    // la app del pago, así que el tipo es "sistema".
    expect(documento.abonos).toEqual([
      { fecha: "2026-08-01", medio: "Efectivo", monto: 60000, tipo: "sistema" },
    ]);
  });

  // El botón de quitar un equipo es el del bote de basura, sin texto: se lo
  // ubica por su ícono. El primero de la pantalla es el del equipo, que se
  // dibuja antes que los medios de pago.
  const botonQuitarEquipo = () => screen.getAllByTestId("DeleteIcon")[0].closest("button");

  it("un equipo sin historia sí se puede sacar", () => {
    abrir({ factura: facturaExistente });

    expect(botonQuitarEquipo()).toBeEnabled();
  });

  it("pero uno con una devolución registrada queda bloqueado", () => {
    // Quitarlo perdería esa historia sin dejar rastro: es la única forma que
    // tiene este formulario de "editar" un equipo.
    abrir({
      factura: existente({
        equipos: [
          unEquipoDevuelto({
            nombre: "ANDAMIO",
            cantidad: 4,
            dias: 3,
            valorDia: 20000,
            fechaDespacho: "2026-08-01",
            fechaVencimiento: "2026-08-03",
            fechaDevolucion: "2026-08-03",
          }),
        ],
      }),
    });

    expect(botonQuitarEquipo()).toBeDisabled();
  });
});

describe("FacturaFormDialog — los medios de pago", () => {
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
