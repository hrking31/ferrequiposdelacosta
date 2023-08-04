import style from "./RedesButton.module.css";
import { faGithub, faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function RedesButton() {
  return (
    <div className={style.iconos}>
      <a
        href="https://github.com/hrking31"
        target="_blank"
        rel="noopener noreferrer"
        className={style.icon}
      >
        <FontAwesomeIcon className="" icon={faGithub} />
      </a>
      <a
        href="https://www.linkedin.com/in/hernandorey/"
        target="_blank"
        rel="noopener noreferrer"
        className={style.icon}
      >
        <FontAwesomeIcon className="" icon={faLinkedin} />
      </a>
    </div>
  );
}
