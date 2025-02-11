// import React, { useState } from "react";
// import { TextField, Button, Box, Grid, Typography } from "@mui/material";

// const SearchComponent = ({ onSearch }) => {
//   const [searchTerm, setSearchTerm] = useState("");

//   const handleSearch = () => {
//     if (!searchTerm.trim()) return;
//     onSearch(searchTerm);
//     setSearchTerm("");
//   };

//   return (
//     <Box
//       sx={{
//         padding: 2,
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         flexDirection: "column",
//         textAlign: "center",
//         width: { xs: "100%", sm: "80%", md: "100%" },
//         margin: "0 auto",
//       }}
//     >
//       <Box sx={{ marginBottom: 2, width: "100%" }}>
//         <Typography
//           variant="h4"
//           sx={{
//             color: "#8B3A3A",
//             fontWeight: "bold",
//             width: "100%",
//             overflowWrap: "break-word",
//           }}
//         >
//           Bienvenida, Busca el equipo por su nombre.
//         </Typography>
//       </Box>

//       <Grid container spacing={2} justifyContent="center" alignItems="center">
//         <Grid item xs={8}>
//           <TextField
//             label="Buscar por nombre"
//             variant="outlined"
//             fullWidth
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             sx={{ mt: 2, mb: 2 }}
//           />
//         </Grid>
//         <Grid item xs={4}>
//           <Button
//             variant="contained"
//             onClick={handleSearch}
//             fullWidth
//             sx={{
//               marginTop: 3,
//               width: "200px",
//               height: "45px",
//               color: "#ffffff",
//               backgroundColor: "#1E90FF",
//               "&:hover": {
//                 backgroundColor: "#4682B4",
//               },
//             }}
//           >
//             Buscar
//           </Button>
//         </Grid>
//       </Grid>
//     </Box>
//   );
// };

// export default SearchComponent;
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
        padding: { xs: 1, sm: 2, md: 3 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        textAlign: "center",
      }}
    >
      <Box sx={{ marginBottom: { xs: 1, sm: 2 }, width: "100%" }}>
        <Typography
          variant="h4"
          sx={{
            color: "#00008B",
            fontWeight: "bold",
            overflowWrap: "break-word",
            fontSize: { xs: "h5.fontSize", sm: "h4.fontSize" },
          }}
        >
          Busca el equipo por su nombre.
        </Typography>
      </Box>

      <Grid container spacing={2} justifyContent="center">
        <Grid item xs={12} sm={8} md={9}>
          <TextField
            label="Nombre de Equipo"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              sx: {
                color: "#8B3A3A",
                height: "60px",
              },
            }}
            margin="normal"
            sx={{
              mt: 1,
              fontSize: "0.75rem",
              "& .MuiInputBase-input": {
                padding: "14px 12px",
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "#00008B",
                },
                "&:hover fieldset": {
                  borderColor: "#4682B4",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#1E90FF",
                },
              },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={4} md={3}>
          <Button
            variant="contained"
            onClick={handleSearch}
            fullWidth
            sx={{
              mt: 2,
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
          >
            Buscar
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SearchComponent;
