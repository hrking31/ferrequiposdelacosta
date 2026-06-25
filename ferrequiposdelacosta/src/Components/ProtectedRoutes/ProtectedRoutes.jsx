import { useAuth } from "../../Context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import VistaNoAutorizada from "../../Views/VistaNoAutorizada/VistaNoAutorizada";
import RolesPermisos from "../../Components/RolesPermisos/RolesPermisos";

export function ProtectedRoutes({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingLogo />;
  }

  if (!user) {
    return <Navigate to="/home" state={{ from: location }} replace />;
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
