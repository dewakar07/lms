# DATABASE DESIGN - Complete Explanation

MongoDB schema design with relationships, indexes, and data modeling decisions.

---

## DATABASE CHOICE: MongoDB

**WHY MONGODB?**
- **Flexible Schema**: User roles have different fields (instructor profile vs student profile)
- **Document Model**: Course materials, attendance records naturally nest within documents
- **JSON-Like**: Seamless integration with Node.js and React (same data format)
- **Scalability**: Horizontal scaling for future growth
- **Aggregation**: Powerful aggregation pipeline for analytics

**ALTERNATIVES CONSIDERED**:
- **PostgreSQL**: Would require multiple joins for nested data (course materials), more rigid schema
- **MySQL**: Similar to PostgreSQL, less flexible for varying user profiles

---

## SCHEMA DIAGRAMS

### Entity Relationship Overview
```
USER (1) ----creates----> (M) COURSE
USER (1) ----enrolls in--> (M) ENROLLMENT <--belongs to-- (1) COURSE
COURSE (1) --has---> (M) ASSIGNMENT
ASSIGNMENT (1) <--for-- (M) SUBMISSION --by--> (1) USER
ENROLLMENT (1) <--has-- (1) GRADE
COURSE (1) --has--> (M) ATTENDANCE --for--> (M) USER
USER (M) <--receives-- (M) NOTIFICATION
```

---

## COLLECTIONS IN DETAIL

### 1. **users**

**PURPOSE**: Store all user types (students, instructors, admins)

**SCHEMA**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  password: "$2b$10$hashedpassword...",  // bcrypt hash
  role: "instructor",  // enum: ['student', 'instructor', 'admin']
  
  // Common fields
  phone: "123-456-7890",
  dateOfBirth: ISODate("1995-01-01"),
  profileImage: "/uploads/profiles/john.jpg",
  address: {
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zipCode: "10001"
  },
  
  // Role-specific fields (instructor only)
  instructorProfile: {
    qualification: "PhD in Computer Science",
    experience: 5,
    specialization: ["Web Development", "AI", "Machine Learning"],
    bio: "Experienced educator with 5 years of teaching...",
    linkedIn: "https://linkedin.com/in/johndoe",
    verificationStatus: "approved",  // enum: ['pending', 'under_review', 'approved', 'rejected']
    documents: [
      {
        _id: ObjectId(),
        type: "degree_certificate",
        originalName: "degree.pdf",
        filename: "1704067200-123-degree.pdf",
        path: "/uploads/documents/1704067200-123-degree.pdf",
        verified: true,
        verifiedBy: ObjectId("admin_id"),
        verifiedAt: ISODate("2026-01-10"),
        uploadDate: ISODate("2026-01-09")
      }
    ],
    documentsUploaded: true
  },
  
  // Status fields
  isActive: true,
  isApproved: true,  // For instructors - must be true to create courses
  lastLogin: ISODate("2026-01-13T10:30:00Z"),
  
  // Timestamps
  createdAt: ISODate("2026-01-01"),
  updatedAt: ISODate("2026-01-13")
}
```

**INDEXES**:
```javascript
{ email: 1 }  // Unique index for login
{ role: 1 }   // Filter users by role
{ "instructorProfile.verificationStatus": 1 }  // Admin dashboard
```

**DESIGN DECISIONS**:
- **Single Collection for All Users**: Simplifies authentication, allows role changes
- **Subdocument for Instructor Profile**: Avoids null fields for students
- **Document Array**: Stores multiple verification documents inline
- **bcrypt Password**: Never store plain text, uses 10 salt rounds

**PRE-SAVE HOOK**:
```javascript
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
```

**VIRTUAL FIELD**:
```javascript
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});
```

---

### 2. **courses**

**PURPOSE**: Store course information and materials

**SCHEMA**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  title: "Advanced JavaScript",
  description: "Deep dive into modern JavaScript concepts...",
  courseCode: "CS301",  // Unique identifier
  
  // Relationships
  instructor: ObjectId("507f1f77bcf86cd799439011"),  // Reference to users
  
  // Course details
  credits: 4,
  maxStudents: 30,
  currentEnrollment: 15,
  fees: 800,
  category: "Computer Science",
  level: "Advanced",  // enum: ['Beginner', 'Intermediate', 'Advanced']
  prerequisites: ["CS101", "CS201"],  // Array of course codes
  
  // Schedule
  startDate: ISODate("2026-01-15"),
  endDate: ISODate("2026-05-15"),
  
  // Course materials (subdocuments)
  materials: [
    {
      _id: ObjectId(),
      title: "Week 1 Slides",
      type: "pdf",  // enum: ['pdf', 'video', 'document', 'link']
      filename: "week1-slides.pdf",
      path: "/uploads/course-materials/week1-slides.pdf",
      description: "Introduction to course topics",
      uploadDate: ISODate("2026-01-10"),
      isFree: false  // Preview for non-enrolled students
    }
  ],
  
  // Status
  isApproved: true,  // Admin must approve before students see it
  isActive: true,
  
  // Timestamps
  createdAt: ISODate("2026-01-01"),
  updatedAt: ISODate("2026-01-13")
}
```

**INDEXES**:
```javascript
{ courseCode: 1 }  // Unique index
{ instructor: 1 }  // Find courses by instructor
{ isApproved: 1, isActive: 1 }  // Public course listing
{ category: 1, level: 1 }  // Filter courses
```

**DESIGN DECISIONS**:
- **Materials as Subdocuments**: Tightly coupled to course, no need for separate collection
- **currentEnrollment Counter**: Denormalized for performance (updated on enrollment)
- **Prerequisites as Codes**: Flexible, doesn't require foreign key constraint
- **Approval Workflow**: Protects quality, admin reviews before publication

**VALIDATION**:
```javascript
courseSchema.path('maxStudents').validate(function(value) {
  return value >= this.currentEnrollment;
}, 'maxStudents cannot be less than currentEnrollment');
```

---

### 3. **enrollments**

**PURPOSE**: Track student course enrollments

**SCHEMA**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  
  // Relationships
  student: ObjectId("student_id"),
  course: ObjectId("course_id"),
  
  // Enrollment details
  status: "enrolled",  // enum: ['enrolled', 'dropped', 'completed', 'suspended']
  enrollmentDate: ISODate("2026-01-05"),
  completionDate: null,  // Set when status changes to 'completed' or 'dropped'
  
  // Attendance tracking
  attendance: {
    totalClasses: 20,
    attendedClasses: 18,
    attendancePercentage: 90  // Auto-calculated
  },
  
  // Final grade (calculated at end)
  finalGrade: {
    percentage: 85,
    letterGrade: "B",  // Auto-calculated
    gpa: 3.0,
    calculatedAt: ISODate("2026-05-15")
  },
  
  // Timestamps
  createdAt: ISODate("2026-01-05"),
  updatedAt: ISODate("2026-01-13")
}
```

**INDEXES**:
```javascript
{ student: 1, course: 1 }  // Compound unique index - prevent duplicate enrollments
{ course: 1 }  // Find all students in a course
{ student: 1, status: 1 }  // Student's active enrollments
```

**DESIGN DECISIONS**:
- **Compound Unique Index**: Student can't enroll in same course twice
- **Denormalized Attendance**: Avoids aggregating from attendance collection every time
- **Final Grade Storage**: Calculated once at course end, then fixed
- **Status Enum**: Clear lifecycle states

**PRE-SAVE HOOK** (attendance percentage):
```javascript
enrollmentSchema.pre('save', function(next) {
  if (this.attendance.totalClasses > 0) {
    this.attendance.attendancePercentage = 
      (this.attendance.attendedClasses / this.attendance.totalClasses) * 100;
  }
  next();
});
```

---

### 4. **assignments**

**PURPOSE**: Store assignment details

**SCHEMA**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439014"),
  
  // Relationships
  course: ObjectId("course_id"),
  
  // Assignment details
  title: "Homework 1: Variables and Functions",
  description: "Complete the exercises...",
  type: "homework",  // enum: ['homework', 'quiz', 'exam', 'project']
  totalPoints: 100,
  
  // Timing
  dueDate: ISODate("2026-01-20T23:59:59Z"),
  allowLateSubmission: true,
  latePenalty: 10,  // Percentage penalty per day
  
  // Visibility
  isPublished: true,  // Instructor can draft before publishing
  publishedAt: ISODate("2026-01-13"),
  
  // Timestamps
  createdAt: ISODate("2026-01-13"),
  updatedAt: ISODate("2026-01-13")
}
```

**INDEXES**:
```javascript
{ course: 1 }  // Find assignments for a course
{ course: 1, isPublished: 1 }  // Published assignments only
{ dueDate: 1 }  // Sort by due date
```

**DESIGN DECISIONS**:
- **No Student Reference**: Assignments belong to courses, submissions link to students
- **Flexible Due Date**: Instructor can extend deadlines
- **Draft Mode**: isPublished allows creating assignments without showing to students
- **Type Enum**: Allows different grading policies per type

**VALIDATION**:
```javascript
assignmentSchema.path('dueDate').validate(function(value) {
  return value > new Date();
}, 'Due date must be in the future');
```

---

### 5. **submissions**

**PURPOSE**: Store student assignment submissions

**SCHEMA**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439015"),
  
  // Relationships
  assignment: ObjectId("assignment_id"),
  student: ObjectId("student_id"),
  
  // Submission content
  submissionText: "Here is my solution...",
  attachments: [
    {
      originalName: "homework.pdf",
      filename: "1704067200-123-homework.pdf",
      path: "/uploads/assignments/1704067200-123-homework.pdf",
      size: 1048576,  // bytes
      mimetype: "application/pdf"
    }
  ],
  
  // Timing
  submittedAt: ISODate("2026-01-19T15:30:00Z"),
  isLate: false,  // Auto-calculated based on dueDate
  
  // Grading
  status: "graded",  // enum: ['submitted', 'under_review', 'graded']
  grade: {
    points: 85,  // Out of assignment.totalPoints
    percentage: 85,  // Auto-calculated
    letterGrade: "B",  // Auto-calculated
    feedback: "Good work! Watch for edge cases in problem 3.",
    gradedBy: ObjectId("instructor_id"),
    gradedAt: ISODate("2026-01-21T10:00:00Z")
  },
  
  // Timestamps
  createdAt: ISODate("2026-01-19T15:30:00Z"),
  updatedAt: ISODate("2026-01-21T10:00:00Z")
}
```

**INDEXES**:
```javascript
{ assignment: 1 }  // All submissions for an assignment
{ student: 1 }  // Student's submissions
{ assignment: 1, student: 1 }  // Unique submission per student per assignment
{ status: 1 }  // Filter by grading status
```

**DESIGN DECISIONS**:
- **Attachments as Array**: Multiple files allowed
- **isLate Flag**: Calculated at submission time, not when viewing
- **Embedded Grade**: Avoids separate grades collection for assignments
- **Status Workflow**: Clear progression from submitted → graded

**PRE-SAVE HOOK** (calculate late status):
```javascript
submissionSchema.pre('save', async function(next) {
  const assignment = await Assignment.findById(this.assignment);
  this.isLate = this.submittedAt > assignment.dueDate;
  
  if (this.grade && this.grade.points) {
    const assignment = await Assignment.findById(this.assignment);
    let percentage = (this.grade.points / assignment.totalPoints) * 100;
    
    // Apply late penalty
    if (this.isLate && assignment.latePenalty > 0) {
      percentage -= (percentage * (assignment.latePenalty / 100));
    }
    
    this.grade.percentage = Math.max(0, percentage);
    this.grade.letterGrade = calculateLetterGrade(percentage);
  }
  next();
});
```

---

### 6. **grades**

**PURPOSE**: Store final course grades (separate from assignment grades)

**SCHEMA**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439016"),
  
  // Relationships
  student: ObjectId("student_id"),
  course: ObjectId("course_id"),
  enrollment: ObjectId("enrollment_id"),
  
  // Grade details
  percentage: 87.5,
  letterGrade: "B+",  // Auto-calculated
  gpa: 3.3,  // Auto-calculated
  
  // Components (optional breakdown)
  components: [
    { name: "Assignments", weight: 40, score: 85 },
    { name: "Midterm", weight: 25, score: 90 },
    { name: "Final", weight: 25, score: 88 },
    { name: "Participation", weight: 10, score: 95 }
  ],
  
  // Status
  isFinalized: true,  // Once finalized, cannot be changed
  finalizedAt: ISODate("2026-05-15"),
  finalizedBy: ObjectId("instructor_id"),
  
  // Timestamps
  createdAt: ISODate("2026-05-15"),
  updatedAt: ISODate("2026-05-15")
}
```

**INDEXES**:
```javascript
{ student: 1, course: 1 }  // Unique grade per student per course
{ course: 1 }  // Grade distribution for course
{ student: 1 }  // Student transcript
```

**DESIGN DECISIONS**:
- **Separate from Submissions**: Final grade is different from individual assignment grades
- **GPA Calculation**: Standardized 4.0 scale
- **Components Array**: Transparent grade breakdown
- **Finalized Flag**: Immutable once set (protects academic integrity)

**LETTER GRADE CALCULATION**:
```javascript
gradeSchema.pre('save', function(next) {
  const { percentage } = this;
  
  if (percentage >= 93) {
    this.letterGrade = 'A';
    this.gpa = 4.0;
  } else if (percentage >= 90) {
    this.letterGrade = 'A-';
    this.gpa = 3.7;
  } else if (percentage >= 87) {
    this.letterGrade = 'B+';
    this.gpa = 3.3;
  } else if (percentage >= 83) {
    this.letterGrade = 'B';
    this.gpa = 3.0;
  } else if (percentage >= 80) {
    this.letterGrade = 'B-';
    this.gpa = 2.7;
  } else if (percentage >= 77) {
    this.letterGrade = 'C+';
    this.gpa = 2.3;
  } else if (percentage >= 73) {
    this.letterGrade = 'C';
    this.gpa = 2.0;
  } else if (percentage >= 70) {
    this.letterGrade = 'C-';
    this.gpa = 1.7;
  } else if (percentage >= 67) {
    this.letterGrade = 'D+';
    this.gpa = 1.3;
  } else if (percentage >= 60) {
    this.letterGrade = 'D';
    this.gpa = 1.0;
  } else {
    this.letterGrade = 'F';
    this.gpa = 0.0;
  }
  next();
});
```

---

### 7. **attendance**

**PURPOSE**: Track class attendance

**SCHEMA**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439017"),
  
  // Relationships
  course: ObjectId("course_id"),
  
  // Session details
  date: ISODate("2026-01-13"),
  
  // Attendance records (subdocuments)
  students: [
    {
      student: ObjectId("student_id"),
      status: "present",  // enum: ['present', 'absent', 'late', 'excused']
      remarks: "Arrived 10 minutes late"
    },
    {
      student: ObjectId("student_id_2"),
      status: "absent",
      remarks: ""
    }
  ],
  
  // Recorded by
  markedBy: ObjectId("instructor_id"),
  markedAt: ISODate("2026-01-13T10:15:00Z"),
  
  // Timestamps
  createdAt: ISODate("2026-01-13"),
  updatedAt: ISODate("2026-01-13")
}
```

**INDEXES**:
```javascript
{ course: 1, date: 1 }  // Unique attendance per course per day
{ course: 1 }  // Attendance history for course
{ "students.student": 1 }  // Find attendance for specific student
```

**DESIGN DECISIONS**:
- **One Document Per Class Session**: Natural grouping by date
- **Students Array**: All attendance for one session in one document
- **Status Enum**: Clear attendance states
- **Remarks Field**: Optional notes (late arrival, medical excuse)

**UPDATE ENROLLMENT ATTENDANCE**:
```javascript
// After marking attendance
for (const record of attendanceDoc.students) {
  await Enrollment.findOneAndUpdate(
    { student: record.student, course: attendanceDoc.course },
    {
      $inc: {
        'attendance.totalClasses': 1,
        ...(record.status === 'present' || record.status === 'late' 
            ? { 'attendance.attendedClasses': 1 } 
            : {})
      }
    }
  );
}
```

---

### 8. **notifications**

**PURPOSE**: Store user notifications

**SCHEMA**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439018"),
  
  // Recipient
  recipient: ObjectId("user_id"),
  
  // Notification content
  title: "Assignment Graded",
  message: "Your homework 1 has been graded. You scored 85/100.",
  type: "grade",  // enum: ['grade', 'assignment', 'enrollment', 'announcement', 'system']
  
  // Link (optional)
  targetUrl: "/dashboard/assignments/507f1f77bcf86cd799439014",
  
  // Status
  isRead: false,
  readAt: null,
  isDeleted: false,  // Soft delete
  
  // Timestamps
  createdAt: ISODate("2026-01-21T10:00:00Z"),
  updatedAt: ISODate("2026-01-21T10:00:00Z")
}
```

**INDEXES**:
```javascript
{ recipient: 1, createdAt: -1 }  // User's notifications sorted by date
{ recipient: 1, isRead: 1 }  // Unread notifications
{ type: 1 }  // Filter by notification type
```

**DESIGN DECISIONS**:
- **Per-User Documents**: Each notification is for one user
- **Soft Delete**: isDeleted preserves history
- **Target URL**: Deep linking to relevant page
- **Type Classification**: UI can show different icons per type

**STATIC METHOD** (notify all admins):
```javascript
notificationSchema.statics.notifyAllAdmins = async function(title, message) {
  const admins = await User.find({ role: 'admin', isActive: true });
  const notifications = admins.map(admin => ({
    recipient: admin._id,
    title,
    message,
    type: 'system'
  }));
  return this.insertMany(notifications);
};
```

---

## DATA RELATIONSHIPS

### One-to-Many Relationships
- **User → Courses**: One instructor creates many courses
  - `Course.instructor` references `User._id`
- **Course → Assignments**: One course has many assignments
  - `Assignment.course` references `Course._id`
- **Assignment → Submissions**: One assignment receives many submissions
  - `Submission.assignment` references `Assignment._id`

### Many-to-Many Relationships
- **Students ↔ Courses**: Many students enroll in many courses
  - **Junction Collection**: `enrollments`
  - Links `student` (User) and `course` (Course)

### Embedded vs. Referenced

**EMBEDDED** (subdocuments):
- **Course → Materials**: Materials tightly coupled to course, no independent access needed
- **Attendance → Student Records**: Daily attendance list naturally groups together
- **User → Documents**: Instructor verification documents belong to user

**REFERENCED** (separate collections):
- **Course → Instructor**: Instructor exists independently, shared across courses
- **Enrollment → Student/Course**: Junction table needs to be queryable both ways
- **Submission → Student/Assignment**: Submissions queried by student and by assignment

---

## INDEXING STRATEGY

### Compound Indexes
```javascript
// Prevent duplicate enrollments
{ student: 1, course: 1 }  // on enrollments

// Course listing with filters
{ isApproved: 1, isActive: 1, category: 1 }  // on courses

// Attendance lookup
{ course: 1, date: 1 }  // on attendance
```

### Performance Considerations
- **Frequently Queried Fields**: Indexed (email, courseCode)
- **Foreign Keys**: All reference fields indexed (instructor, student, course)
- **Filter Fields**: role, status, isApproved indexed
- **Sort Fields**: createdAt, dueDate indexed where used

### Index Trade-offs
- **Faster Reads**: Queries use indexes for quick lookups
- **Slower Writes**: Each insert/update must update indexes
- **Storage Cost**: Indexes consume disk space
- **Strategy**: Index only frequently queried fields

---

## DATA INTEGRITY

### Unique Constraints
```javascript
{ email: 1 }  // Unique email per user
{ courseCode: 1 }  // Unique course code
{ student: 1, course: 1 }  // One enrollment per student per course
```

### Referential Integrity
- MongoDB doesn't enforce foreign keys
- Application-level checks in middleware
- Example: Can't enroll in non-existent course

```javascript
enrollmentSchema.pre('save', async function(next) {
  const course = await Course.findById(this.course);
  if (!course) {
    throw new Error('Course not found');
  }
  if (course.currentEnrollment >= course.maxStudents) {
    throw new Error('Course is full');
  }
  next();
});
```

---

## AGGREGATION EXAMPLES

### Grade Distribution for Course
```javascript
db.grades.aggregate([
  { $match: { course: ObjectId("course_id") } },
  { $group: {
    _id: "$letterGrade",
    count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
]);

// Result:
[
  { _id: "A", count: 5 },
  { _id: "B", count: 10 },
  { _id: "C", count: 8 }
]
```

### Student GPA Calculation
```javascript
db.grades.aggregate([
  { $match: { student: ObjectId("student_id") } },
  { $group: {
    _id: null,
    averageGPA: { $avg: "$gpa" }
  }}
]);
```

### Pending Submissions Count
```javascript
db.submissions.aggregate([
  { $match: { status: "submitted" } },
  { $lookup: {
    from: "assignments",
    localField: "assignment",
    foreignField: "_id",
    as: "assignmentDetails"
  }},
  { $unwind: "$assignmentDetails" },
  { $group: {
    _id: "$assignmentDetails.course",
    count: { $sum: 1 }
  }}
]);
```

---

## INTERVIEW TALKING POINTS

### Schema Design
"I chose MongoDB because user roles have different fields - instructors have verification documents, students don't. Embedding these as subdocuments keeps the schema flexible."

### Indexes
"I created compound indexes on (student, course) in enrollments to enforce uniqueness and speed up lookups. Single-field indexes on foreign keys for fast joins."

### Embedded vs Referenced
"Course materials are embedded because they're always loaded with the course and don't exist independently. Submissions are separate because we query them by student and by assignment."

### Data Denormalization
"I denormalize currentEnrollment in the course document for fast display. It's updated when enrollments change. This trades write complexity for read speed."

### Aggregation
"For analytics like grade distribution, I use MongoDB's aggregation pipeline. It's like SQL GROUP BY but more powerful for nested documents."

### Referential Integrity
"MongoDB doesn't enforce foreign keys, so I validate relationships in Mongoose middleware. For example, can't enroll in a non-existent course."

### Soft Deletes
"I use soft deletes (isActive: false) instead of actually deleting records. This preserves historical data for reports while hiding from normal queries."
