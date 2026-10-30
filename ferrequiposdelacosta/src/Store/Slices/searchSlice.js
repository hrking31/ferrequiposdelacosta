import { createSlice } from "@reduxjs/toolkit";

// LO QUE SE ESCRIBE EN EL BUSCADOR DE LA TIENDA Y DEL KIOSCO (2026-10-29,
// pedido del dueño: que funcione como los de Usuarios y Equipos). Filtra
// MIENTRAS se escribe sobre el catálogo en memoria (ver buscarEnCatalogo);
// antes consultaba Firestore al enviar y solo encontraba los nombres que
// EMPEZABAN exactamente con lo escrito: un espacio de más, una palabra del
// medio o una tilde de menos y no salía nada. Vive acá porque el buscador y
// las tarjetas están en partes distintas de la pantalla.
const searchSlice = createSlice({
  name: "search",
  initialState: { termino: "" },
  reducers: {
    ponerBusqueda: (state, action) => {
      state.termino = action.payload;
    },
    clearSearchEquipo: (state) => {
      state.termino = "";
    },
  },
});

export const { ponerBusqueda, clearSearchEquipo } = searchSlice.actions;
export default searchSlice.reducer;
