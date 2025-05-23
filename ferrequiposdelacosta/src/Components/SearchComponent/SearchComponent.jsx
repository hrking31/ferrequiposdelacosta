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
      mx="auto"
      p={2}

      display="flex"
      flexDirection="column"
      sx={{
        [theme.breakpoints.up("md")]: { width: "60%" },
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
            size="small"
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
          <Button variant="contained" onClick={handleSearch} fullWidth>
            Buscar
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SearchComponent;
