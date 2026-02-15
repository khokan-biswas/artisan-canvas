import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice.js';
import shopSlice from './shopSlice.js';
import cartSlice from './cartSlice.js'; // <--- Import it

export const store = configureStore({
    reducer: {
        auth: authSlice,
        shop: shopSlice,
        cart: cartSlice, // <--- Add it here
    }
});

export default store;