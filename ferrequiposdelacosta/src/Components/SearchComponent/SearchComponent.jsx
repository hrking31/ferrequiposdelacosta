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
    <Box p={2} display="flex" flexDirection="column">
      <Grid container spacing={2} justifyContent="center">
        <Grid item xs={12} sm={8} md={8}>
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
                "& input:-webkit-autofill": {
                  boxShadow: `0 0 0 1000px ${theme.palette.background.default} inset`,
                  WebkitTextFillColor: theme.palette.text.primary,
                },
              },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={4} md={4}>
          <Button variant="contained" onClick={handleSearch} fullWidth>
            Buscar
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SearchComponent;
