import style from "./AdminForms.module.css";
import { Link } from "react-router-dom";
import { useState } from "react";
import { storage } from "../../Components/Firebase/Firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../Context/AuthContext";
import { useSelector, useDispatch } from "react-redux";
import { fetchformData } from "../../Store/Actions/formAction";
import { setFormValues, updateImageUrl } from "../../Store/Slices/formSlice";
import { updateNameImage } from "../../Store/Slices/nameImagenSlice";
import LoadingCircle from "../../Components/LoadingCircle/LoadingCircle";

export default function AdminForms() {
  const { user, logout, loading } = useAuth();
  // console.log(user);

  const formValues = useSelector((state) => state.form.values);
  const imageUrl = useSelector((state) => state.form.values.url);

  const dispatch = useDispatch();

  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    const updatedFormValues = { ...formValues, [name]: value };
    dispatch(setFormValues(updatedFormValues));
  };

  const handlerSubmit = async (event) => {
    event.preventDefault();
    dispatch(fetchformData(formValues));
  };

  const [file, setFile] = useState(null);
  const [nameImage, setNameImage] = useState("");

  async function uploadFile(file) {
    const storageRef = ref(storage, nameImage);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  }

  const handleFileUpload = async () => {
    try {
      const imageUrl = await uploadFile(file);
      dispatch(updateImageUrl(imageUrl));
      dispatch(updateNameImage(nameImage));
      alert(`${nameImage} creado exitosamente`);
    } catch (error) {
      alert(`Error al subir el archivo ¡${nameImage}! intenta de nuevo`);
    }
  };

  function changeHandlerFile(event) {
    setFile(event.target.files[0]);
  }

  function changeHandlerName(event) {
    const newName = event.target.value;
    setNameImage(newName);
  }

  const handlerLogout = async () => {
    await logout();
  };

  if (loading) {
    return <LoadingCircle />;
  }
  return (
    <form onSubmit={handlerSubmit}>
      <h1>Bienvenida {user.email}</h1>
      {/* <h1>Bienbenida {user.displayName}</h1>
      <div>
        <img
          className="profile-picture"
          src="{user.photoUrl}"
          alt="Foto de perfil"
        />
      </div> */}

      <div className={style.previewImageContainer}>
        {file ? (
          <img
            className={style.previewImage}
            src={file ? URL.createObjectURL(file) : ""}
            alt="Vista previa de la imagen"
          />
        ) : (
          <p className={style.placeholderMessage}>Imagen Seleccionada</p>
        )}
      </div>

      <label>Subir Imagen</label>

      <input type="file" name="fotos" onChange={changeHandlerFile}></input>

      <div className={style.previewImageContainer}>
        {imageUrl[0] ? (
          <img
            className={style.previewImage}
            src={imageUrl[0]}
            alt="Vista previa de la imagen"
          />
        ) : (
          <p className={style.placeholderMessage}>Primera Imagen</p>
        )}
      </div>

      <div className={style.previewImageContainer}>
        {imageUrl[1] ? (
          <img
            className={style.previewImage}
            src={imageUrl[1]}
            alt="Vista previa de la imagen"
          />
        ) : (
          <p className={style.placeholderMessage}>Segunda Imagen</p>
        )}
      </div>

      <div className={style.previewImageContainer}>
        {imageUrl[2] ? (
          <img
            className={style.previewImage}
            src={imageUrl[2]}
            alt="Vista previa de la imagen"
          />
        ) : (
          <p className={style.placeholderMessage}>Tercera Imagen</p>
        )}
      </div>

      <input
        type="text"
        name="name"
        onChange={changeHandlerName}
        placeholder="  Nombre de la imagen..."
      />

      <button type="button" onClick={handleFileUpload}>
        Subir Imagenes
      </button>

      <div>
        <input
          type="text"
          name="name"
          onChange={handlerInputChange}
          placeholder="  Nombre del equipo..."
        />
      </div>

      <div>
        <input
          type="text"
          readOnly
          placeholder="  Url primera imagen..."
          value={imageUrl[0] || ""}
        />
      </div>

      <div>
        <input
          type="text"
          readOnly
          placeholder="  Url segunda imagen..."
          value={imageUrl[1] || ""}
        />
      </div>

      <div>
        <input
          type="text"
          readOnly
          placeholder="  Url tercera imagen..."
          value={imageUrl[2] || ""}
        />
      </div>

      <div>
        <input
          type="text"
          name="price"
          onChange={handlerInputChange}
          placeholder="  Precio del equipo..."
        />
      </div>

      <div>
        <textarea
          name="description"
          onChange={handlerInputChange}
          placeholder=" Descriccion del equipo..."
        ></textarea>
      </div>

      <button>Subir Archivos</button>

      <button onClick={handlerLogout}>Cerrar Sesión</button>

      <Link to="/vistacotizacion">
        <button>Cotización</button>
      </Link>
    </form>
  );
}
