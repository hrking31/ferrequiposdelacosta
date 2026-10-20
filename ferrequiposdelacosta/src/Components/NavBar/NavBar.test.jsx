import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { renderConProviders } from "../../test/utils";
import { authContext } from "../../Context/useAuth";
import NavBar from "./NavBar";
import BotonTienda from "./BotonTienda";

// La barra es de lo que ve el cliente. Las vistas internas van sin ella, y
// para no quedarse sin camino a la tienda llevan su propio logo.
const conSesion = (ui, ruta) =>
  renderConProviders(
    <authContext.Provider value={{ user: { uid: "u1" } }}>{ui}</authContext.Provider>,
    { ruta },
  );

describe("NavBar — dónde va", () => {
  it("en la tienda está", () => {
    conSesion(<NavBar />, "/home");

    expect(screen.getByAltText("logo")).toBeInTheDocument();
  });

  it("en el menú no", () => {
    conSesion(<NavBar />, "/adminforms");

    expect(screen.queryByAltText("logo")).not.toBeInTheDocument();
  });
});

describe("BotonTienda", () => {
  const DondeEstoy = () => {
    const { pathname, search } = useLocation();
    return <p>{`${pathname}${search}`}</p>;
  };

  it("lleva a la tienda, aunque haya sesión abierta", async () => {
    const { usuario } = conSesion(
      <Routes>
        <Route path="/adminforms" element={<BotonTienda />} />
        <Route path="/home" element={<DondeEstoy />} />
      </Routes>,
      "/adminforms",
    );

    await usuario.click(screen.getByRole("button", { name: "Ir a la tienda" }));

    expect(screen.getByText("/home?vistahome=si")).toBeInTheDocument();
  });
});
