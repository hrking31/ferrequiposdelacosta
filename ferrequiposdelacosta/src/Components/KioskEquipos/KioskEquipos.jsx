import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Grid, Box } from "@mui/material";
import { clearSearchEquipo } from "../../Store/Slices/searchSlice";
import KioskCards from "../KioskCards/KioskCards.jsx";
import Search from "../../Components/Search/Search";
import Footer from "../../Components/Footer/Footer.jsx";

export default function KioskEquipos() {
  const dispatch = useDispatch();
  // Al salir del kiosco, el buscador vuelve vacío.
  useEffect(() => {
    return () => {
      dispatch(clearSearchEquipo());
    };
  }, [dispatch]);

  return (
    <Grid
      container
      sx={{
        display: "flex",
        flexDirection: "column",
        pt: 1,
        // border: "2px solid red",
      }}
    >
      <Box sx={{ p: 2 }}>
        <Search />
      </Box>

      <KioskCards />

      <Box
        component="footer"
        sx={{
          width: "100%",
          mt: 2,
          //  border: "2px solid red"
        }}
      >
        <Footer />
      </Box>

    </Grid>
  );
}
