import style from "../Home/Home.module.css";
import CardsEquipos from "../../Components/CardsEquipos/CardsEquipos";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setLoading } from "../../Store//Slices/LoadingSlice";
import { fetchEquiposData } from "../../Store/Actions/equiposAction";

export default function Home() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setLoading(true));
    dispatch(fetchEquiposData());
  }, [dispatch]);

  return (
    <div>
      <CardsEquipos />
    </div>
  );
}
