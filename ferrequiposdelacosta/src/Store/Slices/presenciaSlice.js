import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  usuariosConectados: {},
};

const presenceSlice = createSlice({
  name: "presence",
  initialState,
  reducers: {
    setUsuariosConectados: (state, action) => {
      state.usuariosConectados = action.payload;
    },
  },
});

export const { setUsuariosConectados } = presenceSlice.actions;

export default presenceSlice.reducer;
