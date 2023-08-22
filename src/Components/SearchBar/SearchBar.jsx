import { useState } from "react";
import style from "./SearchBar.module.css";

export default function SearchBar({ onSearch }) {
  const [id, setId] = useState("");

  function handleChange(event) {
    setId(event.target.value);
  }

  return (
    <div className={style.searchBar}>
      <input
        className={style.search}
        onChange={handleChange}
        type="search"
        name="search"
        value={id}
        placeholder="Equipo..."
      />
      <button className={style.buttonSearch} onClick={() => onSearch(id)}>
        Buscar
      </button>
    </div>
  );
}
