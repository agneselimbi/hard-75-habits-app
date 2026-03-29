import axiosInstance from "./api";
import Cookies from "js-cookie";
// Login function
export async function Login(userEmail, userPassword) {
  try {
    const url = "auth/login";
    const resp = await axiosInstance.post(url, {
      email: userEmail,
      password: userPassword,
    });
    return resp?.data?.user;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data?.error?.message;
      if (status === 400 || status === 401 || status == 404) {
        console.error("Login failed", error.message);
      }
      console.error(`Server error (${status}) :`, message);
      throw new Error("Server error. Please try again.");
    }
    console.error("Network error", error.message);
    throw new Error("Network error. Please check your connection.");
  }
}

// Register function

export async function Register(userEmail, userPassword, userName) {
  try {
    const url = "auth/register";
    const resp = await axiosInstance.post(url, {
      email: userEmail,
      password: userPassword,
      name: userName,
    });
    console.log("register response", resp);
    return resp.data?.user;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message;

      if (status === 400 || status === 409) {
        console.error(`Registration failed:${message}`);
        throw new Error(`Registration failed:${message}`);
      }
      console.error(`Server error (${status}) :`, message);
      throw new Error("Server error. Please try again.");
    }
    console.error("Network error", error.message);
    throw new Error("Network error. Please check your connection.");
  }
}

// Logout
export async function Logout() {
  try {
    const resp = await axiosInstance.post("/aut/logout");
    console.log("User logged out successfully");
  } catch (error) {
    console.error("Error during logout", error.message);
    throw error;
  }
}

// get current User
export async function getCurrentUser() {
  try {
    const resp = await axiosInstance.get("/auth/me");
    console.log("response", resp);
    return resp.data?.user;
  } catch (error) {
    console.log("error", error);

    if (error.response?.status == 401) {
      console.error("User not authenticated");
      return null;
    }
    if (error.response?.status == 404) {
      console.error("No user found");
      return null;
    }
    console.error("Unable to retrieve current user");
    window.location.href("/login");
  }
}
