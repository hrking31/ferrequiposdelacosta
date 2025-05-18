
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";

export const fetchEquipos = createAsyncThunk(
  "equipos/fetchEquipos",
  async (searchTerm, { rejectWithValue }) => {
    try {
      // throw new Error("Error simulado al buscar equipos");
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const q = query(
        collection(db, "equipos"),
        where("nameLowerCase", ">=", lowerCaseSearchTerm),
        where("nameLowerCase", "<=", lowerCaseSearchTerm + "\uf8ff")
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return [];
      } else {
        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        return items;
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const searchSlice = createSlice({
  name: "search",
  initialState: {
    results: [],
    loading: false,
    error: null,
    hasSearched: false,
  },
  reducers: {
    clearSearchEquipo: (state) => {
      state.results = [];
      state.loading = false;
      state.error = null;
      state.hasSearched = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEquipos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEquipos.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload;
        state.hasSearched = true;
      })
      .addCase(fetchEquipos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSearchEquipo } = searchSlice.actions;
export default searchSlice.reducer;