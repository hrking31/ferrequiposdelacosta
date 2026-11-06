import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import KioskCart from "./KioskCart";

// El carrito del kiosco: la pantalla del local, donde el cliente arma su pedido
// estando ahí mismo.
//
// La diferencia con el de la tienda es deliberada y conviene que quede fijada:
// acá NO se abre WhatsApp. El cliente está parado enfrente; no hay a quién
// mandarle el mensaje. La solicitud entra derecho al buzón del personal, y sí
// hace sonar la campana, porque pasa por la misma función del servidor.
const enviarCotizacion = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const abrirWhatsapp = vi.hoisted(() => vi.fn());

vi.mock("../../Utils/whatsapp", async (importarOriginal) => ({
  ...(await importarOriginal()),
  abrirWhatsapp,
}));

vi.mock("../../Components/Firebase/Firebase", () => ({
  functions: {},
  db: {},
  storage: {},
  auth: {},
  database: {},
  // reCAPTCHA se enciende al entrar al carrito (ver Firebase.js). Acá no hay
  // navegador de verdad que lo cargue, así que basta con que exista.
  activarAppCheck: () => Promise.resolve(),
}));
vi.mock("firebase/functions", () => ({
  getFunctions: () => ({}),
  httpsCallable: () => enviarCotizacion,
}));

const conEquipos = {
  cart: {
    items: [
      {
        id: "e1",
        lineId: "e1",
        name: "ANDAMIO",
        description: "Andamio metálico",
        quantity: 4,
        days: 3,
        price: 20000,
        subtotal: 240000,
        images: [{ name: "andamio", url: "https://fotos/andamio.jpg" }],
      },
    ],
  },
  cliente: {
    tipo: "persona",
    nombre: "Aida Pérez",
    telefono: "3116576633",
    identificacion: "123456",
    direccion: {
      detalle: "Calle 1 #2-3",
      otrosDatos: "",
      barrio: "El Prado",
      departamento: "Atlántico",
      municipio: "Barranquilla",
    },
    iva: true,
    deposito: true,
  },
};

const enviar = (usuario) =>
  usuario.click(screen.getByRole("button", { name: "Solicitar Cotización" }));

const mostrar = (estadoInicial) =>
  renderConProviders(<KioskCart />, { ruta: "/kioskcart", estadoInicial });

beforeEach(() => {
  vi.clearAllMocks();
  enviarCotizacion.mockResolvedValue();
});

describe("KioskCart", () => {
  it("con el carrito vacío avisa y no manda nada", async () => {
    const { usuario } = mostrar({ cart: { items: [] } });

    await enviar(usuario);

    expect(await screen.findByText("No hay equipos en el carrito")).toBeInTheDocument();
    expect(enviarCotizacion).not.toHaveBeenCalled();
  });

  it("manda la solicitud con los equipos que el cliente eligió", async () => {
    const { usuario } = mostrar(conEquipos);

    await enviar(usuario);

    expect(await screen.findByText("¡Listo! Tu solicitud llegó")).toBeInTheDocument();
    const solicitud = enviarCotizacion.mock.calls[0][0];
    expect(solicitud.empresa).toBe("Aida Pérez");
    expect(solicitud.items[0]).toMatchObject({ quantity: 4, day: 3, price: 20000 });
  });

  // La tarjeta de cierre (2026-11-06): el teléfono se guarda antes de borrar
  // los datos del cliente, que se limpian para el siguiente.
  it("al enviar, la tarjeta de cierre dice a qué número le escriben", async () => {
    const { usuario, store } = mostrar(conEquipos);

    await enviar(usuario);

    expect(await screen.findByText("Al 3116576633")).toBeInTheDocument();
    expect(store.getState().cart.items).toHaveLength(0);
  });

  it("NO abre WhatsApp: el cliente está en el local", async () => {
    const { usuario } = mostrar(conEquipos);

    await enviar(usuario);

    expect(await screen.findByText("¡Listo! Tu solicitud llegó")).toBeInTheDocument();
    expect(abrirWhatsapp).not.toHaveBeenCalled();
  });

  it("si el servidor falla, lo dice", async () => {
    enviarCotizacion.mockRejectedValue(new Error("sin conexión"));
    const { usuario } = mostrar(conEquipos);

    await enviar(usuario);

    expect(await screen.findByText("Error enviando solicitud")).toBeInTheDocument();
    expect(screen.queryByText("¡Listo! Tu solicitud llegó")).not.toBeInTheDocument();
  });
});
