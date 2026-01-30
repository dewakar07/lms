# SECURITY & AUTHENTICATION - Complete Explanation

How authentication, authorization, and security work in the LMS.

---

## AUTHENTICATION SYSTEM

### JWT (JSON Web Tokens)

**WHAT IS JWT?**
- Stateless authentication (server doesn't store sessions)
- Token contains user ID and role
- Signed with secret key to prevent tampering

**JWT STRUCTURE**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJyb2xlIjoiaW5zdHJ1Y3RvciIsImlhdCI6MTcwNDA2NzIwMCwiZXhwIjoxNzA0NjcyMDAwfQ.signature

// Decoded payload:
{
  _id: "507f1f77bcf86cd799439011",
  role: "instructor",
  iat: 1704067200,  // Issued at
  exp: 1704672000   // Expires at (7 days)
}
```

**WHY JWT?**
- **Stateless**: No session storage needed, scales horizontally
- **Self-contained**: Token has all user info, no database lookup
- **Cross-domain**: Works for API + separate frontend

**ALTERNATIVES CONSIDERED**:
- **Session Cookies**: Requires server-side session store (Redis), doesn't work well for API-only backends
- **OAuth**: Overkill for simple email/password auth

---

## AUTHENTICATION FLOW

### Registration
```
1. User submits registration form
   ↓
2. Backend validates input (express-validator)
   ↓
3. Check if email already exists
   ↓
4. Create user document
   ↓
5. Mongoose pre-save hook hashes password with bcrypt
   ↓
6. Generate JWT token with user ID and role
   ↓
7. Return token + user profile to frontend
   ↓
8. Frontend stores token in localStorage
   ↓
9. Frontend sets token in axios default headers
```

**CODE**:
```javascript
// Backend: /routes/auth.js
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  // Validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check existing user
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  // Create user (password hashed in pre-save hook)
  const user = await User.create(req.body);

  // Generate JWT
  const token = jwt.sign(
    { _id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    message: 'Registration successful',
    token,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    }
  });
});
```

**SECURITY MEASURES**:
- **Password Hashing**: bcrypt with 10 salt rounds (never store plain text)
- **Input Validation**: express-validator prevents malformed data
- **Unique Email Check**: Prevents duplicate accounts
- **Token Expiration**: 7-day expiry forces re-authentication

---

### Login
```
1. User submits email + password
   ↓
2. Backend finds user by email
   ↓
3. Compare submitted password with hashed password (bcrypt.compare)
   ↓
4. If match, generate new JWT
   ↓
5. Update user.lastLogin timestamp
   ↓
6. Return token + user profile
   ↓
7. Frontend stores token and sets axios headers
```

**CODE**:
```javascript
// Backend: /routes/auth.js
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Check account status
  if (!user.isActive) {
    return res.status(400).json({ message: 'Account is deactivated' });
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Instructor approval check
  if (user.role === 'instructor' && !user.isApproved) {
    return res.status(403).json({ 
      message: 'Your account is pending admin approval' 
    });
  }

  // Generate JWT
  const token = jwt.sign(
    { _id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  res.json({
    message: 'Login successful',
    token,
    user: { /* user data */ }
  });
});
```

**SECURITY MEASURES**:
- **Generic Error Message**: Don't reveal whether email exists ("Invalid credentials" for both email not found and wrong password)
- **Account Status Check**: Prevent deactivated users from logging in
- **Approval Check**: Instructors must be approved before access
- **Rate Limiting**: (Should be implemented) Prevent brute force attacks

---

### Token Verification
```
1. User makes authenticated request
   ↓
2. Frontend includes token in Authorization header
   ↓
3. Backend auth middleware extracts token
   ↓
4. jwt.verify() validates token signature and expiration
   ↓
5. Decode token to get user ID
   ↓
6. Fetch user from database
   ↓
7. Attach user to req.user
   ↓
8. Continue to route handler
```

**CODE**:
```javascript
// Backend: /middleware/auth.js
const auth = async (req, res, next) => {
  try {
    // Extract token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account deactivated' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
};
```

**SECURITY MEASURES**:
- **Token Expiration Check**: jwt.verify() automatically rejects expired tokens
- **User Existence Check**: Token might be valid but user deleted
- **Account Status Check**: User might be deactivated after token issued

---

## AUTHORIZATION (ROLE-BASED ACCESS CONTROL)

### Authorization Middleware

**PURPOSE**: Check if authenticated user has required role

**CODE**:
```javascript
// Backend: /middleware/auth.js
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You do not have permission to perform this action' 
      });
    }

    next();
  };
};

// Usage:
router.get('/admin/users', auth, authorize('admin'), getAllUsers);
router.post('/courses', auth, authorize('instructor', 'admin'), createCourse);
```

**HOW IT WORKS**:
- **Currying**: authorize() returns a middleware function
- **Variadic Arguments**: Accepts multiple allowed roles
- **Role Check**: req.user.role must be in allowed roles array

**ERROR CODES**:
- **401 Unauthorized**: Not authenticated (missing/invalid token)
- **403 Forbidden**: Authenticated but wrong role

---

### Instructor Approval Middleware

**PURPOSE**: Instructors must be approved before accessing certain features

**CODE**:
```javascript
// Backend: /middleware/auth.js
const checkApproval = (req, res, next) => {
  if (req.user.role === 'instructor' && !req.user.isApproved) {
    return res.status(403).json({ 
      message: 'Your instructor account is pending approval' 
    });
  }
  next();
};

// Usage:
router.post('/courses', auth, authorize('instructor'), checkApproval, createCourse);
```

**USE CASES**:
- Creating courses
- Creating assignments
- Grading submissions

**WHY?**
- Prevents unverified instructors from publishing content
- Admin reviews qualifications first

---

### Route Protection Examples

#### Public Routes (No Auth)
```javascript
router.get('/courses', getCourses);  // Browse courses
router.get('/courses/:id', getCourseDetails);  // View course details
```

#### Authenticated Routes
```javascript
router.get('/profile', auth, getProfile);  // Any logged-in user
```

#### Role-Specific Routes
```javascript
// Student only
router.post('/enrollments', auth, authorize('student'), enrollInCourse);

// Instructor only
router.post('/courses', auth, authorize('instructor'), createCourse);

// Admin only
router.put('/users/:id/approve', auth, authorize('admin'), approveInstructor);

// Multiple roles
router.get('/courses/:id/students', auth, authorize('instructor', 'admin'), getCourseStudents);
```

#### Resource-Based Authorization
```javascript
// User can update own profile or admin can update any
router.put('/users/:id', auth, async (req, res) => {
  const { id } = req.params;
  
  if (req.user._id.toString() !== id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  // Update user...
});

// Instructor can only view/grade submissions for their courses
router.get('/assignments/:id/submissions', auth, authorize('instructor'), async (req, res) => {
  const assignment = await Assignment.findById(req.params.id).populate('course');
  
  if (assignment.course.instructor.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not your course' });
  }
  
  // Fetch submissions...
});
```

---

## FRONTEND AUTHENTICATION

### AuthContext

**PURPOSE**: Global authentication state management

**KEY FEATURES**:
1. **Token Storage**: localStorage.setItem('token', token)
2. **Axios Configuration**: Set Authorization header globally
3. **User State**: Current user object available to all components
4. **Auto-Load**: Verify token on app start

**CODE**:
```javascript
// /src/context/AuthContext.js
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Set axios header when token changes
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
          // Token invalid or expired
          logout();
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**WHY THIS APPROACH?**
- **Context API**: Avoids prop drilling for auth state
- **localStorage**: Persists token across page refreshes
- **Axios Defaults**: Automatic token inclusion in every request
- **Auto-Load**: Seamless experience on page refresh

---

### ProtectedRoute Component

**PURPOSE**: Route guard for authentication and authorization

**CODE**:
```javascript
// /src/components/Auth/ProtectedRoute.js
export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    // Save attempted location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Wrong role - redirect to their dashboard
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }

  // Instructor approval check
  if (user.role === 'instructor' && !user.isApproved) {
    const allowedPaths = ['/profile', '/dashboard/instructor/documents'];
    if (!allowedPaths.some(path => location.pathname.includes(path))) {
      return <Navigate to="/dashboard/instructor/pending" replace />;
    }
  }

  return children;
};
```

**PROTECTION LEVELS**:
1. **Not Authenticated**: Redirect to login
2. **Wrong Role**: Redirect to their dashboard
3. **Instructor Not Approved**: Restrict to profile/documents only

**USAGE**:
```javascript
// In App.js
<Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
  <Route path="student" element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} />
  <Route path="instructor" element={<ProtectedRoute requiredRole="instructor"><InstructorDashboard /></ProtectedRoute>} />
  <Route path="admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
</Route>
```

---

## PASSWORD SECURITY

### Hashing with bcrypt

**WHAT IS BCRYPT?**
- Industry-standard password hashing algorithm
- Slow by design (prevents brute force)
- Built-in salt generation

**HOW IT WORKS**:
```
Plain Password: "password123"
        ↓
Salt Generation (random): "$2b$10$abcd..."
        ↓
Hash Function (slow): Bcrypt algorithm
        ↓
Stored Hash: "$2b$10$abcd...hashedpassword"
```

**CODE**:
```javascript
// Backend: /models/User.js
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
```

**PARAMETERS**:
- **Salt Rounds (10)**: Number of hashing iterations
- **Higher = More Secure**: But slower (10 is industry standard)
- **Cost Increases Over Time**: As computers get faster, increase rounds

**PASSWORD VERIFICATION**:
```javascript
// During login
const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
```

**WHY NOT MD5/SHA1?**
- Too fast (allows billions of guesses per second)
- No built-in salt (rainbow table attacks)
- bcrypt is designed to be slow

---

## INPUT VALIDATION

### Express Validator

**PURPOSE**: Sanitize and validate user input

**WHY?**
- **SQL Injection**: (Not applicable for MongoDB, but still good practice)
- **NoSQL Injection**: Malicious operators like `$gt`, `$ne`
- **XSS**: Cross-site scripting attacks
- **Data Integrity**: Ensure data types and formats

**VALIDATION RULES**:
```javascript
// Registration validation
[
  body('email')
    .isEmail().withMessage('Must be valid email')
    .normalizeEmail(),  // Lowercase, remove dots from gmail
  
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain a number'),
  
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name too long'),
  
  body('role')
    .isIn(['student', 'instructor']).withMessage('Invalid role'),
  
  body('phone')
    .optional()
    .matches(/^\d{3}-\d{3}-\d{4}$/).withMessage('Phone format: 123-456-7890')
]
```

**HANDLING ERRORS**:
```javascript
router.post('/register', validationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Validation passed, proceed...
});
```

---

## FILE UPLOAD SECURITY

### Multer Configuration

**SECURITY MEASURES**:
```javascript
const upload = multer({
  storage: diskStorage({
    destination: (req, file, cb) => {
      // Separate directories by type
      cb(null, `uploads/${file.fieldname}/`);
    },
    filename: (req, file, cb) => {
      // Unique filename to prevent overwrites
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10MB for documents
  },
  fileFilter: (req, file, cb) => {
    // Whitelist allowed file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  }
});
```

**PROTECTIONS**:
- **File Size Limit**: Prevent DoS by huge uploads
- **File Type Whitelist**: Only allow specific MIME types
- **Unique Filenames**: Prevent overwriting existing files
- **Separate Directories**: Organize by upload type

**ADDITIONAL RECOMMENDATIONS** (Not Implemented):
- **Virus Scanning**: Scan uploaded files with ClamAV
- **Storage Outside Web Root**: Prevent direct access via URL
- **Content-Type Verification**: Check file contents, not just extension

---

## CORS (Cross-Origin Resource Sharing)

**WHAT IS CORS?**
- Browser security feature
- Prevents JavaScript from making requests to different domains
- Backend must explicitly allow frontend domain

**CONFIGURATION**:
```javascript
// Backend: server.js
const cors = require('cors');

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true  // Allow cookies/auth headers
}));
```

**WHY?**
- Frontend (localhost:3000) and Backend (localhost:5000) are different origins
- Without CORS, browser blocks API requests
- credentials: true allows Authorization header

---

## ENVIRONMENT VARIABLES

**SENSITIVE DATA**:
```env
# .env file (NEVER commit to git)
JWT_SECRET=your-super-secret-key-change-this
MONGODB_URI=mongodb://localhost:27017/edumanage
CLIENT_URL=http://localhost:3000
PORT=5000
```

**WHY?**
- **Security**: Secrets not in source code
- **Flexibility**: Different values for dev/staging/production
- **Access Control**: Only authorized people see .env

**USAGE**:
```javascript
require('dotenv').config();

const token = jwt.sign(payload, process.env.JWT_SECRET);
```

**.gitignore**:
```
.env
node_modules/
uploads/
```

---

## COMMON VULNERABILITIES & PROTECTIONS

### 1. **Brute Force Attacks**
**VULNERABILITY**: Attacker tries many passwords

**PROTECTION** (Should Implement):
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts
  message: 'Too many login attempts, try again later'
});

app.use('/api/auth/login', loginLimiter);
```

---

### 2. **XSS (Cross-Site Scripting)**
**VULNERABILITY**: Attacker injects malicious JavaScript

**PROTECTION**:
- **Input Sanitization**: express-validator trims and escapes
- **React Auto-Escaping**: React escapes user content by default
- **Content Security Policy**: (Should implement) HTTP header

---

### 3. **CSRF (Cross-Site Request Forgery)**
**VULNERABILITY**: Attacker tricks user into making unwanted requests

**PROTECTION**:
- **JWT in Header**: Not in cookies, so CSRF doesn't work
- **SameSite Cookies**: (If using cookies) Set SameSite=Strict

---

### 4. **SQL/NoSQL Injection**
**VULNERABILITY**: Attacker manipulates database queries

**PROTECTION**:
- **Mongoose Escaping**: Mongoose sanitizes by default
- **Input Validation**: express-validator blocks malicious input
- **Type Checking**: Mongoose schema enforces types

**EXAMPLE ATTACK** (Prevented):
```javascript
// Attacker tries to login as any user
POST /api/auth/login
{
  "email": { "$gt": "" },  // NoSQL operator
  "password": { "$gt": "" }
}

// Mongoose rejects because schema expects strings, not objects
```

---

### 5. **Information Disclosure**
**VULNERABILITY**: Error messages reveal sensitive info

**PROTECTION**:
```javascript
// BAD - reveals if email exists
if (!user) return res.json({ error: 'Email not found' });
if (!isMatch) return res.json({ error: 'Wrong password' });

// GOOD - generic message
if (!user || !isMatch) {
  return res.status(400).json({ message: 'Invalid credentials' });
}
```

---

## INTERVIEW TALKING POINTS

### Authentication
"I use JWT for stateless authentication. The token contains user ID and role, signed with a secret key. This allows horizontal scaling because there's no session storage."

### Authorization
"I have three middleware layers: `auth` verifies the JWT, `authorize` checks the role, and `checkApproval` ensures instructors are approved. These compose for granular access control."

### Password Security
"Passwords are hashed with bcrypt before storage. I never store plain text. bcrypt uses 10 salt rounds, which is slow by design to prevent brute force attacks."

### Token Storage
"I store JWT in localStorage on the frontend. Some say this is vulnerable to XSS, but React escapes content by default. I also validate all input server-side."

### Role-Based Access
"I implemented RBAC with three roles: student, instructor, admin. Middleware checks req.user.role before allowing access to sensitive routes."

### File Upload Security
"File uploads use Multer with file type whitelisting, size limits, and unique filenames. I validate MIME types to prevent malicious file uploads."

### Input Validation
"I validate and sanitize all input with express-validator. This prevents NoSQL injection and ensures data integrity. Client-side validation is for UX, server-side is for security."
