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
        <Card>
          <CardActionArea>
            <CardMedia
              component="img"
              src={url}
              alt="img not found"
              sx={{
                height: {
                  xs: 180,
                  sm: 280,
                  md: 400,
                },
              }}
            />
            <Box p={2}>
              <Typography variant="cardTitle" title={name}>
                {name}
              </Typography>
            </Box>
          </CardActionArea>
        </Card>
      </Link>
    </Grid>
  );
}
