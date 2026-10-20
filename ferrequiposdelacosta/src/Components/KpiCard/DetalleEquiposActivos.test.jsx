import { render, screen } from "@testing-library/react";
import DetalleEquiposActivos from "./DetalleEquiposActivos";

// El detalle de "Equipos activos": de cada equipo, cuántas unidades hay
// afuera. Lo que importa: que se lea de mayor a menor y que el total al pie
// sea el mismo número del recuadro.
describe("DetalleEquiposActivos", () => {
  it("de mayor a menor, con el total al pie", () => {
    const { container } = render(
      <DetalleEquiposActivos equiposPorTipo={{ RUEDAS: 8, ANDAMIOS: 43, TABLÓN: 33 }} />,
    );

    expect(container).toHaveTextContent("ANDAMIOS43TABLÓN33RUEDAS8Total84");
  });

  it("a igual cantidad, por nombre", () => {
    const { container } = render(
      <DetalleEquiposActivos equiposPorTipo={{ RUEDAS: 8, GATOS: 8 }} />,
    );

    expect(container).toHaveTextContent("GATOS8RUEDAS8Total16");
  });

  it("sin equipos afuera, lo dice", () => {
    render(<DetalleEquiposActivos equiposPorTipo={{}} />);

    expect(screen.getByText("No hay equipos en alquiler.")).toBeInTheDocument();
  });

  it("si la pizarra todavía no tiene el detalle, avisa en vez de mostrar una lista vacía", () => {
    render(<DetalleEquiposActivos equiposPorTipo={null} />);

    expect(screen.getByText("El detalle todavía no está listo.")).toBeInTheDocument();
  });
});
