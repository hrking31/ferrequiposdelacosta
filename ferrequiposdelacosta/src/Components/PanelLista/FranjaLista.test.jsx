import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import FranjaLista from "./FranjaLista";

// La lista guardada en una franja (2026-10-29), la de Equipos y Usuarios
// entre 1010 y 1500px: cuántos hay, cada uno se abre tocándolo, el abierto va
// marcado y la flecha saca la lista completa.
const Icono = () => <span>i</span>;
const items = [
  { id: "e1", nombre: "RANA", vista: <span>foto rana</span>, elemento: { id: "e1" } },
  { id: "e2", nombre: "ANDAMIO", vista: <span>foto andamio</span>, elemento: { id: "e2" } },
];

const abrir = (props = {}) => {
  const onElegir = vi.fn();
  const onAbrir = vi.fn();
  const resultado = renderConProviders(
    <FranjaLista icono={<Icono />} items={items} idElegido="e1" onElegir={onElegir} onAbrir={onAbrir} {...props} />,
  );
  return { ...resultado, onElegir, onAbrir };
};

describe("FranjaLista", () => {
  it("dice cuántos hay y marca el abierto", () => {
    abrir();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "RANA" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "ANDAMIO" })).not.toHaveAttribute("aria-current");
  });

  it("tocar uno lo abre", async () => {
    const { usuario, onElegir } = abrir();
    await usuario.click(screen.getByRole("button", { name: "ANDAMIO" }));
    expect(onElegir).toHaveBeenCalledWith({ id: "e2" });
  });

  it("la flecha saca la lista completa", async () => {
    const { usuario, onAbrir } = abrir();
    await usuario.click(screen.getByRole("button", { name: "Ver la lista completa" }));
    expect(onAbrir).toHaveBeenCalled();
  });
});
