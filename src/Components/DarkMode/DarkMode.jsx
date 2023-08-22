import style from "./DarkMode.module.css";
import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { FaLightbulb, FaRegLightbulb } from "react-icons/fa";
import { toggleDarkMode } from "../../Store/Slices/darkModeSlice";

export default function DarkMode() {
  const darkMode = useSelector((state) => state.darkMode.darkMode);
  const dispatch = useDispatch();

  const toggleDarkModeHandler = () => {
    dispatch(toggleDarkMode());
  };

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  document.body.className = darkMode ? style.dark : style.light;

  return (
    <span onClick={toggleDarkModeHandler}>
      {darkMode ? (
        <FaRegLightbulb className={style.iconosLightbulb} />
      ) : (
        <FaLightbulb className={style.iconosLightbulbDark} />
      )}
    </span>
  );
}
