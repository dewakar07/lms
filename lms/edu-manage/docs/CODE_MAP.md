# QUICK REFERENCE GUIDE - Code Map

Fast lookup for file locations, key functions, and code snippets.

---

## PROJECT STRUCTURE AT A GLANCE

```
edu-manage/
├── backend/                    # Node.js + Express API
│   ├── server.js              # Entry point, middleware setup
│   ├── package.json           # Dependencies (express, mongoose, jwt, etc.)
│   ├── mockDb.js              # In-memory MongoDB setup
│   ├── middleware/
│   │   ├── auth.js            # JWT verification, role checking
│   │   └── upload.js          # Multer file upload config
│   ├── models/
│   │   ├── User.js            # User schema with role-specific fields
│   │   ├── Course.js          # Course with materials subdocuments
│   │   ├── Enrollment.js      # Student ↔ Course junction
│   │   ├── Assignment.js      # Assignments for courses
│   │   ├── Submission.js      # Student submissions with grading
│   │   ├── Grade.js           # Final course grades
│   │   ├── Attendance.js      # Daily attendance records
│   │   └── Notification.js    # User notifications
│   ├── routes/
│   │   ├── auth.js            # Login, register, token verification
│   │   ├── users.js           # User CRUD, approval
│   │   ├── courses.js         # Course CRUD, materials
│   │   ├── enrollments.js     # Enroll, drop, view enrollments
│   │   ├── assignments.js     # Assignment CRUD, publish
│   │   ├── submissions.js     # Submit, grade, view submissions
│   │   ├── grades.js          # Final grades, GPA
│   │   ├── attendance.js      # Mark attendance
│   │   ├── notifications.js   # Notification CRUD
│   │   ├── analytics.js       # Dashboard statistics
│   │   └── upload.js          # File upload endpoints
│   └── scripts/
│       └── seedData.js        # Sample data generator
│
└── frontend/                   # React SPA
    ├── package.json           # Dependencies (react, router, axios, etc.)
    ├── public/
    │   └── index.html         # HTML entry point
    └── src/
        ├── index.js           # React entry, wraps app in AuthProvider
        ├── App.js             # Route definitions
        ├── context/
        │   └── AuthContext.js # Global auth state
        ├── components/
        │   ├── Auth/
        │   │   ├── Login.js             # Login form
        │   │   ├── Register.js          # Registration with role selection
        │   │   ├── DocumentUpload.js    # Instructor document upload
        │   │   └── ProtectedRoute.js    # Route guard
        │   ├── Dashboard/
        │   │   ├── StudentDashboard.js     # Student overview
        │   │   ├── InstructorDashboard.js  # Instructor overview
        │   │   └── AdminDashboard.js       # Admin control panel
        │   ├── Courses/
        │   │   ├── CourseList.js          # Browse courses
        │   │   ├── CourseDetail.js        # View course, enroll button
        │   │   ├── CreateCourse.js        # Create new course
        │   │   ├── CourseMaterials.js     # View/download materials
        │   │   └── MaterialUpload.js      # Upload materials
        │   ├── Assignments/
        │   │   ├── AssignmentList.js          # View all assignments
        │   │   ├── AssignmentDetail.js        # View + submit assignment
        │   │   ├── CreateAssignment.js        # Create assignment
        │   │   └── AssignmentSubmissions.js   # Grade submissions
        │   ├── Admin/
        │   │   ├── UserManagement.js          # Manage all users
        │   │   └── InstructorVerification.js  # Approve instructors
        │   ├── Layout/
        │   │   ├── Header.js     # Top navigation
        │   │   ├── Sidebar.js    # Side menu
        │   │   └── Layout.js     # Main layout wrapper
        │   └── Common/
        │       └── LoadingSpinner.js
        └── utils/
            └── dateUtils.js    # Date formatting helpers
```

---

## KEY FILE LOCATIONS

### AUTHENTICATION
- **Login Logic**: `backend/routes/auth.js` → POST /login
- **Registration**: `backend/routes/auth.js` → POST /register
- **Token Verification**: `backend/middleware/auth.js` → auth middleware
- **Password Hashing**: `backend/models/User.js` → pre-save hook
- **Frontend Login**: `frontend/src/components/Auth/Login.js`
- **Auth Context**: `frontend/src/context/AuthContext.js`

### AUTHORIZATION
- **Role Checking**: `backend/middleware/auth.js` → authorize middleware
- **Approval Checking**: `backend/middleware/auth.js` → checkApproval middleware
- **Protected Routes**: `frontend/src/components/Auth/ProtectedRoute.js`

### COURSES
- **Course Schema**: `backend/models/Course.js`
- **Course Routes**: `backend/routes/courses.js`
- **Course List UI**: `frontend/src/components/Courses/CourseList.js`
- **Course Detail UI**: `frontend/src/components/Courses/CourseDetail.js`

### ENROLLMENTS
- **Enrollment Schema**: `backend/models/Enrollment.js`
- **Enrollment Routes**: `backend/routes/enrollments.js`
- **Enroll Button**: `frontend/src/components/Courses/CourseDetail.js`

### ASSIGNMENTS
- **Assignment Schema**: `backend/models/Assignment.js`
- **Submission Schema**: `backend/models/Submission.js`
- **Assignment Routes**: `backend/routes/assignments.js`
- **Submission Routes**: `backend/routes/submissions.js`
- **Assignment List UI**: `frontend/src/components/Assignments/AssignmentList.js`
- **Submit UI**: `frontend/src/components/Assignments/AssignmentDetail.js`
- **Grade UI**: `frontend/src/components/Assignments/AssignmentSubmissions.js`

### FILE UPLOADS
- **Upload Config**: `backend/middleware/upload.js`
- **Upload Routes**: `backend/routes/upload.js`
- **Material Upload**: `frontend/src/components/Courses/MaterialUpload.js`
- **Document Upload**: `frontend/src/components/Auth/DocumentUpload.js`

### DASHBOARDS
- **Student Dashboard**: `frontend/src/components/Dashboard/StudentDashboard.js`
- **Instructor Dashboard**: `frontend/src/components/Dashboard/InstructorDashboard.js`
- **Admin Dashboard**: `frontend/src/components/Dashboard/AdminDashboard.js`
- **Analytics API**: `backend/routes/analytics.js`

---

## KEY CODE SNIPPETS

### GENERATING JWT
**Location**: `backend/routes/auth.js`
```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { _id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

### VERIFYING JWT
**Location**: `backend/middleware/auth.js`
```javascript
const jwt = require('jsonwebtoken');

const token = req.header('Authorization')?.replace('Bearer ', '');
const decoded = jwt.verify(token, process.env.JWT_SECRET);
const user = await User.findById(decoded._id);
req.user = user;
```

### CHECKING ROLE
**Location**: `backend/middleware/auth.js`
```javascript
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};
```

### HASHING PASSWORD
**Location**: `backend/models/User.js`
```javascript
const bcrypt = require('bcryptjs');

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
```

### COMPARING PASSWORD
**Location**: `backend/routes/auth.js`
```javascript
const isMatch = await bcrypt.compare(plainPassword, user.password);
```

### CREATING ENROLLMENT
**Location**: `backend/routes/enrollments.js`
```javascript
const enrollment = await Enrollment.create({
  student: req.user._id,
  course: courseId,
  status: 'enrolled'
});

await Course.findByIdAndUpdate(courseId, {
  $inc: { currentEnrollment: 1 }
});
```

### GRADING SUBMISSION
**Location**: `backend/routes/submissions.js`
```javascript
submission.grade = {
  points: req.body.points,
  percentage: (req.body.points / assignment.totalPoints) * 100,
  feedback: req.body.feedback,
  gradedBy: req.user._id,
  gradedAt: new Date()
};

await submission.save();  // Pre-save hook calculates letterGrade
```

### CALCULATING LETTER GRADE
**Location**: `backend/models/Submission.js` or `backend/models/Grade.js`
```javascript
submissionSchema.pre('save', function(next) {
  if (this.grade && this.grade.percentage) {
    const p = this.grade.percentage;
    if (p >= 93) this.grade.letterGrade = 'A';
    else if (p >= 90) this.grade.letterGrade = 'A-';
    else if (p >= 87) this.grade.letterGrade = 'B+';
    // ... etc
  }
  next();
});
```

### PROTECTED ROUTE (FRONTEND)
**Location**: `frontend/src/components/Auth/ProtectedRoute.js`
```javascript
export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }
  
  return children;
};
```

### MAKING AUTHENTICATED REQUEST (FRONTEND)
**Location**: `frontend/src/context/AuthContext.js`
```javascript
// Set token in axios defaults
useEffect(() => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}, [token]);

// Now any axios call includes the token
await axios.get('/api/courses');  // Automatically includes Authorization header
```

### FILE UPLOAD (FRONTEND)
**Location**: `frontend/src/components/Auth/DocumentUpload.js`
```javascript
const formData = new FormData();
files.forEach(file => {
  formData.append('documents', file);
});

await axios.post('/api/auth/upload-documents', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### MULTER UPLOAD (BACKEND)
**Location**: `backend/middleware/upload.js`
```javascript
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  }
});
```

---

## DATABASE QUERIES

### FIND USER BY EMAIL
```javascript
const user = await User.findOne({ email: 'john@example.com' });
```

### FIND WITH POPULATE
```javascript
const course = await Course.findById(courseId)
  .populate('instructor', 'firstName lastName email');
```

### CREATE WITH VALIDATION
```javascript
const enrollment = await Enrollment.create({
  student: studentId,
  course: courseId
});
// Throws error if validation fails (e.g., duplicate enrollment)
```

### UPDATE WITH INCREMENT
```javascript
await Course.findByIdAndUpdate(courseId, {
  $inc: { currentEnrollment: 1 }
});
```

### AGGREGATION (GRADE DISTRIBUTION)
```javascript
const distribution = await Grade.aggregate([
  { $match: { course: mongoose.Types.ObjectId(courseId) } },
  { $group: {
    _id: '$letterGrade',
    count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
]);
```

### FIND WITH FILTERS
```javascript
const courses = await Course.find({
  isApproved: true,
  isActive: true,
  category: 'Computer Science'
})
.limit(20)
.skip(page * 20)
.sort({ createdAt: -1 });
```

---

## COMMON COMMANDS

### START BACKEND
```bash
cd backend
npm install
npm start
# or
npm run dev  # if you have nodemon
```

### START FRONTEND
```bash
cd frontend
npm install
npm start
```

### SEED DATABASE
```bash
cd backend
node scripts/seedData.js
```

### RUN TESTS (IF IMPLEMENTED)
```bash
npm test
```

### ENVIRONMENT SETUP
Create `.env` file in backend/:
```env
JWT_SECRET=your-super-secret-key-here
MONGODB_URI=mongodb://localhost:27017/edumanage
CLIENT_URL=http://localhost:3000
PORT=5000
```

---

## ROUTE QUICK REFERENCE

### PUBLIC ROUTES (NO AUTH)
```
GET    /api/courses              # Browse courses
GET    /api/courses/:id          # View course details
POST   /api/auth/register        # Create account
POST   /api/auth/login           # Login
```

### AUTHENTICATED ROUTES
```
GET    /api/auth/me              # Get current user
GET    /api/enrollments/student/:id    # My enrollments
GET    /api/assignments          # My assignments
GET    /api/grades/student/:id   # My grades
```

### STUDENT ROUTES
```
POST   /api/enrollments          # Enroll in course
DELETE /api/enrollments/:id      # Drop course
POST   /api/submissions          # Submit assignment
```

### INSTRUCTOR ROUTES
```
POST   /api/courses              # Create course
POST   /api/assignments          # Create assignment
PUT    /api/submissions/:id/grade    # Grade submission
POST   /api/attendance            # Mark attendance
```

### ADMIN ROUTES
```
GET    /api/users                # List all users
PUT    /api/users/:id/approve    # Approve instructor
PUT    /api/courses/:id/approve  # Approve course
```

---

## FRONTEND ROUTES

```
/                             # Home page (public)
/login                        # Login form
/register                     # Registration form

/dashboard/student            # Student dashboard (protected)
/dashboard/instructor         # Instructor dashboard (protected)
/dashboard/admin              # Admin dashboard (protected)

/dashboard/courses            # Browse courses
/dashboard/courses/:id        # View course details
/dashboard/courses/create     # Create course (instructor)

/dashboard/assignments        # View assignments
/dashboard/assignments/:id    # View/submit assignment
/dashboard/assignments/create # Create assignment (instructor)

/dashboard/grades             # View grades (student)
/dashboard/attendance         # View attendance (student)

/profile                      # User profile
/dashboard/notifications      # Notifications
```

---

## QUICK DEBUGGING CHECKLIST

### API RETURNS 401 (UNAUTHORIZED)
- [ ] Check if token is being sent in Authorization header
- [ ] Verify token hasn't expired (7 days)
- [ ] Check JWT_SECRET matches between sign and verify
- [ ] Confirm user still exists in database

### API RETURNS 403 (FORBIDDEN)
- [ ] Check user role matches required role
- [ ] For instructors, verify isApproved is true
- [ ] For resource-based auth, check ownership logic

### ENROLLMENT FAILS
- [ ] Course exists and isApproved is true
- [ ] Course not full (currentEnrollment < maxStudents)
- [ ] No duplicate enrollment (compound unique index)
- [ ] User role is 'student'

### FILE UPLOAD FAILS
- [ ] File type in whitelist
- [ ] File size under limit
- [ ] Correct form field name ('documents', 'materials', etc.)
- [ ] Content-Type: multipart/form-data header set

### CORS ERROR
- [ ] Backend has cors() middleware configured
- [ ] origin set to frontend URL (http://localhost:3000)
- [ ] credentials: true if sending cookies/auth headers

### MONGODB CONNECTION FAILS
- [ ] MongoDB server running (if not using memory server)
- [ ] MONGODB_URI correct in .env
- [ ] Network allows connection to database

---

## USEFUL TERMINAL COMMANDS

### CHECK IF BACKEND IS RUNNING
```bash
curl http://localhost:5000/api/courses
```

### CHECK IF FRONTEND IS RUNNING
```bash
curl http://localhost:3000
```

### VIEW MONGODB DATA (IF USING MONGO SHELL)
```bash
mongo
use edumanage
db.users.find().pretty()
db.courses.find().pretty()
```

### KILL PROCESS ON PORT (IF PORT OCCUPIED)
Windows:
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

Mac/Linux:
```bash
lsof -ti:5000 | xargs kill -9
```

---

## INTERVIEW QUICK PREP

**Before Interview**:
1. Run `npm start` on both backend and frontend
2. Have MongoDB running (or mockDb connected)
3. Seed data with `node scripts/seedData.js`
4. Test login with seeded credentials
5. Have codebase open in VS Code
6. Have docs folder visible

**During Demo**:
1. Show architecture diagram (draw on paper if needed)
2. Walk through one complete workflow (enrollment → submit → grade)
3. Show code for key features (auth, authorization, grading)
4. Explain database relationships
5. Discuss trade-offs and improvements

**Common Files to Show**:
- `backend/server.js` - Clean entry point
- `backend/middleware/auth.js` - Authorization logic
- `backend/models/User.js` - Schema with subdocuments
- `backend/routes/enrollments.js` - Complete CRUD workflow
- `frontend/src/context/AuthContext.js` - State management
- `frontend/src/components/Auth/ProtectedRoute.js` - Route guards

Good luck! You've got this! 🎉
