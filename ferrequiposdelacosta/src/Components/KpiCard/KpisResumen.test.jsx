import { screen, within } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import KpisResumen from "./KpisResumen";
import KpisDestacados from "./KpisDestacados";

// Los KPI del menú cuando las cinco tarjetas en fila no caben (2026-10-29):
// la columna de la derecha del computador angosto y la plata destacada.
const Icono = () => <span>i</span>;
const kpi = (etiqueta, valor) => ({ etiqueta, icono: <Icono />, color: "#0288d1", valor, subtitulo: "Este mes" });
const todos = [
  kpi("COTIZACIONES", 7),
  kpi("CUENTAS DE COBRO", 3),
  kpi("EQUIPOS ACTIVOS", 51),
  kpi("PAGOS PENDIENTES", "$ 700.000"),
];

describe("KpisResumen (la columna)", () => {
  it("todas, con la plata primero", () => {
    renderConProviders(<KpisResumen kpis={todos} />);
    const columna = screen.getByRole("complementary", { name: "Indicadores clave" });
    const nombres = within(columna)
      .getAllByText(/COTIZACIONES|CUENTAS DE COBRO|EQUIPOS ACTIVOS|PAGOS PENDIENTES/)
      .map((e) => e.textContent);
    expect(nombres).toEqual(["PAGOS PENDIENTES", "COTIZACIONES", "CUENTAS DE COBRO", "EQUIPOS ACTIVOS"]);
  });

  it("sin la plata (un rol sin cartera), las demás", () => {
    renderConProviders(<KpisResumen kpis={todos.slice(0, 2)} />);
    expect(screen.getByText("COTIZACIONES")).toBeInTheDocument();
    expect(screen.queryByText("PAGOS PENDIENTES")).not.toBeInTheDocument();
  });
});

describe("KpisDestacados (la plata destacada)", () => {
  it("la plata en grande y las demás de a dos", () => {
    renderConProviders(<KpisDestacados kpis={todos} />);
    expect(screen.getByText("$ 700.000")).toBeInTheDocument();
    for (const nombre of ["COTIZACIONES", "CUENTAS DE COBRO", "EQUIPOS ACTIVOS"]) {
      expect(screen.getByText(nombre)).toBeInTheDocument();
    }
  });

  it("sin la plata, solo la cuadrícula", () => {
    renderConProviders(<KpisDestacados kpis={todos.slice(0, 2)} />);
    expect(screen.queryByText("PAGOS PENDIENTES")).not.toBeInTheDocument();
    expect(screen.getByText("CUENTAS DE COBRO")).toBeInTheDocument();
  });
});
