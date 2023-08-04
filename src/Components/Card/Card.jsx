import style from "../Card/Card.module.css";
import { Link } from "react-router-dom";

export default function Card(props) {
  return (
    <div>
      <div className={style.card}>
        <h2> {props.name}</h2>
        <h2>{props.types.join(", ")}</h2>
        <Link to={`/detail/${props.id}`}>
          <img
            src={props.image}
            className={style.cardImage}
            alt="img not found"
          />
        </Link>
      </div>
    </div>
  );
}
