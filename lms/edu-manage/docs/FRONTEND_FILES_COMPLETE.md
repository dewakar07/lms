# FRONTEND FILES - Complete Explanation

Every React component explained with purpose, state management, API calls, and UI patterns.

---

## ROOT FILES

### `/src/index.js`

**PURPOSE**: Application entry point

**CODE**:
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

**EXPLANATION**:
- Wraps App in AuthProvider for global auth state
- StrictMode enabled for development warnings
- Tailwind CSS imported through index.css

**INTERVIEW**: "The AuthProvider at root level means every component can access user state without prop drilling."

---

### `/src/App.js`

**PURPOSE**: Main routing and layout orchestration

**CODE STRUCTURE**:
```javascript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';
import PublicLayout from './components/Layout/PublicLayout';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* Student Routes */}
          <Route path="student" element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} />
          
          {/* Instructor Routes */}
          <Route path="instructor" element={<ProtectedRoute requiredRole="instructor"><InstructorDashboard /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          
          {/* Shared Routes */}
          <Route path="courses" element={<CourseList />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}
```

**ROUTING STRATEGY**:
- **Public Routes**: Wrapped in PublicLayout (no auth required)
- **Protected Routes**: Wrapped in ProtectedRoute (requires authentication)
- **Role-Based Routes**: ProtectedRoute with requiredRole prop

**ROUTE PROTECTION LEVELS**:
1. Authenticated only: `<ProtectedRoute><Component /></ProtectedRoute>`
2. Role-specific: `<ProtectedRoute requiredRole="admin"><Component /></ProtectedRoute>`

**INTERVIEW**: "I use nested routes with Outlet components for layouts. ProtectedRoute checks authentication and roles before rendering sensitive routes."

---

## CONTEXT

### `/src/context/AuthContext.js`

**PURPOSE**: Global authentication state management

**FULL CODE**:
```javascript
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const { data } = await axios.get('/api/auth/me');
          setUser(data.user);
        } catch (error) {
          console.error('Failed to load user:', error);
          logout();
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      toast.success('Login successful!');
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await axios.post('/api/auth/register', userData);
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      toast.success('Registration successful!');
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully');
  };

  const refreshUser = async () => {
    try {
      const { data } = await axios.get('/api/auth/me');
      setUser(data.user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

**KEY FEATURES**:
1. **Token Management**: Stores JWT in localStorage, auto-sets axios headers
2. **Auto-Load User**: On app start, verifies token and loads user profile
3. **Global Access**: useAuth hook available in any component
4. **Error Handling**: Auto-logout on token expiration

**STATE MANAGEMENT**:
- `user`: Current user object or null
- `loading`: True during initial load
- `token`: JWT token string

**METHODS**:
- `login(email, password)`: Authenticate and store token
- `register(userData)`: Create account and auto-login
- `logout()`: Clear token and user data
- `refreshUser()`: Reload user profile (after updates)

**INTERVIEW**: "I chose Context API over Redux for authentication because auth state is accessed globally but changes infrequently. Context API is simpler for this use case."

---

## AUTHENTICATION COMPONENTS

### `/src/components/Auth/Login.js`

**PURPOSE**: User login form

**STATE**:
```javascript
const [formData, setFormData] = useState({
  email: '',
  password: ''
});
const [loading, setLoading] = useState(false);
```

**FORM HANDLING**:
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    await login(formData.email, formData.password);
    // Redirect based on role
    const redirectPath = user.role === 'student' ? '/dashboard/student'
                        : user.role === 'instructor' ? '/dashboard/instructor'
                        : '/dashboard/admin';
    navigate(redirectPath);
  } catch (error) {
    // Error handled in AuthContext
  } finally {
    setLoading(false);
  }
};
```

**UI FEATURES**:
- Email and password input fields
- Remember me checkbox
- Forgot password link
- Loading spinner during submission
- Error message display

**VALIDATION**:
- Required fields
- Email format validation
- Minimum password length

**INTERVIEW**: "After successful login, I redirect users to role-specific dashboards. The AuthContext handles token storage and API header configuration."

---

### `/src/components/Auth/Register.js`

**PURPOSE**: User registration form with role selection

**STATE**:
```javascript
const [formData, setFormData] = useState({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'student',
  phone: '',
  dateOfBirth: '',
  // Instructor-specific fields
  instructorProfile: {
    qualification: '',
    experience: 0,
    specialization: [],
    bio: '',
    linkedIn: ''
  }
});
const [showInstructorFields, setShowInstructorFields] = useState(false);
```

**CONDITIONAL RENDERING**:
```javascript
{formData.role === 'instructor' && (
  <>
    <input
      type="text"
      name="instructorProfile.qualification"
      placeholder="Highest Qualification"
      value={formData.instructorProfile.qualification}
      onChange={handleInstructorFieldChange}
      required
    />
    <input
      type="number"
      name="instructorProfile.experience"
      placeholder="Years of Experience"
      value={formData.instructorProfile.experience}
      onChange={handleInstructorFieldChange}
      required
    />
    {/* More instructor fields */}
  </>
)}
```

**VALIDATION**:
```javascript
const validateForm = () => {
  if (formData.password !== formData.confirmPassword) {
    toast.error('Passwords do not match');
    return false;
  }
  if (formData.password.length < 6) {
    toast.error('Password must be at least 6 characters');
    return false;
  }
  if (formData.role === 'instructor' && !formData.instructorProfile.qualification) {
    toast.error('Qualification is required for instructors');
    return false;
  }
  return true;
};
```

**POST-REGISTRATION FLOW**:
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  try {
    const data = await register(formData);
    if (data.needsDocuments) {
      toast.info('Please upload your verification documents');
      navigate('/dashboard/instructor/documents');
    } else {
      navigate('/dashboard/student');
    }
  } catch (error) {
    // Handled in context
  }
};
```

**INTERVIEW**: "Registration has conditional fields based on role. Instructors must provide qualifications. After registration, instructors are redirected to document upload."

---

### `/src/components/Auth/DocumentUpload.js`

**PURPOSE**: Instructor document verification upload

**STATE**:
```javascript
const [files, setFiles] = useState([]);
const [uploading, setUploading] = useState(false);
```

**FILE HANDLING**:
```javascript
const handleFileChange = (e) => {
  const selectedFiles = Array.from(e.target.files);
  // Validate file types
  const validFiles = selectedFiles.filter(file => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error(`${file.name} is not a valid file type`);
      return false;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast.error(`${file.name} exceeds 10MB`);
      return false;
    }
    return true;
  });
  setFiles(validFiles);
};
```

**UPLOAD LOGIC**:
```javascript
const handleUpload = async () => {
  if (files.length === 0) {
    toast.error('Please select files to upload');
    return;
  }

  const formData = new FormData();
  files.forEach(file => {
    formData.append('documents', file);
  });

  setUploading(true);
  try {
    await axios.post('/api/auth/upload-documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    toast.success('Documents uploaded successfully!');
    refreshUser(); // Update user state
    navigate('/dashboard/instructor');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Upload failed');
  } finally {
    setUploading(false);
  }
};
```

**UI FEATURES**:
- Drag-and-drop zone
- File preview list
- Upload progress indicator
- Accepted file types shown
- Size limit warnings

**INTERVIEW**: "Document upload uses FormData for multipart uploads. I validate file types and sizes client-side before uploading to prevent unnecessary server load."

---

### `/src/components/Auth/ProtectedRoute.js`

**PURPOSE**: Route guard with authentication and authorization

**CODE**:
```javascript
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../Common/LoadingSpinner';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    // Redirect to login, save attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Unauthorized - redirect to their dashboard
    const redirectPath = user.role === 'student' ? '/dashboard/student'
                        : user.role === 'instructor' ? '/dashboard/instructor'
                        : '/dashboard/admin';
    return <Navigate to={redirectPath} replace />;
  }

  // Instructor-specific check
  if (user.role === 'instructor' && !user.isApproved) {
    // Allow access to profile and document upload only
    const allowedPaths = ['/dashboard/instructor/documents', '/profile'];
    if (!allowedPaths.some(path => location.pathname.includes(path))) {
      return <Navigate to="/dashboard/instructor/pending" replace />;
    }
  }

  return children;
};
```

**PROTECTION LEVELS**:
1. **Not authenticated**: Redirect to login
2. **Wrong role**: Redirect to their own dashboard
3. **Instructor not approved**: Redirect to pending page

**INTERVIEW**: "ProtectedRoute is a wrapper component that checks authentication and role before rendering children. It saves the attempted location so we can redirect back after login."

---

## DASHBOARD COMPONENTS

### `/src/components/Dashboard/StudentDashboard.js`

**PURPOSE**: Student main dashboard with course overview and quick actions

**STATE**:
```javascript
const [dashboardData, setDashboardData] = useState({
  totalEnrollments: 0,
  pendingAssignments: 0,
  averageGrade: 0,
  averageAttendance: 0,
  upcomingDeadlines: []
});
const [loading, setLoading] = useState(true);
```

**DATA LOADING**:
```javascript
useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      const { data } = await axios.get('/api/analytics/dashboard');
      setDashboardData(data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  fetchDashboardData();
}, []);
```

**UI SECTIONS**:
1. **Stats Cards**:
```javascript
<div className="grid grid-cols-4 gap-4">
  <StatCard
    title="Total Enrollments"
    value={dashboardData.totalEnrollments}
    icon={<BookIcon />}
  />
  <StatCard
    title="Pending Assignments"
    value={dashboardData.pendingAssignments}
    icon={<AssignmentIcon />}
  />
  <StatCard
    title="Average Grade"
    value={`${dashboardData.averageGrade}%`}
    icon={<GradeIcon />}
  />
  <StatCard
    title="Attendance"
    value={`${dashboardData.averageAttendance}%`}
    icon={<AttendanceIcon />}
  />
</div>
```

2. **Upcoming Deadlines**:
```javascript
<div className="bg-white rounded-lg shadow p-6">
  <h2 className="text-xl font-bold mb-4">Upcoming Deadlines</h2>
  {dashboardData.upcomingDeadlines.map(deadline => (
    <div key={deadline._id} className="border-b py-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">{deadline.title}</h3>
          <p className="text-sm text-gray-600">{deadline.course.title}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">
            {formatDistanceToNow(new Date(deadline.dueDate), { addSuffix: true })}
          </p>
          <Link to={`/dashboard/assignments/${deadline._id}`}>
            View Assignment →
          </Link>
        </div>
      </div>
    </div>
  ))}
</div>
```

3. **Quick Actions**:
```javascript
<div className="grid grid-cols-3 gap-4">
  <QuickActionCard
    title="My Courses"
    icon={<CourseIcon />}
    link="/dashboard/courses"
  />
  <QuickActionCard
    title="Assignments"
    icon={<AssignmentIcon />}
    link="/dashboard/assignments"
  />
  <QuickActionCard
    title="Grades"
    icon={<GradeIcon />}
    link="/dashboard/grades"
  />
</div>
```

**INTERVIEW**: "Student dashboard shows at-a-glance metrics and upcoming deadlines. I use formatDistanceToNow for relative date formatting like '3 days from now'."

---

### `/src/components/Dashboard/InstructorDashboard.js`

**PURPOSE**: Instructor dashboard with course management and grading queue

**STATE**:
```javascript
const [dashboardData, setDashboardData] = useState({
  totalCourses: 0,
  totalStudents: 0,
  totalAssignments: 0,
  pendingGrading: 0,
  recentActivities: []
});
```

**UI SECTIONS**:
1. **Instructor Stats**:
   - Total courses taught
   - Total students across all courses
   - Total assignments created
   - Pending submissions to grade

2. **Pending Grading Queue**:
```javascript
<div className="bg-white rounded-lg shadow p-6">
  <h2 className="text-xl font-bold mb-4">
    Pending Grading ({dashboardData.pendingGrading})
  </h2>
  {dashboardData.pendingSubmissions?.map(submission => (
    <div key={submission._id} className="border-b py-3">
      <div className="flex justify-between">
        <div>
          <h3 className="font-semibold">{submission.assignment.title}</h3>
          <p className="text-sm text-gray-600">
            Student: {submission.student.firstName} {submission.student.lastName}
          </p>
          <p className="text-xs text-gray-500">
            Submitted {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
          </p>
        </div>
        <Link
          to={`/dashboard/assignments/${submission.assignment._id}/submissions`}
          className="btn btn-primary"
        >
          Grade
        </Link>
      </div>
    </div>
  ))}
</div>
```

3. **Course Management**:
   - List of active courses
   - Quick links to course materials
   - Create new course button

4. **Recent Activities**:
   - New enrollments
   - Recent submissions
   - Student messages

**INTERVIEW**: "Instructor dashboard prioritizes grading workflow. The pending grading queue is sorted by submission date to ensure timely feedback."

---

### `/src/components/Dashboard/AdminDashboard.js`

**PURPOSE**: Admin control panel with system oversight

**STATE**:
```javascript
const [stats, setStats] = useState({
  totalUsers: 0,
  totalStudents: 0,
  totalInstructors: 0,
  totalCourses: 0,
  pendingVerifications: 0,
  pendingCourseApprovals: 0
});
const [pendingInstructors, setPendingInstructors] = useState([]);
const [pendingCourses, setPendingCourses] = useState([]);
```

**UI SECTIONS**:
1. **System Stats**: User counts, course counts, enrollment metrics

2. **Pending Instructor Verifications**:
```javascript
<div className="bg-white rounded-lg shadow p-6">
  <h2 className="text-xl font-bold mb-4">
    Pending Instructor Verifications ({pendingInstructors.length})
  </h2>
  {pendingInstructors.map(instructor => (
    <div key={instructor._id} className="border-b py-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">
            {instructor.firstName} {instructor.lastName}
          </h3>
          <p className="text-sm text-gray-600">{instructor.email}</p>
          <p className="text-xs text-gray-500">
            Qualification: {instructor.instructorProfile.qualification}
          </p>
          <p className="text-xs text-gray-500">
            Experience: {instructor.instructorProfile.experience} years
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => viewDocuments(instructor._id)}
            className="btn btn-secondary"
          >
            View Documents
          </button>
          <button
            onClick={() => approveInstructor(instructor._id)}
            className="btn btn-success"
          >
            Approve
          </button>
          <button
            onClick={() => rejectInstructor(instructor._id)}
            className="btn btn-danger"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  ))}
</div>
```

3. **Pending Course Approvals**:
   - Similar structure to instructor verifications
   - Approve/reject course publication

4. **User Management Quick Access**:
   - Link to full user management
   - Recent user registrations
   - Active/inactive user counts

**APPROVAL LOGIC**:
```javascript
const approveInstructor = async (instructorId) => {
  try {
    await axios.put(`/api/users/${instructorId}/approve`);
    toast.success('Instructor approved successfully');
    // Refresh list
    setPendingInstructors(prev => prev.filter(i => i._id !== instructorId));
    setStats(prev => ({ ...prev, pendingVerifications: prev.pendingVerifications - 1 }));
  } catch (error) {
    toast.error('Approval failed');
  }
};
```

**INTERVIEW**: "Admin dashboard focuses on pending approvals. I show instructor qualifications inline so admins can make quick decisions without navigating away."

---

## COURSE COMPONENTS

### `/src/components/Courses/CourseList.js`

**PURPOSE**: Browse and search courses

**STATE**:
```javascript
const [courses, setCourses] = useState([]);
const [filters, setFilters] = useState({
  search: '',
  category: '',
  level: ''
});
const [pagination, setPagination] = useState({
  current: 1,
  pages: 1,
  total: 0
});
const [loading, setLoading] = useState(true);
```

**FETCHING WITH FILTERS**:
```javascript
useEffect(() => {
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.current,
        limit: 12,
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.level && { level: filters.level })
      });

      const { data } = await axios.get(`/api/courses?${queryParams}`);
      setCourses(data.courses);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  const timeoutId = setTimeout(fetchCourses, 300);
  return () => clearTimeout(timeoutId);
}, [filters, pagination.current]);
```

**FILTER UI**:
```javascript
<div className="flex gap-4 mb-6">
  <input
    type="text"
    placeholder="Search courses..."
    value={filters.search}
    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
    className="input flex-1"
  />
  <select
    value={filters.category}
    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
    className="select"
  >
    <option value="">All Categories</option>
    <option value="Computer Science">Computer Science</option>
    <option value="Mathematics">Mathematics</option>
    <option value="Physics">Physics</option>
  </select>
  <select
    value={filters.level}
    onChange={(e) => setFilters({ ...filters, level: e.target.value })}
    className="select"
  >
    <option value="">All Levels</option>
    <option value="Beginner">Beginner</option>
    <option value="Intermediate">Intermediate</option>
    <option value="Advanced">Advanced</option>
  </select>
</div>
```

**COURSE CARD**:
```javascript
<div className="grid grid-cols-3 gap-6">
  {courses.map(course => (
    <Link
      key={course._id}
      to={`/dashboard/courses/${course._id}`}
      className="bg-white rounded-lg shadow hover:shadow-lg transition"
    >
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2">{course.title}</h3>
        <p className="text-gray-600 mb-4">{course.courseCode}</p>
        <div className="flex items-center gap-2 mb-2">
          <span className="badge">{course.level}</span>
          <span className="badge">{course.category}</span>
        </div>
        <p className="text-sm text-gray-700 mb-4">
          {course.description.substring(0, 100)}...
        </p>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {course.instructor.firstName} {course.instructor.lastName}
          </span>
          <span className="font-bold text-primary">${course.fees}</span>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          {course.currentEnrollment}/{course.maxStudents} enrolled
        </div>
      </div>
    </Link>
  ))}
</div>
```

**PAGINATION**:
```javascript
<div className="flex justify-center gap-2 mt-8">
  <button
    onClick={() => setPagination({ ...pagination, current: pagination.current - 1 })}
    disabled={!pagination.hasPrev}
    className="btn"
  >
    Previous
  </button>
  <span className="px-4 py-2">
    Page {pagination.current} of {pagination.pages}
  </span>
  <button
    onClick={() => setPagination({ ...pagination, current: pagination.current + 1 })}
    disabled={!pagination.hasNext}
    className="btn"
  >
    Next
  </button>
</div>
```

**INTERVIEW**: "I debounce search input to avoid excessive API calls. The filter state updates immediately but the API call waits 300ms after the user stops typing."

---

### `/src/components/Courses/CourseDetail.js`

**PURPOSE**: View course details and enroll

**STATE**:
```javascript
const [course, setCourse] = useState(null);
const [isEnrolled, setIsEnrolled] = useState(false);
const [enrolling, setEnrolling] = useState(false);
const [loading, setLoading] = useState(true);
```

**DATA LOADING**:
```javascript
const { id } = useParams();
const { user } = useAuth();

useEffect(() => {
  const fetchCourse = async () => {
    try {
      const { data } = await axios.get(`/api/courses/${id}`);
      setCourse(data.course);
      setIsEnrolled(data.isEnrolled); // Backend checks enrollment
    } catch (error) {
      toast.error('Course not found');
      navigate('/dashboard/courses');
    } finally {
      setLoading(false);
    }
  };
  fetchCourse();
}, [id]);
```

**ENROLLMENT LOGIC**:
```javascript
const handleEnroll = async () => {
  if (!user) {
    toast.error('Please login to enroll');
    navigate('/login');
    return;
  }

  if (user.role !== 'student') {
    toast.error('Only students can enroll in courses');
    return;
  }

  setEnrolling(true);
  try {
    await axios.post('/api/enrollments', { courseId: course._id });
    toast.success('Enrolled successfully!');
    setIsEnrolled(true);
    setCourse({ ...course, currentEnrollment: course.currentEnrollment + 1 });
  } catch (error) {
    toast.error(error.response?.data?.message || 'Enrollment failed');
  } finally {
    setEnrolling(false);
  }
};
```

**UI SECTIONS**:
1. **Course Header**:
   - Title, code, instructor
   - Level, category badges
   - Enrollment count

2. **Course Info**:
   - Full description
   - Prerequisites list
   - Credits and fees
   - Start/end dates

3. **Enrollment Button**:
```javascript
{!isEnrolled ? (
  <button
    onClick={handleEnroll}
    disabled={enrolling || course.currentEnrollment >= course.maxStudents}
    className="btn btn-primary btn-lg"
  >
    {enrolling ? 'Enrolling...' : 
     course.currentEnrollment >= course.maxStudents ? 'Course Full' :
     `Enroll Now - $${course.fees}`}
  </button>
) : (
  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
    You are enrolled in this course
  </div>
)}
```

4. **Course Materials** (if enrolled):
```javascript
{isEnrolled && (
  <div className="mt-8">
    <h2 className="text-2xl font-bold mb-4">Course Materials</h2>
    {course.materials.map(material => (
      <div key={material._id} className="border-b py-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">{material.title}</h3>
            <p className="text-sm text-gray-600">{material.type.toUpperCase()}</p>
          </div>
          <a
            href={`/api/courses/${course._id}/materials/${material._id}/download`}
            className="btn btn-secondary"
            download
          >
            Download
          </a>
        </div>
      </div>
    ))}
  </div>
)}
```

**INTERVIEW**: "CourseDetail shows public info to everyone but course materials only to enrolled students. The backend enforces this too, so it's not just UI-level protection."

---

### `/src/components/Courses/CreateCourse.js`

**PURPOSE**: Instructor creates new course

**STATE**:
```javascript
const [formData, setFormData] = useState({
  title: '',
  description: '',
  courseCode: '',
  credits: 3,
  maxStudents: 30,
  fees: 0,
  category: '',
  level: 'Beginner',
  prerequisites: []
});
const [submitting, setSubmitting] = useState(false);
```

**FORM HANDLING**:
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);
  try {
    const { data } = await axios.post('/api/courses', formData);
    toast.success('Course created! Pending admin approval.');
    navigate(`/dashboard/courses/${data.course._id}`);
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to create course');
  } finally {
    setSubmitting(false);
  }
};
```

**DYNAMIC PREREQUISITES**:
```javascript
const [prerequisiteInput, setPrerequisiteInput] = useState('');

const addPrerequisite = () => {
  if (prerequisiteInput.trim()) {
    setFormData({
      ...formData,
      prerequisites: [...formData.prerequisites, prerequisiteInput.trim()]
    });
    setPrerequisiteInput('');
  }
};

const removePrerequisite = (index) => {
  setFormData({
    ...formData,
    prerequisites: formData.prerequisites.filter((_, i) => i !== index)
  });
};

// UI
<div>
  <label>Prerequisites</label>
  <div className="flex gap-2">
    <input
      type="text"
      value={prerequisiteInput}
      onChange={(e) => setPrerequisiteInput(e.target.value)}
      placeholder="Enter course code"
      className="input flex-1"
    />
    <button type="button" onClick={addPrerequisite} className="btn">
      Add
    </button>
  </div>
  <div className="flex flex-wrap gap-2 mt-2">
    {formData.prerequisites.map((prereq, index) => (
      <span key={index} className="badge badge-lg">
        {prereq}
        <button
          type="button"
          onClick={() => removePrerequisite(index)}
          className="ml-2"
        >
          ×
        </button>
      </span>
    ))}
  </div>
</div>
```

**INTERVIEW**: "After course creation, it requires admin approval. I show a success message explaining this workflow so instructors know what to expect."

---

## ASSIGNMENT COMPONENTS

### `/src/components/Assignments/AssignmentList.js`

**PURPOSE**: View all assignments for student or instructor

**STATE**:
```javascript
const [assignments, setAssignments] = useState([]);
const [filter, setFilter] = useState('all'); // all, pending, submitted, graded
const [loading, setLoading] = useState(true);
```

**FETCH LOGIC**:
```javascript
useEffect(() => {
  const fetchAssignments = async () => {
    try {
      const { data } = await axios.get('/api/assignments');
      setAssignments(data.assignments);
    } catch (error) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };
  fetchAssignments();
}, []);
```

**FILTERING**:
```javascript
const filteredAssignments = assignments.filter(assignment => {
  if (filter === 'pending') return !assignment.isSubmitted;
  if (filter === 'submitted') return assignment.isSubmitted && !assignment.grade;
  if (filter === 'graded') return assignment.grade;
  return true;
});
```

**ASSIGNMENT CARD**:
```javascript
{filteredAssignments.map(assignment => (
  <Link
    key={assignment._id}
    to={`/dashboard/assignments/${assignment._id}`}
    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
  >
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-xl font-bold mb-2">{assignment.title}</h3>
        <p className="text-gray-600 mb-2">{assignment.course.title}</p>
        <div className="flex gap-2">
          <span className="badge">{assignment.type}</span>
          <span className="badge">{assignment.totalPoints} points</span>
        </div>
      </div>
      <div className="text-right">
        {assignment.isSubmitted ? (
          assignment.grade ? (
            <div className="bg-green-100 px-3 py-1 rounded">
              Grade: {assignment.grade.percentage}%
            </div>
          ) : (
            <div className="bg-yellow-100 px-3 py-1 rounded">
              Submitted
            </div>
          )
        ) : (
          <div className="bg-red-100 px-3 py-1 rounded">
            Pending
          </div>
        )}
      </div>
    </div>
    <div className="mt-4 text-sm text-gray-600">
      Due: {format(new Date(assignment.dueDate), 'PPP p')}
      {new Date() > new Date(assignment.dueDate) && !assignment.isSubmitted && (
        <span className="text-red-600 ml-2">Overdue</span>
      )}
    </div>
  </Link>
))}
```

**FILTER TABS**:
```javascript
<div className="flex gap-2 mb-6">
  <button
    onClick={() => setFilter('all')}
    className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
  >
    All ({assignments.length})
  </button>
  <button
    onClick={() => setFilter('pending')}
    className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
  >
    Pending ({assignments.filter(a => !a.isSubmitted).length})
  </button>
  <button
    onClick={() => setFilter('submitted')}
    className={`btn ${filter === 'submitted' ? 'btn-primary' : 'btn-secondary'}`}
  >
    Submitted ({assignments.filter(a => a.isSubmitted && !a.grade).length})
  </button>
  <button
    onClick={() => setFilter('graded')}
    className={`btn ${filter === 'graded' ? 'btn-primary' : 'btn-secondary'}`}
  >
    Graded ({assignments.filter(a => a.grade).length})
  </button>
</div>
```

**INTERVIEW**: "Assignment list shows status badges (pending/submitted/graded) for quick visual scanning. The filter tabs update counts dynamically based on submission status."

---

### `/src/components/Assignments/AssignmentDetail.js`

**PURPOSE**: View assignment details and submit

**STATE**:
```javascript
const [assignment, setAssignment] = useState(null);
const [submission, setSubmission] = useState(null);
const [submissionText, setSubmissionText] = useState('');
const [files, setFiles] = useState([]);
const [submitting, setSubmitting] = useState(false);
```

**FETCH DATA**:
```javascript
const { id } = useParams();

useEffect(() => {
  const fetchAssignment = async () => {
    try {
      const { data } = await axios.get(`/api/assignments/${id}`);
      setAssignment(data.assignment);
      if (data.submission) {
        setSubmission(data.submission);
      }
    } catch (error) {
      toast.error('Assignment not found');
      navigate('/dashboard/assignments');
    }
  };
  fetchAssignment();
}, [id]);
```

**SUBMISSION FORM**:
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!submissionText && files.length === 0) {
    toast.error('Please provide submission text or upload files');
    return;
  }

  const formData = new FormData();
  formData.append('assignmentId', assignment._id);
  formData.append('submissionText', submissionText);
  files.forEach(file => {
    formData.append('files', file);
  });

  setSubmitting(true);
  try {
    const { data } = await axios.post('/api/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    toast.success('Assignment submitted successfully!');
    setSubmission(data.submission);
  } catch (error) {
    toast.error(error.response?.data?.message || 'Submission failed');
  } finally {
    setSubmitting(false);
  }
};
```

**CONDITIONAL RENDERING**:
```javascript
{submission ? (
  // Show existing submission
  <div className="bg-gray-100 rounded-lg p-6">
    <h2 className="text-xl font-bold mb-4">Your Submission</h2>
    <p className="mb-4">{submission.submissionText}</p>
    {submission.attachments.length > 0 && (
      <div>
        <h3 className="font-semibold mb-2">Attachments:</h3>
        {submission.attachments.map((file, index) => (
          <a
            key={index}
            href={file.path}
            download={file.originalName}
            className="block text-blue-600 hover:underline"
          >
            {file.originalName}
          </a>
        ))}
      </div>
    )}
    <p className="text-sm text-gray-600 mt-4">
      Submitted: {format(new Date(submission.submittedAt), 'PPP p')}
    </p>
    {submission.isLate && (
      <p className="text-red-600 text-sm">Late Submission</p>
    )}
    {submission.grade && (
      <div className="mt-4 bg-green-100 p-4 rounded">
        <h3 className="font-bold">Grade: {submission.grade.percentage}%</h3>
        <p className="text-sm mt-2">{submission.grade.feedback}</p>
      </div>
    )}
  </div>
) : (
  // Show submission form
  <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
    <h2 className="text-xl font-bold mb-4">Submit Assignment</h2>
    <div className="mb-4">
      <label className="block font-semibold mb-2">Submission Text</label>
      <textarea
        value={submissionText}
        onChange={(e) => setSubmissionText(e.target.value)}
        rows="6"
        className="textarea w-full"
        placeholder="Enter your submission..."
      />
    </div>
    <div className="mb-4">
      <label className="block font-semibold mb-2">Attach Files</label>
      <input
        type="file"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files))}
        className="input"
      />
      {files.length > 0 && (
        <div className="mt-2 text-sm text-gray-600">
          {files.map((file, index) => (
            <div key={index}>{file.name}</div>
          ))}
        </div>
      )}
    </div>
    {new Date() > new Date(assignment.dueDate) && (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        This assignment is past due. {assignment.allowLateSubmission ? 
          `A ${assignment.latePenalty}% penalty will be applied.` :
          'Late submissions are not allowed.'}
      </div>
    )}
    <button
      type="submit"
      disabled={submitting || (new Date() > new Date(assignment.dueDate) && !assignment.allowLateSubmission)}
      className="btn btn-primary"
    >
      {submitting ? 'Submitting...' : 'Submit Assignment'}
    </button>
  </form>
)}
```

**INTERVIEW**: "AssignmentDetail shows the submission form if not submitted, otherwise shows the existing submission with grade if available. It warns about late penalties before submission."

---

### `/src/components/Assignments/CreateAssignment.js`

**PURPOSE**: Instructor creates assignment

**STATE**:
```javascript
const [formData, setFormData] = useState({
  courseId: '',
  title: '',
  description: '',
  type: 'homework',
  totalPoints: 100,
  dueDate: '',
  allowLateSubmission: false,
  latePenalty: 10
});
const [courses, setCourses] = useState([]); // Instructor's courses
```

**LOAD INSTRUCTOR COURSES**:
```javascript
useEffect(() => {
  const fetchCourses = async () => {
    try {
      const { data } = await axios.get('/api/courses?instructor=me');
      setCourses(data.courses);
    } catch (error) {
      toast.error('Failed to load courses');
    }
  };
  fetchCourses();
}, []);
```

**FORM**:
```javascript
<form onSubmit={handleSubmit}>
  <select
    value={formData.courseId}
    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
    required
    className="select"
  >
    <option value="">Select Course</option>
    {courses.map(course => (
      <option key={course._id} value={course._id}>
        {course.title} ({course.courseCode})
      </option>
    ))}
  </select>

  <input
    type="text"
    placeholder="Assignment Title"
    value={formData.title}
    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
    required
    className="input"
  />

  <textarea
    placeholder="Description and instructions"
    value={formData.description}
    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
    rows="6"
    required
    className="textarea"
  />

  <select
    value={formData.type}
    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
    className="select"
  >
    <option value="homework">Homework</option>
    <option value="quiz">Quiz</option>
    <option value="exam">Exam</option>
    <option value="project">Project</option>
  </select>

  <input
    type="number"
    placeholder="Total Points"
    value={formData.totalPoints}
    onChange={(e) => setFormData({ ...formData, totalPoints: parseInt(e.target.value) })}
    required
    className="input"
  />

  <input
    type="datetime-local"
    value={formData.dueDate}
    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
    required
    className="input"
  />

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={formData.allowLateSubmission}
      onChange={(e) => setFormData({ ...formData, allowLateSubmission: e.target.checked })}
    />
    Allow Late Submissions
  </label>

  {formData.allowLateSubmission && (
    <input
      type="number"
      placeholder="Late Penalty (%)"
      value={formData.latePenalty}
      onChange={(e) => setFormData({ ...formData, latePenalty: parseInt(e.target.value) })}
      className="input"
    />
  )}

  <button type="submit" className="btn btn-primary">
    Create Assignment
  </button>
</form>
```

**INTERVIEW**: "CreateAssignment only shows courses the instructor teaches. The late penalty field appears conditionally when 'allow late submissions' is checked."

---

## LAYOUT COMPONENTS

### `/src/components/Layout/Header.js`

**PURPOSE**: Top navigation bar

**CODE**:
```javascript
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-primary">
          EduManage
        </Link>

        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <Link to="/dashboard/courses" className="text-gray-700 hover:text-primary">
                Courses
              </Link>
              {user.role === 'student' && (
                <>
                  <Link to="/dashboard/assignments" className="text-gray-700 hover:text-primary">
                    Assignments
                  </Link>
                  <Link to="/dashboard/grades" className="text-gray-700 hover:text-primary">
                    Grades
                  </Link>
                </>
              )}
              {user.role === 'instructor' && (
                <>
                  <Link to="/dashboard/instructor/courses" className="text-gray-700 hover:text-primary">
                    My Courses
                  </Link>
                  <Link to="/dashboard/instructor/assignments" className="text-gray-700 hover:text-primary">
                    Assignments
                  </Link>
                </>
              )}
              {user.role === 'admin' && (
                <>
                  <Link to="/dashboard/admin/users" className="text-gray-700 hover:text-primary">
                    Users
                  </Link>
                  <Link to="/dashboard/admin/courses" className="text-gray-700 hover:text-primary">
                    Courses
                  </Link>
                </>
              )}
              
              <div className="relative group">
                <button className="flex items-center gap-2">
                  <img
                    src={user.profileImage || '/default-avatar.png'}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{user.firstName}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg hidden group-hover:block">
                  <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">
                    Profile
                  </Link>
                  <Link to="/dashboard/notifications" className="block px-4 py-2 hover:bg-gray-100">
                    Notifications
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-700 hover:text-primary">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
```

**FEATURES**:
- Role-specific navigation links
- Profile dropdown with hover
- Conditional rendering based on auth state

**INTERVIEW**: "Header navigation changes based on user role. Students see assignments/grades, instructors see their courses, admins see management links."

---

### `/src/components/Layout/Sidebar.js`

**PURPOSE**: Dashboard sidebar navigation

**CODE**:
```javascript
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HomeIcon,
  BookIcon,
  AssignmentIcon,
  GradeIcon,
  AttendanceIcon,
  MessageIcon,
  SettingsIcon
} from './Icons';

export default function Sidebar() {
  const { user } = useAuth();

  const studentLinks = [
    { to: '/dashboard/student', icon: <HomeIcon />, label: 'Dashboard' },
    { to: '/dashboard/courses', icon: <BookIcon />, label: 'My Courses' },
    { to: '/dashboard/assignments', icon: <AssignmentIcon />, label: 'Assignments' },
    { to: '/dashboard/grades', icon: <GradeIcon />, label: 'Grades' },
    { to: '/dashboard/attendance', icon: <AttendanceIcon />, label: 'Attendance' },
    { to: '/dashboard/messages', icon: <MessageIcon />, label: 'Messages' },
  ];

  const instructorLinks = [
    { to: '/dashboard/instructor', icon: <HomeIcon />, label: 'Dashboard' },
    { to: '/dashboard/instructor/courses', icon: <BookIcon />, label: 'My Courses' },
    { to: '/dashboard/instructor/assignments', icon: <AssignmentIcon />, label: 'Assignments' },
    { to: '/dashboard/instructor/students', icon: <GradeIcon />, label: 'Students' },
    { to: '/dashboard/messages', icon: <MessageIcon />, label: 'Messages' },
  ];

  const adminLinks = [
    { to: '/dashboard/admin', icon: <HomeIcon />, label: 'Dashboard' },
    { to: '/dashboard/admin/users', icon: <BookIcon />, label: 'User Management' },
    { to: '/dashboard/admin/courses', icon: <BookIcon />, label: 'Course Management' },
    { to: '/dashboard/admin/verifications', icon: <AssignmentIcon />, label: 'Verifications' },
    { to: '/dashboard/admin/analytics', icon: <GradeIcon />, label: 'Analytics' },
  ];

  const links = user?.role === 'student' ? studentLinks
               : user?.role === 'instructor' ? instructorLinks
               : adminLinks;

  return (
    <aside className="w-64 bg-white border-r h-full">
      <nav className="p-4">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

**FEATURES**:
- NavLink for active state styling
- Role-based link arrays
- Icon + label layout

**INTERVIEW**: "I use NavLink instead of Link for automatic active state styling. The sidebar links change completely based on user role."

---

### `/src/components/Layout/Layout.js`

**PURPOSE**: Main layout wrapper with header and sidebar

**CODE**:
```javascript
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

**EXPLANATION**:
- `<Outlet />` renders the matched child route
- Sidebar + main content flex layout
- Used for all authenticated pages

**INTERVIEW**: "Layout uses React Router's Outlet to render child routes. This creates a consistent header and sidebar across all dashboard pages."

---

## UTILITY FILES

### `/src/utils/dateUtils.js`

**PURPOSE**: Date formatting utilities

**CODE**:
```javascript
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (date) => {
  return format(new Date(date), 'PPP');
};

export const formatDateTime = (date) => {
  return format(new Date(date), 'PPP p');
};

export const formatRelativeTime = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const isOverdue = (dueDate) => {
  return new Date() > new Date(dueDate);
};
```

**USAGE**:
```javascript
import { formatDate, formatRelativeTime } from '../utils/dateUtils';

// In component:
<p>Due: {formatDate(assignment.dueDate)}</p>
<p>Submitted {formatRelativeTime(submission.submittedAt)}</p>
```

**INTERVIEW**: "I use date-fns for consistent date formatting across the app. formatRelativeTime shows user-friendly strings like '3 days ago'."

---

## INTERVIEW TALKING POINTS

### Component Architecture
"I organize components by feature (Courses, Assignments, Auth) with reusable common components (LoadingSpinner, Header). Each component has a single responsibility."

### State Management
"Authentication uses Context API for global state. Component-level state uses useState for form inputs and API data. I don't use Redux because the app's state is mostly independent between features."

### API Integration
"All API calls use axios with a global config for the base URL. The auth token is set in axios defaults so I don't need to pass it manually for every request."

### Error Handling
"Errors are caught in try-catch blocks and displayed with react-hot-toast. Failed API calls show user-friendly messages from the backend response."

### Form Validation
"Client-side validation for UX (immediate feedback). Server-side validation for security (can't be bypassed). Both use the same rules."

### Protected Routes
"ProtectedRoute component checks authentication and role before rendering. It redirects unauthenticated users to login and wrong-role users to their dashboard."

### Performance
"I use debouncing for search input to reduce API calls. List components paginate large datasets. Images are lazy-loaded."

### Conditional Rendering
"UI changes based on user role and state. Students see enrollment buttons, instructors see grading interfaces, admins see approval buttons."
