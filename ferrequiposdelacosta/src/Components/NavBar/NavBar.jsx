import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Grid,
  Box,
  useTheme,
  useMediaQuery,
  Modal,
} from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import { useColorMode } from "../../Theme/ThemeProvider";
import Logos from "../../assets/LogoFerrequipos.png";
import { NavLink } from "react-router-dom";
import Login from "../Login/Login";

export default function MenuAppBar() {
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const isSmallScreen = useMediaQuery("(max-width:915px)");
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

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
              onClick={handleOpen}
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
            <Modal open={open} onClose={handleClose}>
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: "#FDF6EC",
                  padding: "0px",
                  borderRadius: "8px",
                  maxWidth: "400px",
                  width: "90%",
                }}
              >
                <Login onClose={handleClose} />
              </div>
            </Modal>
          </div>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
