import { createSlice } from "@reduxjs/toolkit";

const pwaUpdateSlice = createSlice({
  name: "pwaUpdate",
  initialState: {
    updateAvailable: false,
  },
  reducers: {
    setUpdateAvailable: (state) => {
      state.updateAvailable = true;
    },
    clearUpdateAvailable: (state) => {
      state.updateAvailable = false;
    },
  },
});

export const { setUpdateAvailable, clearUpdateAvailable } =
  pwaUpdateSlice.actions;
export default pwaUpdateSlice.reducer;
