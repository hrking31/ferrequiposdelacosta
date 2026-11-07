import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import HeaderUsuario from "./HeaderUsuario";

// TERMINAR TURNO = DEVOLVER EL CARNÉ (2026-11-07). El encabezado ya no lleva
// botón de cerrar sesión en ninguna pantalla: le quitaba lo lindo. La sesión
// se cierra solo desde el menú, tocando el carné (`conSalida`): pregunta
// primero y después la cinta se lleva el carné. En las pruebas no hay dibujo
// de verdad, así que la salida termina enseguida y cierra la sesión.
vi.mock("../Firebase/Firebase", () => ({ auth: {}, db: {}, storage: {} }));
const sesion = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock("../../Context/useAuth", () => ({ useAuth: () => sesion }));

const datos = { name: "Ana", role: "administrador", vista: "Menú" };

beforeEach(() => sesion.logout.mockClear());

describe.each([
  ["celular", true],
  ["computador", false],
])("HeaderUsuario en %s", (_forma, compacto) => {
  it("fuera del menú no hay cómo salir: solo el carné como marca", () => {
    renderConProviders(<HeaderUsuario {...datos} compacto={compacto} conLogo />);

    expect(screen.getByRole("img", { name: "Ferrequipos Personal" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cerrar sesión|terminar turno/i })).not.toBeInTheDocument();
  });

  it("en el menú, el carné pregunta antes y luego cierra la sesión", async () => {
    const { usuario } = renderConProviders(
      <HeaderUsuario {...datos} compacto={compacto} conLogo conSalida />,
    );

    await usuario.click(screen.getByRole("button", { name: "Terminar turno" }));
    expect(screen.getByText("¿Terminar turno?")).toBeInTheDocument();
    expect(sesion.logout).not.toHaveBeenCalled();

    await usuario.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(sesion.logout).toHaveBeenCalledTimes(1);
  });

  it("«Seguir trabajando» no cierra nada", async () => {
    const { usuario } = renderConProviders(
      <HeaderUsuario {...datos} compacto={compacto} conLogo conSalida />,
    );

    await usuario.click(screen.getByRole("button", { name: "Terminar turno" }));
    await usuario.click(screen.getByRole("button", { name: "Seguir trabajando" }));

    expect(sesion.logout).not.toHaveBeenCalled();
  });
});
