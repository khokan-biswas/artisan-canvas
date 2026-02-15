import { createSlice } from "@reduxjs/toolkit";

// Load initial state from LocalStorage
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
    // Action: Add Item
    addToCart: (state, action) => {
      const painting = action.payload;
      const exists = state.cartItems.find((item) => item.$id === painting.$id);
      if (!exists) {
        state.cartItems.push(painting);
        localStorage.setItem("cart", JSON.stringify(state.cartItems));
      }
    },

    // Action: Remove Item
    removeFromCart: (state, action) => {
      const paintingId = action.payload;
      state.cartItems = state.cartItems.filter((item) => item.$id !== paintingId);
      localStorage.setItem("cart", JSON.stringify(state.cartItems));
    },

    // Action: Clear Cart
    clearCart: (state) => {
      state.cartItems = [];
      localStorage.removeItem("cart");
    },

    // 👇 NEW: Update availability status dynamically
    syncCartAvailability: (state, action) => {
        const freshItems = action.payload; // Array of latest painting objects from DB
        
        state.cartItems = state.cartItems.map(cartItem => {
            const freshItem = freshItems.find(p => p.$id === cartItem.$id);
            if (freshItem) {
                // Update isSold status and latest price info just in case
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

export const { addToCart, removeFromCart, clearCart, syncCartAvailability } = cartSlice.actions;

export default cartSlice.reducer;