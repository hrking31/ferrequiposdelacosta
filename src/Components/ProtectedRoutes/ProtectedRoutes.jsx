import { useAuth } from "../../Context/AuthContext";
import { Navigate } from "react-router-dom";
import LoadingCircle from "../LoadingLogo/LoadingLogo";

export function ProtectedRoutes({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingLogo />;
  }

  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}
