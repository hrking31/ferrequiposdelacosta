import { createSlice } from "@reduxjs/toolkit";

const passwordSlice = createSlice({
  name: "password",
  initialState: false,
  reducers: {
    togglePasswordVisibility: (state) => !state,
  },
});

export const { togglePasswordVisibility } = passwordSlice.actions;
export default passwordSlice.reducer;
