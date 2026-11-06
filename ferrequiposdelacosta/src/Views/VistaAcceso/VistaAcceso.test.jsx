import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderConProviders } from "../../test/utils";
import { authContext } from "../../Context/useAuth";
import { ProtectedRoutes } from "../../Components/ProtectedRoutes/ProtectedRoutes";
import VistaAcceso from "./VistaAcceso";

// LA PUERTA DEL PERSONAL (2026-11-06): el personal entra siempre por /acceso y
// la tienda ya no tiene "Mi cuenta". Por eso importan las dos direcciones del
// camino: sin sesión, el sistema manda a /acceso (y no a la tienda, que ya no
// tiene por dónde entrar); con sesión, /acceso manda al menú.
const sesion = (cambios = {}) => ({
  user: null,
  loading: false,
  correoVerificado: true,
  dosPasos: "activo",
  login: vi.fn(),
  recuperarClave: vi.fn(),
  prepararSegundoPaso: vi.fn(),
  entrarConCodigo: vi.fn(),
  logout: vi.fn(),
  ...cambios,
});

const abrir = (valor, ruta) =>
  renderConProviders(
    <authContext.Provider value={valor}>
      <Routes>
        <Route path="/acceso" element={<VistaAcceso />} />
        <Route path="/home" element={<p>La tienda</p>} />
        <Route
          path="/adminforms"
          element={
            <ProtectedRoutes>
              <p>Menú del sistema</p>
            </ProtectedRoutes>
          }
        />
      </Routes>
    </authContext.Provider>,
    { ruta },
  );

describe("/acceso, la puerta del personal", () => {
  it("sin sesión muestra el inicio de sesión del personal", () => {
    abrir(sesion(), "/acceso");

    expect(screen.getByText("Acceso del personal")).toBeInTheDocument();
    expect(screen.getByLabelText(/Dirección de correo electrónico/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ACCESO" })).toBeInTheDocument();
  });

  it("con la sesión abierta, pasa directo al menú del sistema", () => {
    abrir(sesion({ user: { uid: "u1", role: "administrador" } }), "/acceso");

    expect(screen.getByText("Menú del sistema")).toBeInTheDocument();
    expect(screen.queryByText("Acceso del personal")).not.toBeInTheDocument();
  });

  it("sin sesión, una pantalla del sistema lleva a /acceso y no a la tienda", () => {
    abrir(sesion(), "/adminforms");

    expect(screen.getByText("Acceso del personal")).toBeInTheDocument();
    expect(screen.queryByText("La tienda")).not.toBeInTheDocument();
    expect(screen.queryByText("Menú del sistema")).not.toBeInTheDocument();
  });
});
