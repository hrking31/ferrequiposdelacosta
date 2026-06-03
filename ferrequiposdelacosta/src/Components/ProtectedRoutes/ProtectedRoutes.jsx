import { useAuth } from "../../Context/AuthContext";
import { Navigate } from "react-router-dom";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";

export function ProtectedRoutes({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingLogo />;
  }

  if (!user) {
    return <Navigate to="/home" />;
  }

  return children;
}