import React, { useState } from "react";
import { Box, Button, Grid, TextField, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../Context/AuthContext";
import { Link } from "react-router-dom";
import { storage } from "../../Components/Firebase/Firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { fetchformData } from "../../Store/Actions/formAction";
import { setFormValues, updateImageUrl } from "../../Store/Slices/formSlice";
import { updateNameImage } from "../../Store/Slices/nameImagenSlice";
import LoadingCircle from "../../Components/LoadingCircle/LoadingCircle";
import style from "./VistaDb.module.css";

export default function AdminForms() {
  const { user, logout, loading } = useAuth();

  const formValues = useSelector((state) => state.form.values);
  const imageUrl = useSelector((state) => state.form.values.url);
  const nameImg = useSelector((state) => state.nameImagen.nameImagen);

  const dispatch = useDispatch();

  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    const updatedFormValues = { ...formValues, [name]: value };
    dispatch(setFormValues(updatedFormValues));
  };

  const handlerSubmit = async (event) => {
    event.preventDefault();
    dispatch(fetchformData(formValues));
  };

  const [file, setFile] = useState(null);
  const [nameImage, setNameImage] = useState("");

  async function uploadFile(file) {
    const storageRef = ref(storage, nameImage);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  }

  const handleFileUpload = async () => {
    try {
      const imageUrl = await uploadFile(file);
      dispatch(updateImageUrl(imageUrl));
      dispatch(updateNameImage(nameImage));
      alert(`${nameImage} Creado Exitosamente!!!!`);
      setFile(null);
      setNameImage("");
      document.getElementById("file-upload").value = "";
    } catch (error) {
      alert(`Error al Subir el Archivo ${nameImage}. Intenta de Nuevo!`);
    }
  };

  function changeHandlerFile(event) {
    setFile(event.target.files[0]);
  }

  function changeHandlerName(event) {
    const newName = event.target.value;
    setNameImage(newName);
  }

  const handlerLogout = async () => {
    await logout();
  };

  if (loading) {
    return <LoadingCircle />;
  }

  return (
    <form onSubmit={handlerSubmit}>
      <Box sx={{ padding: 2, textAlign: "center" }}>
        <Box sx={{ marginBottom: 4 }}>
          <Typography
            variant="h4"
            sx={{ color: "#8B3A3A", fontWeight: "bold" }}
          >
            Bienvenida {user.email},
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mt: 2,
              }}
            >
              {file ? (
                <img
                  className={style.previewImage}
                  src={file ? URL.createObjectURL(file) : ""}
                  alt="Vista previa de la imagen"
                  style={{
                    width: "200px",
                    height: "200px",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Typography
                  variant="h5"
                  sx={{ color: "#8B3A3A", fontWeight: "bold" }}
                >
                  Selecciona una Imagen.
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
                <Button
                  variant="contained"
                  component="span"
                  sx={{
                    color: "#ffffff",
                    backgroundColor: "#1E90FF",
                    "&:hover": {
                      backgroundColor: "#4682B4",
                    },
                    mt: 2,
                  }}
                >
                  Selecciona Imagen
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                name="fotos"
                onChange={changeHandlerFile}
                style={{ display: "none" }}
              />
            </Box>

            <TextField
              type="text"
              name="name"
              onChange={changeHandlerName}
              value={nameImage}
              placeholder="Nombre de la imagen..."
              fullWidth
              margin="normal"
              sx={{
                mt: 1,
                fontSize: "0.75rem",
                "& .MuiInputBase-input": {
                  padding: "6px 12px",
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "#00008B",
                  },
                  "&:hover fieldset": {
                    borderColor: "#4682B4",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1E90FF",
                  },
                },
              }}
            />
            <Button
              type="button"
              onClick={handleFileUpload}
              variant="contained"
              sx={{
                height: "45px",
                color: "#ffffff",
                backgroundColor: "#1E90FF",
                "&:hover": {
                  backgroundColor: "#4682B4",
                },
                marginBottom: 2,
              }}
            >
              SUBIR IMAGENES
            </Button>
            <TextField
              type="text"
              name="name"
              onChange={handlerInputChange}
              placeholder="Nombre del equipo..."
              fullWidth
              margin="normal"
              sx={{
                mt: 1,
                fontSize: "0.75rem",
                "& .MuiInputBase-input": {
                  padding: "6px 12px",
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "#00008B",
                  },
                  "&:hover fieldset": {
                    borderColor: "#4682B4",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1E90FF",
                  },
                },
              }}
            />
            <TextField
              name="description"
              onChange={handlerInputChange}
              placeholder="Descripción del equipo..."
              multiline
              rows={4}
              fullWidth
              margin="normal"
              sx={{
                mt: 1,
                fontSize: "0.75rem",
                "& .MuiInputBase-input": {
                  padding: "6px 12px",
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "#00008B",
                  },
                  "&:hover fieldset": {
                    borderColor: "#4682B4",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1E90FF",
                  },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {imageUrl &&
                imageUrl.map((url, index) => (
                  <Box key={index} sx={{ textAlign: "center", mb: 2 }}>
                    <img
                      className={style.previewImage}
                      src={url}
                      alt={`Vista previa ${index + 1}`}
                      style={{
                        width: "200px",
                        height: "200px",
                        objectFit: "cover",
                        marginBottom: "10px",
                      }}
                    />
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <TextField
                        type="text"
                        readOnly
                        value={
                          nameImg && Array.isArray(nameImg) && nameImg[index]
                            ? nameImg[index]
                            : `Nombre no disponible ${index + 1}`
                        }
                        fullWidth
                        margin="normal"
                        sx={{
                          mt: 1,
                          fontSize: "0.75rem",
                          "& .MuiInputBase-input": {
                            padding: "6px 12px",
                          },
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                              borderColor: "#00008B",
                              // borderWidth: '2px',
                            },
                            "&:hover fieldset": {
                              borderColor: "#4682B4",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#1E90FF",
                            },
                          },
                        }}
                      />
                    </Box>
                  </Box>
                ))}
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {imageUrl &&
                imageUrl.map((url, index) => (
                  <TextField
                    key={index}
                    type="text"
                    readOnly
                    placeholder={`URL imagen ${index + 1}...`}
                    value={url || ""}
                    fullWidth
                    margin="normal"
                    sx={{
                      mt: 1,
                      fontSize: "0.75rem",
                      "& .MuiInputBase-input": {
                        padding: "6px 12px",
                      },
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": {
                          borderColor: "#00008B",
                          // borderWidth: '2px',
                        },
                        "&:hover fieldset": {
                          borderColor: "#4682B4",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#1E90FF",
                        },
                      },
                    }}
                  />
                ))}
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                height: "45px",
                color: "#ffffff",
                backgroundColor: "#1E90FF",
                "&:hover": {
                  backgroundColor: "#4682B4",
                },
              }}
            >
              CREAR EQUIPO
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              component={Link}
              to="/admin"
              variant="contained"
              fullWidth
              sx={{
                height: "45px",
                color: "#ffffff",
                backgroundColor: "#1E90FF",
                "&:hover": {
                  backgroundColor: "#4682B4",
                },
              }}
            >
              MENU
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              onClick={handlerLogout}
              variant="contained"
              fullWidth
              sx={{
                height: "45px",
                color: "#ffffff",
                backgroundColor: "#1E90FF",
                "&:hover": {
                  backgroundColor: "#4682B4",
                },
              }}
            >
              CERRAR SESION
            </Button>
          </Grid>
        </Grid>
      </Box>
    </form>
  );
}
