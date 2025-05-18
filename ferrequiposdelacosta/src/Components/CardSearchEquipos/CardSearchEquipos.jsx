import { Card, CardActionArea, CardMedia, Grid } from "@mui/material";
import {
  StyleNameTypography,
  StyledCardContent,
} from "./CardSearchEquiposStyles";

export default function CardSearchEquipos({ equipo, onSelect, isSelected }) {
  const { name, images } = equipo;
  const PrimeraUrl = images && images.length > 0 ? images[0].url : null;

  return (
    <Grid
      container
      spacing={0}
      sx={{
        marginTop: "2px",
        marginBottom: {
          xs: "-15px",
          sm: "-30px",
          md: "-70px",
        },
      }}
    >
      <Grid item xs={12}>
        <Card
          onClick={onSelect}
          sx={{
            backgroundColor: isSelected ? "#E3F2FD" : "#ededed",
            border: isSelected ? "2px solid #1976d2" : "1px solid #ccc",
            maxWidth: 345,
            maxHeight: 500,
            overflow: "hidden",
            transition: "0.2s",
            "&:hover": {
              transform: "scale(1.05)",
              boxShadow: 6,
            },
            margin: 1,
            cursor: "pointer",
          }}
        >
          <CardActionArea>
            <CardMedia
              component="img"
              image={PrimeraUrl}
              alt="img not found"
              sx={{
                width: "100%",
                height: 200,
                objectFit: "cover",
              }}
            />
            <StyledCardContent>
              <Grid container direction="column" spacing={2}>
                <Grid item xs={12} sx={{ padding: 1 }}>
                  <StyleNameTypography
                    sx={{
                      fontSize: { xs: "1rem", sm: "1.5rem", md: "2rem" },
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: isSelected ? "bold" : "normal",
                      color: isSelected ? "#0D47A1" : "inherit",
                    }}
                    title={name}
                  >
                    {name}
                  </StyleNameTypography>
                </Grid>
              </Grid>
            </StyledCardContent>
          </CardActionArea>
        </Card>
      </Grid>
    </Grid>
  );
}
