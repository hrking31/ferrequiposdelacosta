import "./App.css";
import { Home, Landing, Detail, Admin } from "./Views";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./Context/AuthContext";
import Register from "./Components/Register/Register";
import Login from "./Components/Login/Login";
import { ProtectedRoutes } from "./Components/ProtectedRoutes/ProtectedRoutes";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoutes>
              <Admin />
            </ProtectedRoutes>
          }
        />
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route exact path="/detail/:id" element={Detail} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
