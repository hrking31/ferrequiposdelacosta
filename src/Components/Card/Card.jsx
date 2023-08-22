import style from "../Card/Card.module.css";
import { Link } from "react-router-dom";

export default function Card(props) {
  return (
    <div>
      <div className={style.card}>
        <Link to={`/detail/${props.name}`}>
          <h2> {props.name}</h2>
          <h2>{props.price}</h2>
          <img
            src={props.url}
            className={style.cardImage}
            alt="img not found"
          />
          {/* <p>{props.description}</p> */}
        </Link>
      </div>
    </div>
  );
}
