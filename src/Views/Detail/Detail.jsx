// import NavBar from "../../Components/NavBar/NavBar";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDetailData } from "../../Store/Actions/detailAction";
import DetailGallery from "../../Components/DetailGallery/DetailGallery";
import LoadingCircle from "../../Components/LoadingCircle/LoadingCircle";

export default function Detail() {
  const { name } = useParams();
  const dispatch = useDispatch();
  const equipo = useSelector((state) => state.equipoDetail.selectedEquipo);

  useEffect(() => {
    dispatch(fetchDetailData(name));
  }, [dispatch, name]);

  if (!equipo) {
    return <LoadingCircle />;
  }

  return (
    <div>
      {/* <NavBar /> */}
      <DetailGallery />
      <h1>{equipo.name}</h1>
      <h1> {equipo.price}</h1>
      <h1>{equipo.description}</h1>
    </div>
  );
}
