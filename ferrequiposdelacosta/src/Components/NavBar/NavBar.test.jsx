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

  it.each(["/vistacotizacion", "/vistausuarios/nuevo", "/vistaseguimientoclientes"])(
    "en las vistas internas tampoco (%s)",
    (ruta) => {
      conSesion(<NavBar />, ruta);

      expect(screen.queryByAltText("logo")).not.toBeInTheDocument();
    },
  );

  it("ni en la ficha de un cliente, que cuelga de /vistaclientes", () => {
    conSesion(<NavBar />, "/vistaclientes/cli1");

    expect(screen.queryByAltText("logo")).not.toBeInTheDocument();
  });

  it("en el carrito sí: es del cliente", () => {
    conSesion(<NavBar />, "/vistacart");

    expect(screen.getByAltText("logo")).toBeInTheDocument();
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

  // En el encabezado del menú en el celular el logo ocupa el lugar del botón
  // de salir: tiene que ofrecer las dos cosas.
  describe("con cerrar sesión", () => {
    const conMenu = (onCerrarSesion) =>
      conSesion(
        <Routes>
          <Route path="/adminforms" element={<BotonTienda onCerrarSesion={onCerrarSesion} />} />
          <Route path="/home" element={<DondeEstoy />} />
        </Routes>,
        "/adminforms",
      );

    it("al tocarlo no se va: ofrece la tienda y cerrar sesión", async () => {
      const { usuario } = conMenu(vi.fn());

      await usuario.click(screen.getByRole("button", { name: "Tienda y sesión" }));

      expect(screen.getByRole("menuitem", { name: "Ir a la tienda" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Cerrar sesión" })).toBeInTheDocument();
      expect(screen.queryByText("/home?vistahome=si")).not.toBeInTheDocument();
    });

    it("«Ir a la tienda» lleva a la tienda", async () => {
      const { usuario } = conMenu(vi.fn());

      await usuario.click(screen.getByRole("button", { name: "Tienda y sesión" }));
      await usuario.click(screen.getByRole("menuitem", { name: "Ir a la tienda" }));

      expect(screen.getByText("/home?vistahome=si")).toBeInTheDocument();
    });

    it("«Cerrar sesión» usa la salida que le pasan", async () => {
      const salir = vi.fn();
      const { usuario } = conMenu(salir);

      await usuario.click(screen.getByRole("button", { name: "Tienda y sesión" }));
      await usuario.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));

      expect(salir).toHaveBeenCalledTimes(1);
    });
  });

  // Al corregir una factura el logo se ve pero no lleva a ningún lado: salir a
  // mitad de camino perdería la corrección.
  it("quieto, es solo el logo: no es un botón", async () => {
    const { usuario } = conSesion(
      <Routes>
        <Route path="/adminforms" element={<BotonTienda quieto />} />
        <Route path="/home" element={<DondeEstoy />} />
      </Routes>,
      "/adminforms",
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("img", { name: "Ferrequipos" }));
    expect(screen.queryByText("/home?vistahome=si")).not.toBeInTheDocument();
  });
});
