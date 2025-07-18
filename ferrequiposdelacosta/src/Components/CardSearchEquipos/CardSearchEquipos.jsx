import {
  Card,
  CardActionArea,
  CardMedia,
  Grid,
  Typography,
  Box,
  useTheme,
} from "@mui/material";

export default function CardSearchEquipos({ equipo, onSelect, isSelected }) {
  const theme = useTheme();
  const { name, images } = equipo;
  const PrimeraUrl = images?.[0]?.url || "";

  return (
    <Grid item xs={12}>
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
                color: isSelected ? "#669BBC" : theme.palette.custom.primary,
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
