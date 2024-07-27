import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Grid } from "@mui/material";
import styles from "./DetailGallery.module.css";

export default function DetailGallery() {
  const room = useSelector((state) => state.equipoDetail.selectedEquipo.url);
  const images = room || {};
  const imageKeys = Object.keys(images);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
  };

  const selectedImageKey = imageKeys[selectedImageIndex];
  const selectedImage = images[selectedImageKey];

  return (
    <Grid
      container
      spacing={2}
      sx={{
        marginTop: "20px",
        marginBottom: {
          xs: "10px",
          sm: "30px",
          md: "70px",
        },
      }}
      justifyContent="center"
    >
      <Grid item xs={12} sm={10} md={8}>
        <div className={styles.container}>
          <div className={styles.imageWrapper}>
            <img
              className={styles.selectedImage}
              src={selectedImage}
              alt="Selected Image"
            />
            <div className={styles.thumbnails}>
              {imageKeys.map((key, index) => (
                <img
                  key={key}
                  src={images[key]}
                  alt={`Thumbnail ${index + 1}`}
                  className={`${styles.thumbnail} ${
                    index === selectedImageIndex ? styles.activeThumbnail : ""
                  }`}
                  onClick={() => handleImageClick(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </Grid>
    </Grid>
  );
}


