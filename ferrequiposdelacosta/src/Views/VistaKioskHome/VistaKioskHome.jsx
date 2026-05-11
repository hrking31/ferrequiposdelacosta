import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice.js";
import KioskEquipos from "../../Components/KioskEquipos/KioskEquipos.jsx";

export default function KioskHome() {
  const dispatch = useDispatch();
  const equipos = useSelector((state) => state.equipos.equipos); //solo realiza consulta al cargar la pagina

  useEffect(() => {
    if (equipos.length === 0) {
      dispatch(fetchEquiposData()); // Solo se hace la consulta si `equipos` está vacío
    }
  }, [dispatch, equipos]);

  return <KioskEquipos />;
}
