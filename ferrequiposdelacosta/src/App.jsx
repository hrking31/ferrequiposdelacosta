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
  VistaCuentasCobro,
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
  VistaClienteDetalle,
  VistaSeguimientoClientes,
} from "./Views";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoutes } from "./Components/ProtectedRoutes/ProtectedRoutes";
import NavBar from "./Components/NavBar/NavBar";
import KioskScreensaver from "./Components/KioskScreensaver/KioskScreensaver.jsx";
import { addToCart } from "./Store/Slices/cartSlice.js";
import { setCliente } from "./Store/Slices/clienteSlice";

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

  // La campanita de solicitudes nuevas.
  //
  // Antes esto escuchaba TODAS las cotizaciones para enterarse de que había una
  // nueva: cada arranque de la app descargaba el historial entero, incluso para
  // quien solo entraba a facturación. Ahora las cotizaciones viven en Firestore
  // (ver Components/AdminCotizaciones/cotizacionesDb.js) y acá solo se escucha
  // el TIMBRE: un dato de dos campos en la base en tiempo real que la Cloud
  // Function crearCotizacion cambia con cada solicitud. Enterarse ya no cuesta
  // ninguna lectura de Firestore.
  //
  // El timbre no se apaga nunca. Cada dispositivo se acuerda de cuál fue el
  // último que le sonó: si el de la base es otro, suena y lo anota. Así dos
  // personas con la app abierta escuchan las dos, y quien abra después no se
  // encuentra con un timbre "ya usado" que no le suena.
  useEffect(() => {
    const timbreRef = ref(database, "timbreCotizaciones");

    const unsubscribe = onValue(timbreRef, (snapshot) => {
      const timbre = snapshot.val();
      const idSonado = timbre?.cotizacionId ?? null;

      // La primera lectura es el estado actual del timbre, no un pedido nuevo:
      // solo se anota, para no sonar cada vez que alguien abre la app.
      if (!initialized.current) {
        lastQuotationIdRef.current = idSonado;
        initialized.current = true;
        return;
      }

      if (!idSonado || idSonado === lastQuotationIdRef.current) return;

      lastQuotationIdRef.current = idSonado;

      const suppressNotificationSound =
        isKioskRoute || location.pathname.toLowerCase().includes("vistacart");

      if (!suppressNotificationSound) {
        const audio = new Audio("/notification.mp3");
        audio.play().catch(() => {});
      }
    });

    return () => unsubscribe();
  }, [location.pathname, isKioskRoute]);

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
          path="/vistacuentascobro"
          element={
            <ProtectedRoutes allowedRoles={["cuentaCombro"]}>
              <VistaCuentasCobro />
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
        <Route
          path="/vistaclientes/:id"
          element={
            <ProtectedRoutes allowedRoles={["clientes"]}>
              <VistaClienteDetalle />
            </ProtectedRoutes>
          }
        />
        <Route
          path="/vistaseguimientoclientes"
          element={
            <ProtectedRoutes allowedRoles={["gestionCartera"]}>
              <VistaSeguimientoClientes />
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
