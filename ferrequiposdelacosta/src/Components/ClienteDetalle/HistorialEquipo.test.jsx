import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import HistorialEquipo from "./HistorialEquipo";
import { unEquipo, unTramoVencido } from "../../test/facturas";
import { formatearMonedaOVacio as formatearMoneda } from "../../Utils/formato";

// La historia de un equipo en pantalla. Las cuentas de cada renglón se prueban
// en facturaPresentacion.test.js; acá solo lo que se LEE.

// Un importe tal como sale en pantalla: el formato de pesos separa el "$" con
// un espacio especial, que al leer la pantalla cuenta como uno normal.
const enPantalla = (valor) => formatearMoneda(valor).replace(/\s/g, " ");

// 1 compresor a $150.000 que vencía el 07/09 y devolvieron el 09: 2 días
// vencidos, $300.000.
const compresor = (descuento) =>
  unEquipo({
    nombre: "COMPRESOR",
    cantidad: 1,
    valorDia: 150000,
    dias: 7,
    fechaDespacho: "2026-09-01",
    vencidos: [
      {
        ...unTramoVencido({ desde: "2026-09-08", hasta: "2026-09-09" }),
        ...(descuento && { descuento }),
      },
    ],
  });

describe("HistorialEquipo — el descuento de los días", () => {
  it("dice cuánto se descontó, y la cifra ya lo trae restado", () => {
    renderConProviders(<HistorialEquipo equipo={compresor(100000)} hoy="2026-09-09" />);

    expect(screen.getByText(`Descuento ${enPantalla(100000)}`)).toBeInTheDocument();
    expect(screen.getByText(enPantalla(200000))).toBeInTheDocument();
  });

  it("sin descuento no aparece el rótulo", () => {
    renderConProviders(<HistorialEquipo equipo={compresor()} hoy="2026-09-09" />);

    expect(screen.queryByText(/^Descuento/)).not.toBeInTheDocument();
    expect(screen.getByText(enPantalla(300000))).toBeInTheDocument();
  });
});
