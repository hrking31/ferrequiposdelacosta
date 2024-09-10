import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";
import { setSelectedEquipo, clearSelectedEquipo } from "../Slices/detailSlice";

export const fetchDetailData = (name) => {
  return async (dispatch) => {
    try {
      dispatch(clearSelectedEquipo());

      const q = query(collection(db, "equipos"), where("name", "==", name));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const selectedEquipoData = querySnapshot.docs[0].data();
        dispatch(setSelectedEquipo(selectedEquipoData));
      } else {
        console.log(`No se encontró un equipo con el nombre ${name}`);
      }
    } catch (error) {
      console.error("Error al obtener el equipo:", error);
    }
  };
};
