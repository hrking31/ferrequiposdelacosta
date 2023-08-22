import { collection, addDoc } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";

export const fetchformData = (formData) => {
  return async (dispatch) => {
    try {
      const equiposRef = collection(db, "equipos");
      await addDoc(equiposRef, formData);
      console.log("Equipo agregado correctamente");
    } catch (error) {
      console.error("Error al agregar el equipo:", error);
    }
  };
};
