import React from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Grid,
  Box,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import MenuItem from "@mui/material/MenuItem";
import { useColorMode } from "../../Theme/ThemeProvider";
import Menu from "@mui/material/Menu";
import Logos from "../../assets/LogoFerrequipos.png";
import { NavLink, useNavigate } from "react-router-dom";

export default function MenuAppBar() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery("(max-width:915px)");

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAccountClick = () => {
    navigate("/login");
    handleClose();
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Grid item>
            <Box>
              <NavLink to="/home">
                <img
                  src={Logos}
                  alt="logo"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    maxWidth: "100%",
                    maxHeight: "60px",
                    height: "auto",
                    filter: "drop-shadow(0 0 3px rgba(255, 255, 255, 0.8))",
                  }}
                />
              </NavLink>
            </Box>
          </Grid>
          {!isSmallScreen ? (
            <Typography
              variant="h4"
              component="h1"
              sx={{
                flexGrow: 1,
                textAlign: "center",
                fontSize: {
                  xs: "1.5rem",
                  sm: "2rem",
                },
              }}
            >
              Ferrequipos De La Costa
            </Typography>
          ) : (
            <Typography
              variant="h4"
              component="h1"
              sx={{
                flexGrow: 1,
                textAlign: "center",
                fontSize: {
                  xs: "1.5rem",
                  sm: "2rem",
                },
              }}
            >
              Ferrequipos
            </Typography>
          )}

          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <IconButton onClick={toggleColorMode}>
              {theme.palette.mode === "dark" ? (
                <Brightness7 />
              ) : (
                <Brightness4 />
              )}
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleClose}
              anchorOrigin={{
                vertical: isSmallScreen ? "bottom" : "top",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: isSmallScreen ? "top" : "top",
                horizontal: "right",
              }}
              sx={{
                "& .MuiPaper-root": {
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  boxShadow: 3,
                  borderRadius: 2,
                  width: 200,
                  mt: isSmallScreen ? 2 : -1,
                },
              }}
            >
              <MenuItem onClick={handleAccountClick}>Mi cuenta</MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>
    </Box>
  );
}


