import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    status: false, // false = not logged in, true = logged in
    userData: null // stores { $id, name, email }
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        login: (state, action) => {
            state.status = true;
            state.userData = action.payload;
        },
        logout: (state) => {
            state.status = false;
            state.userData = null;
        }
    }
})

export const { login, logout } = authSlice.actions;

export default authSlice.reducer;