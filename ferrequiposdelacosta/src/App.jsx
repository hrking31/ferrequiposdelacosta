import {
  Home,
  // Landing,
  Detail,
  AdminForms,
  VistaCotizacion,
  VistaCuentaDeCobro,
  VistaDb,
  VistaEditarEquipo,
  VistaEliminarEquipo,
} from "./Views";
import { Routes, Route, useLocation } from "react-router-dom";
import { ProtectedRoutes } from "./Components/ProtectedRoutes/ProtectedRoutes";
import Login from "./Components/Login/Login";
import NavBar from "./Components/NavBar/NavBar";

function App() {
  const location = useLocation();

  return (
    <div>
      {location.pathname === "/" ? null : <NavBar />}
      {location.pathname === "/" && <NavBar />}
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoutes>
              <AdminForms />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistacotizacion"
          element={
            <ProtectedRoutes>
              <VistaCotizacion />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistacuentadecobro"
          element={
            <ProtectedRoutes>
              <VistaCuentaDeCobro />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistabasedatos"
          element={
            <ProtectedRoutes>
              <VistaDb />
            </ProtectedRoutes>
          }
        />
        {/* <Route
          exact
          path="/vistaeliminarequipo/:name"
          element={
            <ProtectedRoutes>
              <VistaEliminarEquipo />
            </ProtectedRoutes>
          }
        /> */}
        <Route
          path="/vistaeliminarequipo"
          element={
            // <ProtectedRoutes>
            <VistaEliminarEquipo />
            // </ProtectedRoutes>
          }
        />
        <Route
          path="/vistaeditarequipo"
          element={
            // <ProtectedRoutes>
            <VistaEditarEquipo />
            // </ProtectedRoutes>
          }
        />
        {/* <Route path="/" element={<Landing />} /> */}
        <Route path="/" element={<Home />} />
        <Route path="/Home" element={<Home />} />
        {/* <Route path="/register" element={<Register />} /> */}
        <Route path="/login" element={<Login />} />
        <Route exact path="/detail/:name" element={<Detail />} />
      </Routes>
    </div>
  );
}

export default App;
