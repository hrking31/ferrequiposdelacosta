import PropTypes from "prop-types";
import { Box, Drawer, IconButton, Tooltip } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

// LA LISTA COMPLETA QUE SALE DE LA IZQUIERDA, por encima de la ficha (pedido
// del dueño, 2026-10-29), la que saca la flecha de la franja (FranjaLista).
// Adentro va la lista de la pantalla (`children`, en su forma `enPanel`: el
// relleno de 12px es el que espera su buscador pegado arriba). Abajo a la
// derecha, del lado hacia donde se esconde, la flecha de esconder.
export default function CajonLista({ open, onClose, children }) {
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 440, display: "flex", flexDirection: "column" } }}
    >
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 1.5 }}>{children}</Box>
      <Box
        sx={{
          flexShrink: 0,
          px: 1.5,
          py: 1,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Tooltip title="Esconder la lista" placement="left">
          <IconButton onClick={onClose} aria-label="Esconder la lista" sx={{ color: "custom.accent" }}>
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Drawer>
  );
}

CajonLista.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
};
