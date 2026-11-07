import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import HeaderUsuario from "./HeaderUsuario";

// CERRAR SESIÓN, SUELTO (2026-11-07). Del 2026-10-21 al 2026-11-07 vivía en
// una lista que abría el logo, junto a "Ir a la tienda". Con la tienda en otra
// app el logo quedó como marca y cerrar sesión volvió a ser un botón, en
// celular y en computador. Al corregir una factura no aparece: salir a mitad
// de camino perdería la corrección.
vi.mock("../Firebase/Firebase", () => ({ auth: {}, db: {}, storage: {} }));
const sesion = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock("../../Context/useAuth", () => ({ useAuth: () => sesion }));

const datos = { name: "Ana", role: "administrador", vista: "Menú" };

describe.each([
  ["celular", true],
  ["computador", false],
])("HeaderUsuario en %s", (_forma, compacto) => {
  it("cerrar sesión es un botón suelto y el logo ya no lleva a la tienda", async () => {
    const salir = vi.fn();
    const { usuario } = renderConProviders(
      <HeaderUsuario {...datos} compacto={compacto} conLogo onCerrarSesion={salir} />,
    );

    await usuario.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(salir).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("img", { name: "Ferrequipos Personal" })).toBeInTheDocument();
    expect(screen.queryByText(/tienda/i)).not.toBeInTheDocument();
  });

  it("sin cerrar sesión (corregir una factura) queda solo el logo", () => {
    renderConProviders(
      <HeaderUsuario {...datos} compacto={compacto} conLogo sinCerrarSesion />,
    );

    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ferrequipos Personal" })).toBeInTheDocument();
  });
});
