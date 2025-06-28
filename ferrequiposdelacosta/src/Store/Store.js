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

export default configureStore({
  reducer: {
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
  },
});
