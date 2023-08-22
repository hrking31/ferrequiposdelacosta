import { createSlice } from "@reduxjs/toolkit";

const equipoDetail = createSlice({
  name: "equipoDetail",
  initialState: { selectedEquipo: null },
  reducers: {
    setSelectedEquipo: (state, action) => {
      state.selectedEquipo = action.payload;
    },
  },
});

export const { setSelectedEquipo } = equipoDetail.actions;
export default equipoDetail.reducer;
