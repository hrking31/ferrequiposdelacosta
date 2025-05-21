import { useState } from "react";
import { TextField, Button, Box, Grid, useTheme } from "@mui/material";

const SearchComponent = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const theme = useTheme();

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    onSearch(searchTerm);
    setSearchTerm("");
  };

  return (
    <Box
      sx={{
        padding: { xs: 1, sm: 2, md: 3 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        textAlign: "center",
      }}
    >
      <Grid container spacing={2} justifyContent="center">
        <Grid item xs={12} sm={8} md={9}>
          <TextField
            label="Nombre de Equipo"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "primary.main",
                },
                "&:hover fieldset": {
                  borderColor: "primary.light",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.dark",
                },
              },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={4} md={3}>
          <Button variant="contained" onClick={handleSearch} fullWidth >
            Buscar
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SearchComponent;
