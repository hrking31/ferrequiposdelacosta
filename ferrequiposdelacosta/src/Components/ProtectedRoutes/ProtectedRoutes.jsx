import { lazy, Suspense } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../../Context/useAuth";
import { Navigate } from "react-router-dom";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import VistaNoAutorizada from "../../Views/VistaNoAutorizada/VistaNoAutorizada";
import VistaConfirmarCorreo from "../../Views/VistaConfirmarCorreo/VistaConfirmarCorreo";
import { EXIGIR_DOS_PASOS } from "../../Utils/dosPasos";

// Se carga solo cuando hace falta: se usa una vez por persona y trae la
// librería que dibuja el código cuadrado, que nadie más necesita descargar.
const VistaActivarDosPasos = lazy(() =>
  import("../../Views/VistaActivarDosPasos/VistaActivarDosPasos"),
);
import RolesPermisos from "../../Components/RolesPermisos/RolesPermisos";

export function ProtectedRoutes({ children, allowedRoles }) {
  const { user, loading, correoVerificado, dosPasos } = useAuth();

  if (loading) {
    return <LoadingLogo />;
  }

  if (!user) {
    return <Navigate to="/home" />;
  }

  // Sin el correo confirmado las reglas no dejan leer nada: en vez de una
  // pantalla llena de errores, la de confirmarlo.
  if (!correoVerificado) {
    return <VistaConfirmarCorreo />;
  }

  // Los dos pasos son obligatorios: sin ellos, tampoco hay panel.
  if (EXIGIR_DOS_PASOS && dosPasos !== "activo") {
    return (
      <Suspense fallback={<LoadingLogo />}>
        <VistaActivarDosPasos />
      </Suspense>
    );
  }

  const permisosDelUsuario = RolesPermisos[user?.role] || [];

  if (
    allowedRoles &&
    !allowedRoles.every((permiso) => permisosDelUsuario.includes(permiso))
  ) {
    return <VistaNoAutorizada />;
  }

  return children;
}

ProtectedRoutes.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
};
