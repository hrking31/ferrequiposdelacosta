import { useState } from "react";
import { storage } from "../../Components/Firebase/Firebase";
import { ref, uploadBytes } from "firebase/storage";
import { useAuth } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import LoadingCircle from "../../Components/LoadingCircle/LoadingCircle";

export default function Admin() {
  const { user, logout, loading } = useAuth();
  // console.log(user);
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  let equiposName = "";

  async function uploadFile(file) {
    const storageRef = ref(storage, equiposName);
    return await uploadBytes(storageRef, file);
  }

  const handlerSubmit = async (event) => {
    event.preventDefault();
    try {
      // throw new Error("fallo al subir");
      await uploadFile(file);
      alert(`${equiposName} creado exitosamente`);
    } catch (error) {
      alert(`Error al subir el archivo ¡${equiposName}! intenta de nuevo`);
    }
  };

  function changeHandlerName(event) {
    equiposName = event.target.value;
  }

  const handlerLogout = async () => {
    await logout();
  };

  if (loading) {
    return <LoadingCircle />;
  }
  return (
    <form onSubmit={handlerSubmit}>
      <h1>Bienbenida {user.email}</h1>
      {/* <h1>Bienbenida {user.displayName}</h1>
      <div>
        <img
          className="profile-picture"
          src="{user.photoUrl}"
          alt="Foto de perfil"
        />
      </div> */}
      <label>Subir Imagenes</label>
      <input
        type="file"
        name="fotos"
        id=""
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <input
        type="text"
        name="name"
        onChange={changeHandlerName}
        placeholder="  Nombre del equipo..."
      />

      <button>SUBIR ARCHIVOS</button>
      <button onClick={handlerLogout}>Cerrar sesión</button>
    </form>
  );
}
