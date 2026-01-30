# PROJECT OVERVIEW

## What This LMS Does

**EduManage** is a comprehensive Learning Management System that digitalizes the entire educational workflow for institutions, from course creation to final grade submission.

### Real-World Problem It Solves

Educational institutions face operational challenges:
- Manual course enrollment tracking
- Paper-based assignment submissions
- Inconsistent grading systems
- Difficulty verifying instructor qualifications
- Lack of centralized student progress monitoring
- Time-consuming attendance management

**This LMS automates all of these processes** while maintaining strict role-based access control and data integrity.

### Business Value

- **For Institutions**: Reduced administrative overhead, better compliance tracking
- **For Students**: Transparent grading, easy course access, progress tracking
- **For Instructors**: Streamlined grading workflows, analytics on student performance
- **For Admins**: Centralized control, credential verification, platform oversight

---

## User Roles and Permissions

### 🎓 STUDENT ROLE

**Primary Capabilities:**
- Browse course catalog with filtering (category, level, search)
- Enroll in courses (subject to capacity limits)
- Access course materials (PDFs, videos, documents)
- Submit assignments with text and file attachments
- View assignment feedback and grades
- Track attendance records
- Monitor overall GPA and progress
- Receive notifications (grades posted, assignments due)

**Restrictions:**
- ❌ Cannot create courses
- ❌ Cannot grade other students
- ❌ Cannot access admin functions
- ❌ Cannot view other students' grades

**Registration Flow:**
1. Register with basic information
2. **Automatically approved** ✅
3. Immediate access to browse and enroll in courses

**Key Use Cases:**
- "As a student, I want to browse available courses by category"
- "As a student, I need to submit my assignment before the deadline"
- "As a student, I want to track my attendance percentage"

---

### 👨‍🏫 INSTRUCTOR ROLE

**Primary Capabilities:**
- Create courses (after admin approval)
- Upload course materials in multiple formats
- Create assignments with due dates and grading criteria
- Set late submission policies with automatic penalties
- View all student submissions for their courses
- Grade submissions with points and written feedback
- Mark daily attendance with multiple status options
- View course analytics (enrollment, grade distribution, completion rates)
- Track pending grading workload

**Additional Responsibilities:**
- Upload qualification documents for verification
- Maintain course materials and keep them updated
- Respond to student questions via messages (if implemented)

**Restrictions:**
- ❌ Cannot enroll as a student
- ❌ Cannot approve other instructors
- ❌ Cannot modify courses created by other instructors
- ❌ Cannot access platform-wide admin functions

**Registration Flow:**
1. Register with role='instructor'
2. Fill instructor profile (qualification, experience, specialization)
3. **Upload documents** (degree certificates, teaching certificates, ID proof)
4. **Wait for admin verification** ⏳
5. Upload documents → Admin reviews → Approval
6. **Only then can create courses** ✅

**Key Use Cases:**
- "As an instructor, I need to create a new course and wait for admin approval"
- "As an instructor, I want to grade 50 student submissions efficiently"
- "As an instructor, I need to mark attendance for today's class"
- "As an instructor, I want to see which students are struggling in my course"

---

### 👨‍💼 ADMIN ROLE

**Primary Capabilities:**
- Review and verify instructor qualification documents
- Approve or reject instructor accounts with comments
- Approve or reject course creation requests
- View and manage all user accounts
- Activate or deactivate user accounts
- View platform-wide analytics:
  - Total users (students, instructors)
  - Total courses and enrollments
  - System activity metrics
- Receive notifications for pending approvals

**Core Responsibilities:**
- Quality control: Ensure only qualified instructors teach
- Course oversight: Review course content before publication
- User management: Handle account issues and disputes
- Platform health monitoring

**Restrictions:**
- ❌ Cannot create courses (admins oversee, not teach)
- ❌ Cannot enroll as students
- ❌ Should not modify grades directly (instructor responsibility)

**Registration Flow:**
1. Admin accounts created via seed script or by existing admins
2. **Immediately approved** ✅
3. Full platform access

**Key Use Cases:**
- "As an admin, I need to verify 10 instructor document submissions"
- "As an admin, I want to approve 5 pending course requests"
- "As an admin, I need to deactivate a problematic user account"
- "As an admin, I want to see total platform enrollment trends"

---

## Role Comparison Matrix

| Feature | Student | Instructor | Admin |
|---------|---------|------------|-------|
| **Registration** | Open | Open | Script/Invite |
| **Approval Required** | ❌ Auto | ✅ Yes | ❌ Auto |
| **Documents Required** | ❌ | ✅ | ❌ |
| **Browse Courses** | ✅ | ✅ | ✅ |
| **Enroll in Courses** | ✅ | ❌ | ❌ |
| **Create Courses** | ❌ | ✅ (after approval) | ❌ |
| **Upload Materials** | ❌ | ✅ | ❌ |
| **Submit Assignments** | ✅ | ❌ | ❌ |
| **Grade Assignments** | ❌ | ✅ | ❌ |
| **Mark Attendance** | ❌ | ✅ | ❌ |
| **View Own Grades** | ✅ | ❌ | ❌ |
| **View Course Analytics** | ❌ | ✅ (own courses) | ✅ (all) |
| **Verify Instructors** | ❌ | ❌ | ✅ |
| **Approve Courses** | ❌ | ❌ | ✅ |
| **User Management** | ❌ | ❌ | ✅ |

---

## Core Features

### 1. Course Management
**What**: Complete course lifecycle from creation to completion

**Features**:
- Course creation with metadata (title, code, credits, level)
- Enrollment system with capacity limits
- Course materials library (PDFs, videos, external links)
- Category-based organization
- Search and filter functionality
- Admin approval workflow

**Why Important**: Centralizes all course information and ensures only approved courses are published

---

### 2. Assignment & Submission System
**What**: Digital assignment workflow replacing paper-based submissions

**Features**:
- Assignment creation with rich descriptions
- Multiple assignment types (homework, quiz, exam, project)
- Due date management with validation
- File upload support for submissions
- Late submission tracking
- Automatic late penalty calculation
- Bulk grading interface for instructors
- Feedback system

**Why Important**: Eliminates paper submissions, provides clear deadlines, automates penalty calculation

---

### 3. Grading System
**What**: Standardized grading with automatic conversions

**Features**:
- Percentage-based grading
- Automatic letter grade calculation (A+, A, A-, B+, etc.)
- GPA calculation on 4.0 scale
- Individual assignment grades
- Final course grades
- Grade finalization (prevents changes after publishing)
- Grade history tracking

**Why Important**: Ensures consistency across courses, prevents grading errors, transparent to students

---

### 4. Attendance Tracking
**What**: Digital attendance records with automatic calculations

**Features**:
- Mark attendance per class session
- Multiple status options: present, absent, late, excused
- Automatic percentage calculation
- Attendance history per course
- Updates enrollment records automatically
- Filter and sort by date

**Why Important**: Replaces paper attendance sheets, auto-calculates percentages, easy reporting

---

### 5. Instructor Verification
**What**: Document-based credential verification system

**Features**:
- Document upload during registration
- Multiple document types supported
- Document-level approval (can reject specific docs)
- Admin review interface
- Verification status tracking
- Comments and feedback on rejections
- Notification system for status updates

**Why Important**: Ensures instructor quality, compliance with educational standards, prevents fraud

---

### 6. Authentication & Authorization
**What**: Secure access control with role-based permissions

**Features**:
- JWT-based authentication
- Password hashing with bcrypt (12 salt rounds)
- Token expiration management
- Role-based route protection
- Account activation/deactivation
- Middleware for auth checks

**Why Important**: Protects sensitive data, ensures users only access what they're authorized to

---

### 7. Notification System
**What**: In-app alerts for important events

**Features**:
- Assignment due reminders
- Grade posted notifications
- Enrollment confirmations
- Document verification updates
- Course approval notifications
- Admin alerts for pending actions
- Read/unread tracking

**Why Important**: Keeps users informed, reduces missed deadlines, improves engagement

---

### 8. Analytics & Dashboards
**What**: Role-specific insights and metrics

**Student Dashboard**:
- Enrolled courses count
- Pending assignments
- Average grade
- Attendance rate
- Upcoming deadlines

**Instructor Dashboard**:
- Total courses taught
- Total students
- Pending grading count
- Course performance metrics
- Recent activities

**Admin Dashboard**:
- Platform-wide statistics
- Pending verifications
- User growth metrics
- Course approval queue

**Why Important**: Data-driven insights, helps users prioritize actions, identifies issues early

---

## High-Level Architecture

### System Architecture (Text Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  (React SPA - Runs in Browser on Port 3000)                 │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Student    │  │  Instructor  │  │    Admin     │     │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  • React Router for navigation                               │
│  • Context API for auth state                                │
│  • Axios for HTTP requests                                   │
│  • Tailwind CSS for styling                                  │
└─────────────────────────────────────────────────────────────┘
                            ▼ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────┐
│                        API LAYER                             │
│  (Express Server - Port 5000)                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              MIDDLEWARE PIPELINE                      │  │
│  │  CORS → Body Parser → Auth → Authorize → Validate    │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  ROUTES LAYER                         │  │
│  │  /api/auth  /api/courses  /api/assignments           │  │
│  │  /api/users /api/enrollments  /api/grades            │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              BUSINESS LOGIC LAYER                     │  │
│  │  • Validation  • Authorization  • Processing          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▼ Mongoose ODM
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                          │
│  (MongoDB - Port 27017)                                      │
│                                                              │
│  Collections:                                                │
│  • users          • courses        • enrollments            │
│  • assignments    • submissions    • grades                 │
│  • attendance     • notifications  • messages               │
│                                                              │
│  • Indexed for performance                                   │
│  • Relationships via ObjectId references                     │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow Example: Student Submits Assignment

```
1. FRONTEND: Student fills form, attaches file, clicks "Submit"
   ↓
2. AXIOS: POST /api/submissions with FormData
   ↓
3. EXPRESS: Receives request
   ↓
4. CORS Middleware: Validates origin
   ↓
5. Body Parser: Parses multipart/form-data
   ↓
6. Auth Middleware: Verifies JWT → Loads user
   ↓
7. Authorization: Checks role = 'student'
   ↓
8. Validation Middleware: Validates assignmentId, files, etc.
   ↓
9. Route Handler (submissions.js):
   • Checks if assignment exists
   • Checks if student is enrolled in course
   • Calculates if submission is late
   • Stores file using Multer
   • Creates Submission document
   ↓
10. Mongoose: Saves to submissions collection
    • Pre-save hook runs (if any)
    ↓
11. Side Effects:
    • Create notification for instructor
    • Update assignment submission count
    ↓
12. Response: Returns submission confirmation
    ↓
13. FRONTEND: Shows success toast, updates UI
```

---

## Technology Decisions Explained

### Why MongoDB over PostgreSQL?

**Decision**: MongoDB (NoSQL)

**Reasons**:
1. **Flexible Schema**: User documents have role-specific fields (instructors have qualification data, students don't)
2. **Nested Documents**: Course materials, instructor documents stored as arrays within parent documents
3. **Rapid Development**: No migrations needed for schema changes
4. **Document Model**: Educational data (courses with materials) fits naturally

**Trade-off**: Lost ACID transactions across collections, but acceptable for this use case

---

### Why JWT over Session-Based Auth?

**Decision**: JSON Web Tokens (JWT)

**Reasons**:
1. **Stateless**: No session storage on server, scales horizontally
2. **Mobile-Ready**: Easy to implement in mobile apps
3. **Microservices-Friendly**: Token can be verified by any service
4. **Performance**: No database lookup on every request

**Trade-off**: Tokens can't be revoked before expiration (handled with short expiry + isActive flag)

---

### Why React over Vue/Angular?

**Decision**: React 18

**Reasons**:
1. **Job Market**: Most in-demand frontend framework
2. **Ecosystem**: Vast library ecosystem (Router, Chart.js, etc.)
3. **Component Reusability**: Perfect for dashboards with similar patterns
4. **Interview Relevance**: More interview questions about React than alternatives

**Trade-off**: More boilerplate than Vue, but industry standard

---

### Why Express over NestJS?

**Decision**: Express.js

**Reasons**:
1. **Simplicity**: Lightweight, easy to understand
2. **Flexibility**: No opinionated structure
3. **Learning Curve**: Easier for interviews to explain
4. **Performance**: Minimal overhead

**Trade-off**: Less built-in structure than NestJS, but demonstrates architectural decisions

---

## Project Goals

### Primary Goals Achieved
✅ Role-based access control across 3 distinct roles
✅ Complete course lifecycle management
✅ Document verification workflow
✅ Automated grading calculations
✅ Attendance tracking with percentages
✅ File upload handling with security
✅ Responsive UI with Tailwind CSS
✅ RESTful API architecture
✅ JWT authentication
✅ Input validation on all endpoints

### Interview Demonstration Points
- Full-stack proficiency (frontend + backend + database)
- Security best practices (hashing, JWT, RBAC)
- Real-world problem solving (credential verification)
- Database design with relationships
- API design patterns
- Error handling strategies
- State management approaches
- File upload implementation

---

## Use Case Scenarios

### Scenario 1: New Instructor Joins Platform
1. Instructor registers with qualification details
2. System creates account with `isApproved: false`
3. Instructor uploads certificates and ID
4. Admin receives notification
5. Admin reviews documents, approves account
6. Instructor receives approval notification
7. Instructor creates first course
8. Admin reviews and approves course
9. Course appears in student catalog
10. Students can enroll

### Scenario 2: Student Completes Assignment
1. Student views assignment in course
2. Student writes submission text and uploads file
3. System checks due date, marks as on-time/late
4. Submission stored, instructor notified
5. Instructor views submission, grades it
6. System calculates percentage and letter grade
7. Student receives grade notification
8. Grade appears in student's grade history
9. Contributes to overall course grade

### Scenario 3: Admin Manages Platform
1. Admin logs in, sees dashboard
2. Notices 5 pending instructor verifications
3. Reviews documents, approves 4, rejects 1 with comments
4. Sees 3 pending course approvals
5. Reviews course content, approves all
6. Views platform metrics (users, enrollments)
7. Notices spike in new registrations
8. Checks user activity logs

---

## Success Metrics

### For Students
- Quick course enrollment (< 3 clicks)
- Transparent grading (see all grades immediately)
- No missed assignments (notification system)
- Easy file uploads

### For Instructors
- Streamlined grading workflow
- Automated attendance calculations
- Course analytics for insights
- Reduced administrative burden

### For Admins
- Centralized verification system
- Quick approval workflows
- Platform health visibility
- User management tools

### For Institution
- Reduced paper usage (100% digital)
- Better compliance tracking
- Automated reporting
- Data-driven decision making
