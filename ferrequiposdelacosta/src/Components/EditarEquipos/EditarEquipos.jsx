import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  useTheme,
  Divider,
  Stack,
  Chip,
} from "@mui/material";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

const EditarEquipo = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(
    () => location.state?.equipo || null
  );
  const theme = useTheme();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    images: [],
    varianteNombre: "",
    variantes: [],
    textoExtra: "",
    subtitulo: "",
  });
  const [nuevaVarianteValor, setNuevaVarianteValor] = useState("");

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
        varianteNombre: equipoSeleccionado.varianteNombre || "",
        variantes: equipoSeleccionado.variantes || [],
        textoExtra: equipoSeleccionado.textoExtra || "",
        subtitulo: equipoSeleccionado.subtitulo || "",
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

  const handleAddVariante = () => {
    const valor = nuevaVarianteValor.trim();
    if (!valor || formData.variantes.includes(valor)) {
      setNuevaVarianteValor("");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      variantes: [...prev.variantes, valor],
    }));
    setNuevaVarianteValor("");
  };

  const handleRemoveVariante = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      variantes: prev.variantes.filter((_, i) => i !== indexToRemove),
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

        if (img.path) {
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
        varianteNombre: (formData.varianteNombre || "").trim(),
        variantes: formData.variantes || [],
        textoExtra: (formData.textoExtra || "").trim(),
        subtitulo: (formData.subtitulo || "").trim(),
      };

      const equipoRef = doc(db, "equipos", equipoId);
      await updateDoc(equipoRef, datosActualizados);

      // El catálogo de equipos vive en Redux y solo se carga una vez por
      // sesión; sin este refresh, el resto de la app (kiosco, selector de
      // equipos, etc.) seguiría mostrando las imágenes viejas hasta recargar.
      dispatch(fetchEquiposData());

      showSnackbar("Equipo actualizado con éxito", "success");
    } catch (error) {
      console.error("❌ Error al actualizar el equipo:", error);
    }
    setFormData({
      id: "",
      name: "",
      description: "",
      images: [],
      varianteNombre: "",
      variantes: [],
      textoExtra: "",
      subtitulo: "",
    });
    setEquipoSeleccionado(null);
    setEditingImageIndex(null);
    setEditingNameIndex(null);
  };

  const cambiarOrden = () => {
    const indicesActuales = Object.keys(newIndices);
    const totalImagenes = formData.images.length;

    if (indicesActuales.length !== totalImagenes) {
      showSnackbar(
        "Debes definir el nuevo índice para todas las imágenes.",
        "warning",
      );
      return;
    }

    // Si dos imágenes quedan con la misma posición nueva, una pisaría a la
    // otra y la perderíamos en silencio: se valida antes de aplicar.
    const nuevosValores = Object.values(newIndices);
    const posicionesUnicas = new Set(nuevosValores);
    const posicionesValidas = nuevosValores.every(
      (valor) => Number.isInteger(valor) && valor >= 0 && valor < totalImagenes,
    );

    if (!posicionesValidas || posicionesUnicas.size !== nuevosValores.length) {
      showSnackbar(
        `Cada imagen debe tener una posición distinta, entre 1 y ${totalImagenes}.`,
        "warning",
      );
      return;
    }

    const nuevaLista = [];
    const copiaImagenes = [...formData.images];
    Object.entries(newIndices).forEach(([indexOriginal, nuevoIndex]) => {
      nuevaLista[nuevoIndex] = copiaImagenes[indexOriginal];
    });

    setFormData((prev) => ({
      ...prev,
      images: nuevaLista,
    }));

    setNewIndices({});
    showSnackbar("Nuevo orden aplicado.", "success");
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
                name="name"
                label="Nombre del equipo"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <TextField
                name="description"
                label="Descripción del equipo"
                value={formData.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={4}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <TextField
                name="varianteNombre"
                label="Nombre de la variante (opcional, ej. Tamaño, Color)"
                value={formData.varianteNombre}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
                <TextField
                  name="nuevaVarianteValor"
                  label="Valor de la variante (ej. 1.20m)"
                  value={nuevaVarianteValor}
                  onChange={(e) => setNuevaVarianteValor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddVariante();
                    }
                  }}
                  fullWidth
                />
                <Button variant="contained" onClick={handleAddVariante}>
                  Agregar
                </Button>
              </Box>

              {formData.variantes.length > 0 && (
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ width: "100%", mt: 2 }}
                >
                  {formData.variantes.map((variante, index) => (
                    <Chip
                      key={`${variante}-${index}`}
                      label={variante}
                      onDelete={() => handleRemoveVariante(index)}
                    />
                  ))}
                </Stack>
              )}

              <TextField
                name="textoExtra"
                label="Texto extra (opcional)"
                value={formData.textoExtra}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
                sx={{ mt: 2 }}
              />

              <TextField
                name="subtitulo"
                label="Subtítulo para cotización/PDF (opcional, no se muestra al público)"
                helperText="Se usa en vez del nombre del catálogo al generar la cotización/PDF. Útil cuando el nombre del catálogo es informal (ej. 'RANA' → 'Vibrocompactador tipo rana'). Si se deja vacío, se sigue usando la descripción."
                value={formData.subtitulo}
                onChange={handleInputChange}
                fullWidth
                sx={{ mt: 2 }}
              />
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
                          Posición: {index + 1}
                        </Typography>

                        <TextField
                          name={`nuevaPosicion-${index}`}
                          label="Nueva Posición"
                          type="number"
                          fullWidth
                          value={newIndices[index] !== undefined ? newIndices[index] + 1 : ""}
                          onChange={(e) =>
                            setNewIndices({
                              ...newIndices,
                              [index]: Number(e.target.value) - 1,
                            })
                          }
                          inputProps={{
                            min: 1,
                            max: formData.images.length,
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
                                  name={`imagenNombre-${index}`}
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
                                  setEditingImageIndex(null);
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
                  name="nombreImagenNueva"
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
                    setFormData({
                      ...equipoSeleccionado,
                      varianteNombre: equipoSeleccionado.varianteNombre || "",
                      variantes: equipoSeleccionado.variantes || [],
                      textoExtra: equipoSeleccionado.textoExtra || "",
                      subtitulo: equipoSeleccionado.subtitulo || "",
                    });
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
        
        <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
      </Box>
    </Box>
  );
};

export default EditarEquipo;
