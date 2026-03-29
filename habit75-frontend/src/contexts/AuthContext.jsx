import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import {
  getCurrentUser,
  Login,
  Register,
  Logout,
} from "../services/authServices";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState();
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.log("No authenticated user found");
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    initializeAuth();
  }, []); // Empty dependency array - initializeAuth will be called only once at mount

  const isAuthenticated = useCallback(() => {
    return user !== null && user !== undefined;
  }, [user]); // callback ensures we render isAuthenticated only when user changes

  const login = async (email, password) => {
    try {
      setLoading(true);
      await Login(email, password);
      const currentUser = await getCurrentUser();
      console.log("currentUser", currentUser);
      setUser(currentUser);
      return { success: true, user: currentUser };
    } catch (error) {
      console.error("Login failed", error);
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, name) => {
    try {
      setLoading(true);
      const response = await Register(email, password, name);
      setUser(response);
      return { success: true, user: response };
    } catch (error) {
      console.error("Registration failed", error);
      return {
        success: false,
        error: error.response?.data?.message || "Registration failed",
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      await Logout();
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: "Logout failed" };
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initialized,
        isAuthenticated,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const UseAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthProvider;
