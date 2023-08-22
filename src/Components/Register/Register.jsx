// import { useState } from "react";
// import { useAuth } from "../../Context/AuthContext";
// import { useNavigate } from "react-router-dom";

// export default function Register() {
//   const [user, setUser] = useState({
//     email: "",
//     password: "",
//   });

//   const [error, setError] = useState();
//   const { signup } = useAuth();
//   const navigate = useNavigate();

//   const handleChange = ({ target: { name, value } }) =>
//     setUser({ ...user, [name]: value });

//   const handleSubmit = async (event) => {
//     event.preventDefault();
//     setError("");
//     try {
//       await signup(user.email, user.password);
//       navigate("/admin");
//     } catch (error) {
//       // console.log(error.code);
//       if (error.code === "auth/invalid-email") {
//         setError("Correo invalido");
//       } else if (error.code === "auth/weak-password") {
//         setError("Contraseña debe tener mas de 6 digitos");
//       } else if (error.code === "auth/email-already-in-use") {
//         setError("El correo ya existe");
//       }
//     }
//   };

//   return (
//     <div>
//       {error && <p>{error}</p>}
//       <form onSubmit={handleSubmit}>
//         <label htmlFor="email">Correo</label>
//         <input
//           type="email"
//           name="email"
//           placeholder="tucorreo@compañia.ltd"
//           onChange={handleChange}
//         />

//         <label htmlFor="password">Contraseña</label>
//         <input
//           type="password"
//           name="password"
//           id="password"
//           placeholder="******"
//           onChange={handleChange}
//         />

//         <button>Registrar</button>
//       </form>
//     </div>
//   );
// }
