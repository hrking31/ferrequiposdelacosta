import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchDetailData } from "../../Store/Slices/detailSlice.js";
import DetailGallery from "../../Components/DetailGallery/DetailGallery.jsx";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo.jsx";
import {
  Grid,
  Typography,
  Box,
  Divider,
  useMediaQuery,
  Button,
} from "@mui/material";
import KioskProductCardDetail from "../../Components/KioskProductCardDetail/KioskProductCardDetail.jsx";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../../Components/AppSnackbar/AppSnackbar";

export default function KioskDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const isMobile = useMediaQuery("(max-width:1024px)");
  const navigate = useNavigate();

  const {
    selectedEquipo: equipo,
    loading,
    error,
  } = useSelector((state) => state.equipoDetail);

  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    dispatch(fetchDetailData(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (error) {
      showSnackbar(error, "error");
    }
  }, [error, showSnackbar]);

  if (loading || !equipo) return <LoadingLogo />;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        overflow: "auto",
        pt: isFullScreen ? { xs: 0, sm: 0 } : 8,
        pb: isFullScreen ? { xs: 6, sm: 7 } : 0,
        // border: "2px solid red",
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          p: isMobile ? 0 : 2,
          // border: "2px solid red",
        }}
      >
        <Grid container>
          <Grid
            item
            xs={12}
            md={isMobile ? 12 : 5}
            sx={{
              display: "flex",
              alignItems: "center",
              // border: "2px solid red",
            }}
          >
            <DetailGallery />
          </Grid>

          <Grid
            item
            xs={12}
            md={isMobile ? 12 : 7}
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              p: 2,
              // border: "2px solid red",
            }}
          >
            <Typography
              variant="h5"
              sx={{
                textAlign: isMobile ? "center" : "left",
                lineHeight: 1.6,
                overflowWrap: "break-word",
                wordBreak: "break-word",
                hyphens: "auto",
                whiteSpace: "pre-line",
              }}
            >
              {equipo.name}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography
              variant="body1"
              sx={{
                pl: 1,
                overflowWrap: "break-word",
                wordBreak: "break-word",
                hyphens: "auto",
                whiteSpace: "pre-line",
              }}
            >
              {equipo.description}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <KioskProductCardDetail product={equipo} />

            <Box sx={{ textAlign: "center" }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate("/kioskhome")}
              >
                Ver más Equipos
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
