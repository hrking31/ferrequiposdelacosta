import { Home, Landing, Detail, AdminForms } from "./Views";
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./Context/AuthContext";
// import Register from "./Components/Register/Register";
import { ProtectedRoutes } from "./Components/ProtectedRoutes/ProtectedRoutes";
import Login from "./Components/Login/Login";
import NavBar from "./Components/NavBar/NavBar";

function App() {
  const location = useLocation();

  return (
    <div>
      {location.pathname === "/" ? null : <NavBar />}
      {/* {location.pathname === "/" && <NavBar />} */}
      <AuthProvider>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoutes>
                <AdminForms />
              </ProtectedRoutes>
            }
          />
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          {/* <Route path="/register" element={<Register />} /> */}
          <Route path="/login" element={<Login />} />
          <Route exact path="/detail/:name" element={<Detail />} />
        </Routes>
      </AuthProvider>
    </div>
  );
}

export default App;
