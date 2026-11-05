import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import VistaPreviaDocumento from "./VistaPreviaDocumento";

const abrir = (items) =>
  renderConProviders(
    <VistaPreviaDocumento
      numero="CC-1"
      cliente="ANA"
      estado={{ label: "Emitida", color: "success" }}
      items={items}
      totales={[]}
    />,
  );

describe("los renglones de la vista previa", () => {
  it("un ítem por horas dice horas, con su subtotal", () => {
    abrir([{ description: "RETRO", quantity: 2, day: 8, price: 50000, unidad: "horas" }]);

    expect(screen.getByText("2 × 8 horas")).toBeInTheDocument();
    expect(screen.getByText(/800\.000/)).toBeInTheDocument();
  });

  it("un ítem sin unidad, como los de las cotizaciones, dice días", () => {
    abrir([{ description: "RANA", quantity: 1, day: 3, price: 10000 }]);
    expect(screen.getByText("1 × 3 días")).toBeInTheDocument();
  });

  it("el renglón de los daños muestra su valor, sin días", () => {
    abrir([
      {
        description: "DAÑOS (retenido del depósito)",
        quantity: 1,
        day: "",
        price: 30000,
        subtotal: 30000,
      },
    ]);

    expect(screen.getByText(/30\.000/)).toBeInTheDocument();
    expect(screen.queryByText(/días/)).not.toBeInTheDocument();
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });

  it("un subtotal de cotización, guardado con formato, se vuelve a calcular", () => {
    abrir([{ description: "RANA", quantity: 2, day: 3, price: 10000, subtotal: "$ 60.000" }]);
    expect(screen.getByText(/60\.000/)).toBeInTheDocument();
  });

  it("un solo día va en singular", () => {
    abrir([{ description: "RANA", quantity: 1, day: 1, price: 10000 }]);
    expect(screen.getByText("1 × 1 día")).toBeInTheDocument();
  });
});
