import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api",
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("vs_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("vs_token");
      localStorage.removeItem("vs_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
