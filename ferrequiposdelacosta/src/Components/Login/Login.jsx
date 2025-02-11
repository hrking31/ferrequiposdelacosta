import React, { useState } from "react";
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  IconButton,
  Alert,
} from "@mui/material";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { togglePasswordVisibility } from "../../Store/Slices/passwordSlice";
import { useAuth } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [user, setUser] = useState({
    email: "",
    password: "",
  });

  const passwordVisible = useSelector((state) => state.password);
  const dispatch = useDispatch();
  const passwordType = passwordVisible ? "text" : "password";

  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = ({ target: { name, value } }) =>
    setUser({ ...user, [name]: value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await login(user.email, user.password);
      navigate("/admin");
    } catch (error) {
      if (error.code === "auth/wrong-password") {
        setError("Contraseña incorrecta");
      } else if (error.code === "auth/user-not-found") {
        setError("Usuario no registrado");
      }
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 500,
        width: "90%",
        margin: "40px auto",
        padding: "20px",
        border: "2px solid #00008B",
        borderRadius: "5px",
        backgroundColor: "transparent",
      }}
    >
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography
              variant="h6"
              sx={{ marginTop: "30px", color: "#00008B" }}
            >
              Iniciar sesión en mi cuenta
            </Typography>
            {error && (
              <Alert
                severity="error"
                sx={{ marginTop: "10px", color: "#b22222" }}
              >
                {error}
              </Alert>
            )}
          </Grid>
          <Grid item xs={12}>
            <TextField
              type="email"
              name="email"
              label="Dirección de correo electrónico"
              value={user.email}
              onChange={handleChange}
              required
              fullWidth
              InputLabelProps={{ style: { color: "#00008B" } }}
              InputProps={{
                style: { color: "#00008B" },
              }}
              sx={{
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
          <Grid item xs={12}>
            <TextField
              type={passwordType}
              name="password"
              label="Contraseña"
              value={user.password}
              onChange={handleChange}
              required
              fullWidth
              InputLabelProps={{ style: { color: "#00008B" } }}
              InputProps={{
                style: { color: "#00008B" },
                endAdornment: (
                  <IconButton
                    onClick={() => dispatch(togglePasswordVisibility())}
                  >
                    {passwordVisible ? (
                      <FaEyeSlash color="#00008B" />
                    ) : (
                      <FaEye color="#00008B" />
                    )}
                  </IconButton>
                ),
              }}
              sx={{
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
        </Grid>

        <Box sx={{ textAlign: "center", marginTop: "20px" }}>
          <Button
            type="submit"
            variant="contained"
            sx={{
              marginRight: "18px",
              marginBottom: "15px",
              borderRadius: "20px",
              backgroundColor: "#1E90FF",
              color: "#ffffff",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
          >
            ACCESO
          </Button>
        </Box>
      </form>
    </Box>
  );
}
