import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ref, onValue } from "firebase/database";
import { database } from "./Components/Firebase/Firebase.js";
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
  KioskHome,
  KioskDetail,
  KioskCart,
  VistaCotizacionesAdmin,
  VistaClientes,
} from "./Views";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoutes } from "./Components/ProtectedRoutes/ProtectedRoutes";
import NavBar from "./Components/NavBar/NavBar";
import KioskScreensaver from "./Components/KioskScreensaver/KioskScreensaver.jsx";
import { addToCart } from "./Store/Slices/cartSlice.js";
import { setCliente } from "./Store/Slices/clienteSlice";
import { setListaCotizaciones } from "./Store/Slices/cotizacionSlice";

function App() {
  const location = useLocation();
  const dispatch = useDispatch();
  const items = useSelector((state) => state.cart.items);
  const cliente = useSelector((state) => state.cliente);
  const initialized = useRef(false);
  const lastQuotationIdRef = useRef(null);
  const isKioskRoute = location.pathname.toLowerCase().includes("kiosk");

  useEffect(() => {
    // en modo kiosk el estado vive solo en Redux: no se hidrata desde localStorage
    if (isKioskRoute) return;

    if (items.length === 0) {
      const storedCart = localStorage.getItem("cart");
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        parsed.items.forEach((item) => {
          dispatch(addToCart(item));
        });
      }
    }

    const isClienteVacio =
      ["tipo", "nombre", "telefono", "identificacion"].every(
        (campo) => (cliente[campo] ?? "") === "",
      ) &&
      Object.values(cliente.direccion || {}).every((v) => v === "");
    if (isClienteVacio) {
      const storedCliente = localStorage.getItem("datosCliente");

      if (storedCliente) {
        const parsedCliente = JSON.parse(storedCliente);
        dispatch(setCliente(parsedCliente));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe hidratar una vez al montar la app
  }, [dispatch]);

  useEffect(() => {
    // en modo kiosk el carrito no se persiste: es de un solo cliente a la vez
    if (isKioskRoute) return;

    if (items.length > 0) {
      localStorage.setItem("cart", JSON.stringify({ items }));
    } else {
      localStorage.removeItem("cart");
    }
  }, [items, isKioskRoute]);

  useEffect(() => {
    const quotationsRef = ref(database, "cotizaciones");

    const unsubscribe = onValue(quotationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();

        const quotationsArray = Object.entries(data)
          .map(([id, value]) => ({
            id,
            items: value.items || [],
            ...value,
          }))
          .reverse();

        const newest = quotationsArray[0];

        if (initialized.current) {
          if (newest && newest.id !== lastQuotationIdRef.current) {
            lastQuotationIdRef.current = newest.id;

            const suppressNotificationSound =
              isKioskRoute ||
              location.pathname.toLowerCase().includes("vistacart");

            if (!suppressNotificationSound) {
              const audio = new Audio("/notification.mp3");
              audio.play().catch(() => {});
            }
          }
        } else {
          if (newest) lastQuotationIdRef.current = newest.id;
          initialized.current = true;
        }

        dispatch(setListaCotizaciones(quotationsArray));
      } else {
        dispatch(setListaCotizaciones([]));
      }
    });

    return () => unsubscribe();
  }, [dispatch, location.pathname, isKioskRoute]);

  return (
    <div>
      <NavBar />

      {isKioskRoute && <KioskScreensaver timeout={45000} />}

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
          path="/vistacotizacionesadmin"
          element={
            <ProtectedRoutes allowedRoles={["solicitudesCotizaciones"]}>
              <VistaCotizacionesAdmin />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistacotizacion"
          element={
            <ProtectedRoutes allowedRoles={["cotizacion"]}>
              <VistaCotizacion />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistacuentadecobro"
          element={
            <ProtectedRoutes allowedRoles={["cuentaCombro"]}>
              <VistaCuentaDeCobro />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistacreaequipo"
          element={
            <ProtectedRoutes allowedRoles={["crearEquipos"]}>
              <VistaCreaEquipo />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistaseleccionarequipo"
          element={
            <ProtectedRoutes allowedRoles={["eliminarEditarEquipos"]}>
              <VistaSeleccionarEquipo />
            </ProtectedRoutes>
          }
        />
        <Route
          exact
          path="/vistaeliminarequipo"
          element={
            <ProtectedRoutes allowedRoles={["eliminarEditarEquipos"]}>
              <VistaEliminarEquipo />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistaeditarequipo"
          element={
            <ProtectedRoutes allowedRoles={["eliminarEditarEquipos"]}>
              <VistaEditarEquipo />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistacrearusuarios"
          element={
            <ProtectedRoutes allowedRoles={["crearUsuarios"]}>
              <VistaCrearUsuarios />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistaeliminarusuario"
          element={
            <ProtectedRoutes allowedRoles={["eliminarUsuarios"]}>
              <VistaEliminarUsuario />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistaclientes"
          element={
            <ProtectedRoutes allowedRoles={["clientes"]}>
              <VistaClientes />
            </ProtectedRoutes>
          }
        />
        <Route path="/" element={<Home />} />
        <Route path="/Home" element={<Home />} />
        <Route exact path="/detail/:id" element={<Detail />} />
        <Route path="/vistanoautorizada" element={<VistaNoAutorizada />} />
        <Route path="/vistacart" element={<VistaCart />} />
        <Route path="/kioskhome" element={<KioskHome />} />
        <Route path="/kioskdetail/:id" element={<KioskDetail />} />
        <Route path="/kioskcart" element={<KioskCart />} />
      </Routes>
    </div>
  );
}

export default App;
