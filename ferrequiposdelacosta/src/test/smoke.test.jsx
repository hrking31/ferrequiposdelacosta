import { render, screen } from "@testing-library/react";

// Test de humo: confirma que Vitest + Testing Library + jsdom + jest-dom
// quedaron bien conectados. No prueba la app en sí; sirve para validar el
// setup y se puede borrar cuando ya existan tests reales.
describe("setup de testing", () => {
  it("corre aserciones básicas", () => {
    expect(1 + 1).toBe(2);
  });

  it("renderiza y consulta el DOM con Testing Library", () => {
    render(<button>Hola</button>);
    expect(screen.getByRole("button", { name: "Hola" })).toBeInTheDocument();
  });
});
