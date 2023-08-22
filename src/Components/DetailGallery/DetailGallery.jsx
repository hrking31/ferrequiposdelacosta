import React, { useState } from "react";
import { useSelector } from "react-redux";
import styles from "./DetailGallery.module.css";

export default function DetailGallery() {
  const room = useSelector((state) => state.equipoDetail.selectedEquipo.url);
  const images = room || {};
  const imageKeys = Object.keys(images);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleImageClick = (direction) => {
    if (direction === "prev") {
      setSelectedImageIndex((prevIndex) =>
        prevIndex === 0 ? prevIndex : prevIndex - 1
      );
    } else if (direction === "next") {
      setSelectedImageIndex((prevIndex) =>
        prevIndex === imageKeys.length - 1 ? prevIndex : prevIndex + 1
      );
    }
  };

  const selectedImageKey = imageKeys[selectedImageIndex];
  const selectedImage = images[selectedImageKey];

  return (
    <div className={styles.container}>
      <div className={styles.imageWrapper}>
        <img
          className={styles.selectedImage}
          src={selectedImage}
          alt="Selected Image"
        />
        <button
          className={`${styles.arrowButton} ${styles.prevButton}`}
          onClick={() => handleImageClick("prev")}
          disabled={selectedImageIndex === 0}
        >
          &#8249;
        </button>
        <button
          className={`${styles.arrowButton} ${styles.nextButton}`}
          onClick={() => handleImageClick("next")}
          disabled={selectedImageIndex === imageKeys.length - 1}
        >
          &#8250;
        </button>
      </div>
    </div>
  );
}
