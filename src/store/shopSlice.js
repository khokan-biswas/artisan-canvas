import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import service from '../backend/config';
import { Query } from 'appwrite';

// --- 1. Fetch specific categories (Home Page) ---
export const fetchCategoryPaintings = createAsyncThunk(
  'shop/fetchCategoryPaintings',
  async ({ category, offset = 0 }, { rejectWithValue }) => {
    try {
        const queries = [
            // 1. Filter by Category
            Query.equal('category', category),
            
            // 2. Filter by UNSOLD (Security)
            Query.equal('isSold', false),
            
            // 3. Limit to 6 items (5 shown + 1 buffer)
            Query.limit(6),
            
            // 4. Offset for pagination (if needed later)
            Query.offset(offset),
            
            // ⚠️ CRITICAL FIX: Commented out sorting to ensure cards show up.
            // If you want sorting, you must create a Composite Index in Appwrite 
            // for (category + isSold + $createdAt).
            // Query.orderDesc('$createdAt') 
        ];

        console.log(`Fetching ${category}...`); // 🔍 Debug Log
        
        const data = await service.getPaintings(queries);
        
        console.log(`Fetched ${category}:`, data.documents.length, "items"); // 🔍 Debug Log
        
        return { category, documents: data.documents, total: data.total };
    } catch (err) {
      console.error(`Error in fetchCategoryPaintings (${category}):`, err);
      return rejectWithValue(err.message);
    }
  }
);

// --- 2. Fetch with Filters (Shop Page) ---
export const fetchFilteredPaintings = createAsyncThunk(
  'shop/fetchFilteredPaintings',
  async ({ filters = {}, sort = 'newest', offset = 0, limit = 12 }, { rejectWithValue }) => {
    try {
      const queries = [];

      // A. Standard Filters
      if (filters.medium?.length > 0) queries.push(Query.equal('medium', filters.medium));
      if (filters.subject?.length > 0) queries.push(Query.equal('category', filters.subject));
      if (filters.style?.length > 0) queries.push(Query.equal('style', filters.style));
      
      // 🔒 SECURITY: Only show UNSOLD items
      queries.push(Query.equal('isSold', false));

      // B. Sorting
      // We keep sorting here because Shop page usually has different indexes. 
      // If Shop page breaks, comment out the switch case below.
      switch (sort) {
        case 'newest':
        default: 
            queries.push(Query.orderDesc('$createdAt')); 
            break;
      }

      queries.push(Query.limit(limit));
      queries.push(Query.offset(offset));

      const response = await service.getPaintings(queries);
      return { documents: response.documents, total: response.total };

    } catch (err) {
      console.error("Shop API Error:", err);
      return rejectWithValue(err.message);
    }
  }
);

const shopSlice = createSlice({
  name: 'shop',
  initialState: {
    categories: {}, 
    shopPage: { items: [], total: 0, loading: false, error: null },
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // --- Categories (Home Page) ---
      .addCase(fetchCategoryPaintings.pending, (state, action) => {
        const { category } = action.meta.arg;
        if (!state.categories[category]) state.categories[category] = { loading: true, items: [] };
        else state.categories[category].loading = true;
      })
      .addCase(fetchCategoryPaintings.fulfilled, (state, action) => {
        const { category, documents, total } = action.payload;
        
        // Initialize if missing
        if (!state.categories[category]) {
            state.categories[category] = { loading: false, items: [], total: 0 };
        }
        
        state.categories[category].loading = false;
        state.categories[category].total = total;
        
        // Prevent duplicates
        const uniqueDocs = documents.filter(d => !state.categories[category].items.find(e => e.$id === d.$id));
        state.categories[category].items = [...state.categories[category].items, ...uniqueDocs];
      })
      .addCase(fetchCategoryPaintings.rejected, (state, action) => {
        const { category } = action.meta.arg;
        if (state.categories[category]) state.categories[category].loading = false;
      })

      // --- Shop Page ---
      .addCase(fetchFilteredPaintings.pending, (state) => {
        state.shopPage.loading = true;
        state.shopPage.error = null;
      })
      .addCase(fetchFilteredPaintings.fulfilled, (state, action) => {
        state.shopPage.loading = false;
        state.shopPage.items = action.payload.documents;
        state.shopPage.total = action.payload.total;
      })
      .addCase(fetchFilteredPaintings.rejected, (state, action) => {
        state.shopPage.loading = false;
        state.shopPage.error = action.payload;
      });
  },
});

export default shopSlice.reducer;