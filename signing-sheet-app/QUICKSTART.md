# Quick Start Guide

## 1. Install All Dependencies (One Time)

From the project root:
```bash
npm run setup
```

This installs dependencies for root, backend, and frontend.

## 2. Start Development Servers

**Option A: Run both servers together (requires concurrently)**
```bash
npm run dev
```

**Option B: Run servers in separate terminals**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

## 3. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

## 4. Test the App

### Create a Test Account
1. Go to http://localhost:5173/register
2. Enter email, name, and draw a signature
3. Click Register

### Create a Signing Sheet
1. You're now logged in
2. Click "Create Signing Sheet"
3. Fill in:
   - Event Title: "Test Meeting"
   - Location: "Test Location"
   - Dates: Add 2-3 dates
   - Deadline: Set to tomorrow
4. Click "Create Sheet"
5. You'll be redirected to admin panel

### Share & Sign
1. Copy the share link from the sheet details
2. Open in a private/incognito window (or different browser)
3. Click the link
4. Choose to login or sign as guest
5. Fill name, email, select dates, draw signature
6. Submit

### Admin Panel
1. Back in original browser, you see the submission
2. Approve guests if needed
3. Edit dates if needed
4. Click "Export PDF" to download
5. Click "Finalize Sheet" when done

## 5. Next: Fill in Piece by Piece

The scaffold is complete and runnable. Now we fill in:
1. Error handling & validation
2. UI polish
3. Email notifications (optional)
4. Audit log display
5. Session management improvements
6. Production deployment setup

Each feature can be tested immediately after coding.

## Troubleshooting

**Port already in use?**
```bash
# Kill process on port 3000 or 5173
lsof -i :3000
kill -9 <PID>
```

**Database issues?**
```bash
# SQLite database creates automatically, but if corrupted:
rm backend/signing-sheet.db*
# Restart backend server
```

**Dependencies not installing?**
```bash
# Clear node_modules and reinstall
rm -rf node_modules backend/node_modules frontend/node_modules
npm run setup
```

## What's Working Now

✓ User registration with signature capture  
✓ Login with JWT tokens  
✓ Create signing sheets  
✓ Guest signatures  
✓ Admin panel view  
✓ Edit attendance dates  
✓ Approve/reject guests  
✓ PDF export (basic)  
✓ Database schema  
✓ API routes (all endpoints)  

## What Needs Testing/Polish

- Form validation edge cases
- Error messages
- PDF image rendering (signatures in columns)
- Large file uploads
- Browser compatibility
- Mobile responsiveness
- Session timeout handling
- Concurrent edits

Start by running the app and testing the main workflows!
