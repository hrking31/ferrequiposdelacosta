import PropTypes from "prop-types";
import { Box } from "@mui/material";
import Logos from "../../assets/LogoFerrequipos.svg";

// EL LOGO EN SU CÍRCULO BLANCO, en el encabezado de las pantallas del personal
// y en la puerta de entrada (VistaAcceso).
//
// Hasta el 2026-11-07 era un botón (BotonTienda): llevaba a la tienda y, en el
// menú, abría una lista con "Ir a la tienda" y "Cerrar sesión". Con la tienda y
// el personal en apps separadas no hay tienda a dónde ir; cerrar sesión volvió
// a ser un botón suelto (ver HeaderUsuario) y el logo quedó como marca.
export default function LogoCirculo({ alto = 40 }) {
  return (
    <Box
      sx={{
        flexShrink: 0,
        p: 0.75,
        // Un círculo, no un óvalo (pedido del dueño, 2026-11-06): el logo va
        // en un cuadrado.
        borderRadius: "50%",
        // Blanco siempre: el logo es rojo y azul y sobre otro fondo se pierde.
        bgcolor: "common.white",
        boxShadow: (theme) => theme.shadows[2],
      }}
    >
      {/* En un cuadrado: el SVG trae margen transparente a los costados y
          "cover" se lo recorta sin tocar el dibujo, que queda del mismo alto. */}
      <img
        src={Logos}
        alt="Ferrequipos"
        style={{ display: "block", height: alto, width: alto, objectFit: "cover" }}
      />
    </Box>
  );
}

LogoCirculo.propTypes = {
  alto: PropTypes.number,
};
