import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import LoadingLogo from "./LoadingLogo";

// EL LOGO QUE SE ARMA SOLO. Lee la "C" y la "f" del mismo SVG que usa toda la
// app, buscándolas en su texto. Si algún día se cambia el logo por uno armado
// de otra forma, la búsqueda dejaría de encontrarlas y la pantalla de carga
// saldría vacía —o rota— sin que nada avise. Esta prueba es ese aviso.
describe("LoadingLogo", () => {
  it("arma el logo con sus dos piezas: la C azul y la f roja", () => {
    renderConProviders(<LoadingLogo text="Cargando equipos..." />);

    const logo = screen.getByRole("img", { name: "Ferrequipos Logo" });
    const [c, f] = logo.querySelectorAll("path");

    expect(logo.querySelectorAll("path")).toHaveLength(2);
    expect(logo.getAttribute("viewBox")).toMatch(/^[\d.\s-]+$/);
    expect(c).toHaveClass("logo-c");
    expect(c.getAttribute("fill")).toBe("#2A3890");
    expect(c.getAttribute("d")).toMatch(/^M/);
    expect(f).toHaveClass("logo-f");
    expect(f.getAttribute("fill")).toBe("#BE1F2D");
    expect(f.getAttribute("d")).toMatch(/^M/);
  });

  // El dibujo de la "C" se anima de 1 a 0: sin esto el contorno no se dibuja.
  it("la C mide 1 para poder dibujarse de punta a punta", () => {
    renderConProviders(<LoadingLogo />);

    const c = screen.getByRole("img", { name: "Ferrequipos Logo" }).querySelector(".logo-c");
    expect(c.getAttribute("pathLength")).toBe("1");
  });

  it("muestra el texto que le pasan", () => {
    renderConProviders(<LoadingLogo text="Enviando solicitud..." />);

    expect(screen.getByText("Enviando solicitud...")).toBeInTheDocument();
  });
});
