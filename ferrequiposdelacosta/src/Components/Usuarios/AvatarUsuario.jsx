import PropTypes from "prop-types";
import { Avatar, Box, useTheme } from "@mui/material";
import { iniciales } from "./usuarios";

// La cara de una persona en la pantalla de Usuarios: su foto o, sin foto, sus
// iniciales sobre un color que sale de su id (cada quien el suyo, siempre el
// mismo). `enLinea`: el punto de conexión abajo a la derecha (verde, o gris
// si está desconectada); sin la prop, no lleva punto.
//
// `anillo`: en la ficha, un aro alrededor, verde si está en línea.
export default function AvatarUsuario({ usuario, tamano = 40, enLinea, anillo = false }) {
  const theme = useTheme();
  const colores = [
    theme.palette.custom.accent,
    theme.palette.info.dark,
    theme.palette.success.dark,
    theme.palette.primary.dark,
  ];
  const suma = [...(usuario.id || "")].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  const fondo = colores[suma % colores.length];
  const conPunto = typeof enLinea === "boolean";
  const colorConexion = enLinea ? theme.palette.custom.online : theme.palette.grey[500];
  const punto = Math.max(10, Math.round(tamano * 0.26));

  return (
    <Box sx={{ position: "relative", width: tamano, height: tamano, flexShrink: 0 }}>
      <Avatar
        src={usuario.photoURL || undefined}
        alt={usuario.name || usuario.email || ""}
        sx={{
          width: tamano,
          height: tamano,
          bgcolor: fondo,
          color: theme.palette.getContrastText(fondo),
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 700,
          fontSize: tamano * 0.36,
          ...(anillo && {
            boxShadow: `0 0 0 4px ${theme.palette.background.paper}, 0 0 0 7px ${
              enLinea ? colorConexion : theme.palette.divider
            }`,
          }),
        }}
      >
        {iniciales(usuario.name, usuario.email)}
      </Avatar>
      {conPunto && !anillo && (
        <Box
          sx={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: punto,
            height: punto,
            borderRadius: "50%",
            bgcolor: colorConexion,
            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
          }}
        />
      )}
    </Box>
  );
}

AvatarUsuario.propTypes = {
  usuario: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    photoURL: PropTypes.string,
  }).isRequired,
  tamano: PropTypes.number,
  enLinea: PropTypes.bool,
  anillo: PropTypes.bool,
};
