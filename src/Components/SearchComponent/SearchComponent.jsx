// import React, { useState } from "react";
// import { TextField, Button, Grid, Typography, Box } from "@mui/material";
// import { db } from "../../Components/Firebase/Firebase";
// import {
//   collection,
//   query,
//   where,
//   getDocs,
//   deleteDoc,
//   doc,
// } from "firebase/firestore";
// import { useAuth } from "../../Context/AuthContext";

// const SearchComponent = () => {
//   const { user } = useAuth();
//   const [searchTerm, setSearchTerm] = useState("");
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [selectedItem, setSelectedItem] = useState(null);

//   const handleSearch = async () => {
//     if (!searchTerm.trim()) return;

//     setLoading(true);
//     setError(null);

//     try {
//       console.log("Iniciando búsqueda...");

//       const q = query(
//         collection(db, "equipos"),
//         where("name", ">=", searchTerm),
//         where("name", "<=", searchTerm + "\uf8ff")
//       );
//       const querySnapshot = await getDocs(q);

//       console.log("Documentos encontrados: ", querySnapshot.size);

//       if (querySnapshot.empty) {
//         setResults([]);
//         setError("No se encontraron equipos.");
//         setSelectedItem(null);
//       } else {
//         const items = querySnapshot.docs.map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         }));
//         console.log("Items: ", items);
//         setResults(items);
//         setSelectedItem(items[0]); // Selecciona el primer elemento encontrado
//       }
//     } catch (error) {
//       console.error("Error fetching documents: ", error);
//       setError("Error al buscar equipos.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDelete = async (id) => {
//     try {
//       await deleteDoc(doc(db, "equipos", id));
//       setResults(results.filter((item) => item.id !== id));
//       setSelectedItem(null);
//     } catch (error) {
//       console.error("Error deleting document: ", error);
//       setError("Error al eliminar el equipo.");
//     }
//   };

//   return (
//     <Box sx={{ padding: 2, textAlign: "center" }}>
//       <Box sx={{ marginBottom: 1 }}>
//         <Typography variant="h5" sx={{ color: "#8B3A3A", fontWeight: "bold" }}>
//           Bienvenida {user.email}, Busca el Equipo por nombre pero recuerda con
//           MAYUSCULA:
//         </Typography>
//       </Box>
//       <Grid container spacing={2}>
//         <Grid item xs={12} sm={4}>
//           <TextField
//             label="Buscar por nombre en mayuscula"
//             variant="outlined"
//             fullWidth
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             sx={{ mt: 2, mb: 2 }}
//           />
//           <Button
//             variant="contained"
//             onClick={handleSearch}
//             sx={{
//               mb: 2,
//               backgroundColor: "#1E90FF",
//               "&:hover": {
//                 backgroundColor: "#4682B4",
//               },
//             }}
//             fullWidth
//           >
//             Buscar
//           </Button>
//           {error && <Typography color="error">{error}</Typography>}
//         </Grid>
//         {loading ? (
//           <Typography>Buscando...</Typography>
//         ) : (
//           <Grid container spacing={2}>
//             <Grid item xs={12} sm={6}>
//               {results.map((item) => (
//                 <Box
//                   key={item.id}
//                   sx={{
//                     display: "flex",
//                     flexDirection: "column",
//                     alignItems: "flex-start",
//                     textAlign: "left",
//                   }}
//                 >
//                   <Box
//                     sx={{
//                       display: "flex",
//                       flexWrap: "wrap",
//                       gap: "8px",
//                       mb: 2,
//                     }}
//                   >
//                     {item.url.map((imageUrl, index) => (
//                       <img
//                         key={index}
//                         src={imageUrl}
//                         alt={item.name}
//                         style={{
//                           width: "100%",
//                           maxWidth: "200px",
//                           height: "auto",
//                           marginBottom: "8px",
//                         }}
//                       />
//                     ))}
//                   </Box>
//                   <Box
//                     sx={{
//                       border: "1px solid #00008B",
//                       padding: "8px",
//                       borderRadius: "4px",
//                       wordBreak: "break-all",
//                       whiteSpace: "normal",
//                       width: "100%",
//                       mb: 2,
//                     }}
//                   >
//                     {item.name}
//                   </Box>
//                   <Box
//                     sx={{
//                       border: "1px solid #00008B",
//                       padding: "8px",
//                       borderRadius: "4px",
//                       wordBreak: "break-all",
//                       whiteSpace: "normal",
//                       marginBottom: "8px",
//                       width: "100%",
//                     }}
//                   >
//                     {item.description}
//                   </Box>
//                   {item.url.map((url, index) => (
//                     <Box
//                       key={index}
//                       sx={{
//                         border: "1px solid #00008B",
//                         padding: "8px",
//                         borderRadius: "4px",
//                         wordBreak: "break-all",
//                         whiteSpace: "normal",
//                         width: "100%",
//                         marginBottom: "8px",
//                       }}
//                     >
//                       {url}
//                     </Box>
//                   ))}
//                 </Box>
//               ))}
//             </Grid>
//             <Grid
//               item
//               xs={12}
//               sm={6}
//               sx={{
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "flex-end",
//               }}
//             >
//               <Button
//                 variant="outlined"
//                 color="error"
//                 onClick={() => selectedItem && handleDelete(selectedItem.id)}
//                 sx={{ mb: 2 }}
//                 sx={{
//                   mb: 2,
//                   backgroundColor: "#1E90FF",
//                   "&:hover": {
//                     backgroundColor: "#4682B4",
//                   },
//                 }}
//                 fullWidth
//                 disabled={!selectedItem}
//               >
//                 Eliminar {selectedItem ? selectedItem.name : ""}
//               </Button>
//             </Grid>
//           </Grid>
//         )}
//       </Grid>
//     </Box>
//   );
// };

// export default SearchComponent;

import React, { useState } from "react";
import { TextField, Button, Grid, Typography, Box } from "@mui/material";
import { db } from "../../Components/Firebase/Firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "../../Context/AuthContext";

const SearchComponent = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    images: [""],
  });

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);

    try {
      console.log("Iniciando búsqueda...");

      const q = query(
        collection(db, "equipos"),
        where("name", ">=", searchTerm),
        where("name", "<=", searchTerm + "\uf8ff")
      );
      const querySnapshot = await getDocs(q);

      console.log("Documentos encontrados: ", querySnapshot.size);

      if (querySnapshot.empty) {
        setResults([]);
        setError("No se encontraron equipos.");
        setSelectedItem(null);
      } else {
        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Items: ", items);
        setResults(items);
        setSelectedItem(items[0]);
        setEditData(items[0]);
      }
    } catch (error) {
      console.error("Error fetching documents: ", error);
      setError("Error al buscar equipos.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "equipos", id));
      setResults(results.filter((item) => item.id !== id));
      setSelectedItem(null);
    } catch (error) {
      console.error("Error deleting document: ", error);
      setError("Error al eliminar el equipo.");
    }
  };

  const handleEditChange = (field, value) => {
    setEditData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    try {
      const itemDoc = doc(db, "equipos", selectedItem.id);
      await updateDoc(itemDoc, editData);
      setResults(
        results.map((item) =>
          item.id === selectedItem.id ? { ...item, ...editData } : item
        )
      );
      setSelectedItem({ ...selectedItem, ...editData });
      setError("Equipo actualizado correctamente.");
    } catch (error) {
      console.error("Error updating document: ", error);
      setError("Error al actualizar el equipo.");
    }
  };

  return (
    <Box sx={{ padding: 2, textAlign: "center" }}>
      <Box sx={{ marginBottom: 1 }}>
        <Typography variant="h5" sx={{ color: "#8B3A3A", fontWeight: "bold" }}>
          Bienvenida {user.email}, Busca el Equipo por nombre pero recuerda con
          MAYUSCULA:
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Buscar por nombre en mayuscula"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              mb: 2,
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
            fullWidth
          >
            Buscar
          </Button>
          {error && <Typography color="error">{error}</Typography>}
        </Grid>
        {loading ? (
          <Typography>Buscando...</Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              {results.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    textAlign: "left",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      mb: 2,
                    }}
                  >
                    {item.url.map((imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt={item.name}
                        style={{
                          width: "100%",
                          maxWidth: "200px",
                          height: "auto",
                          marginBottom: "8px",
                        }}
                      />
                    ))}
                  </Box>
                  <Box
                    sx={{
                      border: "1px solid #00008B",
                      padding: "8px",
                      borderRadius: "4px",
                      wordBreak: "break-all",
                      whiteSpace: "normal",
                      width: "100%",
                      mb: 2,
                    }}
                  >
                    {item.name}
                  </Box>
                  <Box
                    sx={{
                      border: "1px solid #00008B",
                      padding: "8px",
                      borderRadius: "4px",
                      wordBreak: "break-all",
                      whiteSpace: "normal",
                      marginBottom: "8px",
                      width: "100%",
                    }}
                  >
                    {item.description}
                  </Box>
                  {item.url.map((url, index) => (
                    <Box
                      key={index}
                      sx={{
                        border: "1px solid #00008B",
                        padding: "8px",
                        borderRadius: "4px",
                        wordBreak: "break-all",
                        whiteSpace: "normal",
                        width: "100%",
                        marginBottom: "8px",
                      }}
                    >
                      {url}
                    </Box>
                  ))}
                </Box>
              ))}
            </Grid>
            <Grid
              item
              xs={12}
              sm={6}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <Button
                variant="outlined"
                color="error"
                onClick={() => selectedItem && handleDelete(selectedItem.id)}
                sx={{
                  mb: 2,
                  backgroundColor: "#1E90FF",
                  "&:hover": {
                    backgroundColor: "#4682B4",
                  },
                }}
                fullWidth
                disabled={!selectedItem}
              >
                Eliminar {selectedItem ? selectedItem.name : ""}
              </Button>

              {selectedItem && (
                <>
                  <TextField
                    label="Nombre"
                    variant="outlined"
                    fullWidth
                    value={editData.name}
                    onChange={(e) => handleEditChange("name", e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Descripción"
                    variant="outlined"
                    fullWidth
                    value={editData.description}
                    onChange={(e) =>
                      handleEditChange("description", e.target.value)
                    }
                    sx={{ mb: 2 }}
                  />
                  {editData.url.map((url, index) => (
                    <TextField
                      key={index}
                      label={`URL ${index + 1}`}
                      variant="outlined"
                      fullWidth
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...editData.url];
                        newUrls[index] = e.target.value;
                        handleEditChange("url", newUrls);
                      }}
                      sx={{ mb: 2 }}
                    />
                  ))}
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    sx={{
                      mb: 2,
                      backgroundColor: "#1E90FF",
                      "&:hover": {
                        backgroundColor: "#4682B4",
                      },
                    }}
                    fullWidth
                  >
                    Guardar Cambios
                  </Button>
                </>
              )}
            </Grid>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SearchComponent;
