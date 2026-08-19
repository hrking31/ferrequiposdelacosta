import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import BuscadorFiltro from "./BuscadorFiltro";

// Primera prueba de PANTALLA del proyecto (Fase 2). Se eligió este componente
// para estrenar el andamiaje porque no consulta la base ni depende de nadie:
// recibe el texto, avisa cuando cambia y ya. Si algo falla acá, el problema es
// del andamiaje, no del componente.
//
// Lo que se fija es la conducta que se ve, no cómo está hecho por dentro: que
// escribir avise letra por letra, que la X aparezca solo cuando hay algo, y que
// limpiar deje el campo vacío. Se puede reescribir entero por dentro y estas
// pruebas tienen que seguir pasando.

describe("BuscadorFiltro", () => {
  it("muestra el texto que le pasan y su indicación", () => {
    renderConProviders(
      <BuscadorFiltro value="taladro" onChange={() => {}} placeholder="Buscar equipo" />,
    );

    expect(screen.getByPlaceholderText("Buscar equipo")).toHaveValue("taladro");
  });

  it("avisa cada letra que se escribe, sin esperar a que terminen", async () => {
    // Filtra MIENTRAS se escribe: por eso avisa en cada tecla y no al salir del
    // campo ni con Enter.
    const avisos = [];
    const { usuario } = renderConProviders(
      <BuscadorFiltro value="" onChange={(v) => avisos.push(v)} placeholder="Buscar" />,
    );

    await usuario.type(screen.getByPlaceholderText("Buscar"), "and");

    // El componente no guarda el texto —lo maneja quien lo usa—, así que cada
    // aviso trae una sola letra: lo que importa es que avisó tres veces.
    expect(avisos).toEqual(["a", "n", "d"]);
  });

  it("no muestra la X cuando el campo está vacío", () => {
    renderConProviders(
      <BuscadorFiltro value="" onChange={() => {}} placeholder="Buscar" />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("muestra la X en cuanto hay algo escrito", () => {
    renderConProviders(
      <BuscadorFiltro value="mez" onChange={() => {}} placeholder="Buscar" />,
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("al tocar la X avisa que quedó vacío", async () => {
    const avisos = [];
    const { usuario } = renderConProviders(
      <BuscadorFiltro value="mezcladora" onChange={(v) => avisos.push(v)} placeholder="Buscar" />,
    );

    await usuario.click(screen.getByRole("button"));

    expect(avisos).toEqual([""]);
  });
});
