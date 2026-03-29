import React, { useState } from "react";
import { Navigate } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  InputAdornment,
  IconButton,
  Link,
  Divider,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Password,
} from "@mui/icons-material";

import { UseAuth } from "../contexts/authContext";
import { UseTheme } from "../contexts/ThemeContext";

const LoginForm = () => {
  const { theme } = UseTheme();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(true);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [redirectToDashboard, setRedirectToDashboard] = useState(false);

  const { login, loading } = UseAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const result = await login(formData.email, formData.password);
      console.log("Login result", result);
      if (result.success) {
        console.log("Setting redirect to true");
        setRedirectToDashboard(true);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred");
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
            color: theme.primary,
            fontFamily: "'Press Start 2P', monospace",
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
              Welcome Back!
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
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2,
                  "& .MuiInputLabel-root": {
                    color: theme.textSecondary,
                  },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    "&:hover fieldset": {
                      borderColor: `${theme.primaryLight}`,
                    },
                    " & fieldset": {
                      borderColor: `${theme.textSecondary}`,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.primaryLight, // Focus state
                    },
                  },
                }}
              ></TextField>

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete="current-password"
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
                        aria-label="toggle password visibility"
                        onClick={togglePasswordVisibility}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2,
                  "& .MuiInputLabel-root": {
                    color: `${theme.textSecondary}`,
                  },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    "&:hover fieldset": {
                      borderColor: theme.textSecondary,
                    },
                    " & fieldset": {
                      borderColor: theme.textSecondary,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.primaryLight, // Focus state
                    },
                  },
                }}
              />
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
                />
                <Link
                  href="/forgot-password"
                  variant="body2"
                  sx={{
                    color: `${theme.primaryLight}`,
                    textDecoration: "none",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  Forgot password?
                </Link>
              </Box>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !formData.email || !formData.password}
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
                    Signing In ...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color={`${theme.primary}`}>
                  New to Hard 75?
                </Typography>
              </Divider>

              <Button
                fullWidth
                variant="outlined"
                href="/register"
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
                Create Account
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default LoginForm;
