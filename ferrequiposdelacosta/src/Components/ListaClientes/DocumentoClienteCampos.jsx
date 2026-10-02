// Los dos recuadros del documento de identidad en el formulario del cliente:
// frente y atrás. Cada uno muestra la foto (la guardada o la recién elegida)
// y debajo sus botones: tomar foto, elegir de la galería y quitar.
//
// Acá no se sube nada: se elige. La subida pasa al tocar Guardar, en
// ClienteFormDialog, para que cancelar el formulario no deje fotos en Storage.
import PropTypes from "prop-types";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import { LADOS_DOCUMENTO } from "./documentoCliente";

// El botón que abre el selector de archivos: un IconButton que por dentro es
// la etiqueta de un input de archivo escondido. `capture` hace que el celular
// abra directo la cámara trasera en vez de preguntar.
function BotonElegirFoto({ titulo, nombre, capture, deshabilitado, onElegir, children }) {
  const alElegir = (e) => {
    const archivo = e.target.files?.[0];
    // Se vacía para que elegir otra vez la MISMA foto también avise.
    e.target.value = "";
    if (archivo) onElegir(archivo);
  };

  return (
    <Tooltip title={titulo}>
      <span>
        <IconButton
          component="label"
          size="small"
          aria-label={titulo}
          disabled={deshabilitado}
        >
          {children}
          <input
            hidden
            type="file"
            accept="image/*"
            name={nombre}
            capture={capture}
            onChange={alElegir}
            disabled={deshabilitado}
          />
        </IconButton>
      </span>
    </Tooltip>
  );
}

BotonElegirFoto.propTypes = {
  titulo: PropTypes.string.isRequired,
  nombre: PropTypes.string.isRequired,
  capture: PropTypes.string,
  deshabilitado: PropTypes.bool,
  onElegir: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default function DocumentoClienteCampos({ fotos, onElegir, onQuitar, deshabilitado }) {
  // La cámara solo se ofrece en pantallas táctiles. En el computador ese
  // botón abriría el mismo explorador de archivos que el de la galería.
  const conCamara = useMediaQuery("(pointer: coarse)");

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Documento de identidad
      </Typography>
      <Stack direction="row" spacing={1.5}>
        {LADOS_DOCUMENTO.map(({ clave, etiqueta }) => {
          const foto = fotos[clave] ?? {};
          const vista = foto.vista || foto.url;
          const lado = etiqueta.toLowerCase();

          return (
            <Box key={clave} sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                {etiqueta}
              </Typography>
              {/* Con la forma de una cédula (85,6 × 54 mm): así la foto
                  entra entera y el recuadro vacío ya dice qué va ahí. */}
              <Box
                sx={{
                  aspectRatio: "1.586",
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 1,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "action.hover",
                }}
              >
                {vista ? (
                  <Box
                    component="img"
                    src={vista}
                    alt={`Documento, ${lado}`}
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <BadgeOutlinedIcon sx={{ color: "text.disabled", fontSize: 32 }} />
                )}
              </Box>

              <Stack direction="row" justifyContent="center" spacing={0.5} sx={{ mt: 0.5 }}>
                {conCamara && (
                  <BotonElegirFoto
                    titulo={`Tomar foto del ${lado}`}
                    nombre={`documento-${clave}-camara`}
                    capture="environment"
                    deshabilitado={deshabilitado}
                    onElegir={(archivo) => onElegir(clave, archivo)}
                  >
                    <PhotoCameraIcon fontSize="small" />
                  </BotonElegirFoto>
                )}
                <BotonElegirFoto
                  titulo={`Elegir de la galería el ${lado}`}
                  nombre={`documento-${clave}-galeria`}
                  deshabilitado={deshabilitado}
                  onElegir={(archivo) => onElegir(clave, archivo)}
                >
                  <PhotoLibraryIcon fontSize="small" />
                </BotonElegirFoto>
                {vista && (
                  <Tooltip title={`Quitar el ${lado}`}>
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={`Quitar el ${lado}`}
                        onClick={() => onQuitar(clave)}
                        disabled={deshabilitado}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

DocumentoClienteCampos.propTypes = {
  // Por lado: { url, archivo, vista }. `url` es la foto ya guardada; `archivo`
  // y `vista`, la recién elegida y su vista previa.
  fotos: PropTypes.object.isRequired,
  onElegir: PropTypes.func.isRequired,
  onQuitar: PropTypes.func.isRequired,
  deshabilitado: PropTypes.bool,
};
