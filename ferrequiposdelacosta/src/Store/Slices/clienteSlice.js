import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  tipo: "",
  nombre: "",
  identificacion: "",
  direccion: {
    detalle: "",
    otrosDatos: "",
    barrio: "",
    departamento: "",
    municipio: "",
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

    actualizarDireccion: (state, action) => {
      const { departamento, municipio, detalle, barrio, otrosDatos } =
        action.payload;
      if (detalle !== undefined) state.direccion.detalle = detalle;
      if (barrio !== undefined) state.direccion.barrio = barrio;
      if (otrosDatos !== undefined) state.direccion.otrosDatos = otrosDatos;
      if (departamento !== undefined)
        state.direccion.departamento = departamento;
      if (municipio !== undefined) state.direccion.municipio = municipio;
    },
  },
});

export const { setCliente, clearCliente, actualizarDireccion } =
  clienteSlice.actions;
export default clienteSlice.reducer;
