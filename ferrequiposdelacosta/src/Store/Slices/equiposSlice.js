import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";

// Thunk para obtener los equipos
export const fetchEquiposData = createAsyncThunk(
  "equipos/fetchEquiposData",
  async (_, thunkAPI) => {
    try {
      const querySnapshot = await getDocs(collection(db, "equipos"));
      const equiposData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return equiposData;
    } catch (error) {
      console.error("Error al obtener los datos de equipos:", error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const equiposSlice = createSlice({
  name: "equipos",
  initialState: {
    equipos: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEquiposData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEquiposData.fulfilled, (state, action) => {
        state.loading = false;
        state.equipos = action.payload;
      })
      .addCase(fetchEquiposData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error al cargar equipos";
      });
  },
});

export default equiposSlice.reducer;
