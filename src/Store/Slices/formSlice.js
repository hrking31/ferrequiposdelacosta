import { createSlice } from "@reduxjs/toolkit";

const formSlice = createSlice({
  name: "form",
  initialState: {
    values: {
      name: "",
      price: "",
      description: "",
      url: [],
    },
  },
  reducers: {
    setFormValues: (state, action) => {
      state.values = action.payload;
    },

    updateImageUrl: (state, action) => {
      state.values.url.push(action.payload);
    },
  },
});

export const { setFormValues, updateImageUrl } = formSlice.actions;
export default formSlice.reducer;
