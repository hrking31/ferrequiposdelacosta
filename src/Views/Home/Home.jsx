import style from "../Home/Home.module.css";
import Cards from "../../Components/Cards/Cards";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchEquiposData } from "../../Store/Actions/equiposAction";

export default function Home() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchEquiposData());
  }, [dispatch]);

  return (
    <div>
      <Cards />
    </div>
  );
}
