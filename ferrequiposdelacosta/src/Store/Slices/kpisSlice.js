import { createSlice } from "@reduxjs/toolkit";

// Los últimos números que se vieron en los recuadros del menú (AdminForms).
//
// Esto NO es la fuente de la verdad: los cuatro números se vuelven a consultar
// cada vez que se entra al menú. Lo único que hace este slice es evitar que se
// vean tres puntitos mientras esa consulta va y vuelve — se muestra lo último
// conocido y se reemplaza en cuanto llega el dato fresco.
//
// Por eso mismo no puede quedar desactualizado: nunca reemplaza a la consulta,
// solo tapa el hueco. Guardar el número y confiar en él sería lo contrario, y
// es justo lo que se descartó al diseñar esto (un número guardado que nadie
// refresca miente en silencio).
//
// A propósito no se persiste en localStorage: alcanza con que sobreviva al ir
// y volver del menú —que es lo que pasa decenas de veces al día— y así una
// recarga nunca muestra cifras de la sesión de otra persona.
const initialState = {
  cotizaciones: null,
  cuentasCobro: null,
  equiposActivos: null,
  pagosPendientes: null,
  equiposCatalogo: null,
};

const kpisSlice = createSlice({
  name: "kpis",
  initialState,
  reducers: {
    // Guarda solo lo que venga: si una de las consultas falló, el número que
    // ya había se conserva en vez de volver a "…".
    setKpis: (state, action) => {
      Object.entries(action.payload || {}).forEach(([clave, valor]) => {
        if (valor !== null && valor !== undefined) state[clave] = valor;
      });
    },
  },
});

export const { setKpis } = kpisSlice.actions;

export default kpisSlice.reducer;
