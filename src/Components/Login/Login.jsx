import { useState } from "react";
import { useAuth } from "../../Context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [user, setUser] = useState({
    email: "",
    password: "",
  });

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
    <div>
      {error && <p>{error}</p>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Correo</label>
        <input
          type="email"
          name="email"
          placeholder="tucorreo@compañia.ltd"
          onChange={handleChange}
        />

        <label htmlFor="password">Contraseña</label>
        <input
          type="password"
          name="password"
          id="password"
          placeholder="******"
          onChange={handleChange}
        />

        <button>Acceso</button>
        <Link to="/home">
          <button>HOME</button>
        </Link>
      </form>
    </div>
  );
}
