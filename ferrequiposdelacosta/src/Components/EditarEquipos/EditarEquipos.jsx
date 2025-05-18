import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Snackbar,
  Alert,
  Box,
  Typography,
  Button,
  TextField,
  Grid,
} from "@mui/material";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
// import style from "./EditarEquipos.module.css";

const EditarEquipo = () => {
  const location = useLocation();
  const nameInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(
    () => location.state?.equipo || null
  );
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  console.log("Estado equipo Seleccionado:", equipoSeleccionado);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    images: [],
  });

  console.log("Estado Equipo Editado:", formData);
  useEffect(() => {
    if (equipoSeleccionado) {
      setFormData({
        id: equipoSeleccionado.id,
        name: equipoSeleccionado.name,
        description: equipoSeleccionado.description,
        images: equipoSeleccionado.images.map((img) => ({
          name: img.name,
          url: img.url,
          path: img.path,
          file: null,
          isNew: false,
        })),
      });
    }
  }, [equipoSeleccionado]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImputRestName = () => {
    setFormData((prev) => ({
      ...prev,
      name: equipoSeleccionado.name,
    }));
  };
  const handleImputRestDescription = () => {
    setFormData((prev) => ({
      ...prev,
      description: equipoSeleccionado.description,
    }));
  };

  const handleInputNewImg = (files) => {
    const file = files[0];
    if (!file) return;

    const nuevaImagen = {
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    };

    setNuevaImagenTemporal(nuevaImagen);
  };

  const guardarImagenConNombre = () => {
    if (!nuevaImagenTemporal || !nombreTemporal) return;

    const nuevaImagen = {
      file: nuevaImagenTemporal.file,
      url: nuevaImagenTemporal.url,
      name: nombreTemporal,
      isNew: true,
      path: null,
    };

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, nuevaImagen],
    }));

    setNuevaImagenTemporal(null);
    setNombreTemporal("");
  };

  const handleReplaceImage = (index, newFile) => {
    const newPreviewUrl = URL.createObjectURL(newFile);

    const updatedImages = [...formData.images];

    const previousImage = updatedImages[index];

    updatedImages[index] = {
      name: "",
      url: newPreviewUrl,
      file: newFile,
      isNew: true,
      path: previousImage.path || null,
    };

    setFormData((prev) => ({
      ...prev,
      images: updatedImages,
    }));
  };

  const handleChangeImageName = (index, newName) => {
    const updatedImages = [...formData.images];
    updatedImages[index] = {
      ...updatedImages[index],
      name: newName,
    };

    setFormData((prev) => ({
      ...prev,
      images: updatedImages,
    }));
  };

  const handleDeleteImageByIndex = (indexToDelete) => {
    const imagenAEliminar = formData.images[indexToDelete];

    if (imagenAEliminar?.path) {
      setImagenesEliminadas((prev) => [...prev, imagenAEliminar.path]);
    }

    const updatedImages = formData.images.filter((_, i) => i !== indexToDelete);
    setFormData((prev) => ({
      ...prev,
      images: updatedImages,
    }));

    if (editingImageIndex === indexToDelete) {
      setEditingImageIndex(null);
    }
  };

  const handleConfirmImageName = () => {
    if (editingImageIndex !== null) {
      const updatedImages = [...formData.images];
      updatedImages[editingImageIndex].name = tempImageName;
      setFormData((prev) => ({
        ...prev,
        images: updatedImages,
      }));
      setEditingImageIndex(null);
    }
  };

  // Elimina una imagen del storage
  const eliminarImagenStorage = async (path) => {
    try {
      const storage = getStorage();
      const imageRef = ref(storage, path);
      await deleteObject(imageRef);
    } catch (error) {
      console.warn("⚠️ No se pudo eliminar imagen del storage:", error);
    }
  };

  // Subir imágenes nuevas y reemplazar en sus posiciones originales
  const subirImagenesNuevas = async (imagenes, equipoId) => {
    const storage = getStorage();
    const subidas = await Promise.all(
      imagenes.map(async (img) => {
        if (!img.isNew) return img; // Conservar imagen antigua si no es nueva
        console.log("🟢 Imagen no modificada:", img);
        // Si hay una url existente, eliminar la imagen anterior
        if (img.path) {
          console.log("🟢 Imagen path:", img.path);
          await eliminarImagenStorage(img.path);
        }

        // Subir nueva imagen
        const uniqueName = `${img.name}-${Date.now()}`;
        const storageRef = ref(storage, `${equipoId}/${uniqueName}`);
        await uploadBytes(storageRef, img.file);
        const url = await getDownloadURL(storageRef);

        return {
          name: img.name,
          url,
          path: storageRef.fullPath,
        };
      })
    );

    return subidas;
  };

  const actualizarEquipoConCambios = async (formData, equipoId) => {
    try {
      const db = getFirestore();

      await Promise.all(
        imagenesEliminadas.map(async (path) => {
          await eliminarImagenStorage(path);
        })
      );

      const imagenesFinales = await subirImagenesNuevas(
        formData.images,
        equipoId
      );

      const imagenesFinalesFiltradas = imagenesFinales.map((img) => ({
        name: img.name,
        url: img.url,
        path: img.path,
      }));

      // Datos actualizados
      const datosActualizados = {
        name: formData.name,
        description: formData.description,
        images: imagenesFinalesFiltradas,
        nameLowerCase: formData.name.toLowerCase(),
      };

      // Actualizar documento
      const equipoRef = doc(db, "equipos", equipoId);
      await updateDoc(equipoRef, datosActualizados);

      setSnackbarMessage("Equipo actualizado con éxito");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);

      console.log("✅ Equipo actualizado con éxito.");
    } catch (error) {
      console.error("❌ Error al actualizar el equipo:", error);
    }
    setFormData({
      id: "",
      name: "",
      description: "",
      images: [],
    });
    setEquipoSeleccionado(null);
    setEditingImageIndex(null);
    setEditingNameIndex(null);
  };

  const cambiarOrden = () => {
    const nuevaLista = [];

    const indicesActuales = Object.keys(newIndices);
    const totalImagenes = formData.images.length;

    if (indicesActuales.length !== totalImagenes) {
      setSnackbarMessage(
        "Debes definir el nuevo índice para todas las imágenes."
      );
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
      return;
    }

    const copiaImagenes = [...formData.images];
    Object.entries(newIndices).forEach(([indexOriginal, nuevoIndex]) => {
      nuevaLista[nuevoIndex] = copiaImagenes[indexOriginal];
    });

    setFormData((prev) => ({
      ...prev,
      images: nuevaLista,
    }));

    setNewIndices({});
    setSnackbarMessage("Nuevo orden aplicado.");
    setSnackbarSeverity("success");
    setOpenSnackbar(true);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const [originalImageBeforeEdit, setOriginalImageBeforeEdit] = useState(null);
  const [editingImageIndex, setEditingImageIndex] = useState(null);
  const [imagenesEliminadas, setImagenesEliminadas] = useState([]);
  const [editingNameIndex, setEditingNameIndex] = useState(null);
  const [nuevaImagenTemporal, setNuevaImagenTemporal] = useState(null);
  const [nombreTemporal, setNombreTemporal] = useState("");
  const [newIndices, setNewIndices] = useState({});

  return (
    <Box sx={{ padding: 2 }}>
      <Typography
        variant="h4"
        sx={{
          color: "#8B3A3A",
          fontWeight: "bold",
          overflowWrap: "break-word",
          fontSize: { xs: "h5.fontSize", sm: "h4.fontSize" },
        }}
      >
        Editar el equipo
      </Typography>
      <Grid container spacing={0.5} justifyContent="center">
        <Grid item xs={12} sm={12} md={12}>
          <TextField
            inputRef={nameInputRef}
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Button
          variant="contained"
          onClick={() => {
            setFormData({ ...formData, name: "" });
            setTimeout(() => {
              nameInputRef.current?.focus();
            }, 0);
          }}
          sx={{
            fontSize: "12px",
            backgroundColor: "#1E90FF",
            "&:hover": {
              backgroundColor: "#d32f2f",
            },
            mt: 2,
            mr: 2,
          }}
        >
          Editar Nombre
        </Button>
        <Button
          variant="contained"
          onClick={handleImputRestName}
          sx={{
            fontSize: "12px",
            backgroundColor: "#1E90FF",
            "&:hover": {
              backgroundColor: "#d32f2f",
            },
            mt: 2,
          }}
        >
          Cancelar Edicion
        </Button>
        <Grid item xs={12} sm={12} md={12}>
          <TextField
            inputRef={descriptionInputRef}
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Button
          variant="contained"
          onClick={() => {
            setFormData({ ...formData, description: "" });
            setTimeout(() => {
              descriptionInputRef.current?.focus();
            }, 0);
          }}
          sx={{
            fontSize: "12px",
            backgroundColor: "#1E90FF",
            "&:hover": {
              backgroundColor: "#d32f2f",
            },
            mt: 2,
            mr: 2,
          }}
        >
          Editar descripción
        </Button>
        <Button
          variant="contained"
          onClick={handleImputRestDescription}
          sx={{
            fontSize: "12px",
            backgroundColor: "#1E90FF",
            "&:hover": {
              backgroundColor: "#d32f2f",
            },
            mt: 2,
            mb: 2,
          }}
        >
          Cancelar Edicion
        </Button>
        <Grid container spacing={2}>
          {formData.images && formData.images.length > 0
            ? formData.images.map((image, index) => (
                <Grid item xs={12} sm={4} key={index}>
                  <Box sx={{ textAlign: "center", mb: 2 }}>
                    <img
                      src={image.url}
                      alt={image.name}
                      style={{
                        width: "100px",
                        height: "100px",
                      }}
                    />

                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <Typography sx={{ color: "#00008B", marginBottom: 2 }}>
                        {image.name}
                      </Typography>
                      <Typography sx={{ color: "#00008B", marginBottom: 2 }}>
                        Posición actual: {index}
                      </Typography>
                      <TextField
                        label="Nueva Posición"
                        type="number"
                        value={newIndices[index] ?? ""}
                        onChange={(e) =>
                          setNewIndices({
                            ...newIndices,
                            [index]: Number(e.target.value),
                          })
                        }
                        size="small"
                        sx={{ flexGrow: 1, mr: 2 }}
                        inputProps={{
                          min: 0,
                          max: formData.images.length - 1,
                        }}
                      />

                      {editingImageIndex !== index ? (
                        <Button
                          variant="contained"
                          onClick={() => {
                            setEditingImageIndex(index);
                            setOriginalImageBeforeEdit(formData.images[index]);
                          }}
                          sx={{
                            fontSize: "12px",
                            backgroundColor: "#FFA500",
                            mt: 1,
                            mb: 1,
                            "&:hover": {
                              backgroundColor: "#FF8C00",
                            },
                          }}
                        >
                          Editar Imagen {index + 1}
                        </Button>
                      ) : (
                        <>
                          {editingNameIndex !== index ? (
                            <label
                              htmlFor={`file-upload-${index}`}
                              style={{ cursor: "pointer" }}
                            >
                              <input
                                id={`file-upload-${index}`}
                                type="file"
                                name="fotos"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    handleReplaceImage(index, file);
                                    setEditingNameIndex(index);
                                  }
                                }}
                                style={{ display: "none" }}
                              />
                              <Button
                                variant="contained"
                                component="span"
                                sx={{
                                  height: "45px",
                                  color: "#ffffff",
                                  backgroundColor: "#1E90FF",
                                  "&:hover": {
                                    backgroundColor: "#4682B4",
                                  },
                                  mt: 2,
                                  mb: 2,
                                }}
                              >
                                Selecciona Imagen
                              </Button>
                            </label>
                          ) : (
                            <>
                              <TextField
                                label="Nombre de la imagen"
                                value={formData.images[index]?.name || ""}
                                onChange={(e) =>
                                  handleChangeImageName(index, e.target.value)
                                }
                                size="small"
                                sx={{ flexGrow: 1, mr: 2 }}
                              />
                            </>
                          )}
                          <Button
                            variant="contained"
                            onClick={() => handleDeleteImageByIndex(index)}
                            sx={{
                              fontSize: "12px",
                              backgroundColor: "#1E90FF",
                              "&:hover": {
                                backgroundColor: "#d32f2f",
                              },
                              mt: 2,
                            }}
                          >
                            Eliminar Imagen
                          </Button>
                          <Button
                            variant="contained"
                            onClick={() => {
                              const updatedImages = [...formData.images];
                              if (originalImageBeforeEdit) {
                                updatedImages[index] = originalImageBeforeEdit;
                              }

                              setFormData((prev) => ({
                                ...prev,
                                images: updatedImages,
                              }));

                              setEditingImageIndex(null);
                              setEditingNameIndex(null);
                              setOriginalImageBeforeEdit(null);
                            }}
                            sx={{
                              fontSize: "12px",
                              backgroundColor: "#1E90FF",
                              "&:hover": {
                                backgroundColor: "#d32f2f",
                              },
                              mt: 2,
                            }}
                          >
                            Cancelar
                          </Button>

                          <Box sx={{ textAlign: "center", mt: 4 }}>
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={() => {
                                handleConfirmImageName;
                                setEditingImageIndex(null);
                                console.log("imagenes guardadas:", formData);
                              }}
                              sx={{
                                height: "40px",
                                backgroundColor: "#1E90FF",
                                "&:hover": { backgroundColor: "#28a745" },
                              }}
                            >
                              Guardar Cambios
                            </Button>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>
                </Grid>
              ))
            : null}
          <Box sx={{ textAlign: "center", mt: 4 }}>
            {!nuevaImagenTemporal ? (
              <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleInputNewImg(e.target.files)}
                  style={{ display: "none" }}
                />
                <Button
                  variant="contained"
                  component="span"
                  sx={{
                    height: "45px",
                    color: "#ffffff",
                    backgroundColor: "#1E90FF",
                    "&:hover": {
                      backgroundColor: "#4682B4",
                    },
                    mt: 2,
                    mb: 2,
                    mr: 2,
                  }}
                >
                  Selecciona Nueva Imagen
                </Button>
              </label>
            ) : (
              <Grid item xs={12} sm={4}>
                <img
                  src={nuevaImagenTemporal.url}
                  alt="preview"
                  style={{
                    width: "100px",
                    height: "100px",
                  }}
                />
                <TextField
                  label="Nombre de la imagen"
                  value={nombreTemporal}
                  onChange={(e) => setNombreTemporal(e.target.value)}
                  size="small"
                  sx={{ flexGrow: 1, mr: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={guardarImagenConNombre}
                  sx={{
                    height: "40px",
                    backgroundColor: "#1E90FF",
                    "&:hover": { backgroundColor: "#28a745" },
                    mt: 2,
                  }}
                >
                  Guardar Nueva Imagen
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    setNuevaImagenTemporal(null);
                    setNombreTemporal("");
                  }}
                  sx={{
                    fontSize: "12px",
                    backgroundColor: "#1E90FF",
                    "&:hover": {
                      backgroundColor: "#d32f2f",
                    },
                    mt: 2,
                  }}
                >
                  Cancelar
                </Button>
              </Grid>
            )}
          </Box>
        </Grid>
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (equipoSeleccionado) {
                setFormData(equipoSeleccionado);
              }
              setOriginalImageBeforeEdit(null);
              setEditingImageIndex(null);
              setEditingNameIndex(null);
              setNuevaImagenTemporal(null);
              setNombreTemporal("");
            }}
            sx={{
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#d32f2f",
              },
              mt: 2,
              mb: 2,
            }}
          >
            Cancelar Todo
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              actualizarEquipoConCambios(formData, equipoSeleccionado.id);
              console.log("Datos guardados:", formData);
            }}
            sx={{
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#28a745",
              },
              mt: 2,
              mb: 2,
              ml: 2,
            }}
          >
            Guardar Equipo
          </Button>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={cambiarOrden}
          sx={{
            height: "45px",
            color: "#ffffff",
            backgroundColor: "#1E90FF",
            "&:hover": {
              backgroundColor: "#28a745",
            },
            mt: 2,
            mb: 2,
            ml: 2,
          }}
        >
          Aplicar cambios de orden
        </Button>
      </Grid>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EditarEquipo;
