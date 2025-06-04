import { useState } from "react";
import { TextField, Box, Grid, useTheme, InputAdornment} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const Search = ({ onSearch }) => {
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
        <Grid item xs={12} >
          <TextField
            label="¿Qué estás buscando?"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            size="small"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon
                    sx={{ cursor: "pointer" }}
                    onClick={handleSearch}
                  />
                </InputAdornment>
              ),
            }}
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
      </Grid>
    </Box>
  );
};

export default Search;
