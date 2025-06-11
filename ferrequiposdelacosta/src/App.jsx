import {
  Home,
  Detail,
  AdminForms,
  VistaCotizacion,
  VistaCuentaDeCobro,
  VistaCreaEquipo,
  VistaSeleccionarEquipo,
  VistaEliminarEquipo,
  VistaEditarEquipo,
  VistaCrearUsuarios,
  VistaEliminarUsuario,
  VistaNoAutorizada,
} from "./Views";
import { Routes, Route, useLocation } from "react-router-dom";
import { ProtectedRoutes } from "./Components/ProtectedRoutes/ProtectedRoutes";
import NavBar from "./Components/NavBar/NavBar";

function App() {
  const location = useLocation();

  return (
    <div>
      <NavBar />
      <Routes>
        <Route
          path="/adminforms"
          element={
            <ProtectedRoutes>
              <AdminForms />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistacotizacion"
          element={
            <ProtectedRoutes
              allowedRoles={[
                "administrador",
                "gestorIntegral",
                "gestorFacturacion",
              ]}
            >
              <VistaCotizacion />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistacuentadecobro"
          element={
            <ProtectedRoutes
              allowedRoles={[
                "administrador",
                "gestorIntegral",
                "gestorFacturacion",
              ]}
            >
              <VistaCuentaDeCobro />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistacreaequipo"
          element={
            <ProtectedRoutes
              allowedRoles={["administrador", "gestorEditor", "gestorIntegral"]}
            >
              <VistaCreaEquipo />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistaseleccionarequipo"
          element={
            <ProtectedRoutes
              allowedRoles={["administrador", "gestorEditor", "gestorIntegral"]}
            >
              <VistaSeleccionarEquipo />
            </ProtectedRoutes>
          }
        />
        <Route
          exact
          path="/vistaeliminarequipo"
          element={
            <ProtectedRoutes
              allowedRoles={["administrador", "gestorEditor", "gestorIntegral"]}
            >
              <VistaEliminarEquipo />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistaeditarequipo"
          element={
            <ProtectedRoutes
              allowedRoles={["administrador", "gestorEditor", "gestorIntegral"]}
            >
              <VistaEditarEquipo />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistacrearusuarios"
          element={
            <ProtectedRoutes allowedRoles={["administrador"]}>
              <VistaCrearUsuarios />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistaeliminarusuario"
          element={
            <ProtectedRoutes allowedRoles={["administrador"]}>
              <VistaEliminarUsuario />
            </ProtectedRoutes>
          }
        />
        <Route path="/" element={<Home />} />
        <Route path="/Home" element={<Home />} />
        <Route exact path="/detail/:id" element={<Detail />} />
        <Route path="/vistanoautorizada" element={<VistaNoAutorizada />} />
      </Routes>
    </div>
  );
}

export default App;
