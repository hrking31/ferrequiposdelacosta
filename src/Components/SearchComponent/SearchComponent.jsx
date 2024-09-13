import React, { useState } from "react";
import { TextField, Button, Box, Grid, Typography } from "@mui/material";

const SearchComponent = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    onSearch(searchTerm);
    setSearchTerm("");
  };

  return (
    <Box
      sx={{
        padding: 2,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        textAlign: "center",
        width: { xs: "100%", sm: "80%", md: "50%" },
        margin: "0 auto",
      }}
    >
      <Box sx={{ marginBottom: 2 }}>
        <Typography variant="h5" sx={{ color: "#8B3A3A", fontWeight: "bold" }}>
          Bienvenida, Busca el Equipo por su nombre.
        </Typography>
      </Box>

      <Grid container spacing={2} justifyContent="center" alignItems="center">
        <Grid item xs={8}>
          <TextField
            label="Buscar por nombre"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
        </Grid>
        <Grid item xs={4}>
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              height: "100%",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
            fullWidth
          >
            Buscar
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SearchComponent;
