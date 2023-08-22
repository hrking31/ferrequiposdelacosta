import { createSlice } from "@reduxjs/toolkit";

const nameImagenSlice = createSlice({
  name: "nameImagen",
  initialState: {
    nameImagen: [],
  },
  reducers: {
    updateNameImage: (state, action) => {
      state.nameImagen.push(action.payload);
    },
  },
});

export const { updateNameImage } = nameImagenSlice.actions;
export default nameImagenSlice.reducer;
