import json
import re
from datetime import datetime
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = "student-registration-dev-secret"
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "students.json"
USERS_PATH = BASE_DIR / "users.json"

EMAIL_DOMAIN = "@mlritm.ac.in"
PASSWORD_PATTERN = re.compile(r"^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,}$")
DEFAULT_ADMIN_EMAIL = "admin@mlritm.ac.in"
DEFAULT_ADMIN_PASSWORD = "Admin@123"


def read_json(path: Path, fallback):
    if not path.exists():
        return fallback
    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if isinstance(data, dict) and "value" in data:
        return data["value"]
    return data


def write_json(path: Path, data) -> None:
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


def read_students() -> list[dict]:
    return read_json(DB_PATH, [])


def write_students(students: list[dict]) -> None:
    write_json(DB_PATH, students)


def read_users() -> list[dict]:
    return read_json(USERS_PATH, [])


def write_users(users: list[dict]) -> None:
    write_json(USERS_PATH, users)


def init_db() -> None:
    if not DB_PATH.exists():
        write_students([])
    if not USERS_PATH.exists():
        write_users([])

    users = read_users()
    changed = False
    for user in users:
        if "role" not in user:
            user["role"] = "student"
            changed = True

    if not any(user.get("role") == "admin" for user in users):
        users.append(
            {
                "email": DEFAULT_ADMIN_EMAIL,
                "password_hash": generate_password_hash(DEFAULT_ADMIN_PASSWORD),
                "role": "admin",
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
        )
        changed = True

    if changed:
        write_users(users)


def login_required(view):
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        if "user_email" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Login required"}), 401
            return redirect(url_for("auth"))
        return view(*args, **kwargs)

    return wrapped_view


def admin_required(view):
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        if "user_email" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Login required"}), 401
            return redirect(url_for("auth"))
        if session.get("role") != "admin":
            if request.path.startswith("/api/"):
                return jsonify({"error": "Admin access required"}), 403
            return redirect(url_for("index"))
        return view(*args, **kwargs)

    return wrapped_view


def student_required(view):
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        if "user_email" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Login required"}), 401
            return redirect(url_for("auth"))
        if session.get("role") != "student":
            if request.path.startswith("/api/"):
                return jsonify({"error": "Student access required"}), 403
            return redirect(url_for("admin"))
        return view(*args, **kwargs)

    return wrapped_view


def validate_email(email: str) -> bool:
    return email.endswith(EMAIL_DOMAIN) and len(email) > len(EMAIL_DOMAIN)


def validate_password(password: str) -> bool:
    return bool(PASSWORD_PATTERN.match(password))


@app.route("/")
@student_required
def index():
    return render_template("index.html", user_email=session["user_email"])


@app.route("/admin")
@admin_required
def admin():
    return render_template("admin.html", user_email=session["user_email"])


@app.route("/auth")
def auth():
    if session.get("role") == "admin":
        return redirect(url_for("admin"))
    if session.get("role") == "student":
        return redirect(url_for("index"))
    return render_template("auth.html")


@app.route("/api/register", methods=["POST"])
def register():
    payload = request.get_json(force=True)
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    role = str(payload.get("role", "student")).strip().lower()

    if role != "student":
        return jsonify({"error": "Only student accounts can be registered from this page"}), 400
    if not validate_email(email):
        return jsonify({"error": "Only @mlritm.ac.in email addresses are allowed"}), 400
    if not validate_password(password):
        return jsonify({"error": "Password must be 8+ characters with 1 capital letter, 1 number, 1 symbol, and no spaces"}), 400

    users = read_users()
    if any(user["email"] == email for user in users):
        return jsonify({"error": "Account already exists. Please login."}), 409

    users.append(
        {
            "email": email,
            "password_hash": generate_password_hash(password),
            "role": "student",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
    )
    write_users(users)
    return jsonify({"message": "Account created successfully. Please login."}), 201


@app.route("/api/login", methods=["POST"])
def login():
    payload = request.get_json(force=True)
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    role = str(payload.get("role", "student")).strip().lower()

    users = read_users()
    user = next((item for item in users if item["email"] == email and item.get("role", "student") == role), None)
    if not user:
        return jsonify({"error": "User not found. New user? Please register first."}), 404
    if not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid password"}), 401

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    previous_login = user.get("last_login")
    user["last_login"] = now
    write_users(users)

    session["user_email"] = email
    session["role"] = user.get("role", "student")
    session["last_login"] = previous_login or now
    return jsonify({"message": "Logged in successfully", "role": session["role"]})


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth"))


STUDENT_FIELDS = [
    "ht_no", "student_name", "profile_photo", "registration_no", "program", "batch", "semester", "section",
    "official_email", "personal_email", "student_mobile", "alternative_mobile", "dob", "gender", "blood_group",
    "nationality", "religion", "category", "aadhaar_no", "passport_no", "father_name", "mother_name",
    "guardian_name", "father_mobile", "mother_mobile", "guardian_mobile", "parent_email", "parent_income",
    "parent_profession", "family_address", "city", "state", "pincode", "country", "tenth_school", "tenth_board",
    "tenth_year", "tenth_percentage", "intermediate_college", "intermediate_board", "intermediate_year",
    "intermediate_percentage", "entrance_exam", "entrance_rank", "admission_quota", "current_cgpa",
    "arrears_count", "certifications", "co_curricular", "extra_curricular", "sports_level", "documents",
    "medical_conditions", "hostel_required", "transport_required", "is_scholarship", "scholarship_name", "status", "notes",
]


def find_student_for_email(students: list[dict], email: str):
    return next(
        (
            student
            for student in students
            if student.get("user_email") == email or str(student.get("official_email", "")).lower() == email
        ),
        None,
    )


def student_summary(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "ht_no": row.get("ht_no"),
        "student_name": row.get("student_name"),
        "program": row.get("program"),
        "official_email": row.get("official_email"),
        "student_mobile": row.get("student_mobile"),
        "status": row.get("status"),
        "updated_at": row.get("updated_at") or row.get("created_at"),
    }


@app.route("/api/session-info", methods=["GET"])
@login_required
def session_info():
    return jsonify({"email": session["user_email"], "role": session.get("role"), "last_login": session.get("last_login", "-")})


@app.route("/api/students", methods=["POST"])
@student_required
def save_student():
    payload = request.get_json(force=True)

    for field in ["ht_no", "student_name"]:
        if not str(payload.get(field, "")).strip():
            return jsonify({"error": f"{field} is required"}), 400

    students = read_students()
    user_email = session["user_email"]
    existing = find_student_for_email(students, user_email)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    row = {field: payload.get(field) for field in STUDENT_FIELDS}
    row["user_email"] = user_email
    row["updated_at"] = now

    if existing:
        row["id"] = existing["id"]
        row["created_at"] = existing.get("created_at", now)
        existing.update(row)
        student_id = existing["id"]
    else:
        student_id = max([int(student.get("id", 0)) for student in students] or [0]) + 1
        row["id"] = student_id
        row["created_at"] = now
        students.append(row)

    write_students(students)
    return jsonify({"message": "Student profile saved successfully", "id": student_id}), 201


@app.route("/api/students", methods=["GET"])
@student_required
def list_students():
    profile = find_student_for_email(read_students(), session["user_email"])
    return jsonify([student_summary(profile)] if profile else [])


@app.route("/api/profile", methods=["GET"])
@student_required
def get_profile():
    profile = find_student_for_email(read_students(), session["user_email"])
    return jsonify(profile or {"official_email": session["user_email"]})


@app.route("/api/admin/students", methods=["GET"])
@admin_required
def admin_students():
    students = sorted(
        read_students(),
        key=lambda row: row.get("updated_at") or row.get("created_at") or "",
        reverse=True,
    )
    return jsonify([student_summary(row) for row in students])


@app.route("/api/admin/students/<int:student_id>", methods=["GET"])
@admin_required
def admin_student_detail(student_id: int):
    student = next((row for row in read_students() if int(row.get("id", 0)) == student_id), None)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    return jsonify(student)


if __name__ == "__main__":
    init_db()
    app.run(debug=True)

