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

export default function KioskCard({ name, url, id }) {
  const theme = useTheme();

  return (
    <Grid item xs={12}>
      <Link to={`/kioskdetail/${id}`} style={{ textDecoration: "none" }}>
        <Card
          elevation={3}
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            borderRadius: 4,
            transition: "transform 0.2s",
            "&:active": { transform: "scale(0.95)" },
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
                backgroundColor: "#fff",
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
                // border: "2px solid #000",
              }}
            >
              <Typography
                variant="body1"
                title={name}
                sx={{
                  color: theme.palette.custom.primary,
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
