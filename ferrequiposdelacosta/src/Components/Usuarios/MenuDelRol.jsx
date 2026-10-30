import { cloneElement } from "react";
import PropTypes from "prop-types";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import BOTONES_MENU from "../RolesPermisos/botonesMenu";
import { permisosDelRol } from "./usuarios";

// LO QUE VE UN ROL EN EL MENÚ (pedido del dueño, 2026-10-28): los botones del
// menú en casillas, encendidas las que puede usar y apagadas, con candado, las
// que no. Así se entiende un rol sin leer la lista de permisos. Cada casilla
// con el ícono arriba y el nombre abajo, como los botones del menú.
//
// `rolAntes`: al editar, compara con el rol guardado y pinta lo que GANA
// (verde) y lo que PIERDE (rojo) con el cambio. En el computador la etiqueta
// GANA / PIERDE va dentro de la casilla, bajo el nombre; en el celular
// (`compacto`) no va: no cabía y tapaba las casillas de al lado, y el color
// ya lo dice.
//
// `llenar`: las casillas crecen hasta llenar su recuadro, como los botones
// del menú (el editor en el computador ancho, sin huecos).
//
// `columnas`: de a cuántas por fila; de a dos en la ficha en dos pisos, para
// que ROL quede angosto y SESIONES tenga más lugar (pedido del dueño,
// 2026-10-29).
export default function MenuDelRol({ rol, rolAntes, compacto = false, llenar = false, columnas = 3 }) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const ahora = permisosDelRol(rol);
  const antes = rolAntes ? permisosDelRol(rolAntes) : ahora;
  const conCambios = Boolean(rolAntes) && rolAntes !== rol;

  const estilo = (tiene, tenia) => {
    if (tiene && !tenia) {
      return { color: theme.palette.success.dark, borde: theme.palette.success.main, linea: "solid", etiqueta: "GANA" };
    }
    if (!tiene && tenia) {
      return { color: theme.palette.error.dark, borde: theme.palette.error.main, linea: "dashed", etiqueta: "PIERDE" };
    }
    if (tiene) return { color: acento, borde: alpha(acento, 0.35), linea: "solid" };
    return { color: theme.palette.text.disabled, borde: theme.palette.divider, linea: "dashed", apagada: true };
  };

  return (
    <Box sx={llenar ? { flex: 1, display: "flex", flexDirection: "column" } : undefined}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`,
          gap: compacto ? 0.75 : 1,
          ...(llenar && { flex: 1, gridTemplateRows: `repeat(${Math.ceil(BOTONES_MENU.length / columnas)}, 1fr)` }),
        }}
      >
        {BOTONES_MENU.map((boton) => {
          const tiene = ahora.includes(boton.permiso);
          const tenia = antes.includes(boton.permiso);
          const e = estilo(tiene, tenia);
          return (
            <Box
              key={boton.to}
              sx={{
                minWidth: 0,
                minHeight: compacto ? 64 : 72,
                px: 0.5,
                py: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
                textAlign: "center",
                borderRadius: 1.5,
                border: `1px ${e.linea} ${e.borde}`,
                bgcolor: e.apagada ? "transparent" : alpha(e.borde, 0.08),
                color: e.color,
              }}
            >
              {e.apagada ? (
                <LockOutlinedIcon sx={{ fontSize: 18 }} />
              ) : (
                cloneElement(boton.icon, { sx: { fontSize: 20 } })
              )}
              <Typography
                sx={{
                  fontSize: compacto ? "0.68rem" : "0.75rem",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  overflowWrap: "anywhere",
                }}
              >
                {boton.corto}
              </Typography>
              {e.etiqueta && !compacto && (
                <Box
                  component="span"
                  sx={{
                    px: 0.75,
                    borderRadius: 5,
                    fontSize: "0.6rem",
                    fontWeight: 800,
                    letterSpacing: 0.4,
                    bgcolor: e.borde,
                    color: theme.palette.getContrastText(e.borde),
                  }}
                >
                  {e.etiqueta}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      {conCambios && (
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 600 }}>
            Verde: lo que gana
          </Typography>
          <Typography variant="caption" sx={{ color: "error.dark", fontWeight: 600 }}>
            Rojo: lo que pierde
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

MenuDelRol.propTypes = {
  rol: PropTypes.string,
  rolAntes: PropTypes.string,
  compacto: PropTypes.bool,
  columnas: PropTypes.oneOf([2, 3]),
  llenar: PropTypes.bool,
};
