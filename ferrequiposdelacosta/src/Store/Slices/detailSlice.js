import { createSlice } from "@reduxjs/toolkit";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";

const equipoDetailSlice = createSlice({
  name: "equipoDetail",
  initialState: {
    selectedEquipo: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedEquipo: (state, action) => {
      state.selectedEquipo = action.payload;
      state.loading = false;
      state.error = null;
    },
    clearSelectedEquipo: (state) => {
      state.selectedEquipo = null;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setSelectedEquipo, clearSelectedEquipo, setLoading, setError } =
  equipoDetailSlice.actions;

export const fetchDetailData = (id) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    dispatch(clearSelectedEquipo());

    const docRef = doc(db, "equipos", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      dispatch(setSelectedEquipo({ id: docSnap.id, ...docSnap.data() }));
    } else {
      dispatch(setError("No se encontró el Equipo"));
    }
  } catch (error) {
    dispatch(setError("Error al obtener el equipo: " + error.message));
  }
};

export default equipoDetailSlice.reducer;
