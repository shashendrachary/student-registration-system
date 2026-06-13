# Student Registration System

A Flask-based student registration project for capturing complete student details.

## Features
- Multi-section student form: Basic Info, Academic Info, Family, Certifications, Documents, and Others
- Profile photo upload with preview
- Dynamic `+ Add` rows for certifications and documents
- Scanned document upload support
- Success popup with tick animation after saving
- Persistent local storage in `students.json`
- Saved students table

## Run
1. Install dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```
2. Start the app:
   ```bash
   python app.py
   ```
3. Open:
   ```text
   http://127.0.0.1:5000
   ```

## Project Files
- `app.py`: Flask backend and API routes
- `templates/index.html`: Student registration UI
- `static/style.css`: UI styling
- `static/app.js`: Tabs, dynamic rows, uploads, save flow
- `students.json`: Local student data storage

## Authentication
- Login supports Student and Admin roles.`n- Students can register with @mlritm.ac.in email IDs only.`n- After registration, students must login before opening the main page.`n- Passwords require at least 8 characters, 1 capital letter, 1 number, 1 symbol, and no spaces.`n- Students can create and edit only their own profile.`n- Admin can read all student profiles but cannot edit them.`n- Default admin login: admin@mlritm.ac.in / Admin@123`n- A light/dark theme toggle is available at the top right.

