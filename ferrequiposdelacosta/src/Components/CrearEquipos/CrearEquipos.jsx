import { useState } from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material";
import { usePantallaCompacta } from "../../Utils/pantalla";
import { useDispatch } from "react-redux";
import { db } from "../Firebase/Firebase";
import { collection, setDoc, doc } from "firebase/firestore";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import FormularioEquipo from "../FormularioEquipo/FormularioEquipo";
import Seccion from "../FormularioEquipo/Seccion";
import SeccionDatos from "../FormularioEquipo/SeccionDatos";
import SeccionVariantes from "../FormularioEquipo/SeccionVariantes";
import SeccionCotizacion from "../FormularioEquipo/SeccionCotizacion";
import ZonaElegirFoto from "../FormularioEquipo/ZonaElegirFoto";
import TarjetaFoto from "../FormularioEquipo/TarjetaFoto";
import EtiquetasFoto from "../FormularioEquipo/EtiquetasFoto";
import BarraFoto from "../FormularioEquipo/BarraFoto";
import GrillaFotos from "../FormularioEquipo/GrillaFotos";
import { coloresDelFormulario } from "../FormularioEquipo/piezasFormulario";
import { subirFotoEquipo } from "../FormularioEquipo/fotosEquipo";

// `anchoCompleto`: con lugar (ver VistaCreaEquipo) el formulario ocupa todo el
// ancho que le queda, en dos columnas de secciones al alto de la pantalla.
//
// Crear y Cancelar no van acá: viven en el encabezado (computador) o en el
// pie (celular), como en la cotización y la cuenta de cobro, y llegan a este
// formulario por su `idFormulario`: un botón puede enviar o limpiar un
// formulario que está en otra parte de la pantalla.
//
// `fotosPorFila`: lo decide la vista por sus cortes de pantalla.
const CrearEquipos = ({ anchoCompleto = false, idFormulario, fotosPorFila }) => {
  const theme = useTheme();
  // Angosta O baja, como Seguimiento: el teléfono acostado también es celular.
  const esCelular = usePantallaCompacta();
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState({ name: "", description: "" });
  const [images, setImages] = useState([]);
  const [varianteNombre, setVarianteNombre] = useState("");
  const [variantes, setVariantes] = useState([]);
  const [textoExtra, setTextoExtra] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");
  const dispatch = useDispatch();

  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (files) => {
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

  // ◀ ▶: la cambia de lugar con la de al lado. La primera es la portada.
  const handleMoveImage = (index, paso) => {
    setImages((prev) => {
      const ordenadas = [...prev];
      [ordenadas[index], ordenadas[index + paso]] = [ordenadas[index + paso], ordenadas[index]];
      return ordenadas;
    });
  };

  // Cada foto se achica y se sube en dos tamaños (ver fotosEquipo).
  const handleUploadImages = (equipoId) =>
    Promise.all(images.map((img) => subirFotoEquipo(equipoId, img)));

  const handleCancel = () => {
    setFormValues({ name: "", description: "" });
    setImages([]);
    setVarianteNombre("");
    setVariantes([]);
    setTextoExtra("");
    setSubtitulo("");
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

      // Mismo motivo que en EditarEquipos: el catálogo vive en Redux y solo se
      // consulta cuando está vacío, así que sin este refresh el equipo recién
      // creado no aparece en la tienda, el kiosco ni la pantalla de Equipos
      // hasta que se recargue la página.
      dispatch(fetchEquiposData());

      showSnackbar("Equipo creado exitosamente.", "success");
      handleCancel();
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingLogo text="Creando equipo..." />;

  const colores = coloresDelFormulario(theme);
  // En el computador, con las secciones al alto de la pantalla, los campos
  // largos llenan su recuadro; en el celular crecen a medida que se escribe.
  const llenar = anchoCompleto;

  const texto = (
    <>
      <SeccionDatos
        nombre={formValues.name}
        descripcion={formValues.description}
        onChange={handlerInputChange}
        color={colores.datos}
        llenar={llenar}
      />
      <SeccionVariantes
        nombre={varianteNombre}
        onCambiarNombre={setVarianteNombre}
        valores={variantes}
        onCambiarValores={setVariantes}
        color={colores.variantes}
        esCelular={esCelular}
      />
      <SeccionCotizacion
        subtitulo={subtitulo}
        onCambiarSubtitulo={setSubtitulo}
        textoExtra={textoExtra}
        onCambiarTextoExtra={setTextoExtra}
        color={colores.cotizacion}
        llenar={llenar}
        esCelular={esCelular}
      />
    </>
  );

  const fotos = (
    <Seccion titulo="FOTOS" icono={<PhotoLibraryIcon />} color={colores.fotos} crece={llenar}>
      <ZonaElegirFoto
        id="file-upload"
        titulo="Selecciona una Imagen"
        onElegir={handleImageChange}
        color={colores.fotos}
        esCelular={esCelular}
      />

      <GrillaFotos porFila={fotosPorFila} cantidad={images.length} color={colores.fotos} llenar={llenar}>
        {images.map((img, index) => (
          <TarjetaFoto
            key={img.id}
            url={img.preview}
            alt={`preview-${index}`}
            nombre={img.name}
            nombreCampo={`imagenNombre-${index}`}
            onCambiarNombre={(nombre) => handleNameChange(index, nombre)}
            // La portada y el organizador, como al editar (pedido del dueño,
            // 2026-10-26).
            etiquetas={index === 0 && <EtiquetasFoto portada />}
            barra={
              <BarraFoto
                index={index}
                total={images.length}
                onMover={handleMoveImage}
                onQuitar={handleRemoveImage}
              />
            }
          />
        ))}
      </GrillaFotos>
    </Seccion>
  );

  return (
    <FormularioEquipo
      idFormulario={idFormulario}
      onSubmit={handleSubmit}
      onReset={handleCancel}
      anchoCompleto={anchoCompleto}
      porFila={fotosPorFila}
      texto={texto}
      fotos={fotos}
    >
      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </FormularioEquipo>
  );
};

CrearEquipos.propTypes = {
  anchoCompleto: PropTypes.bool,
  idFormulario: PropTypes.string.isRequired,
  fotosPorFila: PropTypes.oneOf([1, 2]).isRequired,
};

export default CrearEquipos;
