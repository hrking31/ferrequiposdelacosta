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
//
// Cuando la cuenta se arma desde las facturas de un cliente (ver
// cuentaCobroDesdeFacturas.js) entran además lo ya cobrado —`pagado` y
// `abonos`— y el descuento de las renovaciones. Ahí el documento deja de
// cobrar el total: cobra el SALDO, que es lo que queda debiendo.
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
  // El depósito no tiene casilla que lo habilite: entra en el documento con
  // solo tener valor, venga de la factura o escrito a mano.
  valorDeposito: 0,
  descuento: 0,
  subtotalNumero: 0,
  ivaNumero: 0,
  total: 0, // subtotal + IVA + depósito + transporte - descuento
  pagado: 0, // lo que el cliente ya entregó al facturar
  abonos: 0, // lo que fue abonando después
  saldo: 0, // total - pagado - abonos: es el "Total a cancelar"
  // Verdadero mientras la cuenta sea, tal cual, la que se trajo de las
  // facturas. Se apaga al tocar un ítem o la casilla de IVA (ver
  // CuentaDeCobro.jsx) y a partir de ahí el IVA se recalcula al 19%.
  desdeFacturas: false,
};

const leerSesionGuardada = () => {
  try {
    const guardado = localStorage.getItem(CLAVE_SESION);
    // Con los valores por omisión debajo: una sesión guardada por una versión
    // anterior de la app no trae los campos nuevos, y sin esto quedarían en
    // `undefined` en vez de en cero.
    if (guardado) return { ...valorInicial, ...JSON.parse(guardado) };
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
