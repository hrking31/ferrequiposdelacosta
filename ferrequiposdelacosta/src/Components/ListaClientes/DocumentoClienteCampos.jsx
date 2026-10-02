// Los dos recuadros del documento de identidad en el formulario del cliente:
// frente y atrás. Cada uno se ve como la tarjeta misma —la foto guardada, la
// recién elegida o el dibujo de una cédula— y ES el botón: se toca la tarjeta
// para elegir la foto. Sin botones debajo (pedido del dueño, 2026-10-02).
//
// Un solo selector sirve para cámara y galería: sin `capture`, el celular
// pregunta de dónde sacarla ("Tomar foto" o la galería), y en el computador
// abre los archivos.
//
// Acá no se sube nada: se elige. La subida pasa al tocar Guardar, en
// ClienteFormDialog, para que cancelar el formulario no deje fotos en Storage.
import PropTypes from "prop-types";
import { Box, ButtonBase, IconButton, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import PersonIcon from "@mui/icons-material/Person";
import { LADOS_DOCUMENTO } from "./documentoCliente";

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
  const alElegir = (clave) => (e) => {
    const archivo = e.target.files?.[0];
    // Se vacía para que elegir otra vez la MISMA foto también avise.
    e.target.value = "";
    if (archivo) onElegir(clave, archivo);
  };

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
            // Sin rótulo de "Frente" o "Atrás" encima: el dibujo de la tarjeta
            // ya dice cuál es (pedido del dueño, 2026-10-02).
            <Box key={clave} sx={{ flex: 1, minWidth: 0, position: "relative" }}>
              {/* Se ve como la tarjeta misma, puesta sobre la mesa: blanca,
                  con esquinas redondeadas y sombra, y con la forma de una
                  cédula (85,6 × 54 mm). Blanca fija también en modo oscuro,
                  como los logos de los medios de pago: es un papel, no un
                  recuadro de la pantalla. La foto va entera, sin recortar.

                  Por dentro es la etiqueta del selector de archivos
                  escondido: tocarla es tocar el selector. */}
              <ButtonBase
                component="label"
                aria-label={`Elegir foto del ${lado}`}
                disabled={deshabilitado}
                sx={{
                  display: "block",
                  width: "100%",
                  aspectRatio: "1.586",
                  borderRadius: 1.5,
                  overflow: "hidden",
                  bgcolor: "common.white",
                  boxShadow: 3,
                  cursor: "pointer",
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
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  name={`documento-${clave}`}
                  onChange={alElegir(clave)}
                  disabled={deshabilitado}
                />
              </ButtonBase>

              {/* Quitar: una × chica en la esquina, solo si hay foto. Va
                  FUERA de la tarjeta para que tocarla no abra el selector. */}
              {vista && (
                <IconButton
                  size="small"
                  aria-label={`Quitar el ${lado}`}
                  onClick={() => onQuitar(clave)}
                  disabled={deshabilitado}
                  sx={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    p: 0.25,
                    bgcolor: "error.main",
                    color: "common.white",
                    "&:hover": { bgcolor: "error.dark" },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
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
