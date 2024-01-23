/*import style from "./Login.module.css";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { togglePasswordVisibility } from "../../Store/Slices/passwordSlice";

export default function Login() {
  const [user, setUser] = useState({
    email: "",
    password: "",
  });

  const passwordVisible = useSelector((state) => state.password);
  const dispatch = useDispatch();
  const passwordType = passwordVisible ? "text" : "password";

  const [error, setError] = useState();
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
      // console.log(error.code);
      if (error.code === "auth/wrong-password") {
        setError("Contraseña incorrecta");
      } else if (error.code === "auth/user-not-found") {
        setError("Usuario no registrado");
      }
    }
  };

  return (
    <div className={style.container}>
      <div className={style.container2}>
        <h2>Welcome!</h2>
      </div>
      {error && <p>{error}</p>}
      <form className={style.form} onSubmit={handleSubmit}>
        <div className={style.field}>
          <label htmlFor="email">Correo</label>
          <input
            type="email"
            name="email"
            placeholder="tucorreo@mail.com"
            onChange={handleChange}
          />
        </div>
        <div className={style.field}>
          <label htmlFor="password">Contraseña</label>
          <div className={style.passwordInputContainer}>
            <input
              type={passwordType}
              name="password"
              id="password"
              placeholder="******"
              onChange={handleChange}
            />
            <button
              type="button"
              className={style.passwordVisibilityButton}
              onClick={() => dispatch(togglePasswordVisibility())}
            >
              {passwordVisible ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>
        <button className={style.buttonAcceso}>Acceso</button>
      </form>
    </div>
  );
}*/

import React, { useState } from "react";
import {
  Box,
  Button,
  Grid,
  Snackbar,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { togglePasswordVisibility } from "../../Store/Slices/passwordSlice";
import { useAuth } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
/*
const Login = () => {
  const dispatch = useDispatch();
  const { login } = useAuth();

  const [user, setUser] = useState({
    email: "",
    password: "",
  });

  const passwordVisible = useSelector((state) => state.password);
  const passwordType = passwordVisible ? "text" : "password";

  const [error, setError] = useState("");
  const [errorOpen, setErrorOpen] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setUser({ ...user, [name]: value });
  };

  const handleTogglePasswordVisibility = () => {
    dispatch(togglePasswordVisibility());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await login(user.email, user.password);
    } catch (error) {
      if (error.code === "auth/wrong-password") {
        setError("Contraseña incorrecta");
      } else if (error.code === "auth/user-not-found") {
        setError("Usuario no registrado");
      }
      setErrorOpen(true);
    }
  };
  */

export default function Login() {
  const [user, setUser] = useState({
    email: "",
    password: "",
  });

  const passwordVisible = useSelector((state) => state.password);
  const dispatch = useDispatch();
  const passwordType = passwordVisible ? "text" : "password";

  const [error, setError] = useState();
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
      // console.log(error.code);
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
        maxWidth: {
          xs: "90%",
          sm: 500,
        },
        margin: "0 auto",
        marginTop: "40px",
        padding: "20px",
        paddingLeft: "25px",
        border: "1px solid #ccc",
        borderRadius: "5px",
      }}
    >
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography
              variant="h6"
              sx={{ marginTop: "30px", color: "#9A98FE" }}
            >
              Iniciar sesión en mi cuenta
            </Typography>
            {error && <p>{error}</p>}
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
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => dispatch(TogglePasswordVisibility())}
                  >
                    {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                  </IconButton>
                ),
              }}
            />
          </Grid>
        </Grid>

        <Box sx={{ textAlign: "center", marginTop: "20px" }}></Box>
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            style={{
              marginRight: "18px",
              marginBottom: "15px",
              borderRadius: "20px",
            }}
            sx={{
              backgroundColor: "#9A98FE",
              "&:hover": {
                backgroundColor: "#c2c1fe",
              },
            }}
          >
            Acceso
          </Button>
        </Grid>
      </form>
    </Box>
  );
}

//export default Login;
