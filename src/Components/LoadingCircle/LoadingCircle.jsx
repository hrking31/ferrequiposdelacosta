import React from "react";
import style from "../LoadingCircle/LoadingCircle.module.css";

const LoadingCircle = () => {
  return (
    <div className={style.loader_container}>
      <div className={style.loader}></div>;
    </div>
  );
};

export default LoadingCircle;
