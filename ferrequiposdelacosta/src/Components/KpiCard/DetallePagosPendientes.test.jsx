import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import { formatearMoneda } from "../../Utils/formato";
import DetallePagosPendientes from "./DetallePagosPendientes";

// La plata como la deja toHaveTextContent: el espacio especial del formato
// queda como un espacio común.
const plata = (monto) => formatearMoneda(monto).replace(/\s+/g, " ");

// El detalle de "Pagos pendientes": cuánto se debe según el estado de la
// factura. Lo que importa: que vaya primero lo más urgente, que no aparezcan
// casillas en cero y que el total al pie sea el mismo número del recuadro.
describe("DetallePagosPendientes", () => {
  it("primero lo vencido, después cobro y activas, con el total al pie", () => {
    const { container } = renderConProviders(
      <DetallePagosPendientes
        pagosPorEstado={{ activa: 824280, vencida: 5412300, cobro: 1168700 }}
      />,
    );

    expect(container).toHaveTextContent(
      `Vencidas${plata(5412300)}` +
        `En cobro${plata(1168700)}` +
        `Activas${plata(824280)}` +
        `Total${plata(7405280)}`,
    );
  });

  it("solo las casillas que tienen plata", () => {
    renderConProviders(<DetallePagosPendientes pagosPorEstado={{ vencida: 100000 }} />);

    expect(screen.getByText("Vencidas")).toBeInTheDocument();
    expect(screen.queryByText("En cobro")).not.toBeInTheDocument();
    expect(screen.queryByText("Activas")).not.toBeInTheDocument();
  });

  it("sin plata por cobrar, lo dice", () => {
    renderConProviders(<DetallePagosPendientes pagosPorEstado={{}} />);

    expect(screen.getByText("No hay pagos pendientes.")).toBeInTheDocument();
  });

  it("si la pizarra todavía no tiene el detalle, avisa en vez de mostrar una lista vacía", () => {
    renderConProviders(<DetallePagosPendientes pagosPorEstado={null} />);

    expect(screen.getByText("El detalle todavía no está listo.")).toBeInTheDocument();
  });
});
