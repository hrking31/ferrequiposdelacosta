import { createSlice } from "@reduxjs/toolkit";

const formSlice = createSlice({
  name: "form",
  initialState: {
    values: {
      name: "",
      description: "",
      images: [],
    },
  },
  reducers: {
    setFormValues: (state, action) => {
      state.values = action.payload;
    },

    updateImage: (state, action) => {
      const { url, name } = action.payload;
      state.values.images.push({ url, name });
    },
  },
});

export const { setFormValues, updateImage } = formSlice.actions;
export default formSlice.reducer;
