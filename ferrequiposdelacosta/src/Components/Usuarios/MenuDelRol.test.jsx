import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import BOTONES_MENU from "../RolesPermisos/botonesMenu";
import MenuDelRol from "./MenuDelRol";

// Lo que ve un rol en el menú: los botones encendidos son los suyos y los
// demás van con candado. Al editar, marca lo que gana y lo que pierde.
const candados = () => screen.queryAllByTestId("LockOutlinedIcon").length;

describe("MenuDelRol", () => {
  // Ocho desde el 2026-10-29: Crear equipo y Editar / eliminar se juntaron
  // en EQUIPOS.
  it("el administrador ve los ocho botones", () => {
    renderConProviders(<MenuDelRol rol="administrador" />);

    expect(BOTONES_MENU).toHaveLength(8);
    expect(candados()).toBe(0);
  });

  it("el gestor editor, solo el del catálogo", () => {
    renderConProviders(<MenuDelRol rol="gestorEditor" />);

    expect(candados()).toBe(7);
  });

  it("sin rol, todo con candado", () => {
    renderConProviders(<MenuDelRol rol="" />);

    expect(candados()).toBe(8);
  });

  it("al pasar de facturación a integral, gana el del catálogo y no pierde nada", () => {
    renderConProviders(<MenuDelRol rol="gestorIntegral" rolAntes="gestorFacturacion" />);

    expect(screen.getAllByText("GANA")).toHaveLength(1);
    expect(screen.queryByText("PIERDE")).not.toBeInTheDocument();
  });

  it("al pasar de administrador a editor, pierde los otros siete", () => {
    renderConProviders(<MenuDelRol rol="gestorEditor" rolAntes="administrador" />);

    expect(screen.getAllByText("PIERDE")).toHaveLength(7);
    expect(screen.queryByText("GANA")).not.toBeInTheDocument();
  });

  // En el celular las etiquetas no caben: queda solo el color.
  it("en el celular, sin etiquetas", () => {
    renderConProviders(<MenuDelRol rol="gestorEditor" rolAntes="administrador" compacto />);

    expect(screen.queryByText("PIERDE")).not.toBeInTheDocument();
    expect(screen.getByText("Rojo: lo que pierde")).toBeInTheDocument();
  });

  it("sin cambio de rol no marca nada", () => {
    renderConProviders(<MenuDelRol rol="gestorEditor" rolAntes="gestorEditor" />);

    expect(screen.queryByText("GANA")).not.toBeInTheDocument();
    expect(screen.queryByText("PIERDE")).not.toBeInTheDocument();
  });
});
