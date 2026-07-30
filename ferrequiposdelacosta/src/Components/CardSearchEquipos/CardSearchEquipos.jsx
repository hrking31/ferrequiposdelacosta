import {
  Card,
  CardActionArea,
  CardMedia,
  Grid,
  Typography,
  Box,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import PropTypes from "prop-types";

export default function CardSearchEquipos({ equipo, onSelect, isSelected }) {
  const theme = useTheme();
  const { name, images } = equipo;
  const PrimeraUrl = images?.[0]?.url || "";

  return (
    <Grid item xs={12}>
      <Card
        onClick={onSelect}
        sx={{
          // El acento ya cambia con el modo, así que la tarjeta no pregunta
          // en cuál está. Elegida y sin elegir comparten color: lo que las
          // distingue es que la elegida se rodea entera y levanta sombra.
          boxShadow: isSelected
            ? `0 4px 12px ${alpha(theme.palette.custom.accent, 0.3)}`
            : "0 2px 8px rgba(0, 0, 0, 0.08)",
          border: "1px solid",
          borderColor: isSelected ? theme.palette.custom.accent : "divider",
          borderTop: (theme) =>
            isSelected
              ? `2px solid ${theme.palette.custom.accent}`
              : `4px solid ${theme.palette.custom.accent}`,
        }}
      >
        <CardActionArea>
          <CardMedia
            component="img"
            image={PrimeraUrl}
            alt="img not found"
            sx={{
              height: {
                xs: 280,
                md: 400,
              },
            }}
          />

          <Box p={2}>
            <Typography
              variant="body1"
              title={name}
              sx={{
                fontWeight: isSelected ? 700 : undefined,
                // Seleccionada: color de marca (14.6:1 en claro, 8.4:1 en
                // oscuro). El naranja sobre fondo claro daba solo 3.6:1.
                color: isSelected
                  ? theme.palette.primary.main
                  : theme.palette.text.primary,
              }}
            >
              {name}
            </Typography>
          </Box>
        </CardActionArea>
      </Card>
    </Grid>
  );
}

CardSearchEquipos.propTypes = {
  equipo: PropTypes.shape({
    name: PropTypes.string,
    images: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
      }),
    ),
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
  isSelected: PropTypes.bool,
};
