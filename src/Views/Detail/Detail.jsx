import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDetailData } from "../../Store/Actions/detailAction";
import DetailGallery from "../../Components/DetailGallery/DetailGallery";
import LoadingCircle from "../../Components/LoadingCircle/LoadingCircle";
import { Grid, Typography, Box } from "@mui/material";

export default function Detail() {
  const { name } = useParams();
  const dispatch = useDispatch();
  const equipo = useSelector((state) => state.equipoDetail.selectedEquipo);

  useEffect(() => {
    dispatch(fetchDetailData(name));
  }, [dispatch, name]);

  if (!equipo) {
    return <LoadingCircle />;
  }

  return (
    <Grid
      container
      spacing={2}
      sx={{
        marginTop: "20px",
        marginBottom: {
          xs: "-15px",
          sm: "-30px",
          md: "-70px",
        },
      }}
    >
      <Grid item xs={12} md={6}>
        <DetailGallery />
      </Grid>
      <Grid item xs={12} md={6}>
        <Box sx={{ padding: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {equipo.name}
          </Typography>
          <Typography variant="body1" component="p">
            {equipo.description}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
}

