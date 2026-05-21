import { createSlice } from "@reduxjs/toolkit";

const initialValue = {
  id: null,
  tipo: "persona",
  empresa: "",
  nit: "",
  telefono: "",
  direccion: "",
  barrio: "",
  otrosDatos: "",
  departamento: "",
  municipio: "",
  fecha: "",
  items: [],
  transporte: "",
  valorTransporte: 0,
  deposito: true,
  valorDeposito: 0,
  iva: true,
  ivaNumero: 0,
  subtotalNumero: 0,
  subtotal: "$0",
  totalNumero: 0,
  total: "$0",
  cotizacionId: null,
  status: "pendiente",
};

const cotizacionSlice = createSlice({
  name: "cotizacion",

  initialState: {
    listaCotizaciones: [],
    value: initialValue,
  },

  reducers: {
    resetCotizacion: (state) => {
      state.value = initialValue;
    },

    setListaCotizaciones: (state, action) => {
      state.listaCotizaciones = action.payload;
    },

    setCotizacionActual: (state, action) => {
     state.value = action.payload;
    },

    setFormCotizacion: (state, action) => {
      state.value = {
        ...state.value,
        ...action.payload,
      };
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

export const {
  resetCotizacion,
  setListaCotizaciones,
  setCotizacionActual,
  setFormCotizacion,
  setItems,
  setSubtotal,
  setSubtotalNumero,
  setIvaNumero,
  setTotal,
  setTotalNumero,
} = cotizacionSlice.actions;

export default cotizacionSlice.reducer;
