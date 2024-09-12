import React, { useState } from "react";
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../Context/AuthContext";
import { Link } from "react-router-dom";
import { storage } from "../../Components/Firebase/Firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { fetchformData } from "../../Store/Actions/formAction";
import { setFormValues, updateImage } from "../../Store/Slices/formSlice";
import style from "./VistaDb.module.css";

export default function AdminForms() {
  const { user, logout } = useAuth();
  const formValues = useSelector((state) => state.form.values);
  const imageUrl = useSelector((state) => state.form.values.images);
  const dispatch = useDispatch();

  const [file, setFile] = useState(null);
  const [nameImage, setNameImage] = useState("");
  const [openFormSnackbar, setOpenFormSnackbar] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    const updatedFormValues = { ...formValues, [name]: value };
    dispatch(setFormValues(updatedFormValues));
  };

  const resetForm = () => {
    dispatch(setFormValues({ name: "", description: "", images: [] }));
    setFile(null);
    setNameImage("");
  };

  const handlerSubmit = async (event) => {
    event.preventDefault();
    if (!formValues.name || !formValues.description || !imageUrl.length) {
      setSnackbarMessage("Por favor completa todos los campos del formulario.");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
      return;
    }
    dispatch(fetchformData(formValues));
    setSnackbarMessage("Equipo creado exitosamente!");
    setSnackbarSeverity("success");
    setOpenSnackbar(true);
    resetForm();
  };

  async function uploadFile(file, nameImage) {
    if (!file || !nameImage) {
      throw new Error("File or nameImage is missing");
    }

    try {
      const uniqueName = `${nameImage}-${Date.now()}`;
      const storageRef = ref(storage, uniqueName);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return { url: downloadURL, name: uniqueName };
    } catch (error) {
      throw new Error("Error uploading file: " + error.message);
    }
  }

  const handleFileUpload = async () => {
    if (!file) {
      setSnackbarMessage("Por favor selecciona un archivo para subir.");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
      return;
    }

    if (!nameImage) {
      setSnackbarMessage("Por favor ingresa un nombre para el archivo.");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
      return;
    }

    try {
      const { url, name } = await uploadFile(file, nameImage);
      dispatch(updateImage({ url, name }));
      setSnackbarMessage(`${name} Creado Exitosamente!!!!`);
      setSnackbarSeverity("success");
    } catch (error) {
      setSnackbarMessage(
        `Error al Subir el Archivo ${nameImage}. Intenta de Nuevo!`
      );
      setSnackbarSeverity("error");
    } finally {
      setOpenSnackbar(true);
      setFile(null);
      setNameImage("");
      document.getElementById("file-upload").value = "";
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

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleCloseFormSnackbar = () => {
    setOpenFormSnackbar(false);
  };

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
                    width: "100px",
                    height: "100px",
                    // objectFit: "cover",
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
              label="Nombre de la imagen"
              fullWidth
              InputLabelProps={{
                shrink: true,
                sx: {
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                  color: "#8B3A3A",
                },
              }}
              InputProps={{
                sx: {
                  color: "#8B3A3A",
                },
              }}
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
              value={formValues.name}
              label="Nombre del equipo"
              fullWidth
              InputLabelProps={{
                shrink: true,
                sx: {
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                  color: "#8B3A3A",
                },
              }}
              InputProps={{
                sx: {
                  color: "#8B3A3A",
                },
              }}
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
              value={formValues.description}
              label="Descripción del equipo"
              multiline
              rows={6}
              fullWidth
              InputLabelProps={{
                shrink: true,
                sx: {
                  display: "flex",
                  height: "100%",
                  color: "#8B3A3A",
                },
              }}
              InputProps={{
                sx: {
                  color: "#8B3A3A",
                },
              }}
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
                imageUrl.map(({ url }, index) => (
                  <Box key={index} sx={{ textAlign: "center", mb: 2 }}>
                    <img
                      className={style.previewImage}
                      src={url}
                      alt={`Vista previa ${index + 1}`}
                      style={{
                        width: "100px",
                        height: "100px",
                        // objectFit: "cover",
                        // marginBottom: "10px",
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
                          imageUrl && Array.isArray(imageUrl) && imageUrl[index]
                            ? imageUrl[index].name
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
                imageUrl.map(({ url }, index) => (
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
        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
        <Snackbar
          open={openFormSnackbar}
          autoHideDuration={6000}
          onClose={handleCloseFormSnackbar}
        >
          <Alert onClose={handleCloseFormSnackbar} severity={snackbarSeverity}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </form>
  );
}
