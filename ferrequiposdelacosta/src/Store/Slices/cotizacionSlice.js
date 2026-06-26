import { createSlice } from "@reduxjs/toolkit";

const initialValue = {
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
  atendidoPor: "",
  status: "pendiente",
  id: null,
  cotizacionId: null,
  createdAt: null,
};

const getInitialState = () => {
  try {
    const savedCotizacion = localStorage.getItem("sesion_trabajo_cotizacion");
    if (savedCotizacion) {
      return JSON.parse(savedCotizacion);
    }
  } catch (error) {
    console.error("Error al leer de localStorage:", error);
  }
  return initialValue;
};

const cotizacionSlice = createSlice({
  name: "cotizacion",

  initialState: {
    listaCotizaciones: [],
    value: getInitialState(),
  },

  reducers: {
    resetCotizacion: (state) => {
      state.value = initialValue;
      localStorage.removeItem("sesion_trabajo_cotizacion");
    },

    setListaCotizaciones: (state, action) => {
      state.listaCotizaciones = action.payload;
    },

    setCotizacionActual: (state, action) => {
      state.value = action.payload;
      localStorage.setItem(
        "sesion_trabajo_cotizacion",
        JSON.stringify(action.payload),
      );
    },

    setFormCotizacion: (state, action) => {
      state.value = {
        ...state.value,
        ...action.payload,
      };
      localStorage.setItem(
        "sesion_trabajo_cotizacion",
        JSON.stringify(state.value),
      );
    },

    setAtendidoPor: (state, action) => {
      state.value.atendidoPor = action.payload;
      localStorage.setItem(
        "sesion_trabajo_cotizacion",
        JSON.stringify(state.value),
      );
    },

    setItems: (state, action) => {
      state.value.items = action.payload;
      localStorage.setItem(
        "sesion_trabajo_cotizacion",
        JSON.stringify(state.value),
      );
    },

    setSubtotal: (state, action) => {
      state.value.subtotal = action.payload;
      localStorage.setItem(
        "sesion_trabajo_cotizacion",
        JSON.stringify(state.value),
      );
    },

    setSubtotalNumero: (state, action) => {
      state.value.subtotalNumero = action.payload;
      localStorage.setItem(
        "sesion_trabajo_cotizacion",
        JSON.stringify(state.value),
      );
    },

    setIvaNumero: (state, action) => {
      state.value.ivaNumero = action.payload;
      localStorage.setItem(
        "sesion_trabajo_cotizacion",
        JSON.stringify(state.value),
      );
    },

    setTotal: (state, action) => {
      state.value.total = action.payload;
      localStorage.setItem(
        "sesion_trabajo_cotizacion",
        JSON.stringify(state.value),
      );
    },

    setTotalNumero: (state, action) => {
      state.value.totalNumero = action.payload;
      localStorage.setItem(
        "sesion_trabajo_cotizacion",
        JSON.stringify(state.value),
      );
    },
  },
});

export const {
  resetCotizacion,
  setListaCotizaciones,
  setCotizacionActual,
  setFormCotizacion,
  setAtendidoPor,
  setItems,
  setSubtotal,
  setSubtotalNumero,
  setIvaNumero,
  setTotal,
  setTotalNumero,
} = cotizacionSlice.actions;

export default cotizacionSlice.reducer;
