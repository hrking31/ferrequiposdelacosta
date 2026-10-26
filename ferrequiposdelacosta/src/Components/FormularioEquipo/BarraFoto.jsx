import PropTypes from "prop-types";
import { IconButton, Tooltip } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const boton = { p: 0.5 };

// EL ORGANIZADOR DE CADA FOTO, la franja de abajo de su tarjeta (crear y
// editar, 2026-10-26): ◀ ▶ la mueven de lugar —la primera es la PORTADA de la
// tienda— y 🗑 la quita. Para cambiar una foto por otra: se quita y se agrega
// la nueva (el dueño descartó un botón de reemplazar).
export default function BarraFoto({ index, total, onMover, onQuitar }) {
  return (
    <>
      <Tooltip title="Mover antes">
        <span>
          <IconButton
            size="small"
            aria-label="Mover antes"
            disabled={index === 0}
            onClick={() => onMover(index, -1)}
            sx={boton}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Quitar foto">
        <IconButton
          size="small"
          color="error"
          aria-label="Quitar foto"
          onClick={() => onQuitar(index)}
          sx={boton}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Mover después">
        <span>
          <IconButton
            size="small"
            aria-label="Mover después"
            disabled={index === total - 1}
            onClick={() => onMover(index, 1)}
            sx={boton}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </>
  );
}

BarraFoto.propTypes = {
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  // (index, paso): paso -1 la mueve antes, 1 después.
  onMover: PropTypes.func.isRequired,
  onQuitar: PropTypes.func.isRequired,
};
