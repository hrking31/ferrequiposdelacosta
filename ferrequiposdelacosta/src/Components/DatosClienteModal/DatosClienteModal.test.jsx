import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import DatosClienteModal from "./DatosClienteModal";

// Los datos con los que el cliente firma su pedido en la tienda. Es la única
// pantalla donde el propio cliente escribe: si acá entra un teléfono con letras
// o una cédula de dos dígitos, después no hay a quién llamarle ni a quién
// facturarle.
//
// El formulario cambia de nombres según sea persona o empresa —"Nombre" y
// "Cédula" pasan a "Razón social" y "NIT"—, y eso también se fija acá.
const abrir = (props = {}) =>
  renderConProviders(
    <DatosClienteModal open onClose={() => {}} modoCliente {...props} />,
  );

const guardar = (usuario) =>
  usuario.click(screen.getByRole("button", { name: "Guardar" }));

describe("DatosClienteModal — persona o empresa", () => {
  it("como persona pide nombre y cédula", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByLabelText("Persona"));

    expect(screen.getByLabelText(/Nombre/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cédula/)).toBeInTheDocument();
  });

  it("como empresa pasa a razón social y NIT", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByLabelText("Empresa"));

    expect(screen.getByLabelText(/Razón social/)).toBeInTheDocument();
    expect(screen.getByLabelText(/NIT/)).toBeInTheDocument();
  });
});

describe("DatosClienteModal — lo que no deja pasar", () => {
  it("sin datos, no guarda y marca lo que falta", async () => {
    const { usuario } = abrir();

    await guardar(usuario);

    expect(screen.getAllByText("Este campo es obligatorio.").length).toBeGreaterThan(0);
  });

  it("una identificación de menos de 5 dígitos no sirve", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByLabelText("Persona"));
    await usuario.type(screen.getByLabelText(/Nombre/), "Aida Pérez");
    await usuario.type(screen.getByLabelText(/Cédula/), "123");
    await usuario.type(screen.getByLabelText("Teléfono"), "3116576633");
    await guardar(usuario);

    expect(
      screen.getByText("Debe contener solo números (mínimo 5 dígitos)."),
    ).toBeInTheDocument();
  });

  it("el teléfono descarta letras y signos mientras se escribe", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Teléfono"), "(311) 657-66ab33");

    expect(screen.getByLabelText("Teléfono")).toHaveValue("3116576633");
  });
});

describe("DatosClienteModal — cuando está todo", () => {
  it("guarda los datos del cliente y avisa que terminó", async () => {
    const alGuardar = vi.fn();
    const { usuario, store } = abrir({ onSuccess: alGuardar });

    await usuario.click(screen.getByLabelText("Persona"));
    await usuario.type(screen.getByLabelText(/Nombre/), "Aida Pérez");
    await usuario.type(screen.getByLabelText(/Cédula/), "123456");
    await usuario.type(screen.getByLabelText("Teléfono"), "3116576633");
    await guardar(usuario);

    // Los datos quedan en el estado de la app, que es de donde los toma el
    // carrito al armar el pedido.
    const cliente = store.getState().cliente;
    expect(cliente.nombre).toBe("Aida Pérez");
    expect(cliente.identificacion).toBe("123456");
    expect(cliente.telefono).toBe("3116576633");
    expect(alGuardar).toHaveBeenCalled();
  });
});
