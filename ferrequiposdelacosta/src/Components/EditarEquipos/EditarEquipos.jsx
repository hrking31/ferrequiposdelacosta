import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Snackbar,
  Alert,
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  useTheme,
  Divider,
} from "@mui/material";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const EditarEquipo = () => {
  const location = useLocation();
  const nameInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(
    () => location.state?.equipo || null
  );
  const theme = useTheme();
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  // console.log("Estado equipo Seleccionado:", equipoSeleccionado);
  
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    images: [],
  });

  // console.log("Estado Equipo Editado:", formData);
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

  const eliminarImagenStorage = async (path) => {
    try {
      const storage = getStorage();
      const imageRef = ref(storage, path);
      await deleteObject(imageRef);
    } catch (error) {
      console.warn("⚠️ No se pudo eliminar imagen del storage:", error);
    }
  };

  const subirImagenesNuevas = async (imagenes, equipoId) => {
    const storage = getStorage();
    const subidas = await Promise.all(
      imagenes.map(async (img) => {
        if (!img.isNew) return img;
        console.log("🟢 Imagen no modificada:", img);

        if (img.path) {
          console.log("🟢 Imagen path:", img.path);
          await eliminarImagenStorage(img.path);
        }

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
      console.log("formData.url:", formData.url);
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

      const datosActualizados = {
        name: formData.name,
        description: formData.description,
        images: imagenesFinalesFiltradas,
        nameLowerCase: formData.name.toLowerCase(),
      };

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
      <Box
        mx="auto"
        p={2}
        pr={0}
        display="flex"
        flexDirection="column"
        sx={{
          [theme.breakpoints.up("md")]: { width: "60%" },
        }}
      >
        <Grid container spacing={2}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                inputRef={nameInputRef}
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={6}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  setFormData({ ...formData, name: "" });
                  setTimeout(() => {
                    nameInputRef.current?.focus();
                  }, 0);
                }}
                sx={{ flex: 1, whiteSpace: "nowrap" }}
              >
                Editar Nombre
              </Button>
            </Grid>

            <Grid item xs={6}>
              <Button
                variant="danger"
                fullWidth
                onClick={handleImputRestName}
                sx={{ flex: 1, whiteSpace: "nowrap" }}
              >
                Cancelar Edicion
              </Button>
            </Grid>

            <Grid
              item
              xs={12}
              sx={{
                mt: 2,
              }}
            >
              <TextField
                inputRef={descriptionInputRef}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={4}
              />
            </Grid>

            <Grid item xs={6}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  setFormData({ ...formData, description: "" });
                  setTimeout(() => {
                    descriptionInputRef.current?.focus();
                  }, 0);
                }}
                sx={{ flex: 1, whiteSpace: "nowrap" }}
              >
                Editar Descripción
              </Button>
            </Grid>

            <Grid item xs={6}>
              <Button
                variant="danger"
                fullWidth
                onClick={handleImputRestDescription}
                sx={{ flex: 1, whiteSpace: "nowrap" }}
              >
                Cancelar Edicion
              </Button>
            </Grid>
          </Grid>

          <Divider
            sx={{
              width: "100%",
              mt: 3,
              mb: { xs: 2, md: 4 },
              borderBottomWidth: "2.5px",
            }}
          />

          <Grid container spacing={2} sx={{ mt: 2, mb: 1 }}>
            {formData.images && formData.images.length > 0
              ? formData.images.map((image, index) => (
                  <Grid item xs={6} sm={4} key={index}>
                    <Box sx={{ textAlign: "center" }}>
                      <img
                        src={image.url}
                        alt={image.name}
                        style={{
                          width: "100px",
                          height: "100px",
                          borderRadius: 12,
                          border: "1px solid #e0e0e0",
                        }}
                      />

                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2">{image.name}</Typography>

                        <Typography variant="body2" sx={{ mb: 2 }}>
                          Posición: {index}
                        </Typography>

                        <TextField
                          label="Nueva Posición"
                          type="number"
                          fullWidth
                          value={newIndices[index] ?? ""}
                          onChange={(e) =>
                            setNewIndices({
                              ...newIndices,
                              [index]: Number(e.target.value),
                            })
                          }
                          inputProps={{
                            min: 0,
                            max: formData.images.length - 1,
                          }}
                        />

                        {editingImageIndex !== index ? (
                          <Box sx={{ width: "100%", mt: 2 }}>
                            <Button
                              variant="contained"
                              fullWidth
                              onClick={() => {
                                setEditingImageIndex(index);
                                setOriginalImageBeforeEdit(
                                  formData.images[index]
                                );
                              }}
                              sx={{ flex: 1, whiteSpace: "nowrap" }}
                            >
                              Editar Imagen {index + 1}
                            </Button>
                          </Box>
                          
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

                                <Box sx={{ width: "100%", mt: 2 }}>
                                  <Button
                                    variant="contained"
                                    component="span"
                                    sx={{ flex: 1, whiteSpace: "nowrap", p: 1 }}
                                  >
                                    Selecciona Imagen
                                  </Button>
                                </Box>
                              </label>

                            ) : (
                              <>
                                <TextField
                                  label="Nombre de la imagen"
                                  fullWidth
                                  value={formData.images[index]?.name || ""}
                                  onChange={(e) =>
                                    handleChangeImageName(index, e.target.value)
                                  }
                                  sx={{
                                    mt: 2,
                                  }}
                                />
                              </>
                            )}

                            <Box sx={{ width: "100%", mt: 2 }}>
                              <Button
                                variant="danger"
                                fullWidth
                                onClick={() => handleDeleteImageByIndex(index)}
                                sx={{ flex: 1, whiteSpace: "nowrap" }}
                              >
                                Eliminar Imagen
                              </Button>
                            </Box>
                            
                            <Box sx={{ width: "100%", mt: 2 }}>
                              <Button
                                variant="danger"
                                fullWidth
                                onClick={() => {
                                  const updatedImages = [...formData.images];
                                  if (originalImageBeforeEdit) {
                                    updatedImages[index] =
                                      originalImageBeforeEdit;
                                  }

                                  setFormData((prev) => ({
                                    ...prev,
                                    images: updatedImages,
                                  }));

                                  setEditingImageIndex(null);
                                  setEditingNameIndex(null);
                                  setOriginalImageBeforeEdit(null);
                                }}
                              >
                                Cancelar
                              </Button>
                            </Box>

                            <Box sx={{ width: "100%", mt: 2 }}>
                              <Button
                                variant="success"
                                color="primary"
                                fullWidth
                                onClick={() => {
                                  handleConfirmImageName;
                                  setEditingImageIndex(null);
                                  console.log("imagenes guardadas:", formData);
                                }}
                                sx={{ flex: 1, whiteSpace: "nowrap" }}
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
          </Grid>

          <Divider
            sx={{
              width: "100%",
              mt: 2,
              mb: { xs: 2, md: 4 },
              borderBottomWidth: "2.5px",
            }}
          />

          <Box
            mx="auto"
            display="flex"
            flexDirection="column"
            gap={2}
            sx={{ mb: 1 }}
          >
            {!nuevaImagenTemporal ? (
              <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleInputNewImg(e.target.files)}
                  style={{ display: "none" }}
                />

                <Box sx={{ textAlign: "center", mt: 4 }}>
                  <Button variant="contained" component="span" fullWidth>
                    Selecciona Nueva Imagen
                  </Button>
                </Box>
              </label>

            ) : (
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 400,
                  mx: "auto",
                  mt: 4,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 2,
                }}
              >

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
                  fullWidth
                />

                <Box sx={{ width: "100%", mt: 2 }}>
                  <Button
                    variant="success"
                    onClick={guardarImagenConNombre}
                    fullWidth
                  >
                    Guardar Nueva Imagen
                  </Button>
                </Box>

                <Box sx={{ width: "100%", mt: 2 }}>
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => {
                      setNuevaImagenTemporal(null);
                      setNombreTemporal("");
                    }}
                  >
                    Cancelar
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          <Divider
            sx={{
              width: "100%",
              mt: 2,
              mb: { xs: 2, md: 4 },
              borderBottomWidth: "2.5px",
            }}
          />

          <Grid container spacing={2} sx={{ mt: 2, p: 1 }}>
            <Grid item xs={12} md={4}>
              <Button variant="success" onClick={cambiarOrden} fullWidth>
                Aplicar Orden
              </Button>
            </Grid>

            <Grid item xs={12} md={4}>
              <Button
                variant="success"
                fullWidth
                onClick={() => {
                  actualizarEquipoConCambios(formData, equipoSeleccionado.id);
                }}
              >
                Guardar Equipo
              </Button>
            </Grid>

            <Grid item xs={12} md={4}>
              <Button
                variant="danger"
                fullWidth
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
              >
                Cancelar Todo
              </Button>
            </Grid>
          </Grid>
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
    </Box>
  );
};

export default EditarEquipo;
