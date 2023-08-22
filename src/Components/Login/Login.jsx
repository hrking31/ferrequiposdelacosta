import style from "./Login.module.css";
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
}
