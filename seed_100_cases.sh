#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

API_URL="${API_URL:-http://127.0.0.1:8080/api}"
SEED_EMAIL="${SEED_EMAIL:-test100@cyberguard.local}"
SEED_PASSWORD="${SEED_PASSWORD:-password123}"

printf "\033[1;34m[CyberGuard]\033[0m Seeding 100 website-visible test cases\n"
printf "\033[1;34m[CyberGuard]\033[0m API: %s\n" "$API_URL"

node <<'NODE'
const apiUrl = process.env.API_URL || "http://127.0.0.1:8080/api";
const email = process.env.SEED_EMAIL || "test100@cyberguard.local";
const password = process.env.SEED_PASSWORD || "password123";

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed ${response.status}: ${text}`);
  }
  return data;
}

async function auth() {
  try {
    return await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "100 Case Test Teacher",
        email,
        password,
        role: "teacher"
      })
    });
  } catch (error) {
    if (!String(error.message).includes("409")) throw error;
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  }
}

const safeMessages = [
  "Thank you for helping me with homework today",
  "Great job on the science project presentation",
  "I hope you have a good day at school",
  "That drawing looks really creative and bright",
  "Can we work together on the math assignment",
  "Congratulations on winning the debate round",
  "Your idea for the club poster is excellent",
  "I appreciate you sharing your notes with me",
  "Let us meet after class to finish the project",
  "Happy birthday hope your day is wonderful"
];

const bullyingMessages = [
  "You are stupid and nobody likes you",
  "Everyone hates you because you are ugly",
  "Go away loser you are worthless",
  "You are pathetic and useless in class",
  "Nobody wants you here you dumb idiot",
  "You are trash and should stop talking",
  "I hate you and your horrible face",
  "You are disgusting and everyone knows it",
  "Stop joining us you freak and loser",
  "You are awful terrible and worthless"
];

const mixedMessages = [
  "I am angry about the group work but we can fix it",
  "That comment was rude please do not say it again",
  "I do not like what happened in class today",
  "This chat is getting mean and uncomfortable",
  "Please stop making jokes about my photo",
  "I felt hurt when everyone laughed at me",
  "The game argument went too far yesterday",
  "I need help because the messages are stressful",
  "Someone keeps calling me names online",
  "The class group chat made me upset today"
];

function messageFor(index) {
  const bucket = index % 5;
  if (bucket === 0 || bucket === 3) return bullyingMessages[index % bullyingMessages.length];
  if (bucket === 1) return mixedMessages[index % mixedMessages.length];
  return safeMessages[index % safeMessages.length];
}

const authResult = await auth();
const headers = { Authorization: `Bearer ${authResult.accessToken}` };

const existingStudents = (await request("/students", { headers })).students;
const byStudentId = new Map(existingStudents.map((student) => [student.studentId, student]));
const students = [];

for (let i = 1; i <= 10; i += 1) {
  const studentId = `CG-SEED-${String(i).padStart(3, "0")}`;
  if (byStudentId.has(studentId)) {
    students.push(byStudentId.get(studentId));
    continue;
  }

  const { student } = await request("/students", {
    method: "POST",
    headers,
    body: JSON.stringify({
      studentId,
      name: `Seed Student ${i}`,
      grade: String(6 + (i % 5)),
      section: ["A", "B", "C", "D", "E"][i % 5]
    })
  });
  students.push(student);
}

let created = 0;
const severityCounts = {};

for (let i = 0; i < 100; i += 1) {
  const student = students[i % students.length];
  const { message } = await request("/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      studentId: student._id,
      messageText: `[Seed Case ${String(i + 1).padStart(3, "0")}] ${messageFor(i)}`,
      platform: ["chat", "sms", "email"][i % 3]
    })
  });
  created += 1;
  const severity = message.prediction?.severity || "UNKNOWN";
  severityCounts[severity] = (severityCounts[severity] || 0) + 1;
}

const messages = (await request("/messages", { headers })).messages;

console.log(JSON.stringify({
  ok: true,
  loginEmail: email,
  loginPassword: password,
  studentsAvailable: students.length,
  casesCreatedNow: created,
  messagesVisibleInDashboard: messages.length,
  severityCounts
}, null, 2));
NODE
