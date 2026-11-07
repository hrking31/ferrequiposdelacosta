import { useEffect } from "react";
import { useLocation, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Home from "./Views/Home/Home";
import Detail from "./Views/Detail/Detail";
import VistaCart from "./Views/VistaCart/VistaCart";
import KioskHome from "./Views/KioskHome/KioskHome";
import KioskDetail from "./Views/KioskDetail/KioskDetail";
import KioskCart from "./Views/KioskCart/KioskCart";
import NavBar from "./Components/NavBar/NavBar";
import KioskScreensaver from "./Components/KioskScreensaver/KioskScreensaver.jsx";
import { addToCart } from "./Store/Slices/cartSlice.js";
import { setCliente } from "./Store/Slices/clienteSlice";

// LA TIENDA (2026-11-07): lo que ve el cliente, y nada más. Las pantallas del
// personal viven en AppPersonal, en otra dirección. Cada pantalla se importa
// de su archivo —no del índice de Views— para que la tienda no cargue el
// código del personal.
function AppTienda() {
  const location = useLocation();
  const dispatch = useDispatch();
  const items = useSelector((state) => state.cart.items);
  const cliente = useSelector((state) => state.cliente);
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

  return (
    <div>
      <NavBar />

      {isKioskRoute && <KioskScreensaver timeout={45000} />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/detail/:id" element={<Detail />} />
        <Route path="/vistacart" element={<VistaCart />} />
        <Route path="/kioskhome" element={<KioskHome />} />
        <Route path="/kioskdetail/:id" element={<KioskDetail />} />
        <Route path="/kioskcart" element={<KioskCart />} />
        {/* Cualquier otra dirección —un favorito viejo del menú, por
            ejemplo— cae en la tienda. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default AppTienda;
