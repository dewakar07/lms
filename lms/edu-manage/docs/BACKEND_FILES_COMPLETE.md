# BACKEND FILES - COMPLETE EXPLANATION

Every file explained with purpose, functionality, and interview talking points.

---

## 📁 ROOT LEVEL FILES

### `server.js`
**Location**: `/backend/server.js`

**PRIMARY RESPONSIBILITY**:
Entry point for the entire backend application. Initializes Express server, configures middleware, mounts routes, connects to database, and starts HTTP server.

**WHAT IT DOES**:
1. **Imports Dependencies**: Loads Express, Mongoose, middleware, and route modules
2. **Configures Middleware**: Sets up CORS, body parsing, static file serving
3. **Mounts Routes**: Connects URL paths to route handlers
4. **Database Connection**: Connects to MongoDB (uses Memory Server for development)
5. **Error Handling**: Global error handler and 404 handler
6. **Starts Server**: Listens on port 5000 (or ENV variable)

**KEY CODE SECTIONS**:

```javascript
// Middleware Pipeline
app.use(cors({ origin: CLIENT_URL, credentials: true }));  // CORS protection
app.use(express.json({ limit: '10mb' }));                   // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse form data
app.use('/uploads', express.static('uploads'));             // Serve uploaded files

// Route Mounting - Order matters!
app.use('/api/auth', authRoutes);           // Authentication routes
app.use('/api/users', userRoutes);          // User management
app.use('/api/courses', courseRoutes);      // Course operations
// ... 9 more route groups
```

**WHY THIS APPROACH**:
- **Separation of Concerns**: Routes, models, middleware in separate files
- **Middleware Order Matters**: CORS before routes, error handler at end
- **Static File Serving**: `/uploads` accessible via HTTP for materials/documents
- **Environment-Based Config**: Different behavior for dev/production

**MONGODB MEMORY SERVER LOGIC**:
```javascript
if (process.env.NODE_ENV === 'development') {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
} else {
  await mongoose.connect(process.env.MONGODB_URI);
}
```
**Why**: Developers don't need MongoDB installed. In prod, uses real MongoDB Atlas.

**ERROR HANDLING**:
```javascript
// Global error handler (catches all unhandled errors)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler (must be last)
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});
```

**HEALTH CHECK ENDPOINT**:
```javascript
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});
```
**Purpose**: Load balancers/monitoring tools can ping this to check server status.

**INTERVIEW TALKING POINTS**:
- "Server.js is the entry point where I configure the entire Express application"
- "I use middleware in a specific order: CORS first, then parsing, then auth, then routes"
- "For development, I use MongoDB Memory Server so the team doesn't need MongoDB installed"
- "Global error handler catches any unhandled errors and prevents server crashes"

---

### `package.json`
**Location**: `/backend/package.json`

**RESPONSIBILITY**: Defines project metadata, dependencies, and npm scripts

**KEY DEPENDENCIES**:
- **Production**:
  - `express`: Web framework
  - `mongoose`: MongoDB ODM
  - `jsonwebtoken`: JWT authentication
  - `bcryptjs`: Password hashing
  - `multer`: File uploads
  - `express-validator`: Input validation
  - `cors`: Cross-origin requests
  - `dotenv`: Environment variables
  - `mongodb-memory-server`: In-memory DB for development

- **Development**:
  - `nodemon`: Auto-restart server on file changes

**SCRIPTS**:
```json
{
  "start": "node server.js",              // Production start
  "dev": "nodemon server.js",             // Development with auto-reload
  "create-admin": "node scripts/seedData.js"  // Seed admin user
}
```

**ENGINE REQUIREMENT**:
```json
"engines": { "node": ">=20.0.0" }
```
**Why Node 20?**: LTS version with latest security patches and features.

**INTERVIEW POINT**: "I specify exact dependency versions for reproducible builds and use `engines` field to ensure team uses compatible Node version."

---

## 📁 middleware/

### `auth.js`
**Location**: `/backend/middleware/auth.js`

**RESPONSIBILITY**: Authentication and authorization middleware for protected routes

**EXPORTS 3 MIDDLEWARE FUNCTIONS**:

#### 1. `auth` Middleware
**What It Does**: Verifies JWT token and loads user

**REQUEST FLOW**:
```
1. Extract token from Authorization header: "Bearer <TOKEN>"
2. Verify token signature using JWT_SECRET
3. Decode payload to get userId
4. Query database for user by userId
5. Check if user exists
6. Check if user.isActive === true
7. Attach user object to req.user
8. Call next() to proceed to next middleware
```

**CODE WALKTHROUGH**:
```javascript
const auth = async (req, res, next) => {
  try {
    // Extract token: "Bearer abc123" → "abc123"
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify and decode
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { userId: "507f1f77bcf86cd799439011", iat: ..., exp: ... }
    
    // Load user (exclude password field)
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    // Check account status
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    // Attach to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
```

**WHY THIS APPROACH**:
- **Bearer Token Standard**: Follows OAuth 2.0 convention
- **Database Query**: Ensures user still exists (handles deleted users)
- **isActive Check**: Allows admins to deactivate accounts without deleting
- **Error Handling**: All JWT errors (expired, invalid, malformed) caught

**WHAT IF TOKEN IS EXPIRED?**
- `jwt.verify()` throws error
- Caught by try-catch
- Returns 401 "Token is not valid"
- Frontend should redirect to login

#### 2. `authorize(...roles)` Middleware
**What It Does**: Checks if user has required role

**CODE**:
```javascript
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }
    
    next();
  };
};
```

**USAGE EXAMPLE**:
```javascript
// Only instructors and admins can access
router.post('/courses', 
  auth,                            // First verify token
  authorize('instructor', 'admin'), // Then check role
  createCourseHandler               // Then execute logic
);
```

**WHY 401 vs 403?**
- **401 Unauthorized**: User not authenticated (no token or invalid token)
- **403 Forbidden**: User authenticated but lacks permission (wrong role)

#### 3. `checkApproval` Middleware
**What It Does**: Ensures instructors are approved by admin

**CODE**:
```javascript
const checkApproval = (req, res, next) => {
  if (!req.user.isApproved && req.user.role !== 'student') {
    return res.status(403).json({ 
      message: 'Account pending approval. Please contact administrator.' 
    });
  }
  next();
};
```

**WHY NEEDED**:
- Instructors must upload documents and get admin approval
- Prevents unapproved instructors from creating courses
- Students bypass this check (always approved)

**MIDDLEWARE CHAIN EXAMPLE**:
```javascript
router.post('/courses',
  auth,                    // 1. Verify JWT
  authorize('instructor'), // 2. Check role
  checkApproval,           // 3. Check approval status
  validateCourseInput,     // 4. Validate input
  createCourse             // 5. Execute handler
);
```

**INTERVIEW TALKING POINTS**:
- "Auth middleware extracts and verifies JWT, then loads the user from database"
- "I separate authentication (who are you?) from authorization (what can you do?)"
- "CheckApproval adds extra layer for instructor verification workflow"
- "I use 401 for authentication failures and 403 for authorization failures"

---

### `upload.js`
**Location**: `/backend/middleware/upload.js`

**RESPONSIBILITY**: Configure Multer for file upload handling

**WHAT IT DOES**:
1. Configures storage destinations for different file types
2. Generates unique filenames to prevent overwrites
3. Sets file size limits
4. Filters by file type (images, PDFs, videos)
5. Exports pre-configured upload middleware

**STORAGE CONFIGURATION**:
```javascript
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine folder based on fieldname
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'profileImage') {
      uploadPath += 'profiles/';
    } else if (file.fieldname === 'documents') {
      uploadPath += 'documents/';
    } else if (file.fieldname === 'material') {
      uploadPath += 'course-materials/';
    } else if (file.fieldname === 'video') {
      uploadPath += 'videos/';
    }
    
    cb(null, uploadPath);
  },
  
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-random-originalname.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
```

**WHY UNIQUE FILENAMES?**
- Prevents file overwrite if two users upload "resume.pdf"
- Timestamp ensures chronological ordering
- Random number handles simultaneous uploads

**FILE SIZE LIMITS**:
```javascript
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB for documents
  }
});

const uploadVideo = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB for videos
  }
});
```

**FILE TYPE FILTERING**:
```javascript
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true); // Accept
  } else {
    cb(new Error('Only image files allowed'), false); // Reject
  }
};

const documentFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files allowed'), false);
  }
};
```

**EXPORTS**:
```javascript
module.exports = {
  uploadProfile: upload.single('profileImage'),         // Single image
  uploadDocuments: upload.array('documents', 5),        // Up to 5 docs
  uploadMaterial: upload.single('material'),            // Single file
  uploadVideo: uploadVideo.single('video')              // Single video
};
```

**USAGE IN ROUTES**:
```javascript
const { uploadDocuments } = require('../middleware/upload');

router.post('/upload-documents', 
  auth,
  authorize('instructor'),
  uploadDocuments,  // Multer processes files
  async (req, res) => {
    // req.files contains uploaded file info
    console.log(req.files);
    // [{ fieldname: 'documents', originalname: 'degree.pdf', filename: '123-degree.pdf', path: 'uploads/documents/...' }]
  }
);
```

**SECURITY MEASURES**:
1. **Size Limits**: Prevents DoS via large file uploads
2. **Type Filtering**: Only allows specific MIME types
3. **Unique Filenames**: Prevents overwrites
4. **Path Sanitization**: Multer handles directory traversal attacks

**INTERVIEW TALKING POINTS**:
- "Multer handles the complexity of multipart/form-data parsing"
- "I configured separate storage destinations for different file types"
- "Unique filename generation prevents overwrites when multiple users upload similarly named files"
- "File size and type restrictions prevent abuse and ensure only valid files are accepted"

---

## 📁 models/

### `User.js`
**Location**: `/backend/models/User.js`

**RESPONSIBILITY**: Mongoose schema for user accounts with role-specific fields

**SCHEMA STRUCTURE**:

#### Core Fields (All Users)
```javascript
{
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, maxlength: 50 },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
  },
  password: { 
    type: String, 
    required: true, 
    minlength: 6 
  },
  role: { 
    type: String, 
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  profileImage: String,
  phone: String,
  dateOfBirth: Date,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  }
}
```

#### Instructor-Specific Fields
```javascript
instructorProfile: {
  qualification: { 
    type: String, 
    required: function() { return this.role === 'instructor'; } 
  },
  experience: { type: Number, min: 0 },
  specialization: [String],
  bio: { type: String, maxlength: 1000 },
  
  documents: [{
    type: { 
      type: String,
      enum: ['degree_certificate', 'teaching_certificate', 'id_proof', 'experience_letter', 'other']
    },
    originalName: String,
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    comments: String
  }],
  
  documentsUploaded: { type: Boolean, default: false },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationComments: String,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  linkedIn: String,
  portfolio: String
}
```

**WHY NESTED INSTRUCTOR PROFILE?**
- Keeps instructor-specific data organized
- Doesn't pollute student/admin user objects
- Easy to query instructors with pending verification

#### Account Status Fields
```javascript
{
  isActive: { type: Boolean, default: true },
  isApproved: { 
    type: Boolean, 
    default: function() {
      return this.role === 'student'; // Students auto-approved
    }
  },
  enrollmentDate: { type: Date, default: Date.now },
  lastLogin: Date
}
```

**CONDITIONAL DEFAULT VALUE**:
```javascript
isApproved: {
  default: function() {
    return this.role === 'student';
  }
}
```
**Result**: Students get `isApproved: true`, instructors get `false`

#### Fee Tracking (Optional Feature)
```javascript
feeStatus: {
  totalFees: { type: Number, default: 0 },
  paidFees: { type: Number, default: 0 },
  pendingFees: { type: Number, default: 0 },
  lastPaymentDate: Date
}
```

**INDEXES**:
```javascript
userSchema.index({ email: 1 });  // Fast login lookups
userSchema.index({ role: 1 });   // Filter users by role
```

**VIRTUAL PROPERTY**:
```javascript
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Usage:
const user = await User.findById(id);
console.log(user.fullName); // "John Doe"
```

**PRE-SAVE MIDDLEWARE** (Password Hashing):
```javascript
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
```

**WHY CHECK isModified?**
- If user updates profile (name, phone), password shouldn't be re-hashed
- Only hash when password is actually changed or user is created

**INSTANCE METHODS**:

```javascript
// Compare password during login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Usage in login route:
const isMatch = await user.comparePassword(password);
if (!isMatch) {
  return res.status(400).json({ message: 'Invalid credentials' });
}
```

```javascript
// Get user without password field
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Usage in registration:
res.json({
  user: user.getPublicProfile(),
  token
});
```

**INTERVIEW TALKING POINTS**:
- "User schema has role-specific fields using nested objects for instructors"
- "Pre-save hook automatically hashes passwords with bcrypt (12 rounds)"
- "I use conditional default values so students are auto-approved but instructors require admin verification"
- "Instance methods like comparePassword encapsulate password logic"
- "Indexes on email and role improve query performance"

---

### `Course.js`
**Location**: `/backend/models/Course.js`

**RESPONSIBILITY**: Course information and materials storage

**SCHEMA**:
```javascript
{
  title: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 100 
  },
  description: { 
    type: String, 
    required: true, 
    maxlength: 1000 
  },
  courseCode: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  credits: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  maxStudents: {
    type: Number,
    required: true,
    min: 1
  },
  currentEnrollment: {
    type: Number,
    default: 0
  },
  fees: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Arts', 'Business', 'Other']
  },
  level: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced']
  },
  prerequisites: [String],
  materials: [{
    title: String,
    type: {
      type: String,
      enum: ['pdf', 'video', 'link', 'document', 'note']
    },
    url: String,
    filename: String,
    description: String,
    isFree: { type: Boolean, default: false },
    uploadDate: { type: Date, default: Date.now }
  }],
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false },
  thumbnailImage: String
}
```

**KEY DESIGN DECISIONS**:

**1. Course Code Uppercase**:
```javascript
courseCode: { uppercase: true }
// "cs101" automatically saved as "CS101"
```

**2. Materials as Subdocuments**:
- Materials embedded in course document (not separate collection)
- **Why?** Materials always accessed with course, no need for separate queries
- **Trade-off**: Document size limit (16MB), but typical course won't hit this

**3. Free Preview Materials**:
```javascript
materials: [{
  isFree: { type: Boolean, default: false }
}]
```
**Use Case**: Allow non-enrolled students to preview some materials

**4. Enrollment Tracking**:
```javascript
maxStudents: Number,
currentEnrollment: { type: Number, default: 0 }
```
**Updated When**:
- Student enrolls: `currentEnrollment++`
- Student drops: `currentEnrollment--`

**INDEXES**:
```javascript
courseSchema.index({ courseCode: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ isActive: 1, isApproved: 1 }); // Compound index
```

**WHY COMPOUND INDEX ON isActive + isApproved?**
- Most common query: `find({ isActive: true, isApproved: true })`
- Compound index makes this query fast

**VIRTUAL PROPERTY**:
```javascript
courseSchema.virtual('isFullyEnrolled').get(function() {
  return this.currentEnrollment >= this.maxStudents;
});

// Usage:
if (course.isFullyEnrolled) {
  return res.status(400).json({ message: 'Course is full' });
}
```

**INTERVIEW TALKING POINTS**:
- "Course materials are stored as subdocuments for atomic operations"
- "I use compound index on isActive and isApproved since that's the most common query"
- "CurrentEnrollment is denormalized for performance—updated on enrollment changes"
- "Course codes are automatically uppercased for consistency"

---

### `Enrollment.js`
**Location**: `/backend/models/Enrollment.js`

**RESPONSIBILITY**: Student-Course relationship with grades and attendance

**SCHEMA**:
```javascript
{
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['enrolled', 'completed', 'dropped', 'suspended'],
    default: 'enrolled'
  },
  finalGrade: {
    letterGrade: String,
    percentage: Number,
    gpa: Number,
    isFinalized: { type: Boolean, default: false }
  },
  attendance: {
    totalClasses: { type: Number, default: 0 },
    attendedClasses: { type: Number, default: 0 },
    attendancePercentage: { type: Number, default: 0 }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'completed'],
    default: 'pending'
  },
  completionDate: Date
}
```

**CRITICAL INDEX** (Prevents Duplicate Enrollments):
```javascript
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
```

**WHY THIS MATTERS**:
```javascript
// First enrollment succeeds
await Enrollment.create({ student: '123', course: '456' });

// Second enrollment for same student/course throws error
await Enrollment.create({ student: '123', course: '456' });
// Error: E11000 duplicate key error
```

**ATTENDANCE AUTO-CALCULATION**:
```javascript
enrollmentSchema.pre('save', function(next) {
  if (this.attendance.totalClasses > 0) {
    this.attendance.attendancePercentage = 
      (this.attendance.attendedClasses / this.attendance.totalClasses) * 100;
  }
  next();
});

// Usage:
enrollment.attendance.attendedClasses = 15;
enrollment.attendance.totalClasses = 20;
await enrollment.save(); 
// attendancePercentage automatically set to 75
```

**OTHER INDEXES**:
```javascript
enrollmentSchema.index({ student: 1 }); // Get student's enrollments
enrollmentSchema.index({ course: 1 });  // Get course roster
enrollmentSchema.index({ status: 1 });  // Filter by status
```

**INTERVIEW TALKING POINTS**:
- "Compound unique index prevents students from enrolling in same course twice"
- "Attendance percentage auto-calculated in pre-save hook for data consistency"
- "Status enum allows tracking course lifecycle: enrolled → completed/dropped"
- "FinalGrade subdocument with isFinalized flag prevents grade changes after publication"

---

### `Assignment.js`
**Location**: `/backend/models/Assignment.js`

**RESPONSIBILITY**: Assignment definitions with grading criteria

**SCHEMA**:
```javascript
{
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 2000 },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['homework', 'quiz', 'exam', 'project', 'presentation'],
    required: true
  },
  totalPoints: {
    type: Number,
    required: true,
    min: 1
  },
  dueDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value && value > new Date();
      },
      message: 'Due date must be in the future'
    }
  },
  isPublished: { type: Boolean, default: false },
  publishDate: { type: Date, default: Date.now },
  allowLateSubmission: { type: Boolean, default: true },
  latePenalty: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}
```

**DUE DATE VALIDATION**:
```javascript
dueDate: {
  validate: {
    validator: function(value) {
      return value && value > new Date();
    },
    message: 'Due date must be in the future'
  }
}
```

**WHY VALIDATE?**
- Prevents creating assignments that are already overdue
- Runs on document creation, not updates (allows past-due assignments to exist)

**LATE SUBMISSION POLICY**:
```javascript
allowLateSubmission: { type: Boolean, default: true },
latePenalty: { type: Number, min: 0, max: 100, default: 0 }

// Example usage:
// Assignment 1: allowLate=true, penalty=10 (10% deduction per day)
// Assignment 2: allowLate=false, penalty=0 (no late submissions)
```

**VIRTUAL PROPERTIES**:
```javascript
// Check if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function() {
  return this.dueDate ? new Date() > this.dueDate : false;
});

// Human-readable time remaining
assignmentSchema.virtual('timeUntilDue').get(function() {
  if (!this.dueDate) return 'No due date';
  
  const now = new Date();
  const diffTime = this.dueDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else {
    return `${diffDays} days remaining`;
  }
});

// Usage:
console.log(assignment.timeUntilDue); // "3 days remaining"
```

**INDEXES**:
```javascript
assignmentSchema.index({ course: 1 });
assignmentSchema.index({ instructor: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ isPublished: 1 });
```

**INTERVIEW TALKING POINTS**:
- "Assignment schema includes late penalty configuration for automatic grading deductions"
- "Due date validation ensures assignments can't be created with past dates"
- "Virtual properties like `timeUntilDue` provide computed values without storing redundant data"
- "IsPublished flag allows instructors to create drafts before releasing to students"

---

### `Submission.js`
**Location**: `/backend/models/Submission.js`

**RESPONSIBILITY**: Student assignment submissions with grading

**SCHEMA**:
```javascript
{
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submissionText: {
    type: String,
    maxlength: 5000
  },
  attachments: [{
    originalName: String,
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now }
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned', 'resubmitted'],
    default: 'submitted'
  },
  grade: {
    points: { type: Number, min: 0 },
    percentage: { type: Number, min: 0, max: 100 },
    letterGrade: {
      type: String,
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'I']
    },
    gradedAt: Date,
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  feedback: {
    type: String,
    maxlength: 2000
  }
}
```

**UNIQUE CONSTRAINT**:
```javascript
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
```
**Effect**: Each student can only submit once per assignment (prevents duplicate submissions)

**AUTOMATIC GRADE CALCULATION**:
```javascript
submissionSchema.pre('save', function(next) {
  if (this.grade && this.grade.percentage !== undefined) {
    const percentage = this.grade.percentage;
    
    // Convert percentage to letter grade
    if (percentage >= 97) this.grade.letterGrade = 'A+';
    else if (percentage >= 93) this.grade.letterGrade = 'A';
    else if (percentage >= 90) this.grade.letterGrade = 'A-';
    else if (percentage >= 87) this.grade.letterGrade = 'B+';
    else if (percentage >= 83) this.grade.letterGrade = 'B';
    else if (percentage >= 80) this.grade.letterGrade = 'B-';
    else if (percentage >= 77) this.grade.letterGrade = 'C+';
    else if (percentage >= 73) this.grade.letterGrade = 'C';
    else if (percentage >= 70) this.grade.letterGrade = 'C-';
    else if (percentage >= 67) this.grade.letterGrade = 'D+';
    else if (percentage >= 60) this.grade.letterGrade = 'D';
    else this.grade.letterGrade = 'F';
  }
  next();
});

// Usage: Instructor only provides percentage
submission.grade = { 
  points: 85, 
  percentage: 85 
};
await submission.save();
// letterGrade automatically set to 'B'
```

**WHY AUTO-CALCULATE?**
- **Consistency**: Same grading scale across all courses
- **Accuracy**: No manual conversion errors
- **Maintainability**: Change scale in one place

**ATTACHMENTS ARRAY**:
```javascript
attachments: [{
  originalName: 'my-homework.pdf',
  filename: '1704067200-123456-my-homework.pdf',
  path: 'uploads/assignments/1704067200-123456-my-homework.pdf',
  mimetype: 'application/pdf',
  size: 1048576,
  uploadDate: Date.now()
}]
```

**INDEXES**:
```javascript
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
submissionSchema.index({ student: 1 });
submissionSchema.index({ assignment: 1 });
submissionSchema.index({ status: 1 });
```

**INTERVIEW TALKING POINTS**:
- "Submission schema enforces one-submission-per-student with compound unique index"
- "Pre-save hook automatically converts percentage to letter grade using institutional grading scale"
- "Attachments array stores file metadata, not file contents (files stored on disk)"
- "Grade subdocument tracks who graded and when for audit trail"

---

### `Grade.js`
**Location**: `/backend/models/Grade.js`

**RESPONSIBILITY**: Final course grades with GPA calculation

**SCHEMA**:
```javascript
{
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  letterGrade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'I', 'W'],
    default: 'I'
  },
  gpa: {
    type: Number,
    min: 0,
    max: 4.0,
    default: 0
  },
  isFinalized: {
    type: Boolean,
    default: false
  }
}
```

**AUTO-CALCULATION** (Letter Grade AND GPA):
```javascript
gradeSchema.pre('save', function(next) {
  if (this.percentage !== undefined) {
    // Calculate letter grade
    if (this.percentage >= 97) this.letterGrade = 'A+';
    else if (this.percentage >= 93) this.letterGrade = 'A';
    else if (this.percentage >= 90) this.letterGrade = 'A-';
    // ... etc
    
    // Calculate GPA (4.0 scale)
    if (this.percentage >= 97) this.gpa = 4.0;
    else if (this.percentage >= 93) this.gpa = 4.0;
    else if (this.percentage >= 90) this.gpa = 3.7;
    else if (this.percentage >= 87) this.gpa = 3.3;
    else if (this.percentage >= 83) this.gpa = 3.0;
    else if (this.percentage >= 80) this.gpa = 2.7;
    else if (this.percentage >= 77) this.gpa = 2.3;
    else if (this.percentage >= 73) this.gpa = 2.0;
    else if (this.percentage >= 70) this.gpa = 1.7;
    else if (this.percentage >= 67) this.gpa = 1.3;
    else if (this.percentage >= 60) this.gpa = 1.0;
    else this.gpa = 0.0;
  }
  next();
});
```

**GPA SCALE**:
```
A+, A  = 4.0
A-     = 3.7
B+     = 3.3
B      = 3.0
B-     = 2.7
C+     = 2.3
C      = 2.0
C-     = 1.7
D+     = 1.3
D      = 1.0
F      = 0.0
I, W   = 0.0 (Incomplete, Withdrawn)
```

**UNIQUE CONSTRAINT**:
```javascript
gradeSchema.index({ student: 1, course: 1 }, { unique: true });
```
**Effect**: One grade per student per course

**IS FINALIZED FLAG**:
```javascript
isFinalized: { type: Boolean, default: false }
```

**USE CASE**:
```javascript
// Instructor can update grade during semester
grade.percentage = 85;
await grade.save(); // OK

// At end of semester, finalize grade
grade.isFinalized = true;
await grade.save();

// Now locked in routes:
if (grade.isFinalized) {
  return res.status(400).json({ message: 'Grade is finalized' });
}
```

**INTERVIEW TALKING POINTS**:
- "Grade schema automatically calculates both letter grade and GPA from percentage"
- "IsFinalized flag prevents grade changes after publication (data integrity)"
- "GPA calculated on 4.0 scale following standard academic conventions"
- "One grade per student per course enforced by compound unique index"

---

### `Attendance.js`
**Location**: `/backend/models/Attendance.js`

**RESPONSIBILITY**: Daily attendance records per course

**SCHEMA**:
```javascript
{
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      required: true
    },
    markedAt: {
      type: Date,
      default: Date.now
    }
  }]
}
```

**DESIGN DECISION**: Students as array of subdocuments

**WHY?**
- All students for one class session stored together
- Atomic operation: Mark attendance for entire class at once
- Easy to query: "Who was present on Jan 13?"

**ALTERNATIVE APPROACH** (Separate Document Per Student):
```javascript
// Not used, but alternative
{
  student: ObjectId,
  course: ObjectId,
  date: Date,
  status: String
}
```

**Why Not?**
- More database documents (50 students = 50 documents vs 1)
- Harder to ensure all students marked
- Current approach better for batch operations

**UNIQUE CONSTRAINT**:
```javascript
attendanceSchema.index({ course: 1, date: 1 }, { unique: true });
```
**Effect**: One attendance record per course per day

**INDEXES**:
```javascript
attendanceSchema.index({ course: 1 });
attendanceSchema.index({ date: 1 });
```

**USAGE EXAMPLE**:
```javascript
// Instructor marks attendance for entire class
await Attendance.create({
  course: '507f1f77bcf86cd799439011',
  date: new Date('2026-01-13'),
  instructor: req.user._id,
  students: [
    { student: 'student1_id', status: 'present' },
    { student: 'student2_id', status: 'absent' },
    { student: 'student3_id', status: 'late' },
    { student: 'student4_id', status: 'excused' }
  ]
});

// Then update enrollment attendance counts
for (let student of attendanceData.students) {
  const enrollment = await Enrollment.findOne({
    student: student.student,
    course: courseId
  });
  
  enrollment.attendance.totalClasses++;
  if (student.status === 'present' || student.status === 'late') {
    enrollment.attendance.attendedClasses++;
  }
  await enrollment.save(); // Percentage auto-calculated
}
```

**INTERVIEW TALKING POINTS**:
- "Attendance stored as array of students per class session for atomic operations"
- "Compound unique index on course + date prevents duplicate attendance records"
- "Status enum supports multiple scenarios: present, absent, late, excused"
- "MarkedAt timestamp tracks when each student's attendance was recorded"

---

### `Notification.js`
**Location**: `/backend/models/Notification.js`

**RESPONSIBILITY**: In-app notification system

**SCHEMA**:
```javascript
{
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['assignment', 'assignment_due', 'grade', 'enrollment', 'payment', 'system', 'reminder', 'announcement', 'doc_verified', 'doc_rejected', 'course_approved', 'course_rejected', 'user_approved'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  targetUrl: {
    type: String,
    required: false,
    maxlength: 200
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}
```

**NOTIFICATION TYPES EXPLAINED**:
- `assignment`: New assignment created
- `assignment_due`: Assignment deadline approaching
- `grade`: Grade posted for assignment/course
- `enrollment`: Enrolled in course
- `payment`: Fee payment required
- `system`: Platform announcements
- `doc_verified`: Instructor documents approved
- `doc_rejected`: Instructor documents rejected
- `course_approved`: Course approved by admin
- `user_approved`: Instructor account approved

**TARGET NAVIGATION**:
```javascript
{
  type: 'grade',
  targetId: '507f1f77bcf86cd799439011', // Submission ID
  targetUrl: '/submissions/507f1f77bcf86cd799439011',
  actionRequired: false
}
```

**Frontend Usage**:
```javascript
// User clicks notification
<Link to={notification.targetUrl}>
  {notification.title}
</Link>
```

**STATIC METHODS**:

#### 1. Create Notification
```javascript
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this(data);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Usage:
await Notification.createNotification({
  recipient: userId,
  title: 'Assignment Graded',
  message: 'Your assignment has been graded',
  type: 'grade',
  targetUrl: '/assignments/123'
});
```

#### 2. Notify All Admins
```javascript
notificationSchema.statics.notifyAdmins = async function(title, message, type = 'system', relatedData = {}) {
  try {
    const User = require('./User');
    const admins = await User.find({ role: 'admin', isActive: true });
    
    const notifications = await Promise.all(
      admins.map(admin => 
        this.createNotification({
          recipient: admin._id,
          title,
          message,
          type,
          ...relatedData
        })
      )
    );
    
    return notifications;
  } catch (error) {
    console.error('Error notifying admins:', error);
    throw error;
  }
};

// Usage:
await Notification.notifyAdmins(
  'New Instructor Registration',
  'John Doe has registered and needs document verification',
  'system',
  { 
    targetId: instructorId,
    targetUrl: '/admin/instructor-verification',
    actionRequired: true 
  }
);
```

**INDEXES**:
```javascript
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ isRead: 1 });
```

**INTERVIEW TALKING POINTS**:
- "Notification schema supports multiple types for different user events"
- "TargetUrl and targetId enable navigation to related entities"
- "Static method notifyAdmins simplifies sending notifications to all admins"
- "ActionRequired flag highlights urgent notifications requiring user action"
- "Soft delete with isDeleted flag preserves notification history"

---

## CONTINUED IN NEXT RESPONSE...

This is getting very long. Shall I continue with:
1. Routes files (auth.js, courses.js, etc.) - 12 files
2. Scripts and utilities

Or would you prefer I create a separate file for routes documentation?
