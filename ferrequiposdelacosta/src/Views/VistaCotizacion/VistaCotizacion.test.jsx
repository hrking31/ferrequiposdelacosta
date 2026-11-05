import { act, fireEvent, screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import VistaCotizacion from "./VistaCotizacion";

// EL DOBLE CLIC EN "DESCARGAR PDF" (2026-11-04). Una cotización nueva no tiene
// id, así que cada guardado crea un documento: dos clics seguidos dejaban dos
// cotizaciones con el mismo número en el buzón (TOIN S.A.S, JF & MV).
const datos = vi.hoisted(() => ({
  guardar: vi.fn(),
  pdf: vi.fn(),
  whatsapp: vi.fn(),
}));

vi.mock("../../Components/AdminCotizaciones/cotizacionesDb", () => ({
  guardarCotizacion: datos.guardar,
  liberarCotizacion: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../Components/VistaPdf/VistaCotPdf", () => ({ default: datos.pdf }));
vi.mock("../../Utils/whatsapp", () => ({ abrirWhatsapp: datos.whatsapp }));
vi.mock("../../Context/useAuth", () => ({
  useAuth: () => ({ logout: vi.fn(), user: null, loading: false }),
}));

const cotizacionNueva = {
  id: null,
  cotizacionId: "COT-1",
  tipo: "persona",
  telefono: "3001234567",
  items: [{ description: "RANA", quantity: 1, price: 100000, day: 1, subtotal: "$ 100.000" }],
};

const abrir = () =>
  renderConProviders(<VistaCotizacion />, {
    estadoInicial: { cotizacion: { value: cotizacionNueva, original: cotizacionNueva } },
  });

// En el computador es un ícono: se reconoce por el dibujo del PDF.
const botonDescargar = () => screen.getByTestId("PictureAsPdfIcon").closest("button");

describe("Descargar PDF de una cotización", () => {
  it("con doble clic guarda una sola cotización y saca un solo PDF", async () => {
    let terminarDeGuardar;
    datos.guardar.mockReturnValue(
      new Promise((resolver) => {
        terminarDeGuardar = resolver;
      }),
    );
    abrir();

    const boton = botonDescargar();
    fireEvent.click(boton);
    fireEvent.click(boton);

    expect(datos.guardar).toHaveBeenCalledTimes(1);
    expect(datos.whatsapp).toHaveBeenCalledTimes(1);
    expect(botonDescargar()).toBeDisabled();

    await act(async () => {
      terminarDeGuardar({ ...cotizacionNueva, id: "doc1" });
    });

    expect(datos.pdf).toHaveBeenCalledTimes(1);
  });
});
