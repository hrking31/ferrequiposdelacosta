import { createSlice } from "@reduxjs/toolkit";

const equiposSlice = createSlice({
  name: "equipos",
  initialState: { equipos: [] },
  reducers: {
    setEquipos: (state, action) => {
      state.equipos = action.payload;
    },
  },
});

export const { setEquipos } = equiposSlice.actions;
export default equiposSlice.reducer;
