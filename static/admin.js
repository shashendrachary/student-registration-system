function setupTheme() {
  const button = document.getElementById("themeToggle");
  const storedTheme = localStorage.getItem("student-theme") || "light";
  applyTheme(storedTheme);
  button.addEventListener("click", () => applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark"));
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem("student-theme", theme);
  document.getElementById("themeToggle").textContent = theme === "dark" ? "Light" : "Dark";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadAdminStudents() {
  const res = await fetch("/api/admin/students");
  const message = document.getElementById("adminMessage");
  if (!res.ok) {
    message.textContent = "Unable to load student records.";
    message.style.color = "#b91c1c";
    return;
  }

  const students = await res.json();
  const tbody = document.getElementById("adminStudentsBody");
  tbody.innerHTML = "";

  students.forEach((student) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(student.id)}</td>
      <td>${escapeHtml(student.ht_no)}</td>
      <td>${escapeHtml(student.student_name)}</td>
      <td>${escapeHtml(student.program)}</td>
      <td>${escapeHtml(student.official_email)}</td>
      <td>${escapeHtml(student.student_mobile)}</td>
      <td>${escapeHtml(student.status)}</td>
      <td>${escapeHtml(student.updated_at)}</td>
      <td><button class="mini-btn show-more-btn" type="button" data-id="${escapeHtml(student.id)}">Show More</button></td>
    `;
    tbody.appendChild(row);
  });
}

function formatValue(value) {
  if (Array.isArray(value)) {
    if (!value.length) return "-";
    return value.map((item) => Object.entries(item).map(([key, val]) => `${key}: ${val || "-"}`).join(", ")).join(" | ");
  }
  return value === null || value === undefined || value === "" ? "-" : value;
}

async function showStudentDetails(studentId) {
  const res = await fetch(`/api/admin/students/${studentId}`);
  if (!res.ok) return;
  const student = await res.json();
  const content = document.getElementById("studentDetailContent");
  content.innerHTML = "";

  Object.entries(student).forEach(([key, value]) => {
    const item = document.createElement("div");
    item.className = "detail-item";
    item.innerHTML = `<strong>${escapeHtml(key.replaceAll("_", " "))}</strong><span>${escapeHtml(formatValue(value))}</span>`;
    content.appendChild(item);
  });

  const modal = document.getElementById("studentDetailModal");
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function hideStudentDetails() {
  const modal = document.getElementById("studentDetailModal");
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function setupDetailsModal() {
  document.getElementById("adminStudentsBody").addEventListener("click", (event) => {
    if (event.target.classList.contains("show-more-btn")) {
      showStudentDetails(event.target.dataset.id);
    }
  });
  document.getElementById("closeDetailModal").addEventListener("click", hideStudentDetails);
  document.getElementById("studentDetailModal").addEventListener("click", (event) => {
    if (event.target.id === "studentDetailModal") hideStudentDetails();
  });
}

setupTheme();
setupDetailsModal();
loadAdminStudents();
