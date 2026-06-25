import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import { useAuth } from "../../Context/AuthContext";
import Drawer from "../../Components/Drawer/Drawer.jsx";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";

export default function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const equipos = useSelector((state) => state.equipos.equipos); //solo realiza consulta al cargar la pagina

  useEffect(() => {
    if (equipos.length === 0) {
      dispatch(fetchEquiposData()); // Solo se hace la consulta si `equipos` está vacío
    }
  }, [dispatch, equipos]);

  useEffect(() => {
    if (!loading && user) {
      navigate("/adminforms", { replace: true });
    }
  }, [user, loading, navigate]);


  if (loading) {
    return <LoadingLogo />;
  }

  return <Drawer />;
}
