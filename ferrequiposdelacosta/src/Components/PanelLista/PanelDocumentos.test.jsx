import { screen } from "@testing-library/react";
import InsightsIcon from "@mui/icons-material/Insights";
import { renderConProviders } from "../../test/utils";
import PanelDocumentos from "./PanelDocumentos";

// La columna de la derecha del buzón y de la lista de cuentas: un recuadro con
// su título, de cuántas salen los números, y la X para volver al resumen
// cuando hay una vista previa abierta.
const mostrar = (props = {}) =>
  renderConProviders(
    <PanelDocumentos titulo="Estadísticas" icono={<InsightsIcon />} {...props}>
      <p>contenido del recuadro</p>
    </PanelDocumentos>,
  );

describe("PanelDocumentos", () => {
  it("el título, de cuántas salen los números y el contenido, sin X", () => {
    mostrar({ cantidad: 50 });

    expect(screen.getByText("Estadísticas")).toBeInTheDocument();
    expect(screen.getByText("Basado en las últimas 50")).toBeInTheDocument();
    expect(screen.getByText("contenido del recuadro")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Volver al resumen" })).not.toBeInTheDocument();
  });

  it("con una sola cargada lo dice en singular", () => {
    mostrar({ cantidad: 1 });

    expect(screen.getByText("Basado en la última")).toBeInTheDocument();
  });

  it("sin cantidad no dice de cuántas (la vista previa)", () => {
    mostrar({ titulo: "Vista previa" });

    expect(screen.queryByText(/Basado en/)).not.toBeInTheDocument();
  });

  it("con onCerrar aparece la X y la llama", async () => {
    const onCerrar = vi.fn();
    const { usuario } = mostrar({ titulo: "Vista previa", onCerrar });

    await usuario.click(screen.getByRole("button", { name: "Volver al resumen" }));

    expect(onCerrar).toHaveBeenCalledTimes(1);
  });
});
