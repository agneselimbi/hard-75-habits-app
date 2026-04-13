import {
  Box,
  AppBar,
  Toolbar,
  Drawer,
  Typography,
  Menu,
  MenuItem,
  Divider,
  Container,
  Avatar,
  Icon,
  IconButton,
  Tooltip,
  ListItem,
  ListItemIcon,
  ListItemText,
  List,
  ListItemButton,
  useMediaQuery,
  useTheme as useMuiTheme,
  Chip,
} from "@mui/material";
import {
  Settings,
  Logout,
  Today,
  Dashboard as DashboardIcon,
  TrendingUp,
  History,
  Menu as MenuIcon,
  AccountCircle,
  Close,
} from "@mui/icons-material";

import { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { UseTheme } from "../contexts/ThemeContext";
import { UseAuth } from "../contexts/AuthContext";

function stringToColor(string) {
  let hash = 0;
  let i;

  for (i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

function stringAvatar(name) {
  return {
    sx: {
      bgcolor: stringToColor(name),
      border: `2px solid white`,
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    },
    children: `${name.split(" ")[0][0]}`,
  };
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  const navItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Today", icon: <Today />, path: "/checkin" },
    { text: "Progress", icon: <TrendingUp />, path: "/progress" },
    { text: "History", icon: <History />, path: "/history" },
  ];

  const [mobileOpen, setMobileOpen] = useState(false);

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };
  const handleMenuClick = (evt) => setAnchorEl(evt.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    handleMenuClose();
    logout();
    navigate("/login");
  };

  const { theme } = UseTheme();
  const logout = () => {
    console.log("Logout function not implemented yet");
  };
  // const { getCurrentUser } = UseAuth();
  const currentUser = { name: "Agnes", id: 1, email: "agnes@hard75.com" };
  // const currentUser = getCurrentUser();

  // Drawer content component
  const DrawerContent = () => {
    return (
      <Box
        sx={{
          width: 240,
          height: "100%",
          backgroundColor: theme.surface,
          borderRight: `3px solid ${theme.border}`,
        }}
      >
        {/* Drawer Header */}
        <Box
          sx={{
            display: "flex",
            backgroundColor: "inherit",
            justifyContent: "space-between",
            alignItems: "center",
            color: theme.surface,
          }}
        >
          {isMobile && (
            <IconButton
              onClick={handleDrawerToggle}
              sx={{
                color: theme.primary,
                position: "absolute",
                top: 8,
                right: 8,
              }}
            >
              <Close />
            </IconButton>
          )}
        </Box>

        {/* User Information */}
        <Box
          sx={{
            p: 2,
            borderBottom: `2px solid ${theme.divider}`,
            backgroundColor: theme.background,
          }}
        >
          <Box
            sx={{
              mt: 2,
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Avatar {...stringAvatar(currentUser?.name || "User")} />
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  color: theme.textSecondary,
                  fontWeight: "bold",
                  fontFamily: theme.fonts.body,
                }}
              >
                {currentUser?.name || "Loading..."}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: theme.textSecondary,
                  fontFamily: theme.fonts.body,
                  pt: 0,
                }}
              >
                Day 42 of 75
              </Typography>
            </Box>
          </Box>

          <Chip
            variant="filled"
            label="Active Challenge"
            aria-label="Active Challenge"
            sx={{
              backgroundColor: theme.success,
              width: "100%",
              color: theme.surface,
              fontWeight: "bold",
            }}
          ></Chip>
        </Box>
        {/* Navigation Items */}
        <List sx={{ mb: 8 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5, px: 2 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: theme.borderRadius.medium,
                    backgroundColor: isActive ? theme.primary : "transparent",
                    color: isActive ? theme.surface : theme.primary,
                    minWidth: 40,
                    fontFamily: theme.fonts.body,
                    "&:hover": {
                      backgroundColor: isActive
                        ? theme.primaryDark
                        : theme.secondary + "20",
                      transform: "translateX(4px)",
                    },
                    transition: "all 0.2s ease",
                    border: `2px solid ${isActive ? theme.primaryDark : "transparent"}`,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? theme.surface : theme.primary,
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    slotProps={{
                      primary: {
                        variant: "h6",
                        color: "theme.textSecondary",
                        fontSize: "1rem",
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    );
  };
  return (
    <>
      <Box>
        <AppBar
          component="nav"
          position="fixed"
          sx={{
            backgroundColor: theme.primaryDark,
            boxShadow: theme.shadows.playful,
            zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                ml: 2,
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                color: theme.textPrimary,
                zIndex: 100,
              }}
            >
              <IconButton
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { sm: "block", md: "none" } }}
              >
                <MenuIcon />
              </IconButton>
              <Typography
                variant="h4"
                component="h4"
                sx={{
                  flexGrow: 1,
                  fontFamily: theme.fonts.heading,
                  color: "#FFFFFF",
                  textTransform: "uppercase",
                  fontSize: { xs: "1.25rem", md: "1.75rem" },
                }}
              >
                HARD 75 Challenge
              </Typography>
              <Box
                sx={{
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <Tooltip title="Account settings">
                  <IconButton onClick={handleMenuClick} size="small">
                    <Avatar
                      {...stringAvatar(currentUser.name)}
                      sx={{
                        ...stringAvatar(currentUser.name).sx,
                        width: 32,
                        height: 32,
                      }}
                    />
                  </IconButton>
                </Tooltip>
              </Box>

              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={open}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                slotProps={{
                  paper: {
                    elevation: 0,
                    sx: {
                      overflow: "visible",
                      filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                      mt: 1.5,
                      "& .MuiAvatar-root": {
                        width: 32,
                        height: 32,
                        ml: -0.5,
                        mr: 1,
                      },
                      "&::before": {
                        content: '""',
                        display: "block",
                        position: "absolute",
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: "background.paper",
                        transform: "translateY(-50%) rotate(45deg)",
                        zIndex: 0,
                      },
                    },
                  },
                }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              >
                <MenuItem onClick={() => navigate("/profile")}>
                  <Avatar
                    sx={{
                      backgroundColor: theme.primary,
                      color: theme.surface,
                      height: 32,
                      width: 32,
                    }}
                  />
                  Profile
                </MenuItem>
                <MenuItem onClose={() => navigate("/settings")}>
                  <Settings
                    sx={{
                      color: theme.primary,
                      width: 32,
                      height: 32,
                    }}
                  />
                  Settings
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <Logout
                    sx={{
                      color: theme.primary + "90",
                      mr: 2,
                    }}
                  />
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        <nav>
          <Drawer
            anchor="left"
            open={isMobile ? mobileOpen : true}
            variant="temporary"
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              backgroundColor: theme.surface,
              width: 240,
              "& .MuiDrawer-paper": {
                width: 240,
                top: "64px",
                height: "calc(100vh - 64px)",
                zIndex: 1,
              },
            }}
          >
            <DrawerContent />
          </Drawer>
        </nav>

        <Box
          component="main"
          sx={{
            marginTop: "64px",
            marginLeft: { sm: 0, md: "240px" }, // Drawer width on desktop only
            padding: 3, // Internal spacing (24px)
            minHeight: "calc(100vh - 64px)", // Full height minus AppBar
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </>
  );
}
