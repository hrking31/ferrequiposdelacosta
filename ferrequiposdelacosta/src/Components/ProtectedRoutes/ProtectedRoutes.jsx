import { useAuth } from "../../Context/AuthContext";
import { Navigate } from "react-router-dom";

export function ProtectedRoutes({ children }) {
  // const { user, loading } = useAuth();
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}
