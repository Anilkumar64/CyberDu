import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8080/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (error.response?.status !== 401 || !refreshToken || error.config.__retried) {
      throw error;
    }
    error.config.__retried = true;
    const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    error.config.headers.Authorization = `Bearer ${data.accessToken}`;
    return api(error.config);
  }
);
