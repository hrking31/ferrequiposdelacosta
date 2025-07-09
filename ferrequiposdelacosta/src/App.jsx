import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  VistaCart,
} from "./Views";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoutes } from "./Components/ProtectedRoutes/ProtectedRoutes";
import NavBar from "./Components/NavBar/NavBar";
import { addToCart } from "./Store/Slices/cartSlice.js";
import { setCliente } from "./Store/Slices/clienteSlice";

function App() {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.cart.items);
  const cliente = useSelector((state) => state.cliente);
  const navbarRef = useRef(null);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);

  useEffect(() => {
    if (items.length === 0) {
      const storedCart = localStorage.getItem("cart");
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        parsed.items.forEach((item) => {
          dispatch(addToCart(item));
        });
      }
    }

    const isClienteVacio = Object.values(cliente).every(
      (value) => value === ""
    );
    if (isClienteVacio) {
      const storedCliente = localStorage.getItem("datosCliente");

      if (storedCliente) {
        const parsedCliente = JSON.parse(storedCliente);
        dispatch(setCliente(parsedCliente));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNavbarVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    if (navbarRef.current) {
      observer.observe(navbarRef.current);
    }

    return () => {
      if (navbarRef.current) {
        observer.unobserve(navbarRef.current);
      }
    };
  }, []);

  return (
    <div>
      <div ref={navbarRef}>
        <NavBar />
      </div>

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
        <Route
          path="/vistacart"
          element={<VistaCart navbarVisible={isNavbarVisible} />}
        />
      </Routes>
    </div>
  );
}

export default App;
