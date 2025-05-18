import { createSlice } from "@reduxjs/toolkit";

const cuentacobroSlice = createSlice({
  name: "cuentacobro",
  initialState: {
    value: {
      empresa: "",
      obra: "",
      concepto: "",
      nit: "",
      fecha: "",
      items: [],
      total: 0,
    },
  },
  reducers: {
    setFormCuentaCobro: (state, action) => {
      state.value = action.payload;
    },

    setItemsCc: (state, action) => {
      state.value.items = action.payload;
    },

    setTotalCc: (state, action) => {
      state.value.total = action.payload;
    },
  },
});

export const { setFormCuentaCobro, setItemsCc, setTotalCc } =
  cuentacobroSlice.actions;
export default cuentacobroSlice.reducer;
