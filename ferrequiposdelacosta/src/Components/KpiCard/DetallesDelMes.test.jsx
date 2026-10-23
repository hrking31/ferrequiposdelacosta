import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import DetalleCotizaciones from "./DetalleCotizaciones";
import DetalleCuentasCobro from "./DetalleCuentasCobro";
import DetalleCatalogo from "./DetalleCatalogo";

// Los detalles de Cotizaciones, Cuentas de cobro y el catálogo. Lo que importa:
// que vayan todos los estados —también los que están en cero, que es lo que
// los vuelve útiles para revisar—, que el total al pie sea el mismo número del
// recuadro, y que un mes sin nada no se confunda con una pizarra que todavía
// no tiene el dato.
describe("DetalleCotizaciones", () => {
  it("los cuatro estados en orden, con el total", () => {
    const { container } = renderConProviders(
      <DetalleCotizaciones
        cotizacionesMes={{ total: 35, pendientes: 0, pausadas: 0, enProceso: 3, emitidas: 32 }}
      />,
    );

    expect(container).toHaveTextContent(
      "Pendiente0Pausada0En proceso3Emitida32Total35",
    );
  });

  it("un mes sin cotizaciones lo dice", () => {
    renderConProviders(
      <DetalleCotizaciones
        cotizacionesMes={{ total: 0, pendientes: 0, pausadas: 0, enProceso: 0, emitidas: 0 }}
      />,
    );

    expect(screen.getByText("Todavía no hay cotizaciones este mes.")).toBeInTheDocument();
  });

  it("si la pizarra todavía no tiene el dato, avisa", () => {
    renderConProviders(<DetalleCotizaciones cotizacionesMes={null} />);

    expect(screen.getByText("El detalle todavía no está listo.")).toBeInTheDocument();
  });
});

describe("DetalleCuentasCobro", () => {
  it("los cuatro estados, sin plata, con el total", () => {
    const { container } = renderConProviders(
      <DetalleCuentasCobro
        cuentasCobroMes={{ total: 16, emitidas: 12, pausadas: 0, enProceso: 2, pagadas: 2 }}
      />,
    );

    expect(container).toHaveTextContent("Emitida12Pausada0En proceso2Pagada2Total16");
    expect(container).not.toHaveTextContent("$");
  });

  it("un mes sin cuentas emitidas lo dice", () => {
    renderConProviders(
      <DetalleCuentasCobro
        cuentasCobroMes={{ total: 0, emitidas: 0, pausadas: 0, enProceso: 0, pagadas: 0 }}
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
