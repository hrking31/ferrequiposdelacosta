import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  tipo: "",
  nombre: "",
  telefono: "",
  identificacion: "",
  direccion: {
    detalle: "",
    otrosDatos: "",
    barrio: "",
    departamento: "",
    municipio: "",
  },
  iva: true,
  deposito: true,
};

const clienteSlice = createSlice({
  name: "cliente",
  initialState,
  reducers: {
    setCliente: (state, action) => {
      const {
        tipo,
        nombre,
        telefono,
        identificacion,
        direccion,
        iva,
        deposito,
      } = action.payload;
      state.tipo = tipo;
      state.nombre = nombre;
      state.telefono = telefono;
      state.identificacion = identificacion;
      state.direccion = direccion;
      state.iva = iva;
      state.deposito = deposito;
    },

    actualizarCliente: (state, action) => {
      const { tipo, nombre, telefono, identificacion } = action.payload;
      if (tipo !== undefined) state.tipo = tipo;
      if (nombre !== undefined) state.nombre = nombre;
      if (telefono !== undefined) state.telefono = telefono;
      if (identificacion !== undefined) state.identificacion = identificacion;
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

    clearCliente: () => initialState,
  },
});

export const {
  setCliente,
  clearCliente,
  actualizarCliente,
  actualizarDireccion,
} = clienteSlice.actions;
export default clienteSlice.reducer;
