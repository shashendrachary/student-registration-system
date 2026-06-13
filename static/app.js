const textFields = [
  "ht_no", "student_name", "registration_no", "program", "batch", "semester", "section", "official_email",
  "personal_email", "student_mobile", "alternative_mobile", "dob", "gender", "blood_group", "nationality",
  "religion", "category", "aadhaar_no", "passport_no", "father_name", "mother_name", "guardian_name",
  "father_mobile", "mother_mobile", "guardian_mobile", "parent_email", "parent_income", "parent_profession",
  "family_address", "city", "state", "pincode", "country", "tenth_school", "tenth_board", "tenth_year",
  "tenth_percentage", "intermediate_college", "intermediate_board", "intermediate_year", "intermediate_percentage",
  "entrance_exam", "entrance_rank", "admission_quota", "current_cgpa", "arrears_count", "co_curricular",
  "extra_curricular", "sports_level", "medical_conditions", "scholarship_name", "status", "notes"
];

const checkboxFields = ["hostel_required", "transport_required", "is_scholarship"];
const maxPhotoSizeBytes = 5 * 1024 * 1024;
const maxDocumentSizeBytes = 5 * 1024 * 1024;
let profilePhotoData = "";
let successModalTimer = null;

function setupTheme() {
  const button = document.getElementById("themeToggle");
  if (!button) return;

  const storedTheme = localStorage.getItem("student-theme") || "light";
  applyTheme(storedTheme);

  button.addEventListener("click", () => {
    applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
  });
}

function applyTheme(theme) {
  const button = document.getElementById("themeToggle");
  document.body.dataset.theme = theme;
  localStorage.setItem("student-theme", theme);
  if (button) button.textContent = theme === "dark" ? "Light" : "Dark";
}

function certificationRowTemplate(item = {}) {
  return `
    <div class="repeat-row cert-row">
      <label>Certification Name<input type="text" class="cert-name" value="${escapeAttr(item.name || "")}" /></label>
      <label>Provider<input type="text" class="cert-provider" value="${escapeAttr(item.provider || "")}" /></label>
      <label>Year<input type="number" class="cert-year" value="${escapeAttr(item.year || "")}" /></label>
      <button class="remove-btn remove-cert-btn" type="button">Remove</button>
    </div>
  `;
}

function documentRowTemplate(item = {}) {
  return `
    <div class="repeat-row doc-row" data-doc-data="${escapeAttr(item.file_data || "")}" data-doc-type="${escapeAttr(item.file_type || "")}" data-doc-file-name="${escapeAttr(item.file_name || "")}">
      <label>Document Name<input type="text" class="doc-name" placeholder="TC / Aadhaar / Marksheet" value="${escapeAttr(item.name || "")}" /></label>
      <label>Document Number<input type="text" class="doc-number" placeholder="Optional reference number" value="${escapeAttr(item.number || "")}" /></label>
      <label>Scanned Document<input type="file" class="doc-file" accept=".pdf,image/png,image/jpeg,image/jpg" /></label>
      <button class="remove-btn remove-doc-btn" type="button">Remove</button>
    </div>
  `;
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function addCertificationRow(item = {}) {
  document.getElementById("certificationsContainer").insertAdjacentHTML("beforeend", certificationRowTemplate(item));
}

function addDocumentRow(item = {}) {
  document.getElementById("documentsContainer").insertAdjacentHTML("beforeend", documentRowTemplate(item));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function setupDynamicSections() {
  document.getElementById("addCertificationBtn").addEventListener("click", () => addCertificationRow());
  document.getElementById("addDocumentBtn").addEventListener("click", () => addDocumentRow());

  document.getElementById("certificationsContainer").addEventListener("click", (event) => {
    if (event.target.classList.contains("remove-cert-btn")) event.target.closest(".cert-row").remove();
  });

  document.getElementById("documentsContainer").addEventListener("click", (event) => {
    if (event.target.classList.contains("remove-doc-btn")) event.target.closest(".doc-row").remove();
  });

  document.getElementById("documentsContainer").addEventListener("change", async (event) => {
    if (!event.target.classList.contains("doc-file")) return;

    const input = event.target;
    const row = input.closest(".doc-row");
    const file = input.files && input.files[0];
    if (!file) return;

    if (file.size > maxDocumentSizeBytes) {
      setMessage("Each scanned document must be less than 5 MB.", true);
      input.value = "";
      return;
    }

    try {
      row.dataset.docData = await fileToDataUrl(file);
      row.dataset.docType = file.type || "";
      row.dataset.docFileName = file.name || "";
      setMessage("Scanned document selected.");
    } catch (error) {
      setMessage("Could not read scanned document file.", true);
      input.value = "";
    }
  });
}

function collectCertifications() {
  return Array.from(document.querySelectorAll(".cert-row"))
    .map((row) => ({
      name: row.querySelector(".cert-name").value.trim(),
      provider: row.querySelector(".cert-provider").value.trim(),
      year: row.querySelector(".cert-year").value.trim(),
    }))
    .filter((item) => item.name || item.provider || item.year);
}

function collectDocuments() {
  return Array.from(document.querySelectorAll(".doc-row"))
    .map((row) => ({
      name: row.querySelector(".doc-name").value.trim(),
      number: row.querySelector(".doc-number").value.trim(),
      file_name: row.dataset.docFileName || "",
      file_type: row.dataset.docType || "",
      file_data: row.dataset.docData || "",
    }))
    .filter((item) => item.name || item.number || item.file_data);
}

function collectFormData() {
  const payload = {};
  textFields.forEach((id) => {
    const el = document.getElementById(id);
    payload[id] = el ? el.value.trim() : "";
  });
  checkboxFields.forEach((id) => {
    const el = document.getElementById(id);
    payload[id] = el && el.checked ? 1 : 0;
  });
  payload.profile_photo = profilePhotoData;
  payload.certifications = collectCertifications();
  payload.documents = collectDocuments();
  return payload;
}

function resetPhotoPreview() {
  const preview = document.getElementById("photoPreview");
  preview.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><rect width='100%25' height='100%25' fill='%23d8ecf8'/><text x='50%25' y='54%25' text-anchor='middle' font-size='32' fill='%233a6078' font-family='Trebuchet MS'>Photo</text></svg>";
}

function clearForm() {
  textFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = id === "status" ? "Active" : "";
  });
  checkboxFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  document.getElementById("certificationsContainer").innerHTML = "";
  document.getElementById("documentsContainer").innerHTML = "";
  addCertificationRow();
  addDocumentRow();
  profilePhotoData = "";
  resetPhotoPreview();
  activateTab("basic");
}

function fillForm(profile) {
  textFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el && profile[id] !== undefined && profile[id] !== null) el.value = profile[id];
  });
  checkboxFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = Number(profile[id]) === 1;
  });

  profilePhotoData = profile.profile_photo || "";
  if (profilePhotoData) document.getElementById("photoPreview").src = profilePhotoData;

  document.getElementById("certificationsContainer").innerHTML = "";
  (profile.certifications && profile.certifications.length ? profile.certifications : [{}]).forEach(addCertificationRow);

  document.getElementById("documentsContainer").innerHTML = "";
  (profile.documents && profile.documents.length ? profile.documents : [{}]).forEach(addDocumentRow);
}

function setMessage(text, isError = false) {
  const message = document.getElementById("message");
  message.textContent = text;
  message.style.color = isError ? "#b91c1c" : "#0f766e";
}

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `panel-${tabName}`));
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
}

function setupPhotoUpload() {
  const input = document.getElementById("profile_photo_file");
  const preview = document.getElementById("photoPreview");
  resetPhotoPreview();
  input.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > maxPhotoSizeBytes) {
      setMessage("Photo must be less than 5 MB.", true);
      input.value = "";
      return;
    }
    try {
      profilePhotoData = await fileToDataUrl(file);
      preview.src = profilePhotoData;
      setMessage("Photo selected.");
    } catch (error) {
      setMessage("Could not load photo. Please try another file.", true);
      input.value = "";
    }
  });
}

function showSuccessModal() {
  const modal = document.getElementById("successModal");
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  if (successModalTimer) clearTimeout(successModalTimer);
  successModalTimer = setTimeout(hideSuccessModal, 2000);
}

function hideSuccessModal() {
  const modal = document.getElementById("successModal");
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function setupSuccessModal() {
  const modal = document.getElementById("successModal");
  document.getElementById("closeSuccessModal").addEventListener("click", hideSuccessModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) hideSuccessModal();
  });
}

async function loadSessionInfo() {
  const res = await fetch("/api/session-info");
  if (!res.ok) return;
  const info = await res.json();
  const lastLogin = document.getElementById("lastLoginValue");
  if (lastLogin) lastLogin.textContent = info.last_login || "-";
}

async function loadProfile() {
  const res = await fetch("/api/profile");
  if (!res.ok) return;
  const profile = await res.json();
  fillForm(profile);
}

async function saveStudent() {
  const payload = collectFormData();
  if (!payload.ht_no || !payload.student_name) {
    setMessage("Hall Ticket Number and Student Name are required.", true);
    activateTab("basic");
    return;
  }

  try {
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed to save student profile.", true);
      return;
    }
    setMessage("Student profile saved successfully.");
    showSuccessModal();
    await loadProfile();
    await loadSessionInfo();
  } catch (error) {
    setMessage("Error while saving. Please try again.", true);
  }
}

document.getElementById("saveBtn").addEventListener("click", saveStudent);
setupTheme();
setupTabs();
setupPhotoUpload();
setupDynamicSections();
setupSuccessModal();
loadProfile();
loadSessionInfo();


