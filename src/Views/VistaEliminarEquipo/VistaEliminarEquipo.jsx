import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { Box, Grid, Snackbar, Button } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { fetchEquipos } from "../../Store/Slices/searchSlice";
import SearchComponent from "../../Components/SearchComponent/SearchComponent";
import EliminarEquipos from "../../Components/EliminarEquipos/EliminarEquipos";
import CardsSearchEquipos from "../../Components/CardsSearchEquipos/CardsSearchEquipos";

const VistaEliminaEquipo = () => {
  const { user, logout } = useAuth();
  const dispatch = useDispatch();
  const error = useSelector((state) => state.equipos.error);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleSearch = (searchTerm) => {
    dispatch(fetchEquipos(searchTerm));
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handlerLogout = async () => {
    await logout();
  };

  useEffect(() => {
    if (error) {
      setOpenSnackbar(true);
    }
  }, [error]);

  return (
    <Box sx={{ padding: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ padding: 2 }}>
            <Box sx={{ marginBottom: 4 }}>
              <SearchComponent onSearch={handleSearch} />
            </Box>
            <Box sx={{ marginBottom: 4 }}>
              <CardsSearchEquipos />
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ padding: 2 }}>
            <Box sx={{ marginBottom: 4 }}>
              <EliminarEquipos />
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={2} justifyContent="center" sx={{ marginTop: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Button
            component={Link}
            to="/admin"
            variant="contained"
            fullWidth
            sx={{
              marginTop: 0,
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
          >
            MENU
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button
            onClick={handlerLogout}
            variant="contained"
            fullWidth
            sx={{
              marginTop: 0,
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
          >
            CERRAR SESIÓN
          </Button>
        </Grid>
      </Grid>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={error}
      />
    </Box>
  );
};

export default VistaEliminaEquipo;
