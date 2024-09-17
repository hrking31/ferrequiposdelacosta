import * as React from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Grid,
  Box,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import MenuItem from "@mui/material/MenuItem";
import Menu from "@mui/material/Menu";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";

import { NavLink, useNavigate } from "react-router-dom";

export default function MenuAppBar() {
  const [auth, setAuth] = React.useState(true);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const navigate = useNavigate();

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
                  src={LogoFerrequipos}
                  alt="logo"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    maxWidth: "100%",
                    maxHeight: "60px",
                    height: "auto",
                  }}
                />
              </NavLink>
            </Box>
          </Grid>
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
          {auth && (
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
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleAccountClick}>Mi cuenta</MenuItem>
              </Menu>
            </div>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}

/////////////////////////////////////////////////////////////////

// import React, { useState, useEffect } from "react";
// import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
// import BackgroundImage from "../../assets/brick-wall-dark.png";
// import { NavLink } from "react-router-dom";
// import { styled } from "@mui/material/styles";
// import {
//   AppBar,
//   Toolbar,
//   Button,
//   IconButton,
//   Drawer,
//   List,
//   ListItem,
//   Typography,
//   Grid, // Importa Grid
// } from "@mui/material";
// import MenuIcon from "@mui/icons-material/Menu";

// const NavLinkStyled = styled(NavLink)(({ theme }) => ({
//   textDecoration: "none",
//   color: "white",
//   fontSize: "16px",
//   margin: "0",
//   "&.active": {
//     color: theme.palette.secondary.main,
//   },
// }));

// const Logo = styled("img")(({ theme }) => ({
//   height: "60px",
//   [theme.breakpoints.up("sm")]: {
//     height: "70px",
//   },
//   [theme.breakpoints.up("md")]: {
//     height: "80px",
//   },
//   [theme.breakpoints.up("lg")]: {
//     height: "90px",
//   },
// }));

// export default function NavBar() {
//   const [openDrawer, setOpenDrawer] = useState(false);

//   useEffect(() => {
//     let timer;
//     if (openDrawer) {
//       timer = setTimeout(() => {
//         setOpenDrawer(false);
//       }, 10000);
//     }
//     return () => clearTimeout(timer);
//   }, [openDrawer]);

//   const handleDrawerOpen = () => {
//     setOpenDrawer(true);
//   };

//   const handleDrawerClose = () => {
//     setOpenDrawer(false);
//   };

//   return (
//     <div style={{ marginBottom: "20px" }}>
//       <AppBar
//         position="fixed"
//         sx={{
//           backgroundImage: `url(${BackgroundImage})`,
//           backgroundColor: "#F0F0F0",
//           height: "90px",
//         }}
//       >
//         <Toolbar
//           sx={{
//             height: "100%",
//           }}
//         >
//           <Grid container alignItems="center" justifyContent="space-between">
// <Grid item>
//   <NavLinkStyled to="/home">
//     <Logo src={LogoFerrequipos} alt="logo" />
//   </NavLinkStyled>
// </Grid>
//             <Grid item>
//               <Typography
//                 variant="h4"
//                 component="h1"
//                 sx={{
//                   color: "#00008B",
//                   fontFamily: "Oswald, serif",
//                   fontWeight: "bold",
//                   textAlign: "center",
//                   fontSize: {
//                     xs: "1.5rem",
//                     sm: "2rem",
//                   },
//                 }}
//               >
//                 Ferrequipos De La Costa
//               </Typography>
//             </Grid>
//             <Grid item>
//               <IconButton
//                 edge="start"
//                 aria-label="menu"
//                 onClick={handleDrawerOpen}
//                 sx={{
//                   color: "#00008B",
//                 }}
//               >
//                 <MenuIcon />
//               </IconButton>
//             </Grid>
//           </Grid>
//         </Toolbar>
//       </AppBar>

//       <Drawer
//         anchor="right"
//         open={openDrawer}
//         onClose={handleDrawerClose}
//         ModalProps={{
//           disableScrollLock: true,
//           hideBackdrop: true,
//         }}
//         sx={{
//           zIndex: 999,
//           ".MuiDrawer-paper": {
//             width: {
//               xs: "50%",
//               sm: "300px",
//             },
//             height: "220px",
//             top: "100px",
//             borderTopRightRadius: "0",
//             borderTopLeftRadius: "10px",
//             borderBottomRightRadius: "0",
//             borderBottomLeftRadius: "10px",
//             background: `url("./src/assets/white-leather.png") no-repeat center center, #F0F0F0`,
//           },
//         }}
//       >
//         <List
//           sx={{
//             display: "flex",
//             flexDirection: "column",
//             alignItems: "center",
//             justifyContent: "center",
//             height: "100%",
//           }}
//         >
//           <ListItem sx={{ justifyContent: "center", marginBottom: "1px" }}>
//             <Typography
//               variant="h6"
//               sx={{ color: "#00008B", textAlign: "center" }}
//             >
//               Eres Administrador?
//             </Typography>
//           </ListItem>
//           <ListItem sx={{ justifyContent: "center", marginBottom: "1px" }}>
//             <Button
//               component={NavLink}
//               to="/login"
//               onClick={handleDrawerClose}
//               variant="contained"
//               sx={{
//                 width: {
//                   xs: "90%",
//                   sm: "80%",
//                 },
//                 borderRadius: "30px",
//                 height: "45px",
//                 color: "#00008B",
//                 backgroundColor: "transparent",
//                 "&:hover": {
//                   backgroundColor: "transparent",
//                 },
//               }}
//             >
//               INICIA SESION
//             </Button>
//           </ListItem>
//         </List>
//       </Drawer>
//       <Toolbar />
//     </div>
//   );
// }

//////////////////////////////////////////////////////

// import React, { useState, useEffect } from "react";
// import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
// import BackgroundImage from "../../assets/brick-wall-dark.png";
// import { NavLink } from "react-router-dom";
// import { styled } from "@mui/material/styles";
// import {
//   AppBar,
//   Toolbar,
//   Button,
//   IconButton,
//   Drawer,
//   List,
//   ListItem,
//   Typography,
// } from "@mui/material";
// import MenuIcon from "@mui/icons-material/Menu";

// const NavLinkStyled = styled(NavLink)(({ theme }) => ({
//   textDecoration: "none",
//   color: "white",
//   fontSize: "16px",
//   margin: "0",
//   "&.active": {
//     color: theme.palette.secondary.main,
//   },
// }));

// const Logo = styled("img")(({ theme }) => ({
//   height: "60px",
//   [theme.breakpoints.up("sm")]: {
//     height: "70px",
//   },
//   [theme.breakpoints.up("md")]: {
//     height: "80px",
//   },
//   [theme.breakpoints.up("lg")]: {
//     height: "90px",
//   },
// }));

// const NavBar = () => {
//   const [openDrawer, setOpenDrawer] = useState(false);

//   useEffect(() => {
//     let timer;
//     if (openDrawer) {
//       timer = setTimeout(() => {
//         setOpenDrawer(false);
//       }, 10000);
//     }
//     return () => clearTimeout(timer);
//   }, [openDrawer]);

//   const handleDrawerOpen = () => {
//     setOpenDrawer(true);
//   };

//   const handleDrawerClose = () => {
//     setOpenDrawer(false);
//   };

//   return (
//     <div style={{ marginBottom: "20px" }}>
//       <AppBar
//         position="fixed"
//         sx={{
//           backgroundImage: `url(${BackgroundImage})`,
//           backgroundColor: "#F0F0F0",
//           height: "90px",
//         }}
//       >
//         <Toolbar
//           sx={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             height: "100%",
//           }}
//         >
//           <NavLinkStyled
//             to="/home"
//             sx={{ display: "flex", alignItems: "center" }}
//           >
//             <Logo src={LogoFerrequipos} alt="logo" />
//           </NavLinkStyled>
//           <Typography
//             variant="h4"
//             component="h1"
//             sx={{
//               color: "#00008B",
//               fontFamily: "Oswald, serif",
//               fontWeight: "bold",
//               textAlign: "center",
//               fontSize: {
//                 xs: "1.5rem",
//                 sm: "2rem",
//               },
//             }}
//           >
//             Ferrequipos De La Costa
//           </Typography>
//           <IconButton
//             edge="start"
//             aria-label="menu"
//             onClick={handleDrawerOpen}
//             sx={{
//               color: "#00008B",
//             }}
//           >
//             <MenuIcon />
//           </IconButton>
//         </Toolbar>
//       </AppBar>

//       <Drawer
//         anchor="right"
//         open={openDrawer}
//         onClose={handleDrawerClose}
//         ModalProps={{
//           disableScrollLock: true,
//           hideBackdrop: true,
//         }}
//         sx={{
//           zIndex: 999,
//           ".MuiDrawer-paper": {
//             width: {
//               xs: "50%",
//               sm: "300px",
//             },
//             height: "220px",
//             top: "100px",
//             borderTopRightRadius: "0",
//             borderTopLeftRadius: "10px",
//             borderBottomRightRadius: "0",
//             borderBottomLeftRadius: "10px",
//             background: `url("./src/assets/white-leather.png") no-repeat center center, #F0F0F0`,
//           },
//         }}
//       >
//         <List
//           sx={{
//             display: "flex",
//             flexDirection: "column",
//             alignItems: "center",
//             justifyContent: "center",
//             height: "100%",
//           }}
//         >
//           <ListItem sx={{ justifyContent: "center", marginBottom: "1px" }}>
//             <Typography
//               variant="h6"
//               sx={{ color: "#00008B", textAlign: "center" }}
//             >
//               Eres Administrador?
//             </Typography>
//           </ListItem>
//           <ListItem sx={{ justifyContent: "center", marginBottom: "1px" }}>
//             <Button
//               component={NavLink}
//               to="/login"
//               onClick={handleDrawerClose}
//               variant="contained"
//               sx={{
//                 width: {
//                   xs: "90%",
//                   sm: "80%",
//                 },
//                 borderRadius: "30px",
//                 height: "45px",
//                 color: "#00008B",
//                 backgroundColor: "transparent",
//                 "&:hover": {
//                   backgroundColor: "transparent",
//                 },
//               }}
//             >
//               INICIA SESION
//             </Button>
//           </ListItem>
//         </List>
//       </Drawer>
//       <Toolbar />
//     </div>
//   );
// };

// export default NavBar;
