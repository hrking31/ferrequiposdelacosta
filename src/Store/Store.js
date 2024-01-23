import { configureStore } from "@reduxjs/toolkit";
import darkModeReducer from "./Slices/darkModeSlice";
import equiposReducer from "./Slices/equiposSlice";
import equipoDetailReducer from "./Slices/detailSlice";
import passwordReducer from "./Slices/passwordSlice";
import formReducer from "./Slices/formSlice";
import nameImagenReducer from "./Slices/nameImagenSlice";
import cotizacionReducer from "./Slices/cotizacionSlice";
import loadingSlice from "./slices/LodingSlice";

export default configureStore({
  reducer: {
    darkMode: darkModeReducer,
    equipos: equiposReducer,
    equipoDetail: equipoDetailReducer,
    password: passwordReducer,
    form: formReducer,
    nameImagen: nameImagenReducer,
    cotizacion: cotizacionReducer,
    loading: loadingSlice,
  },
});
