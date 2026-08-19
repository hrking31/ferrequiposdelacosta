import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import VistaCart from "./VistaCart";

// El carrito de la tienda: donde el cliente termina su pedido. Al enviarlo
// pasan dos cosas, y el ORDEN importa: primero se abre WhatsApp —tiene que
// ocurrir dentro del mismo toque, o el celular lo trata como ventana emergente
// y termina en WhatsApp Web— y después se manda la solicitud al servidor.
//
// Acá se prueban las dos, y que el mensaje lleve lo que el cliente pidió.
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
        // El carrito muestra la foto del equipo. Siempre hay al menos una:
        // el alta del catálogo no deja crear un equipo sin imagen.
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
      otrosDatos: "Portón azul",
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

beforeEach(() => {
  vi.clearAllMocks();
  enviarCotizacion.mockResolvedValue();
});

describe("VistaCart — el carrito vacío", () => {
  it("no manda nada ni abre WhatsApp", async () => {
    const { usuario } = renderConProviders(<VistaCart />, {
      estadoInicial: { cart: { items: [] } },
    });

    await enviar(usuario);

    expect(await screen.findByText("No hay equipos en el carrito")).toBeInTheDocument();
    expect(abrirWhatsapp).not.toHaveBeenCalled();
    expect(enviarCotizacion).not.toHaveBeenCalled();
  });
});

describe("VistaCart — con el pedido armado", () => {
  it("abre WhatsApp y manda la solicitud al servidor", async () => {
    const { usuario } = renderConProviders(<VistaCart />, { estadoInicial: conEquipos });

    await enviar(usuario);

    expect(abrirWhatsapp).toHaveBeenCalledTimes(1);
    expect(enviarCotizacion).toHaveBeenCalledTimes(1);
  });

  it("el mensaje de WhatsApp lleva el cliente y lo que pidió", async () => {
    const { usuario } = renderConProviders(<VistaCart />, { estadoInicial: conEquipos });

    await enviar(usuario);

    const mensaje = abrirWhatsapp.mock.calls[0][1];
    expect(mensaje).toContain("Aida Pérez");
    expect(mensaje).toContain("123456");
    expect(mensaje).toContain("ANDAMIO");
    expect(mensaje).toContain("Cantidad: 4");
    expect(mensaje).toContain("Días: 3");
  });

  it("la solicitud que va al servidor lleva los equipos con sus cantidades", async () => {
    const { usuario } = renderConProviders(<VistaCart />, { estadoInicial: conEquipos });

    await enviar(usuario);

    const solicitud = enviarCotizacion.mock.calls[0][0];
    expect(solicitud.empresa).toBe("Aida Pérez");
    expect(solicitud.items).toHaveLength(1);
    expect(solicitud.items[0]).toMatchObject({ quantity: 4, day: 3, price: 20000 });
  });

  it("si el servidor falla, el cliente igual mandó su WhatsApp", async () => {
    // El orden protege al cliente: el mensaje ya salió, así que el pedido no se
    // pierde aunque el guardado falle.
    enviarCotizacion.mockRejectedValue(new Error("sin conexión"));
    const { usuario } = renderConProviders(<VistaCart />, { estadoInicial: conEquipos });

    await enviar(usuario);

    expect(abrirWhatsapp).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Error enviando solicitud")).toBeInTheDocument();
  });
});
