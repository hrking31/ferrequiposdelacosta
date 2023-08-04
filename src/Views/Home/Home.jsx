import { useState, useEffect } from "react";
import { FaLightbulb, FaRegLightbulb } from "react-icons/fa";
import style from "../Home/Home.module.css";
import Cards from "../../Components/Cards/Cards";

export default function Home() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    return savedDarkMode === "true" ? true : false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  document.body.className = darkMode ? style.dark : style.light;

  return (
    <div className={darkMode ? style.dark : style.light}>
      <span onClick={toggleDarkMode}>
        {darkMode ? (
          <FaRegLightbulb className={style.iconosLightbulb} />
        ) : (
          <FaLightbulb className={style.iconosLightbulbDark} />
        )}
      </span>
      <Cards />
    </div>
  );
}
