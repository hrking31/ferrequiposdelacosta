// src/components/RotatingImage.js

import React, { useEffect, useRef } from "react";
import "./rotar.css"; // Asegúrate de tener este archivo en el mismo directorio

const RotatingImage = ({ src, alt }) => {
  const imageRef = useRef(null);

  useEffect(() => {
    const image = imageRef.current;
    const rotateImage = () => {
      image.classList.toggle("rotating");
    };

    const intervalId = setInterval(rotateImage, 2000); // Ajusta el intervalo si es necesario

    return () => clearInterval(intervalId); // Limpia el intervalo al desmontar el componente
  }, []);

  return (
    <div className="container">
      <img ref={imageRef} src={src} alt={alt} className="rotating-image" />
    </div>
  );
};

export default RotatingImage;
