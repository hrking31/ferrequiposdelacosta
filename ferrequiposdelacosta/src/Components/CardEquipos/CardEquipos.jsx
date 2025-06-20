import { Link } from "react-router-dom";
import {
  Card,
  CardActionArea,
  CardMedia,
  Grid,
  Typography,
  Box,
} from "@mui/material";

export default function CardEquipos({ name, url, id }) {


  return (
    <Grid item xs={12}>
      <Link to={`/detail/${id}`} style={{ textDecoration: "none" }}>
        <Card
          sx={{
            display: "flex",
            flexDirection: "column",
            height: { xs: 235, sm: 330, md: 450 },
          }}
        >
          <CardActionArea sx={{ flex: 1, flexDirection: "column" }}>
            <CardMedia
              component="img"
              src={url}
              alt={name}
              sx={{
                height: { xs: 180, sm: 280, md: 400 },
                objectFit: "contain",
                backgroundColor: "#fff",
              }}
            />
            <Box
              p={2}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
              }}
            >
              <Typography
                variant="h6"
                title={name}
                sx={{
                  flex: 1,
                  whiteSpace: "normal",
                  display: "-webkit-box",
                  letterSpacing: "0.3px",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
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
