import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import CardsEquipos from "./CardsEquipos";

// Las tarjetas de la tienda filtran el catálogo en memoria con lo escrito en
// el buscador (2026-10-29). Sin resultados, lo dicen: antes volvían a mostrar
// todo y parecía que el buscador no hacía nada.
const catalogo = [
  { id: "1", name: "TABLÓN", images: [] },
  { id: "2", name: "ANDAMIOS CONVENCIONALES", images: [] },
];

const abrir = (termino) =>
  renderConProviders(<CardsEquipos />, {
    estadoInicial: { equipos: { equipos: catalogo, loading: false, error: null }, search: { termino } },
  });

describe("CardsEquipos", () => {
  it("sin búsqueda, todo el catálogo", () => {
    abrir("");
    expect(screen.getByText("TABLÓN")).toBeInTheDocument();
    expect(screen.getByText("ANDAMIOS CONVENCIONALES")).toBeInTheDocument();
  });

  it("con búsqueda, solo los que coinciden, sin importar tildes", () => {
    abrir("tablon");
    expect(screen.getByText("TABLÓN")).toBeInTheDocument();
    expect(screen.queryByText("ANDAMIOS CONVENCIONALES")).not.toBeInTheDocument();
  });

  it("sin resultados, lo dice", () => {
    abrir("grúa ");
    expect(screen.getByText('Ningún equipo coincide con "grúa".')).toBeInTheDocument();
    expect(screen.queryByText("TABLÓN")).not.toBeInTheDocument();
  });
});
