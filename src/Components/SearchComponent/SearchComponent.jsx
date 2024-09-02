import React, { useState } from "react";
import { TextField, Button, Box, Grid, Typography } from "@mui/material";

const SearchComponent = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    onSearch(searchTerm);
  };

  return (
    <Box sx={{ padding: 2, textAlign: "center" }}>
      <Box sx={{ marginBottom: 1 }}>
        <Typography variant="h5" sx={{ color: "#8B3A3A", fontWeight: "bold" }}>
          Bienvenida, Busca el Equipo por nombre pero recuerda con MAYUSCULA:
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Buscar por nombre en mayuscula"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              mb: 2,
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
