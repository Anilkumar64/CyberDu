#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

API_URL="${API_URL:-http://127.0.0.1:8080/api}"
SEED_PASSWORD="${SEED_PASSWORD:-password123}"

printf "\033[1;34m[CyberGuard]\033[0m Seeding Indian demo users and students\n"
printf "\033[1;34m[CyberGuard]\033[0m API: %s\n" "$API_URL"

node <<'NODE'
const apiUrl = process.env.API_URL || "http://127.0.0.1:8080/api";
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
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!response.ok) {
    const error = new Error(`${options.method || "GET"} ${path} failed ${response.status}: ${text}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function signupOrLogin(user) {
  try {
    return await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ ...user, password })
    });
  } catch (error) {
    if (error.status !== 409) throw error;
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: user.email, password })
    });
  }
}

async function createSchool(headers, school) {
  const existing = await request("/schools", { headers });
  const found = existing.schools.find((item) => item.schoolCode === school.schoolCode);
  if (found) return found;
  const created = await request("/schools", {
    method: "POST",
    headers,
    body: JSON.stringify(school)
  });
  return created.school;
}

async function createStudent(headers, student) {
  try {
    const created = await request("/students", {
      method: "POST",
      headers,
      body: JSON.stringify(student)
    });
    return created.student;
  } catch (error) {
    if (error.status !== 409) throw error;
    return null;
  }
}

const firstNames = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
  "Ananya", "Diya", "Aadhya", "Avni", "Myra", "Anika", "Ira", "Sara", "Pari", "Riya",
  "Kabir", "Rohan", "Karthik", "Nikhil", "Rahul", "Siddharth", "Manav", "Yash", "Dhruv", "Aryan",
  "Meera", "Kavya", "Ishita", "Saanvi", "Tanvi", "Pooja", "Nisha", "Sneha", "Priya", "Aditi"
];

const lastNames = [
  "Sharma", "Reddy", "Patel", "Singh", "Kumar", "Gupta", "Nair", "Iyer", "Rao", "Mehta",
  "Choudhary", "Verma", "Joshi", "Das", "Mishra", "Bose", "Kapoor", "Naidu", "Menon", "Pillai"
];

const cities = ["Hyderabad", "Bengaluru", "Chennai", "Mumbai", "Delhi"];
const sections = ["A", "B", "C", "D", "E"];

const superadmins = [];
for (let i = 1; i <= 2; i += 1) {
  const result = await signupOrLogin({
    name: `Indian Demo Superadmin ${i}`,
    email: `indian.superadmin${i}@cyberguard.local`,
    role: "superadmin"
  });
  superadmins.push(result.user);
}

const superadminLogin = await request("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "indian.superadmin1@cyberguard.local", password })
});
const superHeaders = { Authorization: `Bearer ${superadminLogin.accessToken}` };

const schools = [];
for (let i = 1; i <= 5; i += 1) {
  schools.push(await createSchool(superHeaders, {
    schoolName: `CyberGuard Indian Public School ${i}`,
    schoolCode: `CGIN${i}`,
    district: `${cities[i - 1]} District`,
    city: cities[i - 1],
    subscription: i <= 2 ? "enterprise" : "pro",
    maxStudents: 500,
    features: ["student-safety", "ml-prediction", "real-time-alerts"]
  }));
}

const admins = [];
for (let i = 1; i <= 5; i += 1) {
  const school = schools[i - 1];
  const result = await signupOrLogin({
    name: `Indian Demo Admin ${i}`,
    email: `indian.admin${i}@cyberguard.local`,
    role: "admin",
    schoolId: school._id
  });
  admins.push(result.user);
}

const teachers = [];
for (let i = 1; i <= 100; i += 1) {
  const name = `${firstNames[(i + 3) % firstNames.length]} ${lastNames[(i + 7) % lastNames.length]}`;
  const school = schools[(i - 1) % schools.length];
  const result = await signupOrLogin({
    name: `Teacher ${name}`,
    email: `indian.teacher${String(i).padStart(3, "0")}@cyberguard.local`,
    role: "teacher",
    schoolId: school._id
  });
  teachers.push(result.user);
}

let studentsCreated = 0;
let studentsExisting = 0;
for (let i = 1; i <= 100; i += 1) {
  const firstName = firstNames[(i * 3) % firstNames.length];
  const lastName = lastNames[(i * 5) % lastNames.length];
  const teacher = teachers[i - 1];
  const school = schools[(i - 1) % schools.length];
  const student = await createStudent(superHeaders, {
    studentId: `IND-STU-${String(i).padStart(3, "0")}`,
    name: `${firstName} ${lastName}`,
    grade: String(6 + (i % 7)),
    section: sections[(i - 1) % sections.length],
    assignedTeacherId: teacher.id,
    schoolId: school._id,
    parentContact: `+91${9000000000 + i}`,
    guardianEmail: `guardian${String(i).padStart(3, "0")}@example.in`
  });
  if (student) studentsCreated += 1;
  else studentsExisting += 1;
}

const allStudents = await request("/students", { headers: superHeaders });
const allSchools = await request("/schools", { headers: superHeaders });

console.log(JSON.stringify({
  ok: true,
  commonPassword: password,
  superadmins: superadmins.length,
  admins: admins.length,
  teachers: teachers.length,
  studentsCreatedNow: studentsCreated,
  studentsAlreadyExisting: studentsExisting,
  studentsVisibleToSuperadmin: allStudents.students.length,
  schoolsVisibleToSuperadmin: allSchools.schools.length,
  sampleLogins: {
    superadmin: "indian.superadmin1@cyberguard.local",
    admin: "indian.admin1@cyberguard.local",
    teacher: "indian.teacher001@cyberguard.local"
  }
}, null, 2));
NODE
