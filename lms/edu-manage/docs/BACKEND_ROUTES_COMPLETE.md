# BACKEND ROUTES - Complete Explanation

Every route file explained with endpoints, request/response formats, and business logic.

---

## `/routes/auth.js`

**RESPONSIBILITY**: User authentication and registration

### Endpoints:

#### `POST /api/auth/register`
**PURPOSE**: Create new user account

**REQUEST BODY**:
```javascript
{
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  password: "password123",
  role: "student" | "instructor",
  phone: "123-456-7890",
  dateOfBirth: "1995-01-01",
  // If role is instructor:
  instructorProfile: {
    qualification: "PhD in Computer Science",
    experience: 5,
    specialization: ["Web Development", "AI"],
    bio: "Experienced educator...",
    linkedIn: "https://linkedin.com/in/johndoe"
  }
}
```

**PROCESS FLOW**:
1. Validate input with express-validator
2. Check if email already exists
3. Create user document
4. If instructor: initialize instructorProfile with pending status
5. Hash password (Mongoose pre-save hook)
6. Generate JWT token
7. If instructor: notify all admins
8. Return token + user profile

**RESPONSE**:
```javascript
{
  message: "Registration successful! Please upload your documents for verification.",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    _id: "507f1f77bcf86cd799439011",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    role: "instructor",
    isApproved: false
  },
  requiresApproval: true,  // For instructors
  needsDocuments: true      // For instructors
}
```

**VALIDATION RULES**:
```javascript
[
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['student', 'instructor'])
]
```

**ERROR CASES**:
- 400: Validation errors
- 400: Email already exists
- 500: Server error

---

#### `POST /api/auth/login`
**PURPOSE**: Authenticate user and return JWT

**REQUEST BODY**:
```javascript
{
  email: "john@example.com",
  password: "password123"
}
```

**PROCESS FLOW**:
1. Validate email and password format
2. Find user by email
3. Check if user exists
4. Check if account is active
5. Compare password with bcrypt
6. Check if instructor is approved
7. Update lastLogin timestamp
8. Generate JWT token
9. Return token + user profile

**RESPONSE**:
```javascript
{
  message: "Login successful!",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    _id: "507f1f77bcf86cd799439011",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    role: "instructor",
    isApproved: true,
    lastLogin: "2026-01-13T10:30:00Z"
  }
}
```

**ERROR CASES**:
- 400: Invalid credentials
- 400: Account is deactivated
- 403: Instructor not approved yet
- 500: Server error

---

#### `GET /api/auth/me`
**PURPOSE**: Get current user profile (token verification)

**MIDDLEWARE**: `auth`

**RESPONSE**:
```javascript
{
  user: {
    _id: "507f1f77bcf86cd799439011",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    role: "instructor",
    isApproved: true,
    instructorProfile: {
      qualification: "PhD in Computer Science",
      verificationStatus: "approved"
    }
  }
}
```

**USE CASE**: Frontend calls this on app load to verify token and fetch user data

---

#### `POST /api/auth/upload-documents`
**PURPOSE**: Upload instructor qualification documents

**MIDDLEWARE**: `auth`, `authorize('instructor')`, `uploadDocuments`

**REQUEST**: multipart/form-data with files field named "documents"

**PROCESS FLOW**:
1. Multer processes uploaded files
2. Store file metadata in instructorProfile.documents
3. Set documentsUploaded = true
4. Change verificationStatus to 'under_review'
5. Notify all admins
6. Return success message

**RESPONSE**:
```javascript
{
  message: "Documents uploaded successfully. Awaiting admin review.",
  documents: [
    {
      type: "degree_certificate",
      originalName: "degree.pdf",
      filename: "1704067200-123-degree.pdf",
      verified: false,
      uploadDate: "2026-01-13T10:00:00Z"
    }
  ]
}
```

---

## `/routes/users.js`

**RESPONSIBILITY**: User management operations

### Endpoints:

#### `GET /api/users`
**PURPOSE**: Get paginated list of users

**MIDDLEWARE**: `auth`, `authorize('admin')`

**QUERY PARAMS**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `role`: Filter by role (student/instructor/admin)
- `isActive`: Filter by status (true/false)
- `search`: Search in name or email

**RESPONSE**:
```javascript
{
  users: [
    {
      _id: "...",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      role: "instructor",
      isActive: true,
      isApproved: true
    }
  ],
  pagination: {
    current: 1,
    pages: 5,
    total: 100,
    hasNext: true,
    hasPrev: false
  }
}
```

---

#### `GET /api/users/:id`
**PURPOSE**: Get specific user profile

**MIDDLEWARE**: `auth`

**AUTHORIZATION LOGIC**:
- Admins can view any user
- Users can view their own profile
- Instructors can view their students

**RESPONSE**: User object with role-specific fields

---

#### `PUT /api/users/:id`
**PURPOSE**: Update user profile

**MIDDLEWARE**: `auth`

**AUTHORIZATION**: Users can update own profile, admins can update any

**UPDATABLE FIELDS**:
- firstName, lastName, phone, address
- profileImage
- For instructors: instructorProfile fields

**REQUEST BODY**:
```javascript
{
  firstName: "John",
  lastName: "Smith",
  phone: "555-1234",
  address: {
    city: "New York",
    state: "NY",
    zipCode: "10001"
  }
}
```

---

#### `DELETE /api/users/:id`
**PURPOSE**: Deactivate user account (soft delete)

**MIDDLEWARE**: `auth`, `authorize('admin')`

**PROCESS**: Sets `isActive: false` (preserves data for historical records)

---

#### `PUT /api/users/:id/approve`
**PURPOSE**: Approve instructor account

**MIDDLEWARE**: `auth`, `authorize('admin')`

**PROCESS FLOW**:
1. Find user by ID
2. Check role is 'instructor'
3. Check documents are uploaded
4. Set isApproved = true
5. Set instructorProfile.verificationStatus = 'approved'
6. Create notification for instructor
7. Return success message

**RESPONSE**:
```javascript
{
  message: "Instructor approved successfully",
  user: { /* updated user */ }
}
```

---

#### `PUT /api/users/:id/verify-documents`
**PURPOSE**: Verify individual instructor documents

**MIDDLEWARE**: `auth`, `authorize('admin')`

**REQUEST BODY**:
```javascript
{
  documentId: "...",
  verified: true,
  comments: "Certificate verified"
}
```

**PROCESS**:
1. Find user and specific document
2. Update document.verified status
3. Add verifiedBy and verifiedAt fields
4. If all documents verified: approve instructor
5. Create notification for instructor

---

## `/routes/courses.js`

**RESPONSIBILITY**: Course management

### Endpoints:

#### `GET /api/courses`
**PURPOSE**: Get paginated course list with filtering

**ACCESS**: Public (no auth required)

**QUERY PARAMS**:
- `page`, `limit`: Pagination
- `category`: Filter by category
- `level`: Filter by level (Beginner/Intermediate/Advanced)
- `search`: Search in title, description, code

**RESPONSE**:
```javascript
{
  courses: [
    {
      _id: "...",
      title: "Introduction to Web Development",
      courseCode: "CS101",
      instructor: {
        _id: "...",
        firstName: "John",
        lastName: "Doe"
      },
      credits: 3,
      category: "Computer Science",
      level: "Beginner",
      fees: 500,
      maxStudents: 30,
      currentEnrollment: 15
    }
  ],
  pagination: { /* ... */ }
}
```

---

#### `GET /api/courses/:id`
**PURPOSE**: Get single course details

**ACCESS**: Public

**RESPONSE**: Full course object including materials (if user is enrolled)

---

#### `POST /api/courses`
**PURPOSE**: Create new course

**MIDDLEWARE**: `auth`, `authorize('instructor')`, `checkApproval`

**REQUEST BODY**:
```javascript
{
  title: "Advanced JavaScript",
  description: "Deep dive into modern JavaScript",
  courseCode: "CS301",
  credits: 4,
  maxStudents: 25,
  fees: 800,
  category: "Computer Science",
  level: "Advanced",
  prerequisites: ["CS101", "CS201"]
}
```

**PROCESS FLOW**:
1. Validate input
2. Check courseCode uniqueness
3. Create course with instructor = req.user._id
4. Set isApproved = false (requires admin approval)
5. Notify admins of pending course
6. Return course object

**RESPONSE**:
```javascript
{
  message: "Course created successfully. Pending admin approval.",
  course: { /* course object */ },
  requiresApproval: true
}
```

---

#### `PUT /api/courses/:id`
**PURPOSE**: Update course

**MIDDLEWARE**: `auth`, `authorize('instructor', 'admin')`

**AUTHORIZATION**: Only course instructor or admin can update

**BUSINESS RULE**: Cannot update if students already enrolled (protects integrity)

---

#### `DELETE /api/courses/:id`
**PURPOSE**: Delete course (soft delete)

**MIDDLEWARE**: `auth`, `authorize('instructor', 'admin')`

**PROCESS**: Sets `isActive: false`

**BUSINESS RULE**: Cannot delete if students enrolled

---

#### `POST /api/courses/:id/materials`
**PURPOSE**: Add material to course

**MIDDLEWARE**: `auth`, `authorize('instructor')`, `uploadMaterial`

**REQUEST**: multipart/form-data with file

**REQUEST BODY**:
```javascript
{
  title: "Week 1 Slides",
  type: "pdf",
  description: "Introduction to course",
  isFree: false  // Preview for non-enrolled students
}
```

**PROCESS**:
1. Verify user is course instructor
2. Upload file with Multer
3. Add material to course.materials array
4. Return updated course

---

#### `GET /api/courses/:id/performance`
**PURPOSE**: Get course analytics

**MIDDLEWARE**: `auth`, `authorize('instructor', 'admin')`

**RESPONSE**:
```javascript
{
  courseId: "...",
  courseTitle: "Advanced JavaScript",
  enrollmentCount: 25,
  averageGrade: 82.5,
  gradeDistribution: {
    "A": 5,
    "B": 10,
    "C": 8,
    "D": 2,
    "F": 0
  },
  completionRate: 90,
  attendanceAverage: 87.5
}
```

---

#### `PUT /api/courses/:id/approve`
**PURPOSE**: Approve course for publication

**MIDDLEWARE**: `auth`, `authorize('admin')`

**PROCESS**:
1. Set isApproved = true
2. Create notification for instructor
3. Course now visible to students

---

## `/routes/enrollments.js`

**RESPONSIBILITY**: Course enrollment management

### Endpoints:

#### `POST /api/enrollments`
**PURPOSE**: Enroll student in course

**MIDDLEWARE**: `auth`, `authorize('student')`

**REQUEST BODY**:
```javascript
{
  courseId: "507f1f77bcf86cd799439011"
}
```

**BUSINESS LOGIC**:
1. Check course exists and is approved
2. Check course is not full
3. Check student not already enrolled (unique index)
4. Create enrollment document
5. Increment course.currentEnrollment
6. Create notification for instructor
7. Return enrollment confirmation

**ERROR CASES**:
- 404: Course not found
- 400: Course is full
- 400: Already enrolled
- 403: Course not approved yet

---

#### `GET /api/enrollments/student/:studentId`
**PURPOSE**: Get all enrollments for student

**MIDDLEWARE**: `auth`

**AUTHORIZATION**: User can view own enrollments

**RESPONSE**:
```javascript
{
  enrollments: [
    {
      _id: "...",
      course: {
        _id: "...",
        title: "Advanced JavaScript",
        courseCode: "CS301",
        instructor: { /* ... */ }
      },
      status: "enrolled",
      enrollmentDate: "2026-01-01",
      attendance: {
        totalClasses: 20,
        attendedClasses: 18,
        attendancePercentage: 90
      },
      finalGrade: {
        percentage: 85,
        letterGrade: "B",
        gpa: 3.0
      }
    }
  ]
}
```

---

#### `GET /api/enrollments/course/:courseId`
**PURPOSE**: Get all students in course

**MIDDLEWARE**: `auth`, `authorize('instructor', 'admin')`

**AUTHORIZATION**: Only course instructor or admin

**RESPONSE**: Array of enrollments with populated student details

---

#### `PUT /api/enrollments/:id`
**PURPOSE**: Update enrollment status

**MIDDLEWARE**: `auth`

**USE CASES**:
- Student drops course (status: 'dropped')
- Instructor marks as completed
- Admin suspends enrollment

**REQUEST BODY**:
```javascript
{
  status: "dropped" | "completed" | "suspended"
}
```

---

#### `DELETE /api/enrollments/:id`
**PURPOSE**: Drop course

**MIDDLEWARE**: `auth`, `authorize('student')`

**PROCESS**:
1. Set status = 'dropped'
2. Decrement course.currentEnrollment
3. Set completionDate
4. Notify instructor

---

## `/routes/assignments.js`

**RESPONSIBILITY**: Assignment management

### Endpoints:

#### `GET /api/assignments`
**PURPOSE**: Get assignments for user

**MIDDLEWARE**: `auth`

**LOGIC**:
- Students: Get assignments from enrolled courses
- Instructors: Get assignments they created

**RESPONSE**:
```javascript
{
  assignments: [
    {
      _id: "...",
      title: "Homework 1",
      description: "Complete exercises 1-10",
      course: {
        _id: "...",
        title: "Advanced JavaScript"
      },
      type: "homework",
      totalPoints: 100,
      dueDate: "2026-01-20T23:59:59Z",
      isPublished: true,
      // For students:
      submissionStatus: "submitted" | "pending",
      isSubmitted: true,
      grade: { /* if graded */ }
    }
  ]
}
```

---

#### `GET /api/assignments/:id`
**PURPOSE**: Get single assignment

**MIDDLEWARE**: `auth`

**AUTHORIZATION**: Enrolled students or instructor who created it

---

#### `POST /api/assignments`
**PURPOSE**: Create assignment

**MIDDLEWARE**: `auth`, `authorize('instructor')`

**REQUEST BODY**:
```javascript
{
  courseId: "...",
  title: "Midterm Exam",
  description: "Comprehensive exam covering weeks 1-7",
  type: "exam",
  totalPoints: 100,
  dueDate: "2026-03-15T10:00:00Z",
  allowLateSubmission: false,
  latePenalty: 10  // 10% per day
}
```

**VALIDATION**:
- User must be course instructor
- Due date must be in future
- totalPoints must be positive

---

#### `PUT /api/assignments/:id`
**PURPOSE**: Update assignment

**MIDDLEWARE**: `auth`, `authorize('instructor')`

**BUSINESS RULE**: Cannot update if submissions exist (protects grading integrity)

---

#### `DELETE /api/assignments/:id`
**PURPOSE**: Delete assignment

**MIDDLEWARE**: `auth`, `authorize('instructor')`

**BUSINESS RULE**: Cannot delete if submissions exist

---

#### `PUT /api/assignments/:id/publish`
**PURPOSE**: Publish assignment to students

**MIDDLEWARE**: `auth`, `authorize('instructor')`

**PROCESS**:
1. Set isPublished = true
2. Get all enrolled students
3. Create notification for each student
4. Return success

---

## `/routes/submissions.js`

**RESPONSIBILITY**: Assignment submission handling

### Endpoints:

#### `POST /api/submissions`
**PURPOSE**: Submit assignment

**MIDDLEWARE**: `auth`, `authorize('student')`

**REQUEST**: multipart/form-data

**REQUEST BODY**:
```javascript
{
  assignmentId: "...",
  submissionText: "Here is my solution...",
  files: [/* file uploads */]
}
```

**PROCESS FLOW**:
1. Find assignment
2. Check assignment is published
3. Check student is enrolled in course
4. Check due date, set isLate flag
5. Process file uploads
6. Create submission document
7. Create notification for instructor
8. Return submission confirmation

**LATE SUBMISSION LOGIC**:
```javascript
const dueDate = assignment.dueDate;
const now = new Date();
const isLate = now > dueDate;

if (isLate && !assignment.allowLateSubmission) {
  return res.status(400).json({ message: 'Late submissions not allowed' });
}
```

**RESPONSE**:
```javascript
{
  message: "Assignment submitted successfully",
  submission: {
    _id: "...",
    assignment: "...",
    student: "...",
    submittedAt: "2026-01-13T15:30:00Z",
    isLate: false,
    status: "submitted",
    attachments: [
      {
        originalName: "homework.pdf",
        filename: "1704067200-123-homework.pdf",
        path: "/uploads/assignments/..."
      }
    ]
  }
}
```

---

#### `GET /api/submissions/assignment/:assignmentId`
**PURPOSE**: Get all submissions for assignment

**MIDDLEWARE**: `auth`, `authorize('instructor', 'admin')`

**AUTHORIZATION**: Only assignment creator or admin

**RESPONSE**:
```javascript
{
  submissions: [
    {
      _id: "...",
      student: {
        _id: "...",
        firstName: "Jane",
        lastName: "Smith"
      },
      submittedAt: "2026-01-13T15:30:00Z",
      isLate: false,
      status: "submitted",
      attachments: [/* ... */]
    }
  ]
}
```

---

#### `GET /api/submissions/student/:studentId`
**PURPOSE**: Get all submissions by student

**MIDDLEWARE**: `auth`

**AUTHORIZATION**: Student can view own, instructors/admins can view all

---

#### `PUT /api/submissions/:id/grade`
**PURPOSE**: Grade submission

**MIDDLEWARE**: `auth`, `authorize('instructor')`

**REQUEST BODY**:
```javascript
{
  points: 85,  // Out of assignment.totalPoints
  feedback: "Good work! Watch for edge cases in problem 3."
}
```

**GRADING CALCULATION**:
```javascript
const percentage = (points / assignment.totalPoints) * 100;

// Apply late penalty if applicable
if (submission.isLate && assignment.latePenalty > 0) {
  const penaltyAmount = percentage * (assignment.latePenalty / 100);
  finalPercentage = percentage - penaltyAmount;
}

// Letter grade auto-calculated in pre-save hook
```

**PROCESS**:
1. Verify instructor owns assignment's course
2. Calculate percentage
3. Apply late penalty if needed
4. Update submission with grade
5. Set status = 'graded'
6. Create notification for student
7. Return graded submission

---

## `/routes/attendance.js`

**RESPONSIBILITY**: Attendance tracking

### Endpoints:

#### `POST /api/attendance`
**PURPOSE**: Mark attendance for class session

**MIDDLEWARE**: `auth`, `authorize('instructor')`

**REQUEST BODY**:
```javascript
{
  courseId: "...",
  date: "2026-01-13",
  students: [
    { studentId: "...", status: "present" },
    { studentId: "...", status: "absent" },
    { studentId: "...", status: "late" },
    { studentId: "...", status: "excused" }
  ]
}
```

**PROCESS FLOW**:
1. Verify instructor teaches this course
2. Check attendance not already marked for this date
3. Create attendance document
4. For each student:
   - Find enrollment
   - Increment totalClasses
   - If present/late: increment attendedClasses
   - Save enrollment (percentage auto-calculated)
5. Return success

**RESPONSE**:
```javascript
{
  message: "Attendance marked successfully",
  attendance: {
    _id: "...",
    course: "...",
    date: "2026-01-13",
    students: [/* ... */]
  },
  updatedEnrollments: 25
}
```

---

#### `GET /api/attendance/course/:courseId`
**PURPOSE**: Get attendance history for course

**MIDDLEWARE**: `auth`, `authorize('instructor', 'admin')`

**RESPONSE**: Array of attendance records with student details

---

#### `GET /api/attendance/student/:studentId/course/:courseId`
**PURPOSE**: Get attendance for specific student in course

**MIDDLEWARE**: `auth`

**AUTHORIZATION**: Student can view own, instructor/admin can view all

**RESPONSE**:
```javascript
{
  attendance: [
    {
      date: "2026-01-10",
      status: "present"
    },
    {
      date: "2026-01-13",
      status: "late"
    }
  ],
  summary: {
    totalClasses: 20,
    attended: 18,
    percentage: 90
  }
}
```

---

## `/routes/grades.js`

**RESPONSIBILITY**: Grade management

### Endpoints:

#### `GET /api/grades/student/:studentId`
**PURPOSE**: Get all grades for student

**MIDDLEWARE**: `auth`

**AUTHORIZATION**: Student can view own grades

**RESPONSE**:
```javascript
{
  grades: [
    {
      _id: "...",
      course: {
        title: "Advanced JavaScript",
        courseCode: "CS301"
      },
      percentage: 85,
      letterGrade: "B",
      gpa: 3.0,
      isFinalized: true
    }
  ],
  overallGPA: 3.2
}
```

**GPA CALCULATION**:
```javascript
const totalGPA = grades.reduce((sum, grade) => sum + grade.gpa, 0);
const overallGPA = totalGPA / grades.length;
```

---

#### `GET /api/grades/course/:courseId`
**PURPOSE**: Get all grades for course

**MIDDLEWARE**: `auth`, `authorize('instructor', 'admin')`

**RESPONSE**: Array of grades with student details and grade distribution

---

#### `POST /api/grades`
**PURPOSE**: Create/update final course grade

**MIDDLEWARE**: `auth`, `authorize('instructor')`

**REQUEST BODY**:
```javascript
{
  studentId: "...",
  courseId: "...",
  percentage: 87.5
}
```

**PROCESS**:
1. Verify instructor teaches this course
2. Find or create grade document
3. Check if already finalized
4. Update percentage
5. Letter grade and GPA auto-calculated
6. Create notification for student
7. Return grade

---

#### `PUT /api/grades/:id/finalize`
**PURPOSE**: Finalize grade (lock from changes)

**MIDDLEWARE**: `auth`, `authorize('instructor')`

**PROCESS**:
1. Set isFinalized = true
2. Create notification for student
3. Grade can no longer be changed

---

## `/routes/notifications.js`

**RESPONSIBILITY**: Notification management

### Endpoints:

#### `GET /api/notifications`
**PURPOSE**: Get notifications for user

**MIDDLEWARE**: `auth`

**QUERY PARAMS**:
- `page`, `limit`: Pagination
- `isRead`: Filter by read status

**RESPONSE**:
```javascript
{
  notifications: [
    {
      _id: "...",
      title: "Assignment Graded",
      message: "Your homework 1 has been graded",
      type: "grade",
      targetUrl: "/assignments/...",
      isRead: false,
      createdAt: "2026-01-13T10:00:00Z"
    }
  ],
  unreadCount: 5,
  pagination: { /* ... */ }
}
```

---

#### `PUT /api/notifications/:id/read`
**PURPOSE**: Mark notification as read

**MIDDLEWARE**: `auth`

**PROCESS**: Set isRead = true

---

#### `PUT /api/notifications/mark-all-read`
**PURPOSE**: Mark all user's notifications as read

**MIDDLEWARE**: `auth`

**PROCESS**: Bulk update all notifications for user

---

#### `DELETE /api/notifications/:id`
**PURPOSE**: Delete notification (soft delete)

**MIDDLEWARE**: `auth`

**PROCESS**: Set isDeleted = true

---

## `/routes/analytics.js`

**RESPONSIBILITY**: Dashboard analytics

### Endpoints:

#### `GET /api/analytics/dashboard`
**PURPOSE**: Get role-specific dashboard data

**MIDDLEWARE**: `auth`

**RESPONSE (Student)**:
```javascript
{
  totalEnrollments: 5,
  pendingAssignments: 3,
  averageGrade: 85.5,
  averageAttendance: 90,
  upcomingDeadlines: [/* ... */]
}
```

**RESPONSE (Instructor)**:
```javascript
{
  totalCourses: 3,
  totalStudents: 75,
  totalAssignments: 15,
  totalPendingGrading: 23,
  recentActivities: [/* ... */]
}
```

**RESPONSE (Admin)**:
```javascript
{
  totalUsers: 500,
  totalStudents: 450,
  totalInstructors: 45,
  totalAdmins: 5,
  totalCourses: 50,
  totalEnrollments: 1200,
  pendingInstructorVerifications: 5,
  pendingCourseApprovals: 3,
  recentActivities: [/* ... */]
}
```

---

#### `GET /api/analytics/course/:courseId`
**PURPOSE**: Detailed course analytics

**MIDDLEWARE**: `auth`, `authorize('instructor', 'admin')`

**RESPONSE**:
```javascript
{
  courseId: "...",
  enrollment: {
    total: 25,
    active: 23,
    dropped: 2
  },
  gradeDistribution: {
    "A": 5,
    "B": 10,
    "C": 7,
    "D": 1,
    "F": 0
  },
  averageGrade: 82.5,
  attendanceAverage: 87.3,
  assignmentStats: {
    total: 10,
    averageSubmissionRate: 92,
    averageGrade: 84
  }
}
```

---

## `/routes/upload.js`

**RESPONSIBILITY**: Generic file upload endpoints

### Endpoints:

#### `POST /api/upload/profile`
**PURPOSE**: Upload profile picture

**MIDDLEWARE**: `auth`, `uploadProfile`

**PROCESS**:
1. Upload image file
2. Update user.profileImage
3. Return file URL

---

#### `POST /api/upload/document`
**PURPOSE**: Upload instructor documents

**MIDDLEWARE**: `auth`, `authorize('instructor')`, `uploadDocuments`

**PROCESS**: Same as auth/upload-documents

---

## `/routes/messages.js` (Optional Feature)

**RESPONSIBILITY**: Internal messaging

**Endpoints** (if implemented):
- `POST /api/messages` - Send message
- `GET /api/messages` - Get inbox
- `GET /api/messages/:id` - Get message
- `PUT /api/messages/:id/read` - Mark as read
- `DELETE /api/messages/:id` - Delete message

---

## INTERVIEW TALKING POINTS

### Route Organization
"I organized routes by resource (users, courses, assignments) with consistent RESTful patterns. Each route file handles a specific domain."

### Middleware Pipeline
"Every protected route uses the auth middleware to verify JWT, then authorize to check roles, then validation to check input."

### Error Handling
"All routes use try-catch blocks with specific error messages. Validation errors return 400, auth errors return 401, authorization errors return 403."

### Business Logic
"I enforce business rules like 'cannot delete assignment if submissions exist' at the route level before database operations."

### Pagination
"All list endpoints support pagination to handle large datasets efficiently. Default page size is 20, configurable up to 100."

### Authorization Patterns
"I use three authorization patterns: user-owns-resource (student viewing own grades), role-based (admin-only), and relationship-based (instructor teaching that course)."
