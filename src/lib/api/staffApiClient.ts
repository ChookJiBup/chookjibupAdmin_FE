import axios from "axios";

export const staffApiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
});
