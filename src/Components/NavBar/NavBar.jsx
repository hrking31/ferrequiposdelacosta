import SearchBar from "../SearchBar/SearchBar";
import style from "./NavBar.module.css";
import { Link } from "react-router-dom";
import DarkMode from "../../Components/DarkMode/DarkMode";

export default function NavBar(props) {
  return (
    <div className={style.nav}>
      <DarkMode />
      <div className={style.navButtons}>
        <Link to="/home">
          <button>Home</button>
        </Link>
      </div>
      <SearchBar onSearch={props.onSearch} />
    </div>
  );
}
