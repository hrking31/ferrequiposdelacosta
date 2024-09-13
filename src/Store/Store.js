import { configureStore } from "@reduxjs/toolkit";
import darkModeReducer from "./Slices/darkModeSlice";
import equiposReducer from "./Slices/equiposSlice";
import equipoDetailReducer from "./Slices/detailSlice";
import passwordReducer from "./Slices/passwordSlice";
import formReducer from "./Slices/formSlice";
import searchReducer from "./Slices/searchSlice";
import cotizacionReducer from "./Slices/cotizacionSlice";
import cuentacobroReducer from "./Slices/cuentacobroSlice";
import loadingReducer from "./Slices/LoadingSlice";
import selectedReducer from "./Slices/selectedSlice";

export default configureStore({
  reducer: {
    darkMode: darkModeReducer,
    equipos: equiposReducer,
    equipoDetail: equipoDetailReducer,
    password: passwordReducer,
    form: formReducer,
    search: searchReducer,
    cotizacion: cotizacionReducer,
    cuentacobro: cuentacobroReducer,
    loading: loadingReducer,
    selected: selectedReducer,
  },
});
