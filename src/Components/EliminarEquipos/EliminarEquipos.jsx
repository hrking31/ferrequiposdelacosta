// import React from "react";
// import { useDispatch } from "react-redux";
// import { deleteDoc, doc } from "firebase/firestore";
// import { ref, deleteObject } from "firebase/storage";
// import { db, storage } from "../../Components/Firebase/Firebase";
// import { Snackbar, Alert } from "@mui/material";
// import { useState } from "react";

// const EliminarEquipo = ({ equipoId, imagenUrls }) => {
//   const dispatch = useDispatch();
//   const [openSnackbar, setOpenSnackbar] = useState(false);
//   const [snackbarMessage, setSnackbarMessage] = useState("");
//   const [snackbarSeverity, setSnackbarSeverity] = useState("success");

//   const handleDelete = async () => {
//     try {
//       // Eliminar las imágenes de Firebase Storage
//       for (const url of imagenUrls) {
//         const imageRef = ref(storage, url);
//         await deleteObject(imageRef);
//       }

//       // Eliminar el documento del equipo de Firestore
//       const equipoDocRef = doc(db, "equipos", equipoId);
//       await deleteDoc(equipoDocRef);

//       // Configurar y mostrar la alerta de éxito
//       setSnackbarMessage("Equipo eliminado con éxito");
//       setSnackbarSeverity("success");
//     } catch (error) {
//       console.error("Error eliminando el equipo: ", error);
//       setSnackbarMessage("Error al eliminar el equipo");
//       setSnackbarSeverity("error");
//     } finally {
//       setOpenSnackbar(true);
//     }
//   };

//   const handleCloseSnackbar = () => {
//     setOpenSnackbar(false);
//   };

//   return (
//     <div>
//       <button onClick={handleDelete}>Eliminar Equipo</button>
//       <Snackbar
//         open={openSnackbar}
//         autoHideDuration={6000}
//         onClose={handleCloseSnackbar}
//       >
//         <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
//           {snackbarMessage}
//         </Alert>
//       </Snackbar>
//     </div>
//   );
// };

// export default EliminarEquipo;
