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

const mostrar = (facturas = [facturaVencida], datosCliente = cliente) =>
  renderConProviders(
    <ClienteSeguimientoCard cliente={datosCliente} facturas={facturas} hoy={HOY} />,
  );

const botonWhatsapp = () =>
  screen.getAllByTestId("WhatsAppIcon")[0].closest("button");

beforeEach(() => {
  abrirWhatsapp.mockClear();
});

describe("ClienteSeguimientoCard — lo que muestra", () => {
  it("dice de quién es la deuda y por qué factura", () => {
    mostrar();

    expect(screen.getByText("Aida Pérez")).toBeInTheDocument();
    expect(screen.getByText(/1573/)).toBeInTheDocument();
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
