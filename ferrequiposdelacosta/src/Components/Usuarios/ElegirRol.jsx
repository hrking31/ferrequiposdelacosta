import PropTypes from "prop-types";
import { Box, ButtonBase, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ROLES, permisosDelRol } from "./usuarios";
import BOTONES_MENU from "../RolesPermisos/botonesMenu";

// EL ROL EN TARJETAS y no en una lista desplegable (pedido del dueño,
// 2026-10-28): los cuatro a la vista, cada uno con lo que hace y cuántos
// botones del menú le tocan. Se marca uno, como un botón de radio.
//
// `rolGuardado`: al editar, la tarjeta del rol que tiene hoy lo dice.
// `columnas`: dos en el computador; una en el celular.
// `llenar`: las tarjetas se reparten el alto de su recuadro (el editor en el
// computador ancho, sin huecos).
export default function ElegirRol({ valor, onChange, rolGuardado, columnas = 2, llenar = false }) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;

  return (
    <Box
      role="radiogroup"
      aria-label="Rol"
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`,
        gap: 1.25,
        alignContent: "start",
        ...(llenar && { flex: 1, gridTemplateRows: `repeat(${ROLES.length / columnas}, 1fr)`, alignContent: "stretch" }),
      }}
    >
      {ROLES.map((rol) => {
        const marcado = rol.clave === valor;
        const botones = BOTONES_MENU.filter((b) => permisosDelRol(rol.clave).includes(b.permiso)).length;
        return (
          <ButtonBase
            key={rol.clave}
            role="radio"
            aria-checked={marcado}
            onClick={() => onChange(rol.clave)}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "center",
              gap: 0.5,
              px: 1.75,
              py: columnas === 1 ? 1 : 1.5,
              borderRadius: 2,
              border: "2px solid",
              borderColor: marcado ? acento : "divider",
              bgcolor: marcado ? alpha(acento, 0.07) : "background.paper",
              textAlign: "left",
              "&:hover": { borderColor: marcado ? acento : alpha(acento, 0.5) },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: "2px solid",
                  borderColor: marcado ? acento : "text.disabled",
                  display: "grid",
                  placeItems: "center",
                  boxSizing: "border-box",
                  flexShrink: 0,
                }}
              >
                {marcado && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: acento }} />}
              </Box>
              <Typography
                sx={{
                  flex: 1,
                  fontFamily: '"Montserrat", sans-serif',
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: marcado ? acento : "text.primary",
                }}
              >
                {rol.nombre}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                {botones} de {BOTONES_MENU.length}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ pl: 3.25, fontSize: "0.8rem" }}>
              {rol.descripcion}
            </Typography>
            {rolGuardado === rol.clave && (
              <Typography
                variant="caption"
                sx={{ pl: 3.25, fontWeight: 700, letterSpacing: 0.5, color: "text.secondary" }}
              >
                EL QUE TIENE HOY
              </Typography>
            )}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

ElegirRol.propTypes = {
  valor: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  rolGuardado: PropTypes.string,
  columnas: PropTypes.oneOf([1, 2]),
  llenar: PropTypes.bool,
};
