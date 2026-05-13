import { createSlice } from "@reduxjs/toolkit";

const cotizacionSlice = createSlice({
  name: "cotizacion",
  initialState: {
    value: {
      empresa: "",
      direccion: "",
      nit: "",
      fecha: "",
      items: [],
      transporte: "",
      valorTransporte: 0,
      subtotal: 0,
      iva: false,
      total: 0,
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

    setTotal: (state, action) => {
      state.value.total = action.payload;
    },
  },
});

export const { setFormCotizacion, setItems, setSubtotal, setTotal } =
  cotizacionSlice.actions;
export default cotizacionSlice.reducer;
