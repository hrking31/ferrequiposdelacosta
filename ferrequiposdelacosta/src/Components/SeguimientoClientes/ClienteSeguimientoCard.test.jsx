import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import ClienteSeguimientoCard from "./ClienteSeguimientoCard";
import {
  unEquipo,
  unEquipoDevuelto,
  unaFactura,
} from "../../test/facturas";

// La tarjeta de cartera: un cliente al que hay que cobrarle, con la factura que
// lo tiene ahí y lo que se puede hacer para destrabarla.
//
// Lo más valioso de probar es el RECORDATORIO DE WHATSAPP: hay un texto
// distinto según la gestión de esa factura, porque no es lo mismo escribirle a
// quien no contesta que a quien ya devolvió todo y solo debe plata. Ese texto
// se arma adentro del componente, así que se lo verifica por donde sale: lo que
// recibe abrirWhatsapp al tocar el botón.
const abrirWhatsapp = vi.hoisted(() => vi.fn());
vi.mock("../../Utils/whatsapp", async (importarOriginal) => ({
  ...(await importarOriginal()),
  abrirWhatsapp,
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db, ...partes) => partes.join("/"),
  updateDoc: vi.fn(() => Promise.resolve()),
  collection: (_db, ...partes) => partes.join("/"),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  writeBatch: () => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) }),
}));

const HOY = "2026-08-20";

const cliente = {
  id: "cli1",
  tipo: "persona",
  nombres: "Aida",
  apellido: "Pérez",
  telefono: "3116576633",
};

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

const facturaCon = (extra = {}) => ({
  id: "f1",
  ...unaFactura({
    numeroFactura: "1573",
    fechaCreacion: "2026-08-01",
    subtotal: 300000,
    total: 300000,
    equipos: [andamio()],
    ...extra,
  }),
});

// Vencida hace rato, sin pagar y con el equipo todavía afuera.
const facturaVencida = facturaCon();

// Ya devolvió todo, pero quedó debiendo: esto es cobranza pura. Volvió el 05,
// dos días después de vencer, así que estuvo 5 días afuera.
const facturaEnCobro = facturaCon({
  equipos: [
    unEquipoDevuelto({
      nombre: "ANDAMIO",
      cantidad: 5,
      dias: 5,
      valorDia: 20000,
      fechaDespacho: "2026-08-01",
      fechaVencimiento: "2026-08-03",
      fechaDevolucion: "2026-08-05",
    }),
  ],
});

// Sigue vencida por el ANDAMIO que no volvió, pero la MEZCLADORA el cliente la
// devolvió antes de que se venciera: esa devolución no fue cobranza.
const facturaConDevueltoEnPlazo = facturaCon({
  equipos: [
    andamio(),
    unEquipoDevuelto({
      nombre: "MEZCLADORA",
      cantidad: 1,
      dias: 4,
      valorDia: 50000,
      fechaDespacho: "2026-08-01",
      fechaVencimiento: "2026-08-06",
      fechaDevolucion: "2026-08-04",
    }),
  ],
});

// Vencida por UN gato, con seis mezcladoras agregadas después que todavía
// están en plazo. Son 7 equipos afuera, pero solo 1 se le puede reclamar hoy.
const facturaConEquiposEnPlazo = facturaCon({
  equipos: [
    unEquipo({
      nombre: "GATO",
      cantidad: 1,
      dias: 3,
      valorDia: 20000,
      fechaDespacho: "2026-08-01",
      fechaVencimiento: "2026-08-03",
    }),
    unEquipo({
      nombre: "MEZCLADORA",
      cantidad: 6,
      dias: 10,
      valorDia: 30000,
      fechaDespacho: "2026-08-15",
      fechaVencimiento: "2026-09-15",
    }),
  ],
});

// Devolvió 4 de los 5 andamios y le queda uno afuera, ya vencido.
const facturaParcial = facturaCon({
  equipos: [andamio({ cantidad: 1 })],
  gestiones: [{ tipo: "devolucionParcial", unidades: 4, fecha: "2026-08-10" }],
});

// Le renovaron el equipo hasta 2099, así que ya no hay nada vencido, pero
// sigue debiendo lo de antes de esa renovación.
const facturaRenovada = facturaCon({
  equipos: [
    andamio({
      fechaVencimiento: "2099-01-01",
      ampliaciones: [{ diasAmpliados: 30, descuentoRealizado: 0 }],
    }),
  ],
});

const mostrar = (facturas = [facturaVencida], datosCliente = cliente) =>
  renderConProviders(
    <ClienteSeguimientoCard cliente={datosCliente} facturas={facturas} hoy={HOY} />,
  );

const botonWhatsapp = () =>
  screen.getAllByTestId("WhatsAppIcon")[0].closest("button");

const botonAbono = () =>
  screen.getAllByTestId("AttachMoneyIcon")[0].closest("button");

// Las facturas arrancan plegadas —de un cliente con varias se ve la lista de un
// vistazo—, así que el detalle de equipos ni se dibuja hasta desplegarla. Sin
// esto, una prueba que busca lo que NO debe aparecer pasa siempre.
const desplegarFactura = (usuario) =>
  usuario.click(screen.getByRole("button", { name: "Mostrar factura" }));

beforeEach(() => {
  abrirWhatsapp.mockClear();
});

describe("ClienteSeguimientoCard — lo que muestra", () => {
  it("dice de quién es la deuda y por qué factura", () => {
    mostrar();

    expect(screen.getByText("Aida Pérez")).toBeInTheDocument();
    expect(screen.getByText(/1573/)).toBeInTheDocument();
  });

  // La barra de valores es la MISMA que la del encabezado del cliente en su
  // ficha: sale de casillasDeCuenta y renderPizarraTotales, no se arma acá.
  // Así la misma cuenta no puede mostrarse de dos formas según la pantalla.
  it("muestra la barra con los cuatro valores de la cuenta", async () => {
    const { usuario } = mostrar();
    await desplegarFactura(usuario);

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getByText("Abonos")).toBeInTheDocument();
    expect(screen.getByText("Saldo")).toBeInTheDocument();
  });

  // Cartera cuenta lo que se consiguió cobrando. Un equipo que volvió después
  // de vencer es exactamente eso.
  it("muestra lo que el cliente devolvió después de vencer", async () => {
    const { usuario } = mostrar([facturaEnCobro]);
    await desplegarFactura(usuario);

    expect(screen.getByText("Devuelto")).toBeInTheDocument();
  });

  // Y lo contrario: la factura entró a Seguimiento con los equipos que
  // QUEDARON. Mostrar los que ya habían vuelto obliga a quien cobra a
  // preguntarse cuándo y por qué volvieron, y eso no pasó en esta pantalla.
  // La factura entra a cartera por lo que venció. Un equipo agregado después,
  // todavía en fecha, no se le puede reclamar hoy: verlo acá hace preguntarse
  // por qué aparece algo que nadie tiene que devolver.
  it("no muestra los equipos que todavía están en plazo", async () => {
    const { usuario } = mostrar([facturaConEquiposEnPlazo]);
    await desplegarFactura(usuario);

    expect(screen.getByText(/GATO/)).toBeInTheDocument();
    expect(screen.queryByText(/MEZCLADORA/)).not.toBeInTheDocument();
  });

  // Le renovaron el único equipo vencido: ya no hay nada que reclamar, pero la
  // factura sigue en cartera porque debe plata de antes de esa renovación. Sin
  // el aviso, la tarjeta quedaba en blanco y no había forma de saber por qué
  // seguía acá.
  it("dice por qué sigue en cartera cuando ya no hay equipos vencidos", async () => {
    const { usuario } = mostrar([facturaRenovada]);
    await desplegarFactura(usuario);

    expect(screen.getByText("Sin equipos vencidos")).toBeInTheDocument();
    // Lo exigible hoy son los días que el equipo YA estuvo afuera: 5 andamios
    // a $20.000 desde el 01 hasta el 20 de agosto, o sea 20 días. Los que se
    // le acaban de conceder los está usando y se cobran cuando devuelva.
    //
    // Antes este número salía del total GUARDADO de la factura, que no llevaba
    // ni las ampliaciones ni los días vencidos: en la 1234 decía $144.440
    // donde el cliente debía $1.727.140, y con pagar esos $144.440 la factura
    // salía de cartera debiendo el resto.
    expect(screen.getByText(/Sigue en cartera por el saldo de/)).toHaveTextContent(
      "2.000.000",
    );
    // Y dice de qué saldo habla: no es el saldo pendiente de la cuenta, que
    // incluye los días recién concedidos, sino lo que debía antes.
    expect(screen.getByText(/Sigue en cartera por el saldo de/)).toHaveTextContent(
      "deuda antes de la ampliación",
    );
  });

  // Cada lote agregado sale con su propio flete y su propio depósito, y la
  // factura los cobra todos. Leyendo el campo suelto de la factura, esta
  // pantalla mostraba solo los del primer despacho: decía una cifra mientras
  // la cuenta usaba otra.
  it("con todos los equipos vencidos afuera, no muestra ese aviso", async () => {
    const { usuario } = mostrar();
    await desplegarFactura(usuario);

    expect(screen.queryByText("Sin equipos vencidos")).not.toBeInTheDocument();
  });

  it("no muestra lo que el cliente había devuelto en plazo", async () => {
    const { usuario } = mostrar([facturaConDevueltoEnPlazo]);
    await desplegarFactura(usuario);

    // El ANDAMIO sí está: es el que la tiene en cartera.
    expect(screen.getByText(/ANDAMIO/)).toBeInTheDocument();
    expect(screen.queryByText(/MEZCLADORA/)).not.toBeInTheDocument();
    expect(screen.queryByText("Devuelto")).not.toBeInTheDocument();
  });

  it("sin un teléfono usable no ofrece escribirle: no hay a dónde", () => {
    // Cuando el cliente no dio teléfono se carga un código —"SN", "NT",
    // "N/A"—, no un número inventado. Eso es lo que la tarjeta reconoce como
    // "no tiene".
    mostrar([facturaVencida], { ...cliente, telefono: "SN" });

    expect(screen.queryByTestId("WhatsAppIcon")).not.toBeInTheDocument();
  });
});

describe("ClienteSeguimientoCard — el recordatorio de WhatsApp", () => {
  it("le escribe al número del cliente, no al de la empresa", async () => {
    const { usuario } = mostrar();

    await usuario.click(botonWhatsapp());

    expect(abrirWhatsapp).toHaveBeenCalledTimes(1);
    expect(abrirWhatsapp.mock.calls[0][0]).toBe("3116576633");
  });

  it("al que todavía tiene equipos afuera le habla de la devolución", async () => {
    const { usuario } = mostrar();

    await usuario.click(botonWhatsapp());

    const mensaje = abrirWhatsapp.mock.calls[0][1];
    expect(mensaje).toContain("Aida Pérez");
    expect(mensaje).toContain("1573");
    expect(mensaje).toMatch(/devoluci[óo]n/i);
  });

  it("al que ya devolvió todo solo se le cobra: no se le menciona devolver", async () => {
    const { usuario } = mostrar([facturaEnCobro]);

    await usuario.click(botonWhatsapp());

    const mensaje = abrirWhatsapp.mock.calls[0][1];
    expect(mensaje).toContain("Ya recibimos todos los equipos");
    expect(mensaje).toContain("solo queda pendiente el pago");
  });

  // El caso real: una factura vencida por UN equipo, con seis agregados
  // después que todavía están en plazo. El mensaje le reclamaba los siete.
  it("solo le reclama los equipos vencidos, no los que siguen en plazo", async () => {
    const { usuario } = mostrar([facturaConEquiposEnPlazo]);

    await usuario.click(botonWhatsapp());

    const mensaje = abrirWhatsapp.mock.calls[0][1];
    expect(mensaje).toContain("1 equipo pendiente de devolución");
    expect(mensaje).not.toContain("7 equipos");
  });

  // "Todavía quedan 1 equipo" no concuerda. Con un equipo suelto es el caso
  // más común al final de una devolución parcial, así que se lee seguido.
  it("al que devolvió una parte le habla con el verbo concordado", async () => {
    const { usuario } = mostrar([facturaParcial]);

    await usuario.click(botonWhatsapp());

    const mensaje = abrirWhatsapp.mock.calls[0][1];
    expect(mensaje).toContain("Todavía tienes 1 equipo pendiente de devolución");
    expect(mensaje).not.toContain("quedan 1 equipo");
  });

  it("el mensaje trae el saludo y la despedida de la empresa", async () => {
    const { usuario } = mostrar();

    await usuario.click(botonWhatsapp());

    const mensaje = abrirWhatsapp.mock.calls[0][1];
    expect(mensaje).toContain("👋 Hola, Aida Pérez.");
    expect(mensaje).toContain("Gracias por confiar en Ferrequipos de la Costa.");
  });
});

describe("ClienteSeguimientoCard — lo que se puede hacer desde cartera", () => {
  it("ofrece registrar la llamada, ampliar el vencimiento y registrar la devolución", () => {
    mostrar();

    // Son botones de solo ícono; se los ubica por el ícono de MUI.
    expect(screen.getAllByTestId("PhoneIcon").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("UpdateIcon").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("AssignmentReturnIcon").length).toBeGreaterThan(0);
  });

  // A un cliente que no debe nada no se le registra un abono: no habría entre
  // qué facturas repartirlo. El botón se apaga en vez de esconderse, para que
  // el globo pueda decir por qué.
  //
  // Esto prueba la REGLA, no que el botón esté: si desapareciera, la prueba
  // fallaría igual porque no lo encontraría.
  it("con el cliente al día no deja registrar un abono", () => {
    const pagada = facturaCon({ pagos: [{ medio: "Efectivo", monto: 9999999 }] });

    mostrar([pagada]);

    expect(botonAbono()).toBeDisabled();
  });
});
