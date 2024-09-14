// import React, { useState } from "react";
// import { useSelector } from "react-redux";
// import { Grid } from "@mui/material";
// import styles from "./DetailGallery.module.css";

// export default function DetailGallery() {
//   const imagenes = useSelector(
//     (state) => state.equipoDetail.selectedEquipo.images
//   );
//   const images = Array.isArray(imagenes) ? imagenes : [];
//   const [selectedImageIndex, setSelectedImageIndex] = useState(0);

//   const handleImageClick = (index) => {
//     setSelectedImageIndex(index);
//   };

//   const selectedImage = images[selectedImageIndex]?.url || "";

//   return (
//     <Grid
//       container
//       spacing={2}
//       sx={{
//         marginTop: "20px",
//         marginBottom: {
//           xs: "10px",
//           sm: "30px",
//           md: "70px",
//         },
//       }}
//       justifyContent="center"
//     >
//       <Grid item xs={12} sm={10} md={8}>
//         <div className={styles.container}>
//           <div className={styles.imageWrapper}>
//             <img
//               className={styles.selectedImage}
//               src={selectedImage}
//               alt="Selected"
//             />
//             <div className={styles.thumbnails}>
//               {images.map((image, index) => (
//                 <img
//                   key={index}
//                   src={image.url}
//                   alt={`Thumbnail ${index + 1}`}
//                   className={`${styles.thumbnail} ${
//                     index === selectedImageIndex ? styles.activeThumbnail : ""
//                   }`}
//                   onClick={() => handleImageClick(index)}
//                 />
//               ))}
//             </div>
//           </div>
//         </div>
//       </Grid>
//     </Grid>
//   );
// }

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Grid } from "@mui/material";
import styles from "./DetailGallery.module.css";

export default function DetailGallery() {
  const imagenes = useSelector(
    (state) => state.equipoDetail.selectedEquipo.images
  );
  const images = Array.isArray(imagenes) ? imagenes : [];
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
  };

  const selectedImage = images[selectedImageIndex]?.url || "";

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
      <Grid item xs={12} sm={12} md={10}>
        <div className={styles.container}>
          <div className={styles.imageWrapper}>
            <img
              className={styles.selectedImage}
              src={selectedImage}
              alt="Selected"
            />
            <div className={styles.thumbnails}>
              {images.map((image, index) => (
                <img
                  key={index}
                  src={image.url}
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
