import { createSlice } from "@reduxjs/toolkit";

const loadCartFromStorage = () => {
  const savedCart = localStorage.getItem("cart");
  return savedCart ? JSON.parse(savedCart) : [];
};

const initialState = {
  cartItems: loadCartFromStorage(), 
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Overwrite cart (used when syncing from Appwrite)
    setCart: (state, action) => {
        state.cartItems = action.payload;
        localStorage.setItem("cart", JSON.stringify(state.cartItems));
    },

    addToCart: (state, action) => {
      const painting = action.payload;
      const exists = state.cartItems.find((item) => item.$id === painting.$id);
      if (!exists) {
        state.cartItems.push(painting);
        localStorage.setItem("cart", JSON.stringify(state.cartItems));
      }
    },

    removeFromCart: (state, action) => {
      const paintingId = action.payload;
      state.cartItems = state.cartItems.filter((item) => item.$id !== paintingId);
      localStorage.setItem("cart", JSON.stringify(state.cartItems));
    },

    clearCart: (state) => {
      state.cartItems = [];
      localStorage.removeItem("cart");
    },

    syncCartAvailability: (state, action) => {
        const freshItems = action.payload;
        state.cartItems = state.cartItems.map(cartItem => {
            const freshItem = freshItems.find(p => p.$id === cartItem.$id);
            if (freshItem) {
                return { 
                    ...cartItem, 
                    isSold: freshItem.isSold,
                    pricein: freshItem.pricein,
                    priceusd: freshItem.priceusd,
                    discountusd: freshItem.discountusd
                };
            }
            return cartItem;
        });
        localStorage.setItem("cart", JSON.stringify(state.cartItems));
    }
  },
});

export const { setCart, addToCart, removeFromCart, clearCart, syncCartAvailability } = cartSlice.actions;
export default cartSlice.reducer;