import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import { formatearMoneda } from "../../Utils/formato";
import DetalleCotizaciones from "./DetalleCotizaciones";
import DetalleCuentasCobro from "./DetalleCuentasCobro";
import DetalleCatalogo from "./DetalleCatalogo";

// La plata como la deja toHaveTextContent: el espacio especial del formato
// queda como un espacio común.
const plata = (monto) => formatearMoneda(monto).replace(/\s+/g, " ");

// Los detalles de Cotizaciones, Cuentas de cobro y el catálogo. Lo que importa:
// que el total al pie sea el mismo número del recuadro, y que un mes sin nada
// no se confunda con una pizarra que todavía no tiene el dato.
describe("DetalleCotizaciones", () => {
  it("por atender, cotizadas y el total", () => {
    const { container } = renderConProviders(
      <DetalleCotizaciones cotizacionesMes={{ total: 12, cotizadas: 9, porAtender: 3 }} />,
    );

    expect(container).toHaveTextContent("Por atender3Cotizadas9Total12");
  });

  it("un mes sin cotizaciones lo dice", () => {
    renderConProviders(
      <DetalleCotizaciones cotizacionesMes={{ total: 0, cotizadas: 0, porAtender: 0 }} />,
    );

    expect(screen.getByText("Todavía no hay cotizaciones este mes.")).toBeInTheDocument();
  });

  it("si la pizarra todavía no tiene el dato, avisa", () => {
    renderConProviders(<DetalleCotizaciones cotizacionesMes={null} />);

    expect(screen.getByText("El detalle todavía no está listo.")).toBeInTheDocument();
  });
});

describe("DetalleCuentasCobro", () => {
  it("por cobrar y pagadas, cada una con su plata, y el total", () => {
    const { container } = renderConProviders(
      <DetalleCuentasCobro
        cuentasCobroMes={{
          total: 4,
          monto: 2750000,
          porCobrar: 2,
          montoPorCobrar: 1800000,
          pagadas: 2,
          montoPagadas: 950000,
        }}
      />,
    );

    expect(container).toHaveTextContent(
      `Por cobrar2 · ${plata(1800000)}` +
        `Pagadas2 · ${plata(950000)}` +
        `Total4 · ${plata(2750000)}`,
    );
  });

  it("un mes sin cuentas emitidas lo dice", () => {
    renderConProviders(
      <DetalleCuentasCobro
        cuentasCobroMes={{
          total: 0,
          monto: 0,
          porCobrar: 0,
          montoPorCobrar: 0,
          pagadas: 0,
          montoPagadas: 0,
        }}
      />,
    );

    expect(
      screen.getByText("Todavía no hay cuentas de cobro emitidas este mes."),
    ).toBeInTheDocument();
  });

  it("si la pizarra todavía no tiene el dato, avisa", () => {
    renderConProviders(<DetalleCuentasCobro cuentasCobroMes={null} />);

    expect(screen.getByText("El detalle todavía no está listo.")).toBeInTheDocument();
  });
});

describe("DetalleCatalogo", () => {
  it("los nombres por orden alfabético, con el total", () => {
    const { container } = renderConProviders(
      <DetalleCatalogo
        equipos={[{ name: "MEZCLADORA" }, { name: " ANDAMIO " }, { name: "" }]}
      />,
    );

    expect(container).toHaveTextContent("ANDAMIOMEZCLADORASin nombreTotal3");
  });

  it("mientras baja el catálogo, lo dice", () => {
    renderConProviders(<DetalleCatalogo equipos={null} />);

    expect(screen.getByText("Cargando el catálogo…")).toBeInTheDocument();
  });

  it("sin equipos, lo dice", () => {
    renderConProviders(<DetalleCatalogo equipos={[]} />);

    expect(screen.getByText("No hay equipos en el catálogo.")).toBeInTheDocument();
  });
});
