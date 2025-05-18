import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  uid: null,
  email: null,
  name: null,
  genero: null,
  role: null,
  permisos: [],
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserData: (state, action) => {
      return { ...state, ...action.payload };
    },
    clearUserData: () => initialState,
  },
});

export const { setUserData, clearUserData } = userSlice.actions;
export default userSlice.reducer;
