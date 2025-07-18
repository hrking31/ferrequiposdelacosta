import { useState } from "react";
import { TextField, Box, Grid, useTheme, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const Search = ({ LabelOff = true, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const theme = useTheme();

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    onSearch(searchTerm);
    setSearchTerm("");
  };

  return (
    <Box display="flex" flexDirection="column">
      <Grid container spacing={2} justifyContent="center">
        <Grid item xs={12}>
          <TextField
            label={LabelOff ? "¿Qué estás buscando?" : ""}
            placeholder={!LabelOff ? "¿Qué estás buscando?" : undefined}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {theme.palette.mode === "light" ? (
                    <SearchIcon
                      onClick={handleSearch}
                      sx={{ color: "secondary.main" }}
                    />
                  ) : (
                    <SearchIcon
                      onClick={handleSearch}
                      sx={{ color: "secondary.light" }}
                    />
                  )}
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Search;
