import { createSlice } from "@reduxjs/toolkit";

// La clave en localStorage. Mismo criterio que la cotización, que guarda su
// sesión bajo "sesion_trabajo_cotizacion".
const CLAVE_SESION = "sesion_trabajo_cuenta_cobro";
// La cuenta tal como se abrió. Comparar el formulario contra esta foto es lo
// que dice si el usuario cambió algo; se guarda aparte para que una sesión
// interrumpida —un cierre del navegador— no pierda la referencia y crea que
// todo es un cambio. Mismo criterio que la cotización.
const CLAVE_ORIGINAL = "sesion_trabajo_cuenta_cobro_original";

// Los campos que mueve la app sola: no cuentan como cambios del usuario (ver
// Utils/cambios). El número del documento entra acá porque se genera al abrir
// la pantalla, sin que nadie lo escriba.
export const CAMPOS_INTERNOS_CC = [
  "id",
  "cuentaCobroId",
  "status",
  "statusPrevio",
  "atendidoPor",
  "atendidoPorUid",
  "creadaEn",
  "actualizadoEn",
  "emitidaPor",
];

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
  // El número visible del documento ("CC-1754..."), que se genera al abrir la
  // pantalla. Es lo que va de marca de agua en la hoja y en el PDF, y le da
  // nombre al archivo. Mismo criterio que "cotizacionId".
  cuentaCobroId: "",
  // El id del documento en Firestore, si ya se guardó alguna vez. Es lo que
  // distingue crear de actualizar: sin esto, reabrir una cuenta guardada y
  // volver a guardarla dejaría dos.
  id: null,
  // "creada" cuando se emitió el PDF, "pausada" cuando se guardó a medias y
  // "enProceso" mientras alguien la tiene abierta (ver Utils/estadoDocumento).
  status: "",
  // A qué estado vuelve si esa persona sale sin guardar. Lo anota la lista al
  // abrirla, cuando el estado anterior todavía se puede saber.
  statusPrevio: null,
  // Quién la tiene abierta. Solo se muestra mientras está "enProceso".
  atendidoPor: "",
  atendidoPorUid: null,
  // De qué cliente salió, cuando se armó desde sus facturas. Sirve para
  // encontrar después las cuentas de un cliente sin buscarlas por nombre.
  clienteId: null,
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

const leerSesionGuardada = (clave) => {
  try {
    const guardado = localStorage.getItem(clave);
    // Con los valores por omisión debajo: una sesión guardada por una versión
    // anterior de la app no trae los campos nuevos, y sin esto quedarían en
    // `undefined` en vez de en cero.
    if (guardado) return { ...valorInicial, ...JSON.parse(guardado) };
  } catch (error) {
    console.error("Error al leer la cuenta de cobro guardada:", error);
  }
  return valorInicial;
};

const guardarEn = (clave, value) => {
  try {
    localStorage.setItem(clave, JSON.stringify(value));
  } catch (error) {
    console.error("Error al guardar la cuenta de cobro:", error);
  }
};

const guardarSesion = (value) => guardarEn(CLAVE_SESION, value);

const cuentacobroSlice = createSlice({
  name: "cuentacobro",
  initialState: {
    value: leerSesionGuardada(CLAVE_SESION),
    original: leerSesionGuardada(CLAVE_ORIGINAL),
  },
  reducers: {
    // OJO: reemplaza el value ENTERO, no hace merge. Quien lo llame tiene que
    // mandar también items y total, o los pierde.
    setFormCuentaCobro: (state, action) => {
      state.value = action.payload;
      guardarSesion(state.value);
    },

    // Cargar una cuenta para trabajarla: una guardada que se reabre desde la
    // lista, o la que se arma con las facturas de un cliente. Además de
    // cargarla deja la foto contra la que se comparan los cambios, que es lo
    // que distingue "no tocó nada" de "modificó algo".
    abrirCuentaCobro: (state, action) => {
      state.value = action.payload;
      state.original = action.payload;
      guardarSesion(state.value);
      guardarEn(CLAVE_ORIGINAL, state.original);
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
      state.original = valorInicial;
      localStorage.removeItem(CLAVE_SESION);
      localStorage.removeItem(CLAVE_ORIGINAL);
    },
  },
});

export const {
  setFormCuentaCobro,
  abrirCuentaCobro,
  setItemsCc,
  setTotalCc,
  limpiarCuentaCobro,
} = cuentacobroSlice.actions;
export default cuentacobroSlice.reducer;
