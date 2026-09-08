import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import ReporteFacturasDialog from "./ReporteFacturasDialog";
import { unEquipo, unaFactura } from "../../test/facturas";

// El único botón de PDF de la ficha del cliente pasa por acá, y lo que se
// prueba es la DECISIÓN: con una factura marcada sale el documento completo de
// esa factura; con dos o más, el estado de cuenta. Antes eran dos botones
// distintos y el de cada tarjeta era el mismo documento por otro camino.
//
// Los dos generadores van como dobles: armarlos de verdad abriría jsPDF, que no
// aporta nada a esto.
const generarFactura = vi.hoisted(() => vi.fn());
const generarEstadoDeCuenta = vi.hoisted(() => vi.fn());
vi.mock("../VistaPdf/VistaFacturaPdf", () => ({ default: generarFactura }));
vi.mock("../VistaPdf/VistaReporteClientePdf", () => ({
  default: generarEstadoDeCuenta,
}));

const cliente = { id: "cli1", tipo: "persona", nombres: "Aida", apellido: "Pérez" };

const factura = (numero) => ({
  id: `f-${numero}`,
  ...unaFactura({
    numeroFactura: numero,
    fechaCreacion: "2026-08-01",
    equipos: [unEquipo({ nombre: "ANDAMIO", cantidad: 1, dias: 3, valorDia: 100000 })],
  }),
});

const dosFacturas = [factura("1234"), factura("1235")];

const abrir = (facturas = dosFacturas) =>
  renderConProviders(
    <ReporteFacturasDialog
      open
      onClose={() => {}}
      cliente={cliente}
      facturas={facturas}
    />,
  );

const generar = (usuario) =>
  usuario.click(screen.getByRole("button", { name: "Generar PDF" }));

beforeEach(() => {
  generarFactura.mockClear();
  generarEstadoDeCuenta.mockClear();
});

describe("ReporteFacturasDialog — qué documento arma", () => {
  it("con varias marcadas arma el estado de cuenta", async () => {
    // Arrancan todas marcadas.
    const { usuario } = abrir();

    await generar(usuario);

    expect(generarEstadoDeCuenta).toHaveBeenCalledWith({
      cliente,
      facturas: dosFacturas,
    });
    expect(generarFactura).not.toHaveBeenCalled();
  });

  it("con una sola marcada arma la factura completa", async () => {
    const { usuario } = abrir();

    // Se desmarca la segunda: queda una.
    await usuario.click(screen.getByText("Factura 1235 · 01/08/2026"));
    await generar(usuario);

    expect(generarFactura).toHaveBeenCalledWith({
      factura: dosFacturas[0],
      cliente,
    });
    expect(generarEstadoDeCuenta).not.toHaveBeenCalled();
  });

  it("un cliente con una sola factura baja esa factura, no un estado de cuenta", async () => {
    const { usuario } = abrir([dosFacturas[0]]);

    await generar(usuario);

    expect(generarFactura).toHaveBeenCalledWith({
      factura: dosFacturas[0],
      cliente,
    });
    expect(generarEstadoDeCuenta).not.toHaveBeenCalled();
  });
});
