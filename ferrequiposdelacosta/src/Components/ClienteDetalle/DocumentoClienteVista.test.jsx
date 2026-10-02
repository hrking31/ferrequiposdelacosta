import { screen, within } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import DocumentoClienteVista from "./DocumentoClienteVista";

// El documento del cliente en su ficha: las miniaturas y la foto en grande.
const DOCUMENTO = { frente: "https://fotos/frente.jpg", atras: "https://fotos/atras.jpg" };

describe("DocumentoClienteVista", () => {
  it("sin fotos no dibuja nada", () => {
    const { container } = renderConProviders(
      <DocumentoClienteVista documento={{ frente: "", atras: "" }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("muestra solo los lados que tienen foto", () => {
    renderConProviders(
      <DocumentoClienteVista documento={{ frente: DOCUMENTO.frente, atras: "" }} />,
    );

    expect(
      screen.getByRole("button", { name: "Ver el documento, frente" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ver el documento, atrás" }),
    ).not.toBeInTheDocument();
  });

  it("al tocar una miniatura la abre en grande, y se pasa al otro lado sin cerrar", async () => {
    const { usuario } = renderConProviders(<DocumentoClienteVista documento={DOCUMENTO} />);

    await usuario.click(screen.getByRole("button", { name: "Ver el documento, atrás" }));

    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByRole("img")).toHaveAttribute("src", DOCUMENTO.atras);

    await usuario.click(within(dialogo).getByRole("button", { name: "Frente" }));

    expect(within(dialogo).getByRole("img")).toHaveAttribute("src", DOCUMENTO.frente);
  });
});
