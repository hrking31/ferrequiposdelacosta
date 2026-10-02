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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import PersonIcon from "@mui/icons-material/Person";
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

// El dibujo de una cédula, mientras no hay foto: dice qué va en el recuadro
// sin tener que leer el rótulo. El frente lleva el recuadro de la foto y los
// renglones del nombre; atrás, la huella y el código de barras.
const RENGLON_SX = { height: "7%", borderRadius: 1, bgcolor: "grey.300" };

function TarjetaVacia({ clave }) {
  if (clave === "atras") {
    return (
      <Stack sx={{ height: "100%", p: "8%", gap: "8%" }}>
        <Stack direction="row" sx={{ flex: 1, gap: "8%", minHeight: 0 }}>
          <Stack sx={{ flex: 1, justifyContent: "center", gap: "12%" }}>
            <Box sx={{ ...RENGLON_SX, height: "12%", width: "90%" }} />
            <Box sx={{ ...RENGLON_SX, height: "12%", width: "70%" }} />
            <Box sx={{ ...RENGLON_SX, height: "12%", width: "80%" }} />
          </Stack>
          <Box
            sx={{
              aspectRatio: "3 / 4",
              height: "100%",
              border: "1px solid",
              borderColor: "grey.300",
              borderRadius: 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FingerprintIcon sx={{ color: "grey.400", width: "70%", height: "70%" }} />
          </Box>
        </Stack>
        {/* El código de barras: rayas de grosor parejo, que alcanza para
            que se lea como tal. */}
        <Box
          sx={{
            height: "22%",
            backgroundImage:
              "repeating-linear-gradient(90deg, #bdbdbd 0 2px, transparent 2px 4px, #bdbdbd 4px 5px, transparent 5px 8px)",
          }}
        />
      </Stack>
    );
  }

  return (
    <Stack direction="row" sx={{ height: "100%", p: "8%", gap: "8%" }}>
      <Box
        sx={{
          aspectRatio: "3 / 4",
          height: "100%",
          borderRadius: 0.5,
          bgcolor: "grey.200",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <PersonIcon sx={{ color: "grey.400", width: "100%", height: "85%" }} />
      </Box>
      <Stack sx={{ flex: 1, minWidth: 0, gap: "10%" }}>
        <Typography
          sx={{
            fontSize: 7,
            fontWeight: 700,
            lineHeight: 1.2,
            color: "grey.500",
            letterSpacing: 0.3,
          }}
        >
          REPÚBLICA DE COLOMBIA
        </Typography>
        <Box sx={{ ...RENGLON_SX, width: "90%" }} />
        <Box sx={{ ...RENGLON_SX, width: "75%" }} />
        <Box sx={{ ...RENGLON_SX, width: "85%" }} />
        <Box sx={{ ...RENGLON_SX, width: "55%" }} />
      </Stack>
    </Stack>
  );
}

TarjetaVacia.propTypes = {
  clave: PropTypes.string.isRequired,
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
              {/* Se ve como la tarjeta misma, puesta sobre la mesa: blanca,
                  con esquinas redondeadas y sombra, y con la forma de una
                  cédula (85,6 × 54 mm). Blanca fija también en modo oscuro,
                  como los logos de los medios de pago: es un papel, no un
                  recuadro de la pantalla. La foto va entera, sin recortar. */}
              <Box
                sx={{
                  aspectRatio: "1.586",
                  borderRadius: 1.5,
                  overflow: "hidden",
                  bgcolor: "common.white",
                  boxShadow: 3,
                }}
              >
                {vista ? (
                  <Box
                    component="img"
                    src={vista}
                    alt={`Documento, ${lado}`}
                    sx={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <TarjetaVacia clave={clave} />
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
