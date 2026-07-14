import { useState } from "react";
import {
  Box,
  Button,
  Grid,
  Stack,
  TextField,
  Divider,
  Chip,
} from "@mui/material";
import { storage, db } from "../Firebase/Firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, setDoc, doc } from "firebase/firestore";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

const CrearEquipos = () => {
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState({ name: "", description: "" });
  const [images, setImages] = useState([]);
  const [varianteNombre, setVarianteNombre] = useState("");
  const [variantes, setVariantes] = useState([]);
  const [nuevaVarianteValor, setNuevaVarianteValor] = useState("");
  const [textoExtra, setTextoExtra] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      name: "",
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleNameChange = (index, newName) => {
    setImages((prevImages) =>
      prevImages.map((img, i) =>
        i === index ? { ...img, name: newName } : img,
      ),
    );
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAddVariante = () => {
    const valor = nuevaVarianteValor.trim();
    if (!valor || variantes.includes(valor)) {
      setNuevaVarianteValor("");
      return;
    }
    setVariantes((prev) => [...prev, valor]);
    setNuevaVarianteValor("");
  };

  const handleRemoveVariante = (indexToRemove) => {
    setVariantes((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleUploadImages = async (equipoId) => {
    const uploadPromises = images.map(async (img) => {
      const uniqueName = `${img.name}-${Date.now()}`;
      const storageRef = ref(storage, `${equipoId}/${uniqueName}`);
      await uploadBytes(storageRef, img.file);
      const downloadURL = await getDownloadURL(storageRef);
      return { name: img.name, url: downloadURL, path: storageRef.fullPath };
    });

    return await Promise.all(uploadPromises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, description } = formValues;

    if (!name || !description || images.length === 0) {
      showSnackbar("Todos los campos son obligatorios.", "error");
      return;
    }
    setLoading(true);

    try {
      const equipoRef = doc(collection(db, "equipos"));
      const equipoId = equipoRef.id;

      const uploadedImages = await handleUploadImages(equipoId);

      const data = {
        id: equipoId,
        name,
        description,
        images: uploadedImages,
        nameLowerCase: name.toLowerCase(),
        varianteNombre: varianteNombre.trim(),
        variantes,
        textoExtra: textoExtra.trim(),
        subtitulo: subtitulo.trim(),
      };

      await setDoc(equipoRef, data);

      showSnackbar("Equipo creado exitosamente.", "success");

      setFormValues({ name: "", description: "" });
      setImages([]);
      setVarianteNombre("");
      setVariantes([]);
      setNuevaVarianteValor("");
      setTextoExtra("");
      setSubtitulo("");
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormValues({ name: "", description: "" });
    setImages([]);
    setVarianteNombre("");
    setVariantes([]);
    setNuevaVarianteValor("");
    setTextoExtra("");
    setSubtitulo("");
  };

  if (loading) return <LoadingLogo />;

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2} justifyContent="center">
        <Box
          sx={{
            width: { xs: "90%", md: "60%" },
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            mt: 4,
          }}
        >
          <TextField
            name="name"
            label="Nombre del equipo"
            value={formValues.name}
            onChange={handlerInputChange}
            fullWidth
          />

          <TextField
            name="description"
            label="Descripción del equipo"
            value={formValues.description}
            onChange={handlerInputChange}
            fullWidth
            multiline
            rows={4}
            margin="normal"
          />

          <TextField
            name="varianteNombre"
            label="Nombre de la variante (opcional, ej. Tamaño, Color)"
            value={varianteNombre}
            onChange={(e) => setVarianteNombre(e.target.value)}
            fullWidth
            margin="normal"
          />

          <Box sx={{ display: "flex", gap: 1, width: "100%", mt: 1 }}>
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

          {variantes.length > 0 && (
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ width: "100%", mt: 2 }}
            >
              {variantes.map((variante, index) => (
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
            value={textoExtra}
            onChange={(e) => setTextoExtra(e.target.value)}
            fullWidth
            multiline
            rows={2}
            margin="normal"
          />

          <TextField
            name="subtitulo"
            label="Subtítulo para cotización/PDF (opcional, no se muestra al público)"
            helperText="Se usa en vez del nombre del catálogo al generar la cotización/PDF. Útil cuando el nombre del catálogo es informal (ej. 'RANA' → 'Vibrocompactador tipo rana'). Si se deja vacío, se sigue usando la descripción."
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            fullWidth
            margin="normal"
          />

          <Divider sx={{ width: "100%", mt: 2, mb: 1 }} />

          {images &&
            images.map((img, index) => (
              <Box
                key={img.id}
                sx={{
                  mb: 2,
                  mt: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    maxWidth: "100%",
                  }}
                >
                  <Box
                    component="img"
                    src={img.preview}
                    alt={`preview-${index}`}
                    sx={{
                      width: { xs: 80, sm: 90, md: 100 },
                      height: { xs: 80, sm: 90, md: 100 },
                      marginRight: 1.5,
                    }}
                  />
                  <TextField
                    name={`imagenNombre-${index}`}
                    label="Nombre de la imagen"
                    value={img.name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    sx={{
                      marginRight: 1.5,
                    }}
                  />

                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleRemoveImage(index)}
                  >
                    Eliminar
                  </Button>
                </Box>
              </Box>
            ))}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
              <Grid container spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  component="span"
                  fullWidth
                  sx={{
                    mt: 2,
                  }}
                >
                  Selecciona una Imagen
                </Button>
              </Grid>
            </label>
            <input
              id="file-upload"
              type="file"
              name="fotos"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
          </Box>
        </Box>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <Divider
          sx={{
            width: "100%",
            mt: 1,
            mb: { xs: 3, md: 4 },
            borderBottomWidth: "2.5px",
          }}
        />
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={10} sm={4} md={4}>
            <Button type="submit" variant="success" disabled={loading} fullWidth>
              CREAR EQUIPO
            </Button>
          </Grid>
          <Grid item xs={10} sm={4} md={4}>
            <Button onClick={handleCancel} variant="danger" fullWidth>
              CANCELAR
            </Button>
          </Grid>
        </Grid>
      </Box>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </form>
  );
};

export default CrearEquipos;
