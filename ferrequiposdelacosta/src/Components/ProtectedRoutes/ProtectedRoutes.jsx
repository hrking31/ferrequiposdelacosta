import PropTypes from "prop-types";
import { useAuth } from "../../Context/useAuth";
import { Navigate } from "react-router-dom";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import VistaNoAutorizada from "../../Views/VistaNoAutorizada/VistaNoAutorizada";
import RolesPermisos from "../../Components/RolesPermisos/RolesPermisos";

export function ProtectedRoutes({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingLogo />;
  }

  if (!user) {
    return <Navigate to="/home" />;
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
