// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import { collection, query, where, getDocs } from "firebase/firestore";
// import { db } from "../../Components/Firebase/Firebase";

// export const fetchEquipos = createAsyncThunk(
//   "equipos/fetchEquipos",
//   async (searchTerm, { rejectWithValue }) => {
//     try {
//       const q = query(
//         collection(db, "equipos"),
//         where("name", ">=", searchTerm),
//         where("name", "<=", searchTerm + "\uf8ff")
//       );
//       const querySnapshot = await getDocs(q);

//       if (querySnapshot.empty) {
//         return [];
//       } else {
//         const items = querySnapshot.docs.map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         }));
//         return items;
//       }
//     } catch (error) {
//       return rejectWithValue("Error al buscar equipos.");
//     }
//   }
// );

// const searchSlice = createSlice({
//   name: "search",
//   initialState: {
//     results: [],
//     loading: false,
//     error: null,
//   },
//   reducers: {
//     clearSearchEquipo: (state) => {
//       state.results = [];
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(fetchEquipos.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(fetchEquipos.fulfilled, (state, action) => {
//         state.loading = false;
//         state.results = action.payload;
//       })
//       .addCase(fetchEquipos.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload;
//       });
//   },
// });

// export const { clearSearchEquipo } = searchSlice.actions;
// export default searchSlice.reducer;
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";

export const fetchEquipos = createAsyncThunk(
  "equipos/fetchEquipos",
  async (searchTerm, { rejectWithValue }) => {
    try {
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
      return rejectWithValue("Error al buscar equipos.");
    }
  }
);

const searchSlice = createSlice({
  name: "search",
  initialState: {
    results: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearSearchEquipo: (state) => {
      state.results = [];
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
      })
      .addCase(fetchEquipos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSearchEquipo } = searchSlice.actions;
export default searchSlice.reducer;
