import axiosInstance from "./api";

// Login function
export async function Login() {
  try {
    const url = `${import.meta.env.VITE_API_URL}/auth/login`;
    const resp = axios.post(url, {
      email: userEmail,
      password: userPassword,
    });
    if (resp.ok) {
      const data = await resp.json();
      console.log("Login successful");
      localStorage.setItem("token", data.token);
    } else {
      alert("Invalid credentials");
    }
  } catch (error) {
    console.error("Error login in user", error.message);
  }
}

// Register function

export async function Register() {
  try {
    const url = `${import.meta.env.VITE_API_URL}/auth`

  } catch (error) {}
}

// Logout

// get current User
