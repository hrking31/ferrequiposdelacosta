// import { createSlice } from "@reduxjs/toolkit";

// const selectedSlice = createSlice({
//   name: "selected",
//   initialState: null,
//   reducers: {
//     setSelectedEquipo: (state, action) => {
//       return action.payload;
//     },
//     clearSelectedEquipo: () => {
//       return null;
//     },
//     setFormValues: (state, action) => {
//       state.values = action.payload;
//     },
//   },
// });

// export const { setSelectedEquipo, clearSelectedEquipo, setFormValues } =
//   selectedSlice.actions;
// export default selectedSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";

const selectedSlice = createSlice({
  name: "selected",
  initialState: {
    selected: [],
  },
  reducers: {
    setSelectedEquipo: (state, action) => {
      state.selected = action.payload;
    },
    clearSelectedEquipo: (state) => {
      state.selected = [];
    },
  },
});

export const { setSelectedEquipo, clearSelectedEquipo, setFormValues } =
  selectedSlice.actions;
export default selectedSlice.reducer;
