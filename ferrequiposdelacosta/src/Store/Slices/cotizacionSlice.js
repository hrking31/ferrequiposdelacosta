import { createSlice } from "@reduxjs/toolkit";

const initialValue = {
  tipo: "persona",
  empresa: "",
  nit: "",
  telefono: "",
  direccion: "",
  barrio: "",
  otrosDatos: "",
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

    kioskCotizacion: (state, action) => {
      const quotation = action.payload;

      state.value.items = (quotation.equipos || []).map((equipo) => ({
        description: equipo.name,
        quantity: equipo.quantity,
        day: equipo.days,
        price: 0,
        subtotal: 0,
      }));

      state.value.fecha = new Date().toISOString().split("T")[0];
      state.value.tipo = quotation.cliente?.tipo || "persona";
      state.value.nit = quotation.cliente?.identificacion || "";
      state.value.empresa = quotation.cliente?.nombre || "";
      state.value.telefono = quotation.cliente?.telefono || "";
      state.value.direccion = quotation.cliente?.direccion?.detalle || "";
      state.value.barrio = quotation.cliente?.direccion?.barrio || "";
      state.value.otrosDatos = quotation.cliente?.direccion?.otrosDatos || "";
      state.value.transporte = quotation.transporte || "Sin transporte";
      state.value.deposito = quotation.cliente?.deposito ?? true;
      state.value.iva = quotation.cliente?.iva ?? true;
      state.value.valorTransporte = 0;
      state.value.valorDeposito = 0;
      state.value.ivaNumero = 0;
      state.value.subtotalNumero = 0;
      state.value.subtotal = "$0";
      state.value.totalNumero = 0;
      state.value.total = "$0";
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
  kioskCotizacion,
  setFormCotizacion,
  setItems,
  setSubtotal,
  setSubtotalNumero,
  setIvaNumero,
  setTotal,
  setTotalNumero,
  setListaCotizaciones,
} = cotizacionSlice.actions;

export default cotizacionSlice.reducer;
