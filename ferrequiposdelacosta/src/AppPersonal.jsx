import { useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { database } from "./Components/Firebase/Firebase.js";
import AdminForms from "./Views/AdminForms/AdminForms";
import VistaCotizacion from "./Views/VistaCotizacion/VistaCotizacion";
import VistaCuentaDeCobro from "./Views/VistaCuentaDeCobro/VistaCuentaDeCobro";
import VistaCuentasCobro from "./Views/VistaCuentasCobro/VistaCuentasCobro";
import VistaEquipos from "./Views/VistaEquipos/VistaEquipos";
import VistaUsuarios from "./Views/VistaUsuarios/VistaUsuarios";
import VistaNoAutorizada from "./Views/VistaNoAutorizada/VistaNoAutorizada";
import VistaCotizacionesAdmin from "./Views/VistaCotizacionesAdmin/VistaCotizacionesAdmin";
import VistaClientes from "./Views/VistaClientes/VistaClientes";
import VistaClienteDetalle from "./Views/VistaClienteDetalle/VistaClienteDetalle";
import VistaSeguimientoClientes from "./Views/VistaSeguimientoClientes/VistaSeguimientoClientes";
import VistaAcceso from "./Views/VistaAcceso/VistaAcceso";
import { ProtectedRoutes } from "./Components/ProtectedRoutes/ProtectedRoutes";

// LA APP DEL PERSONAL (2026-11-07): todo lo que no es la tienda. La dirección
// sola es la puerta: sin sesión, el inicio de sesión; con sesión, el menú.
// Cada pantalla se importa de su archivo, igual que en AppTienda.
function AppPersonal() {
  const initialized = useRef(false);
  const lastQuotationIdRef = useRef(null);

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
  //
  // Suena solo en esta app: antes, con la tienda y el personal juntos, había
  // que callarlo en el kiosco y en el carrito, donde está el cliente.
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

      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
    });

    return () => unsubscribe();
  }, []);

  return (
    <Routes>
      {/* La puerta: ver VistaAcceso. */}
      <Route path="/" element={<VistaAcceso />} />
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
      {/* Crear, ver, editar y eliminar equipos, en una sola pantalla
          (2026-10-26; crear desde el 2026-10-29): la lista, crear, la
          ficha de uno y su editor, cada uno en su dirección. */}
      <Route
        path="/vistaequipos/:id?"
        element={
          <ProtectedRoutes allowedRoles={["eliminarEditarEquipos"]}>
            <VistaEquipos />
          </ProtectedRoutes>
        }
      />
      <Route
        path="/vistaequipos/nuevo"
        element={
          <ProtectedRoutes allowedRoles={["crearEquipos"]}>
            <VistaEquipos creando />
          </ProtectedRoutes>
        }
      />
      <Route
        path="/vistaequipos/:id/editar"
        element={
          <ProtectedRoutes allowedRoles={["eliminarEditarEquipos"]}>
            <VistaEquipos editando />
          </ProtectedRoutes>
        }
      />
      {/* Crear, ver, editar y eliminar usuarios, en una sola pantalla
          (2026-10-28). Una sola ruta: la lista, crear, la ficha y el
          editor cuelgan de ella (ver VistaUsuarios). */}
      <Route
        path="/vistausuarios/*"
        element={
          <ProtectedRoutes allowedRoles={["crearUsuarios", "eliminarUsuarios"]}>
            <VistaUsuarios />
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
      <Route path="/vistanoautorizada" element={<VistaNoAutorizada />} />
      {/* Cualquier otra dirección vuelve a la puerta. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppPersonal;
