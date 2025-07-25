import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  tipo: "",
  nombre: "",
  identificacion: "",
  direccion: {
    departamento: "",
    municipio: "",
    detalle: "",
    otrosDatos: "",
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
      state.direccion = {
        departamento: "",
        municipio: "",
        detalle: "",
        otrosDatos: "",
      };
    },

    actualizarDireccion: (state, action) => {
      const { departamento, municipio, detalle, otrosDatos } = action.payload;
      if (departamento !== undefined)
        state.direccion.departamento = departamento;
      if (municipio !== undefined) state.direccion.municipio = municipio;
      if (detalle !== undefined) state.direccion.detalle = detalle;
      if (otrosDatos !== undefined) state.direccion.otrosDatos = otrosDatos;
    },
  },
});

export const { setCliente, clearCliente, actualizarDireccion } =
  clienteSlice.actions;
export default clienteSlice.reducer;
