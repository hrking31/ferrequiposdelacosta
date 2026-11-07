import { Navigate } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
import Login from "../../Components/Login/Login";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import PuertaCarne from "../../Components/PuertaCarne/PuertaCarne";

// LA PUERTA DEL PERSONAL: la dirección sola de la app del personal
// (personal.ferrequiposdelacosta.com, desde el 2026-11-07). Antes el inicio
// de sesión colgaba de "Mi cuenta" en el menú de la tienda, y al cliente le
// hacía pensar que alquilar pedía una cuenta; el 2026-11-06 pasó a /acceso,
// dentro de la misma app de la tienda, y al día siguiente a su propia app.
//
// Es un carné de empleado que cae colgado de su cinta, con el formulario
// adentro (PuertaCarne + Login). Con la sesión ya abierta no hay nada que
// hacer acá: pasa al menú, sin animación.
export default function VistaAcceso() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingLogo />;
  if (user) return <Navigate to="/adminforms" replace />;

  return (
    <PuertaCarne>
      <Login />
    </PuertaCarne>
  );
}
