import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  Grid,
  Paper,
  Skeleton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error al obtener los usuarios:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const formatearNombreRol = (rolKey) => {
    if (!rolKey) return "Usuario";
    const conEspacios = rolKey.replace(/([A-Z])/g, " $1");
    return conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Grid container spacing={3}>
        {loading
          ? [...Array(6)].map((_, index) => (
              <Grid item xs={12} sm={12} md={6} lg={4} key={index}>
                <Paper
                  sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    borderRadius: 2,
                  }}
                >
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ width: "100%" }}>
                    <Skeleton variant="text" width="60%" height={25} />
                    <Skeleton variant="text" width="40%" height={20} />
                  </Box>
                </Paper>
              </Grid>
            ))
          : users.map((user) => (
              <Grid item xs={12} sm={12} md={6} lg={4} key={user.id}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: isMobile ? 1.5 : 2,
                    borderRadius: 2,
                    borderLeft: "5px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "light"
                        ? "primary.main"
                        : "secondary.main",
                  }}
                >
                  {/* Avatar y Texto */}
                  <Box
                    display="flex"
                    flexDirection={isMobile ? "column" : "row"}
                    alignItems="center"
                    gap={2}
                    sx={{ width: isMobile ? "100%" : "auto" }}
                  >
                    <Avatar
                      src={user.photoURL}
                      alt={user.name}
                      sx={{ width: 45, height: 45 }}
                    >
                      {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </Avatar>

                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isMobile ? "center" : "flex-start",
                      }}
                    >
                      <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
                        {user.name || "Usuario sin nombre"}
                      </Typography>
                      <Typography variant="body2">{user.email}</Typography>
                    </Box>
                  </Box>

                  {/* Rol */}
                  <Typography
                    variant="body2"
                    sx={{
                      alignSelf: isMobile ? "center" : "auto",
                      bgcolor: "action.hover",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      maxWidth: "120px",
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    {formatearNombreRol(user.role)}
                  </Typography>
                </Paper>
              </Grid>
            ))}
      </Grid>
    </Box>
  );
}
