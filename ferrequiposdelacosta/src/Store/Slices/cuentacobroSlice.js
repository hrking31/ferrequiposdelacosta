import { createSlice } from "@reduxjs/toolkit";

// La clave en localStorage. Mismo criterio que la cotización, que guarda su
// sesión bajo "sesion_trabajo_cotizacion".
const CLAVE_SESION = "sesion_trabajo_cuenta_cobro";

// Los importes son NÚMEROS. El formato de moneda se pone al mostrarlos, nunca
// al guardarlos: ver Utils/formato.js.
//
// El modelo toma de la cotización el tipo (persona/empresa), la dirección, el
// transporte, el IVA y el depósito, y conserva lo propio de la cuenta de cobro:
// la obra y el "por concepto de". Los totales se guardan desglosados para que
// la hoja y el PDF muestren Subtotal / IVA / Depósito / Transporte / Total.
const valorInicial = {
  tipo: "persona",
  empresa: "", // razón social si es empresa, o el nombre si es persona
  obra: "",
  concepto: "",
  nit: "", // NIT o cédula según el tipo
  direccion: "",
  fecha: "",
  items: [],
  transporte: "",
  valorTransporte: 0,
  iva: true,
  deposito: true,
  valorDeposito: 0,
  subtotalNumero: 0,
  ivaNumero: 0,
  total: 0,
};

const leerSesionGuardada = () => {
  try {
    const guardado = localStorage.getItem(CLAVE_SESION);
    if (guardado) return JSON.parse(guardado);
  } catch (error) {
    console.error("Error al leer la cuenta de cobro guardada:", error);
  }
  return valorInicial;
};

const guardarSesion = (value) => {
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(value));
  } catch (error) {
    console.error("Error al guardar la cuenta de cobro:", error);
  }
};

const cuentacobroSlice = createSlice({
  name: "cuentacobro",
  initialState: {
    value: leerSesionGuardada(),
  },
  reducers: {
    // OJO: reemplaza el value ENTERO, no hace merge. Quien lo llame tiene que
    // mandar también items y total, o los pierde.
    setFormCuentaCobro: (state, action) => {
      state.value = action.payload;
      guardarSesion(state.value);
    },

    setItemsCc: (state, action) => {
      state.value.items = action.payload;
      guardarSesion(state.value);
    },

    setTotalCc: (state, action) => {
      state.value.total = action.payload;
      guardarSesion(state.value);
    },

    // Deja la cuenta en blanco y borra la sesión: es el botón Cancelar.
    limpiarCuentaCobro: (state) => {
      state.value = valorInicial;
      localStorage.removeItem(CLAVE_SESION);
    },
  },
});

export const {
  setFormCuentaCobro,
  setItemsCc,
  setTotalCc,
  limpiarCuentaCobro,
} = cuentacobroSlice.actions;
export default cuentacobroSlice.reducer;
