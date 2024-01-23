/*import SearchBar from "../SearchBar/SearchBar";
import style from "./NavBar.module.css";
import { Link } from "react-router-dom";
import DarkMode from "../../Components/DarkMode/DarkMode";

export default function NavBar(props) {
  return (
    <div className={style.nav}>
      <DarkMode />
      <div className={style.navButtons}>
        <Link to="/home">
          <button>Home</button>
        </Link>
      </div>
      <SearchBar onSearch={props.onSearch} />
    </div>
  );
}*/

import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { styled } from "@mui/material/styles";
import {
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

const NavLinkStyled = styled(NavLink)(({ theme }) => ({
  textDecoration: "none",
  color: "white",
  fontSize: "16px",
  margin: "0",
  "&.active": {
    color: theme.palette.secondary.main,
  },
}));

const Logo = styled("img")({
  height: "75px",
});

const NavBar = () => {
  const [openDrawer, setOpenDrawer] = useState(false);

  useEffect(() => {
    let timer;
    if (openDrawer) {
      timer = setTimeout(() => {
        setOpenDrawer(false);
      }, 10000);
    }
    return () => clearTimeout(timer);
  }, [openDrawer]);

  const handleDrawerOpen = () => {
    setOpenDrawer(true);
  };

  const handleDrawerClose = () => {
    setOpenDrawer(false);
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <AppBar position="fixed" sx={{ backgroundColor: "#9A98FE" }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <NavLinkStyled to="/home">
            <div style={{ display: "flex", alignItems: "center" }}>
              <Logo
                src="https://firebasestorage.googleapis.com/v0/b/ferrequiposdelacosta-e2457.appspot.com/o/LogoFerrequipos.png?alt=media&token=7eddb4c4-2dbb-43b4-9701-7eb3db9763f6"
                alt="logo"
              />
            </div>
          </NavLinkStyled>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleDrawerOpen}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={handleDrawerClose}
        ModalProps={{
          disableScrollLock: true,
          hideBackdrop: true,
        }}
        sx={{
          zIndex: 999,
          ".MuiDrawer-paper": {
            width: "300px",
            height: "200px",
            top: "80px",
            borderTopRightRadius: "0",
            borderTopLeftRadius: "10px",
            borderBottomRightRadius: "0",
            borderBottomLeftRadius: "10px",
          },
        }}
      >
        <List
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <ListItem
            sx={{
              justifyContent: "center",
              marginBottom: "1px",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                marginBottom: "1px",
                color: "#9A98FE",
              }}
            >
              ¿Eres Administrador?
            </Typography>
          </ListItem>
          <ListItem
            sx={{
              justifyContent: "center",
              marginBottom: "1px",
            }}
          >
            <Button
              component={NavLink}
              to="/login"
              onClick={handleDrawerClose}
              variant="contained"
              sx={{
                width: "80%",
                borderRadius: "30px",
                height: "45px",
                color: "#868688",
                backgroundColor: "#9A98FE",
                "&:hover": {
                  backgroundColor: "#c2c1fe",
                },
              }}
            >
              INICIAR SESION
            </Button>
          </ListItem>
        </List>
      </Drawer>

      <Toolbar />
    </div>
  );
};

export default NavBar;
