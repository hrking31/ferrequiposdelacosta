import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [], 
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action) {
      const existing = state.items.find(
        (item) => item.id === action.payload.id
      );
      if (existing) {
        existing.quantity += action.payload.quantity;
        existing.days = action.payload.days;
      } else {
        state.items.push({ ...action.payload });
      }
    },
    removeFromCart(state, action) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    updateQty(state, action) {
      const { id, quantity } = action.payload;
      const item = state.items.find((item) => item.id === id);
      if (item && quantity > 0) item.quantity = quantity;
    },
    updateDays(state, action) {
      const { id, days } = action.payload;
      const item = state.items.find((item) => item.id === id);
      if (item && days > 0) item.days = days;
    },
  },
});

export const { addToCart, removeFromCart,  updateQty, updateDays } =
  cartSlice.actions;
export default cartSlice.reducer;
