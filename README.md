# KSB Signing Sheet Application

A full-stack web application for managing event attendance through digital signing sheets.

## Features

- User registration and login with signature capture
- Create signing sheets for events with multiple dates
- Guest sign-ups (no account required)
- Admin panel to manage submissions, approve guests, and edit attendance
- PDF export of final attendance sheets
- Audit trail for all edits

## Project Structure

```
signing-sheet-app/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── sheets.js
│   │   │   └── attendances.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── utils/
│   │   │   └── pdf.js
│   │   └── database.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── SigningSheet.jsx
│   │   │   └── AdminPanel.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .gitignore
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ (for native `sqlite` support)
- npm

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the dev server:
```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

## Usage

### For Registered Users

1. **Register** - Create account with email, name, and signature
2. **Login** - Use credentials to log in
3. **Create Sheet** - Admin creates event with title, location, dates, and deadline
4. **Sign Sheet** - Navigate to shared link, select dates attended, draw signature
5. **Edit** - Users can edit dates/redraw signature during submission window
6. **Admin Review** - Approve guests, edit submissions, export PDF

### For Guests

1. Click shared link
2. Choose "Sign as Guest"
3. Enter name, email, select dates, draw signature
4. Admin approves/rejects submission

### Admin Features

- Create events with multiple dates
- View all submissions in one table
- Approve/reject guest submissions
- Edit any attendance record
- Add missing attendees manually
- Export final PDF
- Finalize sheet (locks all edits)

## Database Schema

### Users
- `id` (UUID)
- `email` (unique)
- `name`
- `signature` (base64 image)
- `password_hash`

### Sheets
- `id` (UUID)
- `title`
- `location`
- `dates` (JSON array)
- `admin_id` (FK to users)
- `submission_deadline`
- `status` (open/finalized)

### Attendances
- `id` (UUID)
- `sheet_id` (FK to sheets)
- `user_id` (FK to users, nullable for guests)
- `name`
- `email`
- `signature` (base64 image)
- `dates_attended` (JSON array)
- `is_guest` (boolean)
- `verified_by_admin` (boolean, null for pending)

### Edits
- `id` (UUID)
- `attendance_id` (FK to attendances)
- `admin_id` (FK to users)
- `field_changed`
- `old_value`
- `new_value`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Sheets
- `POST /api/sheets` - Create sheet (admin only)
- `GET /api/sheets/:id` - Get sheet and attendances
- `PATCH /api/sheets/:id/finalize` - Finalize sheet (admin only)
- `GET /api/sheets/:id/export-pdf` - Export PDF

### Attendances
- `POST /api/attendances` - Submit attendance
- `PATCH /api/attendances/:id` - Edit attendance
- `PATCH /api/attendances/:id/verify` - Approve/reject guest (admin only)
- `POST /api/attendances/admin/add` - Manually add attendee (admin only)
- `DELETE /api/attendances/:id` - Delete attendance

## Notes

- Signatures are stored as base64 PNG images
- Database uses SQLite with WAL mode for reliability
- Session tokens expire after 7 days
- PDF export includes all attendances at time of export
- All dates are stored in ISO 8601 format

## Development

To rebuild both frontend and backend:

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Access application at `http://localhost:5173`
