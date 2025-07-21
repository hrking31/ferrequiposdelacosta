import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  tipo: "",
  nombre: "",
  identificacion: "",
  // direccion: "",
  direccion: {
    departamento: "",
    municipio: "",
    detalle: "",
  },
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
      // state.direccion = "";
      state.direccion = {
        departamento: "",
        municipio: "",
        detalle: "",
      };
    },
    // actualizarDireccion: (state, action) => {
    //   state.direccion = action.payload;
    // },
    actualizarDireccion: (state, action) => {
      const { departamento, municipio, detalle } = action.payload;
      if (departamento !== undefined)
        state.direccion.departamento = departamento;
      if (municipio !== undefined) state.direccion.municipio = municipio;
      if (detalle !== undefined) state.direccion.detalle = detalle;
    },
  },
});

export const { setCliente, clearCliente, actualizarDireccion } = clienteSlice.actions;
export default clienteSlice.reducer;
