import { createSlice } from "@reduxjs/toolkit";

const installAppSlice = createSlice({
  name: "installApp",
  initialState: {
    showInstallApp: false,
  },
  reducers: {
    showInstallApp: (state) => {
      state.showInstallApp = true;
    },
    hideInstallApp: (state) => {
      state.showInstallApp = false;
    },
  },
});0

export const { showInstallApp, hideInstallApp } = installAppSlice.actions;

export default installAppSlice.reducer;
