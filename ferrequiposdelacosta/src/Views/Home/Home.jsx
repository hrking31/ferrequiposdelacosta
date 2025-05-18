import CardsEquipos from "../../Components/CardsEquipos/CardsEquipos";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";

export default function Home() {
  const dispatch = useDispatch();
  const equipos = useSelector((state) => state.equipos.equipos); //solo realiza consulta al cargar la pagina

  // useEffect(() => {
  //   dispatch(fetchEquiposData());
  // }, [dispatch]);

  useEffect(() => {
    if (equipos.length === 0) {
      dispatch(fetchEquiposData()); // Solo se hace la consulta si `equipos` está vacío
    }
  }, [dispatch, equipos]);

  return (
    <div>
      <CardsEquipos />
    </div>
  );
}
