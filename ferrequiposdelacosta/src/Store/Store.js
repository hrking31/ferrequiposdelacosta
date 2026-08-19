import { configureStore } from "@reduxjs/toolkit";
import equiposReducer from "./Slices/equiposSlice";
import equipoDetailReducer from "./Slices/detailSlice";
import passwordReducer from "./Slices/passwordSlice";
import searchReducer from "./Slices/searchSlice";
import cotizacionReducer from "./Slices/cotizacionSlice";
import cuentacobroReducer from "./Slices/cuentacobroSlice";
import userReducer from "./Slices/userSlice";
import installAppReducer from "./Slices/installAppSlice";
import cartReducer from "./Slices/cartSlice";
import clienteReducer from "./Slices/clienteSlice";
import presenceReducer from "./Slices/presenciaSlice";
import kpisReducer from "./Slices/kpisSlice";

const reducer = {
  equipos: equiposReducer,
  equipoDetail: equipoDetailReducer,
  password: passwordReducer,
  search: searchReducer,
  cotizacion: cotizacionReducer,
  cuentacobro: cuentacobroReducer,
  user: userReducer,
  installApp: installAppReducer,
  cart: cartReducer,
  cliente: clienteReducer,
  presence: presenceReducer,
  kpis: kpisReducer,
};

// La app usa el store de abajo, uno solo para toda la sesión. Esta función
// existe para las PRUEBAS: cada una arma el suyo y arranca de cero, así lo que
// hace una no se le aparece a la siguiente. Sale del mismo mapa de reducers,
// que es el punto: si mañana se agrega un slice, las pruebas lo tienen sin que
// nadie se acuerde de copiarlo.
export const crearStore = (preloadedState) =>
  configureStore({ reducer, preloadedState });

export default crearStore();
