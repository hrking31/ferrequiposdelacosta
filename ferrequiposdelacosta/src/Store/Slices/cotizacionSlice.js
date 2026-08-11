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
  // Con qué estado vuelve a quedar si se sale sin guardar. Lo calcula el buzón
  // al abrirla (ver Utils/cotizacionEstado).
  statusPrevio: null,
  id: null,
  cotizacionId: null,
  createdAt: null,
};

const CLAVE = "sesion_trabajo_cotizacion";
// La cotización tal como se abrió. Comparar el formulario contra esta foto es
// lo que dice si el usuario cambió algo; se guarda aparte para que una sesión
// de trabajo interrumpida —un cierre del navegador— no pierda la referencia y
// crea que todo es un cambio.
const CLAVE_ORIGINAL = "sesion_trabajo_cotizacion_original";

const leerGuardada = (clave) => {
  try {
    const guardada = localStorage.getItem(clave);
    if (guardada) {
      return JSON.parse(guardada);
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
    value: leerGuardada(CLAVE),
    original: leerGuardada(CLAVE_ORIGINAL),
  },

  reducers: {
    resetCotizacion: (state) => {
      state.value = initialValue;
      state.original = initialValue;
      localStorage.removeItem(CLAVE);
      localStorage.removeItem(CLAVE_ORIGINAL);
    },

    setListaCotizaciones: (state, action) => {
      state.listaCotizaciones = action.payload;
    },

    // Abrir una cotización: además de cargarla, deja la foto contra la que se
    // van a comparar los cambios.
    setCotizacionActual: (state, action) => {
      state.value = action.payload;
      state.original = action.payload;
      localStorage.setItem(CLAVE, JSON.stringify(action.payload));
      localStorage.setItem(CLAVE_ORIGINAL, JSON.stringify(action.payload));
    },

    setFormCotizacion: (state, action) => {
      state.value = {
        ...state.value,
        ...action.payload,
      };
      localStorage.setItem(CLAVE, JSON.stringify(state.value));
    },

    setAtendidoPor: (state, action) => {
      state.value.atendidoPor = action.payload;
      localStorage.setItem(CLAVE, JSON.stringify(state.value));
    },

    setItems: (state, action) => {
      state.value.items = action.payload;
      localStorage.setItem(CLAVE, JSON.stringify(state.value));
    },

    setSubtotal: (state, action) => {
      state.value.subtotal = action.payload;
      localStorage.setItem(CLAVE, JSON.stringify(state.value));
    },

    setSubtotalNumero: (state, action) => {
      state.value.subtotalNumero = action.payload;
      localStorage.setItem(CLAVE, JSON.stringify(state.value));
    },

    setIvaNumero: (state, action) => {
      state.value.ivaNumero = action.payload;
      localStorage.setItem(CLAVE, JSON.stringify(state.value));
    },

    setTotal: (state, action) => {
      state.value.total = action.payload;
      localStorage.setItem(CLAVE, JSON.stringify(state.value));
    },

    setTotalNumero: (state, action) => {
      state.value.totalNumero = action.payload;
      localStorage.setItem(CLAVE, JSON.stringify(state.value));
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
