import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { renderConProviders } from "../../test/utils";
import NavBar from "./NavBar";

// La barra es de la tienda (AppTienda). Desde el 2026-11-07 el personal tiene
// su propia app, así que la barra ya no mira si hay sesión: el logo siempre
// lleva al inicio de la tienda, o al del kiosco si se está en él.
const DondeEstoy = () => {
  const { pathname, search } = useLocation();
  return <p>{`Estoy en ${pathname}${search}`}</p>;
};

const abrir = (ruta) =>
  renderConProviders(
    <>
      <NavBar />
      <Routes>
        <Route path="*" element={<DondeEstoy />} />
      </Routes>
    </>,
    { ruta },
  );

describe("NavBar", () => {
  it.each(["/home", "/vistacart", "/detail/eq1", "/kioskhome"])("se ve en %s", (ruta) => {
    abrir(ruta);

    expect(screen.getByAltText("logo")).toBeInTheDocument();
  });

  it("el logo lleva al inicio de la tienda", async () => {
    const { usuario } = abrir("/detail/eq1");

    await usuario.click(screen.getByAltText("logo"));

    expect(screen.getByText("Estoy en /home")).toBeInTheDocument();
  });

  it("en el kiosco, el logo lleva al inicio del kiosco", async () => {
    const { usuario } = abrir("/kioskdetail/eq1");

    await usuario.click(screen.getByAltText("logo"));

    expect(screen.getByText("Estoy en /kioskhome")).toBeInTheDocument();
  });
});
