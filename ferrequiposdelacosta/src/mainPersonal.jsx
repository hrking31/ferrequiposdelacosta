// LA APP DEL PERSONAL (personal.ferrequiposdelacosta.com): inicio de sesión,
// menú, cotizaciones, cuentas de cobro, equipos, usuarios y clientes. La
// tienda es otra app (mainTienda.jsx). Ver vite.config.js.
import AppPersonal from "./AppPersonal.jsx";
import { arrancar } from "./arrancar.jsx";
import { AuthProvider } from "./Context/AuthContext";

arrancar(
  <AuthProvider>
    <AppPersonal />
  </AuthProvider>,
);
