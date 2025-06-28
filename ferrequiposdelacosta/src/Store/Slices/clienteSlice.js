import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  tipo: "",
  nombre: "",
  identificacion: "",
  direccion: "",
};

const clienteSlice = createSlice({
  name: "cliente",
  initialState,
  reducers: {
    setCliente: (state, action) => {
      const { tipo, nombre, identificacion, direccion } = action.payload;
      state.tipo = tipo;
      state.nombre = nombre;
      state.identificacion = identificacion;
      state.direccion = direccion;
    },
    clearCliente: (state) => {
      state.tipo = "";
      state.nombre = "";
      state.identificacion = "";
      state.direccion = "";
    },
  },
});

export const { setCliente, clearCliente } = clienteSlice.actions;
export default clienteSlice.reducer;
