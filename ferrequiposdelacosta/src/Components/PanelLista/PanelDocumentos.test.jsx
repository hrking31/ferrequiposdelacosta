import { screen, waitFor } from "@testing-library/react";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import InsightsIcon from "@mui/icons-material/Insights";
import { renderConProviders } from "../../test/utils";
import PanelDocumentos from "./PanelDocumentos";

// La columna de la derecha del buzón y de la lista de cuentas. Lo que importa:
// que la tarjeta del mes use lo que el menú ya guardó, SIN leer la base, y que
// solo lea la pizarra si esa memoria está vacía (se recargó la página estando
// en la pantalla).
const nube = vi.hoisted(() => ({ leerTotales: vi.fn() }));
vi.mock("../../Views/AdminForms/totalesPanelDb", () => ({ leerTotalesPanel: nube.leerTotales }));

const delMes = { total: 35, pendientes: 0, pausadas: 0, enProceso: 3, emitidas: 32 };
const segunda = {
  etiqueta: "SIN RESPONDER",
  icono: <PendingActionsIcon />,
  color: "#ed6c02",
  valor: 4,
  subtitulo: "La más vieja: hace 2 días",
};

const mostrar = (kpis) =>
  renderConProviders(
    <PanelDocumentos
      de="cotizaciones"
      segunda={segunda}
      titulo="De la lista"
      icono={<InsightsIcon />}
    >
      <p>contenido del recuadro</p>
    </PanelDocumentos>,
    { estadoInicial: { kpis } },
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PanelDocumentos", () => {
  it("las dos tarjetas y el recuadro, con lo que guardó el menú y sin leer nada", () => {
    mostrar({ cotizacionesMes: delMes });

    expect(screen.getByText("35", { selector: "h6" })).toBeInTheDocument();
    expect(screen.getByText("SIN RESPONDER")).toBeInTheDocument();
    expect(screen.getByText("La más vieja: hace 2 días")).toBeInTheDocument();
    expect(screen.getByText("contenido del recuadro")).toBeInTheDocument();
    expect(nube.leerTotales).not.toHaveBeenCalled();
  });

  it("con la memoria vacía, lee la pizarra una vez", async () => {
    nube.leerTotales.mockResolvedValue({ cotizacionesMes: delMes, cuentasCobroMes: null });
    mostrar({});

    await waitFor(() => expect(screen.getByText("35", { selector: "h6" })).toBeInTheDocument());
    expect(nube.leerTotales).toHaveBeenCalledTimes(1);
  });
});
