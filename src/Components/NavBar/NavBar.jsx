// import React, { useState, useEffect } from "react";
// import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
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

// const Logo = styled("img")({
//   height: "75px",
// });

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
//       <AppBar position="fixed" sx={{ backgroundColor: "#9A98FE" }}>
//         <Toolbar sx={{ justifyContent: "space-between" }}>
//           <NavLinkStyled to="/home">
//             <div style={{ display: "flex", alignItems: "center" }}>
//               <Logo
//                 src={LogoFerrequipos} 
//                 alt="logo"
//               />
//             </div>
//           </NavLinkStyled>
//           <IconButton
//             edge="start"
//             color="inherit"
//             aria-label="menu"
//             onClick={handleDrawerOpen}
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
//             width: "300px",
//             height: "200px",
//             top: "80px",
//             borderTopRightRadius: "0",
//             borderTopLeftRadius: "10px",
//             borderBottomRightRadius: "0",
//             borderBottomLeftRadius: "10px",
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
//           <ListItem
//             sx={{
//               justifyContent: "center",
//               marginBottom: "1px",
//             }}
//           >
//             <Typography
//               variant="h6"
//               sx={{
//                 marginBottom: "1px",
//                 color: "#9A98FE",
//               }}
//             >
//               ¿Eres Administrador?
//             </Typography>
//           </ListItem>
//           <ListItem
//             sx={{
//               justifyContent: "center",
//               marginBottom: "1px",
//             }}
//           >
//             <Button
//               component={NavLink}
//               to="/login"
//               onClick={handleDrawerClose}
//               variant="contained"
//               sx={{
//                 width: "80%",
//                 borderRadius: "30px",
//                 height: "45px",
//                 color: "#868688",
//                 backgroundColor: "#9A98FE",
//                 "&:hover": {
//                   backgroundColor: "#c2c1fe",
//                 },
//               }}
//             >
//               INICIAR SESION
//             </Button>
//           </ListItem>
//         </List>
//       </Drawer>

//       <Toolbar />
//     </div>
//   );
// };

// export default NavBar;


import React, { useState, useEffect } from "react";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import BackgroundImage from "../../assets/brick-wall-dark.png";
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
  height: "90px",
});

const Title = styled(Typography)({
  color: "white",
  marginLeft: "10px",
  fontSize: "20px", 
  fontWeight: "bold",
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
      <AppBar position="fixed"       
        sx={{ 
          backgroundImage: `url(${BackgroundImage})`,
          backgroundColor: "#F0F0F0",       
        }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <NavLinkStyled to="/home" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Logo src={LogoFerrequipos} alt="logo" />
            <Typography 
              variant="h3" 
              component="p" 
              sx={{ 
                color: '#00008B', 
                textAlign: 'center',
                fontFamily: "Oswald, serif",
                fontWeight: 'bold',
                fontweight: 400,
                // textShadow: '4px 4px 4px #DC143C',
                fontSize: {
                  xs: '1.5rem',  
                  sm: '2rem',    
                  md: '2.5rem',  
                  lg: '3rem',    
                  xl: '3.5rem'   
                },
                flex: 1
              }}
            >
              Ferrequipos De La Costa
            </Typography>
          </NavLinkStyled>
          <IconButton
            edge="start"
            aria-label="menu"
            onClick={handleDrawerOpen}
            sx={{
              color: '#00008B' 
            }}
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
      width: {
        xs: "50%",    
        sm: "300px",  
      },
      height: "220px",
      top: "100px",
      borderTopRightRadius: "0",
      borderTopLeftRadius: "10px",
      borderBottomRightRadius: "0",
      borderBottomLeftRadius: "10px",
      background: `url("./src/assets/white-leather.png") no-repeat center center,
      #F0F0F0`,
      boxSizing: 'border-box',
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
      px: { xs: 2, sm: 0 },  
    }}
  >
    <ListItem
      sx={{
        justifyContent: "center",
        marginBottom: "1px",
        px: { xs: 0, sm: 2 },  
      }}
    >
      <Typography
        variant="h6"
        sx={{
          marginBottom: "1px",
          color: '#00008B',
          textAlign: 'center',  
        }}
      >
        Eres Administrador?
      </Typography>
    </ListItem>
    <ListItem
      sx={{
        justifyContent: "center",
        marginBottom: "1px",
        px: { xs: 0, sm: 2 },  
      }}
    >
      <Button
        component={NavLink}
        to="/login"
        onClick={handleDrawerClose}
        variant="contained"
        sx={{
          width: {
            xs: "90%",   
            sm: "80%",   
          },
          borderRadius: "30px",
          height: "45px",
          color: '#00008B',
          backgroundColor: "transparent",
          "&:hover": {
            backgroundColor: "transparent",
          },
        }}
      >
        INICIA SESION
      </Button>
    </ListItem>
  </List>
</Drawer>
      <Toolbar />
    </div>
  );
};

export default NavBar;

