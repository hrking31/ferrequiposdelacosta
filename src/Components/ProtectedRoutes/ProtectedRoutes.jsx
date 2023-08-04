import { useAuth } from "../../Context/AuthContext";
import { Navigate } from "react-router-dom";
import LoadingCircle from "../LoadingCircle/LoadingCircle";

export function ProtectedRoutes({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingCircle />;
  }

  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}
