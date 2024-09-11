import { createSlice } from "@reduxjs/toolkit";

const selectedSlice = createSlice({
  name: "selected",
  initialState: null,
  reducers: {
    setSelectedEquipo: (state, action) => {
      return action.payload;
    },
    clearSelectedEquipo: () => {
      return null;
    },
  },
});

export const { setSelectedEquipo, clearSelectedEquipo } = selectedSlice.actions;
export default selectedSlice.reducer;
