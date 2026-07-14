import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
};

// Cada línea del carrito se identifica por id + variante, no solo por id,
// para que dos variantes del mismo equipo no se mezclen en una sola línea.
const getLineId = (item) =>
  item.lineId ??
  (item.varianteSeleccionada
    ? `${item.id}-${item.varianteSeleccionada}`
    : item.id);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action) {
      const lineId = getLineId(action.payload);
      const existing = state.items.find((item) => item.lineId === lineId);
      if (existing) {
        existing.quantity += action.payload.quantity;
        existing.days = action.payload.days;
      } else {
        state.items.push({ ...action.payload, lineId });
      }
    },
    removeFromCart(state, action) {
      state.items = state.items.filter(
        (item) => item.lineId !== action.payload,
      );
    },

    updateQty(state, action) {
      const { lineId, quantity } = action.payload;
      const item = state.items.find((item) => item.lineId === lineId);
      if (item && quantity > 0) item.quantity = quantity;
    },

    updateDays(state, action) {
      const { lineId, days } = action.payload;
      const item = state.items.find((item) => item.lineId === lineId);
      if (item && days > 0) item.days = days;
    },

    clearCart(state) {
      state.items = [];
    },
  },
});

export const { addToCart, removeFromCart, updateQty, updateDays, clearCart } =
  cartSlice.actions;
export default cartSlice.reducer;
