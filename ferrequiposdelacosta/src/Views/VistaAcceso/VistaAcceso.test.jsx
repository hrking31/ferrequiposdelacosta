import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderConProviders } from "../../test/utils";
import { authContext } from "../../Context/useAuth";
import { ProtectedRoutes } from "../../Components/ProtectedRoutes/ProtectedRoutes";
import VistaAcceso from "./VistaAcceso";

// LA PUERTA DEL PERSONAL: la dirección sola de su app (2026-11-07; antes,
// /acceso dentro de la tienda). Importan las dos direcciones del camino: sin
// sesión, cualquier pantalla del sistema manda a la puerta; con sesión, la
// puerta manda al menú.
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
        <Route path="/" element={<VistaAcceso />} />
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

describe("La puerta del personal", () => {
  it("sin sesión muestra el inicio de sesión del personal", () => {
    abrir(sesion(), "/");

    expect(screen.getByText("Acceso del personal")).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ACCESO" })).toBeInTheDocument();
  });

  it("con la sesión abierta, pasa directo al menú del sistema", () => {
    abrir(sesion({ user: { uid: "u1", role: "administrador" } }), "/");

    expect(screen.getByText("Menú del sistema")).toBeInTheDocument();
    expect(screen.queryByText("Acceso del personal")).not.toBeInTheDocument();
  });

  it("sin sesión, una pantalla del sistema lleva a la puerta", () => {
    abrir(sesion(), "/adminforms");

    expect(screen.getByText("Acceso del personal")).toBeInTheDocument();
    expect(screen.queryByText("Menú del sistema")).not.toBeInTheDocument();
  });
});
