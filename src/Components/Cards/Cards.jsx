import style from "../Cards/Cards.module.css";
import Card from "../Card/Card.jsx";
import { useSelector } from "react-redux";

export default function Cards() {
  const equipos = useSelector((state) => state.equipos.equipos);
  return (
    <div>
      <div className={style.cards_container}>
        {equipos &&
          equipos.map((equipo, index) => {
            return (
              <Card
                key={index}
                name={equipo.name}
                url={equipo.url}
                price={equipo.price}
                description={equipo.description}
              />
            );
          })}
      </div>
    </div>
  );
}
