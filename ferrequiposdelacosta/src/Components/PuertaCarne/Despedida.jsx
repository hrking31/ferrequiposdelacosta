import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";
import LogoFerrequipos from "../../assets/LogoFerrequipos.svg";

// Lo que dice el carné cuando la cinta se lo lleva al terminar el turno (ver
// "Terminar turno" en HeaderUsuario). Colores fijos de día: el carné es blanco
// también en modo oscuro.
export default function Despedida({ nombre }) {
  const primerNombre = (nombre || "").trim().split(/\s+/)[0];
  return (
    <Box sx={{ p: "18px 26px 22px", display: "grid", justifyItems: "center", gap: "10px" }}>
      <Box
        component="svg"
        viewBox="44 0 218 259"
        role="img"
        aria-label="Ferrequipos de la Costa"
        sx={{ height: 88, width: "auto", display: "block" }}
      >
        <image href={LogoFerrequipos} x="0.4" y="1" width="316.5" height="270" />
      </Box>
      <Typography sx={{ font: '700 17px "Montserrat", sans-serif', color: "#0F172A", textAlign: "center" }}>
        {primerNombre ? `Hasta luego, ${primerNombre}` : "Hasta luego"}
      </Typography>
      <Typography
        sx={{
          font: '700 9.5px "Montserrat", sans-serif',
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: "#475569",
        }}
      >
        Turno terminado
      </Typography>
      <Box
        aria-hidden="true"
        sx={{
          width: "100%",
          height: 26,
          mt: 1,
          opacity: 0.8,
          background:
            "repeating-linear-gradient(90deg, #0F172A 0 2px, transparent 2px 4px, #0F172A 4px 7px, transparent 7px 9px, #0F172A 9px 10px, transparent 10px 14px, #0F172A 14px 17px, transparent 17px 19px)",
          maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        }}
      />
    </Box>
  );
}

Despedida.propTypes = { nombre: PropTypes.string };
