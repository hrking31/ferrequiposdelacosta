import { Snackbar, Alert } from "@mui/material";
import PropTypes from "prop-types";

export default function AppSnackbar({ snackbar, onClose }) {
  return (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{
        "&.MuiSnackbar-root": {
          position: "fixed",
          top: "50% !important",
          left: "50% !important",
          transform: "translate(-50%, -50%)",
          zIndex: 1300,
          width: { xs: "90%", sm: "auto" },
          maxWidth: { xs: "none", sm: "md" },
        },
      }}
    >
      <Alert
        onClose={onClose}
        severity={snackbar.severity}
        variant="filled"
        sx={{
          width: "100%",
          minWidth: { xs: "100%", sm: "300px" },
          bgcolor: (theme) =>
            theme.palette[snackbar.severity]?.main || theme.palette.primary.main,
          color: (theme) =>
            theme.palette[snackbar.severity]?.contrastText ||
            theme.palette.primary.contrastText,
        }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  );
}

AppSnackbar.propTypes = {
  snackbar: PropTypes.shape({
    open: PropTypes.bool.isRequired,
    severity: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};
