import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import Search from "./Search";

// El buscador de la tienda y del kiosco (2026-10-29): filtra mientras se
// escribe —lo escrito va al store, de donde lo leen las tarjetas— y la X lo
// limpia. Ya no consulta la base ni espera el Enter.
describe("Search", () => {
  it("lo escrito queda en la búsqueda, tal cual", async () => {
    const { usuario, store } = renderConProviders(<Search />);

    await usuario.type(screen.getByLabelText("¿Qué estás buscando?"), "mezcla ");
    expect(store.getState().search.termino).toBe("mezcla ");
  });

  it("la X aparece con algo escrito y lo borra", async () => {
    const { usuario, store } = renderConProviders(<Search />);
    expect(screen.queryByRole("button", { name: "Limpiar la búsqueda" })).not.toBeInTheDocument();

    await usuario.type(screen.getByLabelText("¿Qué estás buscando?"), "rana");
    await usuario.click(screen.getByRole("button", { name: "Limpiar la búsqueda" }));

    expect(store.getState().search.termino).toBe("");
    expect(screen.getByLabelText("¿Qué estás buscando?")).toHaveValue("");
  });

  it("sin etiqueta, con el texto de ayuda adentro (la barra del celular)", () => {
    renderConProviders(<Search LabelOff={false} />);
    expect(screen.getByPlaceholderText("¿Qué estás buscando?")).toBeInTheDocument();
  });
});
