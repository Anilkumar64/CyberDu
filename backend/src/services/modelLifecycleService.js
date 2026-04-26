import { Message, MLModel, Student } from "../models/index.js";
import { bootstrapStudentModel, retrainStudentModel } from "./mlClient.js";

const RETRAIN_AFTER_LABELS = 20;

export async function ensureStudentModel(student) {
  if (student.modelId) {
    const existingModel = await MLModel.findById(student.modelId);
    if (existingModel) return existingModel;
  }

  const bootstrap = await bootstrapStudentModel(student._id.toString());
  const model = await MLModel.create({
    studentId: student._id,
    modelVersion: bootstrap.modelVersion || "v1",
    modelFilePath: bootstrap.modelFilePath,
    status: "ready",
    trainedAt: new Date()
  });

  student.modelId = model._id;
  await student.save();
  return model;
}

export async function maybeRetrainStudentModel({ studentId, io }) {
  const model = await MLModel.findOne({ studentId });
  if (!model || model.newLabelsSinceTraining < RETRAIN_AFTER_LABELS) return model;

  model.status = "training";
  await model.save();
  io?.to(`student:${studentId}`).emit("training-progress", { studentId, progress: 10 });

  const messages = await Message.find({ studentId, manualLabel: { $in: [0, 1] } }).lean();
  const samples = messages.map((message) => ({
    text: message.messageText,
    label: message.manualLabel
  }));

  const result = await retrainStudentModel({ studentId: studentId.toString(), samples });
  model.status = "ready";
  model.modelVersion = result.modelVersion;
  model.accuracy = result.accuracy || 0;
  model.f1Score = result.f1Score || 0;
  model.modelFilePath = result.modelFilePath;
  model.trainingDataCount = samples.length;
  model.trainedAt = new Date();
  model.newLabelsSinceTraining = 0;
  model.versions = [
    {
      modelVersion: model.modelVersion,
      accuracy: model.accuracy,
      f1Score: model.f1Score,
      modelFilePath: model.modelFilePath,
      trainedAt: model.trainedAt
    },
    ...model.versions
  ].slice(0, 3);
  await model.save();

  io?.to(`student:${studentId}`).emit("training-progress", { studentId, progress: 100 });
  return model;
}
