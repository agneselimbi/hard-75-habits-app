import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Add interceptors
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  function onFulfilled(response) {
    // for any status code that lies withing range of 200
    return response;
  },
  function onRejected(error) {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href("/login");
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
