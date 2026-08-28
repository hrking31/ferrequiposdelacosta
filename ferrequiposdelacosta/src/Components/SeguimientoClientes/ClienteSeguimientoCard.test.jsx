import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import ClienteSeguimientoCard from "./ClienteSeguimientoCard";

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

// Vencida hace rato, sin pagar y con el equipo todavía afuera.
const facturaVencida = {
  id: "f1",
  numeroFactura: 1573,
  fecha: "2026-08-01",
  aplicaIva: false,
  subtotal: 300000,
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

// Ya devolvió todo, pero quedó debiendo: esto es cobranza pura.
const facturaEnCobro = {
  ...facturaVencida,
  equipos: [
    {
      ...facturaVencida.equipos[0],
      cantidadDevuelta: 5,
      fechaDevolucion: "2026-08-05",
    },
  ],
};

// Sigue vencida por el ANDAMIO que no volvió, pero la MEZCLADORA el cliente la
// devolvió antes de que se venciera: esa devolución no fue cobranza.
const facturaConDevueltoEnPlazo = {
  ...facturaVencida,
  equipos: [
    facturaVencida.equipos[0],
    {
      nombre: "MEZCLADORA",
      cantidad: 1,
      dias: 3,
      valor: 50000,
      fechaDespacho: "2026-08-01",
      fechaVencimiento: "2026-08-06",
      cantidadDevuelta: 1,
      fechaDevolucion: "2026-08-04",
    },
  ],
};

// Vencida por UN gato, con seis mezcladoras agregadas después que todavía
// están en plazo. Son 7 equipos afuera, pero solo 1 se le puede reclamar hoy.
const facturaConEquiposEnPlazo = {
  ...facturaVencida,
  equipos: [
    {
      nombre: "GATO",
      cantidad: 1,
      dias: 3,
      valor: 20000,
      fechaDespacho: "2026-08-01",
      fechaVencimiento: "2026-08-03",
    },
    {
      nombre: "MEZCLADORA",
      cantidad: 6,
      dias: 10,
      valor: 30000,
      fechaDespacho: "2026-08-15",
      fechaVencimiento: "2026-09-15",
    },
  ],
};

// Devolvió 4 de los 5 andamios y le queda uno afuera, ya vencido.
const facturaParcial = {
  ...facturaVencida,
  equipos: [{ ...facturaVencida.equipos[0], cantidad: 1 }],
  gestiones: [{ tipo: "parcial", unidades: 4, fecha: "2026-08-10" }],
};

const mostrar = (facturas = [facturaVencida], datosCliente = cliente) =>
  renderConProviders(
    <ClienteSeguimientoCard cliente={datosCliente} facturas={facturas} hoy={HOY} />,
  );

const botonWhatsapp = () =>
  screen.getAllByTestId("WhatsAppIcon")[0].closest("button");

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
});
