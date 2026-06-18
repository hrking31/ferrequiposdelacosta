import {
  Box,
  Typography,
  Avatar,
  Grid,
  Paper,
  Skeleton,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  InputLabel,
  FormControl,
  Select,
  Tooltip,
  TextField,
  MenuItem,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEffect, useState } from "react";
import RolesPermisos from "../RolesPermisos/RolesPermisos";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../Firebase/Firebase";

export default function UsersList() {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const deleteUserCloud = httpsCallable(functions, "deleteUser");

  const showMessage = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

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
      showMessage("Error al cargar la lista de usuarios", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Abrir modal con datos del usuario
  const handleOpenEdit = (user) => {
    setSelectedUser({
      ...user,
    });
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    if (!loading) {
      setOpenModal(false);
      setSelectedUser(null);
    }
  };

  // Manejar cambios en los inputs del modal
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedUser((prev) => ({ ...prev, [name]: value }));
  };

  // Guardar Edición en Firestore
  const handleSaveChanges = async () => {
    const permisos = RolesPermisos[selectedUser.role];

    if (!selectedUser.name.trim()) {
      showMessage("El nombre no puede estar vacío", "error");
      return;
    }

    if (!selectedUser.role) {
      showMessage("Por favor, selecciona un rol", "error");
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, "users", selectedUser.id);
      const updatedData = {
        name: selectedUser.name,
        genero: selectedUser.genero,
        role: selectedUser.role,
        permisos,
      };

      await updateDoc(userRef, updatedData);

      showMessage("Usuario actualizado con éxito", "success");
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      console.error(error);
      showMessage("Error al actualizar el usuario", "error");
    } finally {
      setLoading(false);
    }
  };

  // Elimina Usuario de Auth y Firestore
  const handleDeleteUser = async () => {
    setOpenConfirmDelete(false);
    setLoading(true);
    try {
      // Borrar de Firebase Authentication mediante la Function
      await deleteUserCloud({ email: selectedUser.email });

      showMessage("Usuario eliminado con éxito", "success");
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      console.error(error);
      showMessage(error.message || "Error al eliminar el usuario", "error");
    } finally {
      setLoading(false);
    }
  };

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
              <Grid item xs={12} sm={12} md={6} lg={6} key={index}>
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
              <Grid item xs={12} sm={12} md={6} lg={6} key={user.id}>
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
                        : "secondary.light",
                  }}
                >
                  {/* Avatar, Nombre y Correo */}
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
                      <Typography
                        variant="h5"
                        sx={{ lineHeight: 1.2, fontWeight: "bold" }}
                      >
                        {user.name || "Usuario sin nombre"}
                      </Typography>
                      <Typography variant="body2">{user.email}</Typography>
                    </Box>
                  </Box>

                  {/* Rol y Botón de Edición */}
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    sx={{
                      width: isMobile ? "100%" : "auto",
                      justifyContent: isMobile ? "center" : "flex-end",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        bgcolor: "action.hover",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        textAlign: "center",
                        lineHeight: 1.2,
                      }}
                    >
                      {formatearNombreRol(user.role)}
                    </Typography>

                    {/* Botón Lápiz para Editar */}
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenEdit(user)}
                      size="small"
                      sx={{
                        bgcolor: "action.selected",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              </Grid>
            ))}
      </Grid>

      {/* ================= MODAL EDICIÓN USUARIOS ================= */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            backgroundColor: (theme) =>
              theme.palette.mode === "light" ? "primary.light" : "primary.main",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          Editar Perfil de Usuario
        </DialogTitle>

        <DialogContent>
          {selectedUser && (
            <Box display="flex" flexDirection="column" gap={2.5} pt={1}>
              <TextField
                label="Nombre Completo"
                name="name"
                value={selectedUser.name || ""}
                onChange={handleInputChange}
                fullWidth
                disabled={loading}
              />

              <TextField
                label="Correo Electrónico"
                value={selectedUser.email || ""}
                fullWidth
                disabled // Cambiar el Email altera el ID de Auth
              />

              <FormControl fullWidth>
                <InputLabel id="genero-label">Género</InputLabel>
                <Select
                  labelId="genero-label"
                  label="Género"
                  name="genero"
                  value={selectedUser.genero || ""}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={loading}
                >
                  <MenuItem value="" disabled>
                    Selecciona un Género
                  </MenuItem>

                  <MenuItem value="femenino">
                    <Box component="span">Femenino</Box>
                  </MenuItem>

                  <MenuItem value="masculino">
                    <Box component="span">Masculino</Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="rol-label">Rol del Usuario</InputLabel>
                <Select
                  labelId="rol-label"
                  label="Rol del Usuario"
                  name="role"
                  value={selectedUser.role || ""}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={loading}
                >
                  <MenuItem value="" disabled>
                    Selecciona un Rol
                  </MenuItem>

                  <MenuItem value="administrador">
                    <Tooltip title="Acceso Total" placement="right">
                      <Box component="span">Administrador</Box>
                    </Tooltip>
                  </MenuItem>

                  <MenuItem value="gestorEditor">
                    <Tooltip
                      title="Crear, Edita o Elimina Equipos"
                      placement="right"
                    >
                      <Box component="span">Gestor Editor</Box>
                    </Tooltip>
                  </MenuItem>

                  <MenuItem value="gestorFacturacion">
                    <Tooltip
                      title="Cotizaciones y Cuentas de Cobro"
                      placement="right"
                    >
                      <Box component="span">Gestor Facturación</Box>
                    </Tooltip>
                  </MenuItem>

                  <MenuItem value="gestorIntegral">
                    <Tooltip title="Editor y Facturación" placement="right">
                      <Box component="span">Gestor Integral</Box>
                    </Tooltip>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>

        {/* Botón de Eliminar, Cancelar y Guardar */}
        <DialogActions
          sx={{
            p: 2.5,
            gap: 1,
            flexDirection: { xs: "column", sm: "row" },
            "& > :not(style)": {
              margin: "0px !important",
            },
            // border: "2px solid red",
          }}
        >
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setOpenConfirmDelete(true)}
            disabled={loading}
          >
            Eliminar Usuario
          </Button>

          <Button
            onClick={handleCloseModal}
            variant="danger"
            size="medium"
            fullWidth={isMobile}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Button
            onClick={handleSaveChanges}
            variant="success"
            size="medium"
            fullWidth={isMobile}
            disabled={loading}
            startIcon={
              loading && <CircularProgress size={16} color="inherit" />
            }
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================= CONFIRMACIÓN DE ELIMINACIÓN ================= */}
      <Dialog
        open={openConfirmDelete}
        onClose={() => setOpenConfirmDelete(false)}
        sx={{ zIndex: 1400 }}
        disableEnforceFocus
        PaperProps={{
          sx: {
            backgroundColor: (theme) =>
              theme.palette.mode === "light" ? "primary.light" : "primary.main",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            bgcolor: "error.main",
            color: "error.contrastText",
          }}
        >
          ⚠️ Alerta de Confirmación
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ mt: 2 }}>
            ¿Seguro que quieres eliminar a <strong>{selectedUser?.name}</strong>{" "}
            ({selectedUser?.email})? Esta acción es irreversible.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            p: 2.5,
            gap: 1.5,
            flexDirection: { xs: "column", sm: "row" },
            "& > :not(style)": {
              margin: "0px !important",
            },
          }}
        >
          <Button
            onClick={handleDeleteUser}
            variant="success"
            size="medium"
            fullWidth={isMobile}
          >
            Eliminar
          </Button>

          <Button
            onClick={() => setOpenConfirmDelete(false)}
            variant="danger"
            size="medium"
            fullWidth={isMobile}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================= SNACKBAR NOTIFICACIONES ================= */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
