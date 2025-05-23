import {
  Card,
  CardActionArea,
  CardMedia,
  Grid,
  Typography,
  Box,
} from "@mui/material";

export default function CardSearchEquipos({ equipo, onSelect, isSelected }) {
  const { name, images } = equipo;
  const PrimeraUrl = images?.[0]?.url || "";

  return (
    <Grid item xs={12} >
      <Card
        onClick={onSelect}
        sx={{
          boxShadow: isSelected
            ? "0 4px 12px rgba(102, 155, 188, 0.3)"
            : "0 2px 8px rgba(0, 0, 0, 0.08)",
          border: isSelected ? "2px solid #669BBC" : undefined,
        }}
      >
        <CardActionArea>
          <CardMedia component="img" image={PrimeraUrl} alt="img not found" />
          <Box p={2}>
            <Typography
              variant="cardTitle"
              sx={{
                fontWeight: isSelected ? 700 : undefined,
                color: isSelected ? "#669BBC" : undefined,
              }}
              title={name}
            >
              {name}
            </Typography>
          </Box>
        </CardActionArea>
      </Card>
    </Grid>
  );
}

