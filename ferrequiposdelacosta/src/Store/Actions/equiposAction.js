import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";
import { setEquipos } from "../Slices/equiposSlice";
import { setLoading } from "../Slices/LoadingSlice";

export const fetchEquiposData = () => {
  return async (dispatch) => {
    try {
      const querySnapshot = await getDocs(collection(db, "equipos"));
      const equiposData = querySnapshot.docs.map((doc) => doc.data());
      dispatch(setEquipos(equiposData));
      dispatch(setLoading(false));
    } catch (error) {
      console.error("Error al obtener los datos de equipos:", error);
      dispatch(setLoading(false));
    }
  };
};
