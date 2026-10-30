import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { useTheme } from "@mui/material";
import { ref, deleteObject } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db, storage } from "../Firebase/Firebase";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import { usePantallaCompacta } from "../../Utils/pantalla";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
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
import { rutasDeFoto, subirFotoEquipo, verMiniatura } from "../FormularioEquipo/fotosEquipo";

// Lo que se edita, sacado del equipo tal como está guardado. Cada foto lleva:
// - `path`: dónde está guardada (null si todavía no se subió);
// - `miniatura`: su versión chica, { url, path } (ver fotosEquipo);
// - `file`: el archivo elegido, si es nueva, y `vistaMiniatura`, su miniatura
//   para verla antes de guardar (llega después, ver agregarFotos).
const desdeEquipo = (equipo) => ({
  name: equipo.name || "",
  description: equipo.description || "",
  varianteNombre: equipo.varianteNombre || "",
  variantes: equipo.variantes || [],
  subtitulo: equipo.subtitulo || "",
  textoExtra: equipo.textoExtra || "",
  fotos: (equipo.images || []).map((img, i) => ({
    id: img.path || `${img.url}-${i}`,
    url: img.url,
    name: img.name || "",
    path: img.path || null,
    // null y no undefined: Firestore no guarda un campo undefined.
    miniatura: img.miniatura || null,
    file: null,
  })),
  // Lo guardado que se quitó: se borra del almacenamiento
  // DESPUÉS de guardar, para que el equipo nunca apunte a una foto borrada.
  porBorrar: [],
});

// EDITAR UN EQUIPO DEL CATÁLOGO (2026-10-26, pedido del dueño): el mismo
// formulario de Crear equipo, con lo propio de editar:
// - un punto en cada recuadro con cambios, y la cuenta para la vista
//   (`onCambios`), que la muestra y pregunta antes de dejar el equipo;
// - las fotos se mueven con ◀ ▶ (la primera es la PORTADA de la tienda) y se
//   quitan con 🗑; las no guardadas dicen NUEVA;
// - "reset" (Deshacer) vuelve a lo guardado;
// - al guardar se queda en el mismo equipo, con lo guardado.
//
// El equipo llega por prop (lo elige la vista de Equipos); si cambia —se
// guardó y el catálogo se volvió a bajar—, el formulario se rehace con él.
const EditarEquipos = ({
  equipo,
  idFormulario,
  anchoCompleto = false,
  fotosPorFila,
  onCambios,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const esCelular = usePantallaCompacta();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => desdeEquipo(equipo));
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    setForm(desdeEquipo(equipo));
  }, [equipo]);

  // QUÉ CAMBIÓ, por recuadro, comparado con lo guardado.
  const guardado = desdeEquipo(equipo);
  const cambiado = {
    datos: form.name !== guardado.name || form.description !== guardado.description,
    variantes:
      form.varianteNombre !== guardado.varianteNombre ||
      form.variantes.join("\n") !== guardado.variantes.join("\n"),
    cotizacion:
      form.subtitulo !== guardado.subtitulo || form.textoExtra !== guardado.textoExtra,
    fotos:
      form.porBorrar.length > 0 ||
      form.fotos.length !== guardado.fotos.length ||
      form.fotos.some((foto, i) => foto.path !== guardado.fotos[i].path),
  };
  const cambios = Object.values(cambiado).filter(Boolean).length;

  useEffect(() => {
    onCambios?.(cambios);
  }, [cambios, onCambios]);
  // Al cerrarse (se eligió otro equipo o se borró), ya no hay cambios.
  useEffect(() => () => onCambios?.(0), [onCambios]);

  const cambiar = (campos) => setForm((prev) => ({ ...prev, ...campos }));

  const cambiarFotos = (transformar) =>
    setForm((prev) => ({ ...prev, ...transformar(prev) }));

  const agregarFotos = (files) => {
    const nuevas = files.map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      path: null,
      miniatura: null,
      file,
    }));
    cambiarFotos((prev) => ({ fotos: [...prev.fotos, ...nuevas] }));
    nuevas.forEach(async ({ id, file }) => {
      const vistaMiniatura = await verMiniatura(file);
      cambiarFotos((prev) => ({
        fotos: prev.fotos.map((foto) => (foto.id === id ? { ...foto, vistaMiniatura } : foto)),
      }));
    });
  };

  const moverFoto = (index, paso) =>
    cambiarFotos((prev) => {
      const fotos = [...prev.fotos];
      [fotos[index], fotos[index + paso]] = [fotos[index + paso], fotos[index]];
      return { fotos };
    });

  const quitarFoto = (index) =>
    cambiarFotos((prev) => {
      const vieja = prev.fotos[index];
      return {
        fotos: prev.fotos.filter((_, i) => i !== index),
        // Las dos versiones, la grande y la miniatura.
        porBorrar: [...prev.porBorrar, ...rutasDeFoto(vieja)],
      };
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim() || form.fotos.length === 0) {
      showSnackbar("El nombre, la descripción y al menos una foto son obligatorios.", "error");
      return;
    }
    if (cambios === 0) {
      showSnackbar("No hay cambios para guardar.", "info");
      return;
    }
    setLoading(true);
    try {
      // Primero se suben las nuevas, después se guarda el equipo y recién
      // entonces se borra lo viejo: si algo falla a mitad, el equipo sigue
      // apuntando a fotos que existen.
      // Las nuevas se achican y suben en dos tamaños (ver fotosEquipo).
      const images = await Promise.all(
        form.fotos.map((foto) => {
          if (foto.file) return subirFotoEquipo(equipo.id, form.name, foto.file);
          return { name: foto.name, url: foto.url, path: foto.path, miniatura: foto.miniatura };
        }),
      );

      const datosActualizados = {
        name: form.name,
        description: form.description,
        images,
        varianteNombre: form.varianteNombre.trim(),
        variantes: form.variantes,
        textoExtra: form.textoExtra.trim(),
        subtitulo: form.subtitulo.trim(),
      };
      await updateDoc(doc(db, "equipos", equipo.id), datosActualizados);

      await Promise.all(
        form.porBorrar.map((path) =>
          deleteObject(ref(storage, path)).catch((error) =>
            console.warn("⚠️ No se pudo eliminar imagen del storage:", error),
          ),
        ),
      );

      // Se queda en el mismo equipo, ya con lo guardado.
      setForm(desdeEquipo({ ...equipo, ...datosActualizados }));

      // El catálogo de equipos vive en Redux y solo se carga una vez por
      // sesión; sin este refresh, el resto de la app (tienda, kiosco, esta
      // misma lista) seguiría mostrando lo viejo hasta recargar.
      dispatch(fetchEquiposData());

      showSnackbar("Equipo actualizado con éxito", "success");
    } catch (error) {
      console.error("❌ Error al actualizar el equipo:", error);
      showSnackbar("No se pudo guardar el equipo. Inténtalo de nuevo.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingLogo text="Guardando cambios..." />;

  const colores = coloresDelFormulario(theme);
  const llenar = anchoCompleto;

  const texto = (
    <>
      <SeccionDatos
        nombre={form.name}
        descripcion={form.description}
        onChange={(e) => cambiar({ [e.target.name]: e.target.value })}
        color={colores.datos}
        llenar={llenar}
        cambiado={cambiado.datos}
      />
      <SeccionVariantes
        nombre={form.varianteNombre}
        onCambiarNombre={(varianteNombre) => cambiar({ varianteNombre })}
        valores={form.variantes}
        onCambiarValores={(variantes) => cambiar({ variantes })}
        color={colores.variantes}
        esCelular={esCelular}
        cambiado={cambiado.variantes}
      />
      <SeccionCotizacion
        subtitulo={form.subtitulo}
        onCambiarSubtitulo={(subtitulo) => cambiar({ subtitulo })}
        textoExtra={form.textoExtra}
        onCambiarTextoExtra={(textoExtra) => cambiar({ textoExtra })}
        color={colores.cotizacion}
        llenar={llenar}
        esCelular={esCelular}
        cambiado={cambiado.cotizacion}
      />
    </>
  );

  const fotos = (
    <Seccion
      titulo={`FOTOS (${form.fotos.length})`}
      icono={<PhotoLibraryIcon />}
      color={colores.fotos}
      crece={llenar}
      cambiado={cambiado.fotos}
    >
      <ZonaElegirFoto
        id="file-upload-editar"
        titulo="Agregar foto"
        onElegir={agregarFotos}
        color={colores.fotos}
        esCelular={esCelular}
      />

      <GrillaFotos
        porFila={fotosPorFila}
        cantidad={form.fotos.length}
        color={colores.fotos}
        llenar={llenar}
      >
        {form.fotos.map((foto, index) => (
          <TarjetaFoto
            key={foto.id}
            url={foto.url}
            alt={`Foto ${index + 1}`}
            // La nueva, la hecha al elegirla; la guardada, la de la nube.
            miniatura={foto.file ? foto.vistaMiniatura : (foto.miniatura?.url ?? null)}
            etiquetas={
              (index === 0 || foto.file) && (
                <EtiquetasFoto portada={index === 0} nueva={Boolean(foto.file)} />
              )
            }
            barra={
              <BarraFoto
                index={index}
                total={form.fotos.length}
                onMover={moverFoto}
                onQuitar={quitarFoto}
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
      // Deshacer: todo como está guardado.
      onReset={() => setForm(desdeEquipo(equipo))}
      anchoCompleto={anchoCompleto}
      porFila={fotosPorFila}
      texto={texto}
      fotos={fotos}
    >
      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </FormularioEquipo>
  );
};

EditarEquipos.propTypes = {
  equipo: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    description: PropTypes.string,
    images: PropTypes.arrayOf(
      PropTypes.shape({ name: PropTypes.string, url: PropTypes.string, path: PropTypes.string }),
    ),
    varianteNombre: PropTypes.string,
    variantes: PropTypes.arrayOf(PropTypes.string),
    textoExtra: PropTypes.string,
    subtitulo: PropTypes.string,
  }).isRequired,
  idFormulario: PropTypes.string.isRequired,
  anchoCompleto: PropTypes.bool,
  fotosPorFila: PropTypes.oneOf([1, 2]).isRequired,
  // Recibe cuántos recuadros tienen cambios sin guardar (0 si ninguno).
  onCambios: PropTypes.func,
};

export default EditarEquipos;
