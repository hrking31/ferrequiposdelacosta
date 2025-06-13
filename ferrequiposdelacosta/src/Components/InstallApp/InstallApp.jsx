import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  showInstallApp,
  hideInstallApp,
} from "../../Store/Slices/installAppSlice";
import { ClickAwayListener, Slide, useTheme } from "@mui/material";
import AnimatedBox from "../AnimatedBox/AnimatedBox.jsx";

export default function InstallApp() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const showApp = useSelector((state) => state.installApp.showInstallApp);
  const [hasMounted, setHasMounted] = useState(false);
  const [showLoop, setShowLoop] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!isExpanded && hasMounted) {
      const timeout = setTimeout(() => {
        setShowLoop(true);
      }, 800); 
      return () => clearTimeout(timeout);
    } else {
      setShowLoop(false); 
    }
  }, [isExpanded, hasMounted]);
  

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      dispatch(showInstallApp());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
  }, [dispatch]);

  useEffect(() => {
    if (!isExpanded) return;
    const timer = setTimeout(() => setIsExpanded(false), 6000);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  const handleInstallClick = async () => {
    if (!isExpanded) return setIsExpanded(true);
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    alert(
      outcome === "accepted"
        ? "✅ ¡La aplicación ha sido instalada con éxito!"
        : "❌ La instalación de la aplicación fue cancelada."
    );

    setDeferredPrompt(null);
    dispatch(hideInstallApp());
  };

  if (!showApp) return null;

  return (
    <ClickAwayListener onClickAway={() => isExpanded && setIsExpanded(false)}>
      <Slide direction="left" in={showApp} mountOnEnter unmountOnExit>
        <AnimatedBox
          isExpanded={isExpanded}
          isDarkMode={isDarkMode}
          handleInstall={handleInstallClick}
          handleClose={() => setIsExpanded(false)}
          hasMounted={hasMounted}
          showLoop={showLoop}
        />
      </Slide>
    </ClickAwayListener>
  );
}
