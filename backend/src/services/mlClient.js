import axios from "axios";
import { env } from "../config/env.js";

const client = axios.create({
  baseURL: env.mlServiceUrl,
  timeout: 15000
});

export async function predictForStudent({ studentId, text }) {
  const { data } = await client.post("/predict", { studentId, text });
  return data;
}

export async function retrainStudentModel({ studentId, samples }) {
  const { data } = await client.post(`/students/${studentId}/retrain`, { samples });
  return data;
}

export async function bootstrapStudentModel(studentId) {
  const { data } = await client.post(`/students/${studentId}/bootstrap`);
  return data;
}
