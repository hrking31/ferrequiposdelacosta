import { createSlice } from "@reduxjs/toolkit";

const equipoDetail = createSlice({
  name: "equipoDetail",
  initialState: { selectedEquipo: null },
  reducers: {
    setSelectedEquipo: (state, action) => {
      state.selectedEquipo = action.payload;
    },
    clearSelectedEquipo: (state) => {
      state.selectedEquipo = null;
    },
  },
});

export const { setSelectedEquipo, clearSelectedEquipo } = equipoDetail.actions;
export default equipoDetail.reducer;
