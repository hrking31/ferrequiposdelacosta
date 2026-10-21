import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import FranjaKpis from "./FranjaKpis";

// La franja del menú en el celular: todos los números en una fila, solo ícono
// y cifra. Los que tienen detalle lo abren; los demás solo se leen.
const Icono = () => <span>i</span>;

const kpis = (abrirEquipos) => [
  { etiqueta: "COTIZACIONES", icono: <Icono />, color: "#0288d1", valor: 7, subtitulo: "Este mes" },
  { etiqueta: "CUENTAS DE COBRO", icono: <Icono />, color: "#2e7d32", valor: 3, subtitulo: "Este mes" },
  {
    etiqueta: "EQUIPOS ACTIVOS",
    icono: <Icono />,
    color: "#ed6c02",
    valor: 51,
    subtitulo: "En alquiler",
    onClick: abrirEquipos,
  },
  {
    etiqueta: "PAGOS PENDIENTES",
    icono: <Icono />,
    color: "#d32f2f",
    valor: "$ 700.000",
    subtitulo: "Por cobrar",
    onClick: () => {},
  },
];

describe("FranjaKpis", () => {
  it("muestra las cuatro cifras, sin los subtítulos", () => {
    renderConProviders(<FranjaKpis kpis={kpis(vi.fn())} />);

    for (const cifra of ["7", "3", "51", "$ 700.000"]) {
      expect(screen.getByText(cifra)).toBeInTheDocument();
    }
    expect(screen.queryByText("Este mes")).not.toBeInTheDocument();
    expect(screen.queryByText("Por cobrar")).not.toBeInTheDocument();
  });

  it("solo las que tienen detalle son botones, y lo abren", async () => {
    const abrirEquipos = vi.fn();
    const { usuario } = renderConProviders(<FranjaKpis kpis={kpis(abrirEquipos)} />);

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "COTIZACIONES" })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "EQUIPOS ACTIVOS" }));

    expect(abrirEquipos).toHaveBeenCalledTimes(1);
  });
});
