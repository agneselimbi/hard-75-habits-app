import axiosInstance from "./api";
import Cookies from "js-cookie";

impo;
// Login function
export async function Login(userEmail, userPassword) {
  try {
    const url = `${import.meta.env.VITE_API_URL}/auth/login`;
    const resp = axios.post(
      url,
      {
        email: userEmail,
        password: userPassword,
      },
      { withCredentials: true },
    );
    if (resp.ok) {
      const data = await resp.json();
      console.log("Login successful");
      const userData = data.user;
      return userData;
    } else {
      alert("Invalid credentials");
      return {}
    }
  } catch (error) {
    console.error("Error login in user", error.message);
    window.location.href("login");
    throw new Error("Login error", error.message)
  }
}

// Register function

export async function Register(userEmail, userPassword) {
  try {
    const url = `${import.meta.env.VITE_API_URL}/auth/register`;
    const resp = axios.post(
      url,
      {
        email: userEmail,
        password: userPassword,
      },
      { withCredentials: true },
    );
    if (resp.ok) {
      const data = await resp.json();
      console.log("Signup successful");
      const userData = data.user;
      return userData
    } else {
      alert("Unable to register user");
      return {};
    }
  } catch (error) {
    console.error("Error registering user", error.message);
    window.location.href("register");
    throw new Error("Error registering new user", error.message)
  }
}

// Logout
export async function Logout() {
  window.location.href("login");
}

// get current User
export async function getCurrentUser(userEmail, userPassword) {
  try {
    const token = Cookies.get("token") 
    if (!token) {
      console.error("No user currently logged in");
      window.location.href("login");
    }
    // get user, password from cookie 
    const {user, password} = 
  } catch (error) {}
}
