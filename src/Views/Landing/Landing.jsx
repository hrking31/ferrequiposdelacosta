import style from "./Landing.module.css";
import DarkMode from "../../Components/DarkMode/DarkMode";
import Ferrequipos from "../../assets/Ferrequipos.jpeg";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div>
      <DarkMode />
      <img src={Ferrequipos} alt="ferrequipos" className={style.icon} />
      <h1>Ferrequipós de la Costa</h1>

      <p className="read-the-docs">
        "¡Bienvenido/a a nuestra página web! Nos complace que nos estés
        visitando. Actualmente estamos en proceso de construcción y mejorando
        nuestra página para brindarte la mejor experiencia posible. Estamos
        trabajando arduamente para agregar contenido, funcionalidades y diseños
        emocionantes. Durante esta fase de construcción, es posible que
        encuentres secciones incompletas o funciones que aún no estén
        disponibles. Sin embargo, te aseguramos que estamos comprometidos en
        terminar pronto y ofrecerte una plataforma completa y satisfactoria.
        Apreciamos tu paciencia y te invitamos a volver más tarde para disfrutar
        de todas las novedades que estamos preparando. Mientras tanto, si tienes
        alguna pregunta o necesitas información adicional, no dudes en
        contactarnos a través de nuestro formulario de contacto. Gracias por tu
        comprensión y por ser parte de nuestra comunidad en crecimiento. Equipo
        de Ferrequipos de la Costa"
      </p>
      <Link to="/home">
        <button>Ingresar</button>
      </Link>
    </div>
  );
}
