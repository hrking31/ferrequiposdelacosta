import PropTypes from "prop-types";
import { Stack, TextField } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import Seccion from "./Seccion";
import { llenarRecuadro } from "./piezasFormulario";

// TEXTOS DE LA COTIZACIÓN: el subtítulo que reemplaza el nombre en la
// cotización/PDF y el texto extra.
export default function SeccionCotizacion({
  subtitulo,
  onCambiarSubtitulo,
  textoExtra,
  onCambiarTextoExtra,
  color,
  llenar,
  esCelular,
  cambiado,
}) {
  return (
    <Seccion
      titulo="TEXTOS DE LA COTIZACIÓN (OPCIONAL)"
      icono={<DescriptionIcon />}
      color={color}
      crece={llenar}
      cambiado={cambiado}
    >
      <Stack spacing={1.5} sx={{ flex: 1 }}>
        {/* El subtítulo crece hacia abajo para verse entero, pero sin saltos
            de línea: va de corrido en la cotización y el PDF. La ayuda, en
            una línea en el computador (la larga no dejaba entrar todo sin
            desplazar). */}
        <TextField
          name="subtitulo"
          label="Subtítulo para cotización/PDF (opcional, no se muestra al público)"
          helperText={
            esCelular
              ? "Se usa en vez del nombre del catálogo al generar la cotización/PDF. Útil cuando el nombre del catálogo es informal (ej. 'RANA' → 'Vibrocompactador tipo rana'). Si se deja vacío, se sigue usando la descripción."
              : "Reemplaza el nombre en la cotización/PDF (ej. 'RANA' → 'Vibrocompactador tipo rana'). Vacío: la descripción."
          }
          value={subtitulo}
          onChange={(e) => onCambiarSubtitulo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          fullWidth
          multiline
        />
        <TextField
          name="textoExtra"
          label="Texto extra (opcional)"
          value={textoExtra}
          onChange={(e) => onCambiarTextoExtra(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          sx={llenar ? llenarRecuadro(1) : undefined}
        />
      </Stack>
    </Seccion>
  );
}

SeccionCotizacion.propTypes = {
  subtitulo: PropTypes.string.isRequired,
  onCambiarSubtitulo: PropTypes.func.isRequired,
  textoExtra: PropTypes.string.isRequired,
  onCambiarTextoExtra: PropTypes.func.isRequired,
  color: PropTypes.string.isRequired,
  llenar: PropTypes.bool,
  esCelular: PropTypes.bool,
  cambiado: PropTypes.bool,
};
