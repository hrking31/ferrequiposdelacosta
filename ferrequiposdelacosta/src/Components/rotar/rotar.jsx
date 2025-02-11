import React from "react";
import "./rotar.css";

const RotatingImage = ({ src, alt }) => {
  return (
    <div className="container">
      <img src={src} alt={alt} className="rotating-image" />
    </div>
  );
};

export default RotatingImage;
