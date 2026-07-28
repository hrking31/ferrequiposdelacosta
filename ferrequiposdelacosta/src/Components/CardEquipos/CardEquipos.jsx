import { Link } from "react-router-dom";
import {
  Card,
  CardActionArea,
  CardMedia,
  Grid,
  Typography,
  Box,
  useTheme,
} from "@mui/material";
import PropTypes from "prop-types";

export default function CardEquipos({ name, url, id }) {
  const theme = useTheme();

  return (
    <Grid item xs={12}>
      <Link to={`/detail/${id}`} style={{ textDecoration: "none" }}>
        <Card
          sx={{
            display: "flex",
            flexDirection: "column",
            height: { xs: 235, sm: 330, md: 470 },
            border: "1px solid",
            borderColor: "divider",
            borderTop: (theme) =>
              `4px solid ${
                theme.palette.mode === "light"
                  ? theme.palette.secondary.main
                  : theme.palette.secondary.light
              }`,
          }}
        >
          <CardActionArea sx={{ flexDirection: "column" }}>
            <CardMedia
              component="img"
              src={url}
              alt={name}
              sx={{
                display: "flex",
                height: { xs: 180, sm: 280, md: 400 },
                objectFit: "contain",
                // Blanco fijo en ambos modos, a propósito: las fotos de los
                // equipos vienen recortadas sobre fondo blanco, así que esta
                // es una "superficie de producto", no una superficie de la UI.
                backgroundColor: theme.palette.common.white,
                justifyContent: "flex-start",
                // border: "2px solid #000",
              }}
            />
            <Box
              py={1}
              pl={1}
              sx={{
                display: "flex",
                height: { xs: 55, sm: 50, md: 70 },
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="body1"
                title={name}
                sx={{
                  color: theme.palette.text.primary,
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "normal",
                  letterSpacing: "0.3px",
                  width: "100%",
                }}
              >
                {name}
              </Typography>
            </Box>
          </CardActionArea>
        </Card>
      </Link>
    </Grid>
  );
}

CardEquipos.propTypes = {
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
};

