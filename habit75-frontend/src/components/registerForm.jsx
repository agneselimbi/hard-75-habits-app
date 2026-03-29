import { useState } from "react";
import { Navigate } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Container,
  InputAdornment,
  IconButton,
  Link,
  Divider,
  Checkbox,
  FormControlLabel,
  useTheme,
  Typography,
} from "@mui/material";

import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Password,
} from "@mui/icons-material";
import BadgeIcon from "@mui/icons-material/Badge";
import { UseAuth } from "../contexts/authContext";
import { UseTheme } from "../contexts/ThemeContext";

const RegisterForm = () => {
  const { theme } = UseTheme();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [redirectToDashboard, setRedirectToDashboard] = useState(false);
  const { register, loading } = UseAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      console.log(formData.username);
      const result = await register(
        formData.email,
        formData.password,
        formData.username,
      );
      if (result.success) {
        setRedirectToDashboard(true);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError("An unexpected error occured");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  if (redirectToDashboard) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          marginBottom: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Header */}
        <Typography
          variant="h3"
          component="h1"
          sx={{
            mb: 1,
            fontWeight: "bold",
            fontFamily: "'Press Start 2P', monospace",
            color: theme.primary,
            fontSize: { xs: "1.5rem", sm: "2rem" },
          }}
        >
          HARD 75
        </Typography>

        <Typography
          variant="subtitle1"
          color={theme.secondary}
          sx={{ mb: 4, textAlign: "center" }}
        >
          Transform your life in 75 days
        </Typography>

        {/* Login Card */}
        <Card
          sx={{
            width: "100%",
            maxWidth: 400,
            borderRadius: 4,
            boxShadow: theme.shadow,
            border: `3px solid ${theme.shadow}`,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography
              component="h2"
              variant="h5"
              align="center"
              sx={{
                mb: 1,
                fontWeight: "bold",
                color: theme.textPrimary,
              }}
            >
              Ready to Commit?
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  border: `2px solid ${theme.error}`,
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="User Name"
                name="username"
                autoComplete="username"
                autoFocus
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              ></TextField>

              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                name="email"
                label="Email Address"
                autoComplete="email"
                onChange={handleChange}
                autoFocus
                value={formData.email}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
              ></TextField>

              <TextField
                margin="normal"
                required
                fullWidth
                id="password"
                name="password"
                label="Password"
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        arial-label="toggle passord visibility"
                        onClick={togglePasswordVisibility}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              ></TextField>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      sx={{
                        color: theme.textSecondary,
                        "&.Mui-checked": {
                          color: theme.textSecondary,
                        },
                        "&.Mui-disabled": {
                          color: theme.textDisabled,
                        },
                      }}
                    />
                  }
                  label="Remember me"
                ></FormControlLabel>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={
                  loading ||
                  !formData.username ||
                  !formData.email ||
                  !formData.password
                }
                sx={{
                  mt: 2,
                  mb: 3,
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: "bold",
                  color: theme.textSecondary,
                  backgroundColor: theme.secondary,
                  borderRadius: 3,
                  boxShadow: theme.shadows.soft,
                  "&:hover": {
                    boxShadow: theme.shadows.playful,
                    transform: "translateY(-2px)",
                  },
                  "&:active": {
                    transform: "translateY(0",
                  },
                  transition: "all 0.2s ease-in-out",
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress
                      size={20}
                      sx={{ mr: 1, color: "white" }}
                    />
                  </>
                ) : (
                  "Registering New User"
                )}
              </Button>

              <Divider sx={{ my: 2 }}>
                <Typography variant="body" color={`${theme.primary}`}>
                  Returning User?
                </Typography>
              </Divider>

              <Button
                fullWidth
                variant="outlined"
                href="/login"
                disabled={loading}
                sx={{
                  py: 1.2,
                  color: theme.textSecondary,
                  borderColor: theme.secondaryLight,
                  borderRadius: 3,
                  borderWidth: 2,
                  fontWeight: "bold",
                  "&:hover": {
                    borderWidth: 2,
                    transform: "translateY(-1px)",
                  },
                }}
              >
                Login
              </Button>

            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default RegisterForm;
