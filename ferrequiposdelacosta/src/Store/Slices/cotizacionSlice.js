import { createSlice } from "@reduxjs/toolkit";

const cotizacionSlice = createSlice({
  name: "cotizacion",
  initialState: {
    value: {
      empresa: "",
      direccion: "",
      barrio:"",
      telefono:"",
      nit: "",
      fecha: "",
      items: [],
      transporte: "",
      valorTransporte: 0,
      deposito: true,
      valorDeposito: 0,
      iva: true,
      subtotalNumero: 0,
      ivaNumero: 0,
      totalNumero: 0,
      subtotal: "$0",
      total: "$0",
    },
  },
  reducers: {
    setFormCotizacion: (state, action) => {
      state.value = action.payload;
    },

    setItems: (state, action) => {
      state.value.items = action.payload;
    },

    setSubtotal: (state, action) => {
      state.value.subtotal = action.payload;
    },

    setSubtotalNumero: (state, action) => {
      state.value.subtotalNumero = action.payload;
    },

    setIvaNumero: (state, action) => {
      state.value.ivaNumero = action.payload;
    },

    setTotal: (state, action) => {
      state.value.total = action.payload;
    },

    setTotalNumero: (state, action) => {
      state.value.totalNumero = action.payload;
    },
  },
});

export const { setFormCotizacion, setItems, setSubtotal, setSubtotalNumero, setIvaNumero, setTotal, setTotalNumero } =
  cotizacionSlice.actions;
export default cotizacionSlice.reducer;
