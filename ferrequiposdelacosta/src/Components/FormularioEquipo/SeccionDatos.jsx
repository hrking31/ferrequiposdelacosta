import PropTypes from "prop-types";
import { Stack, TextField } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";
import Seccion from "./Seccion";
import { llenarRecuadro } from "./piezasFormulario";

// DATOS DEL EQUIPO: nombre y descripción. `onChange` recibe el evento del
// campo; su `name` dice cuál cambió.
export default function SeccionDatos({ nombre, descripcion, onChange, color, llenar, cambiado }) {
  return (
    <Seccion
      titulo="DATOS DEL EQUIPO"
      icono={<ConstructionIcon />}
      color={color}
      crece={llenar}
      cambiado={cambiado}
    >
      <Stack spacing={1.5} sx={{ flex: 1 }}>
        {/* El nombre en una sola línea: es corto, y así Enter sigue guardando. */}
        <TextField
          name="name"
          label="Nombre del equipo"
          value={nombre}
          onChange={onChange}
          fullWidth
        />
        <TextField
          name="description"
          label="Descripción del equipo"
          value={descripcion}
          onChange={onChange}
          fullWidth
          multiline
          minRows={4}
          // En el computador arranca en dos renglones y llena lo que sobre.
          sx={llenar ? llenarRecuadro(2) : undefined}
        />
      </Stack>
    </Seccion>
  );
}

SeccionDatos.propTypes = {
  nombre: PropTypes.string.isRequired,
  descripcion: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  color: PropTypes.string.isRequired,
  llenar: PropTypes.bool,
  cambiado: PropTypes.bool,
};
