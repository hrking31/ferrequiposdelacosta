import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import EliminarUsuarioDialogo from "./EliminarUsuarioDialogo";

// Eliminar a una persona (2026-10-28). Lo borra el servidor (deleteUser): su
// cuenta, su ficha, su foto y su presencia. El botón rojo se activa recién al
// escribir su CORREO —es único; el nombre se puede repetir— para que un toque
// en falso no se lleve una cuenta.
const nube = vi.hoisted(() => ({ eliminarUsuario: vi.fn(), logout: vi.fn() }));

vi.mock("../Firebase/Firebase", () => ({ functions: {} }));
vi.mock("firebase/functions", () => ({ httpsCallable: () => nube.eliminarUsuario }));
vi.mock("../../Context/useAuth", () => ({ useAuth: () => ({ logout: nube.logout }) }));

const aida = {
  id: "u1",
  name: "Aida Pérez",
  email: "aida@ferrequipos.com",
  role: "gestorEditor",
  aparatos: [],
};

const abrir = (usuario = aida, props = {}) => {
  const onTerminar = vi.fn();
  const resultado = renderConProviders(
    <EliminarUsuarioDialogo usuario={usuario} open onClose={vi.fn()} onTerminar={onTerminar} {...props} />,
  );
  return { ...resultado, onTerminar };
};

const botonEliminar = () => screen.getByRole("button", { name: "Eliminar" });
const casilla = () => screen.getByLabelText("Confirmar eliminación");

beforeEach(() => {
  nube.eliminarUsuario.mockReset();
  nube.eliminarUsuario.mockResolvedValue({});
  nube.logout.mockReset();
});

describe("EliminarUsuarioDialogo", () => {
  it("el botón rojo se activa con el correo, no con el nombre", async () => {
    const { usuario } = abrir();
    expect(botonEliminar()).toBeDisabled();

    await usuario.type(casilla(), "Aida Pérez");
    expect(botonEliminar()).toBeDisabled();

    await usuario.clear(casilla());
    await usuario.type(casilla(), "AIDA@ferrequipos.com");
    expect(botonEliminar()).toBeEnabled();
  });

  it("borra por el correo y avisa a la pantalla", async () => {
    const { usuario, onTerminar } = abrir();

    await usuario.type(casilla(), "aida@ferrequipos.com");
    await usuario.click(botonEliminar());

    expect(nube.eliminarUsuario).toHaveBeenCalledWith({ email: "aida@ferrequipos.com" });
    expect(onTerminar).toHaveBeenCalledWith({
      mensaje: "Aida Pérez ya no tiene cuenta.",
      severidad: "success",
      eliminado: true,
    });
    expect(nube.logout).not.toHaveBeenCalled();
  });

  it("si es uno mismo, después de borrar cierra la sesión", async () => {
    const { usuario } = abrir(aida, { esTu: true });

    expect(screen.getByText(/Eres tú/)).toBeInTheDocument();
    await usuario.type(casilla(), "aida@ferrequipos.com");
    await usuario.click(botonEliminar());

    expect(nube.logout).toHaveBeenCalled();
  });

  // Solo quien factura hace cotizaciones y cuentas de cobro.
  it("el aviso de que sus cotizaciones se quedan sale solo si factura", () => {
    const { unmount } = abrir();
    expect(screen.queryByText(/cotizaciones y cuentas de cobro que hizo/)).not.toBeInTheDocument();
    unmount();

    abrir({ ...aida, role: "gestorFacturacion" });
    expect(screen.getByText(/cotizaciones y cuentas de cobro que hizo/)).toBeInTheDocument();
  });
});
