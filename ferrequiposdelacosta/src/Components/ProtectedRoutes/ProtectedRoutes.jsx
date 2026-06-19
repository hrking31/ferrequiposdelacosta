import { useAuth } from "../../Context/AuthContext";
import { Navigate } from "react-router-dom";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import VistaNoAutorizada from "../../Views/VistaNoAutorizada/VistaNoAutorizada";

export function ProtectedRoutes({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingLogo />;
  }

  if (!user) {
    return <Navigate to="/home" />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <VistaNoAutorizada />;
  }

  return children;
}
