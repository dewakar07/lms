const bcrypt = require('bcryptjs');

// Mock in-memory database for development/testing without MongoDB
class MockDatabase {
  constructor() {
    this.users = [];
    this.courses = [];
    this.enrollments = [];
    this.assignments = [];
    this.submissions = [];
    this.attendance = [];
    this.grades = [];
    this.messages = [];
    this.notifications = [];
    this.nextUserId = 1;
    this.nextCourseId = 1;
    this.nextEnrollmentId = 1;
    this.nextAssignmentId = 1;
  }

  // Users
  createUser(userData) {
    const user = {
      _id: this.nextUserId++,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.push(user);
    return user;
  }

  findUserByEmail(email) {
    return this.users.find(u => u.email === email);
  }

  findUserById(id) {
    return this.users.find(u => u._id === parseInt(id));
  }

  findAllUsers() {
    return this.users;
  }

  updateUser(id, updates) {
    const user = this.findUserById(id);
    if (user) {
      Object.assign(user, updates, { updatedAt: new Date() });
    }
    return user;
  }

  deleteUser(id) {
    this.users = this.users.filter(u => u._id !== id);
  }

  // Courses
  createCourse(courseData) {
    const course = {
      _id: this.nextCourseId++,
      ...courseData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.courses.push(course);
    return course;
  }

  findCourseById(id) {
    return this.courses.find(c => c._id === parseInt(id));
  }

  findAllCourses() {
    return this.courses;
  }

  findCoursesByInstructor(instructorId) {
    return this.courses.filter(c => c.instructor === instructorId);
  }

  updateCourse(id, updates) {
    const course = this.findCourseById(id);
    if (course) {
      Object.assign(course, updates, { updatedAt: new Date() });
    }
    return course;
  }

  // Enrollments
  createEnrollment(enrollmentData) {
    const enrollment = {
      _id: this.nextEnrollmentId++,
      ...enrollmentData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.enrollments.push(enrollment);
    return enrollment;
  }

  findEnrollmentsByStudent(studentId) {
    return this.enrollments.filter(e => e.student === studentId);
  }

  findEnrollmentsByCourse(courseId) {
    return this.enrollments.filter(e => e.course === courseId);
  }

  // Assignments
  createAssignment(assignmentData) {
    const assignment = {
      _id: this.nextAssignmentId++,
      ...assignmentData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.assignments.push(assignment);
    return assignment;
  }

  findAssignmentsByCourse(courseId) {
    return this.assignments.filter(a => a.course === courseId);
  }

  findAssignmentById(id) {
    return this.assignments.find(a => a._id === parseInt(id));
  }

  // Generic methods for compatibility
  save(model) {
    return model;
  }

  deleteOne(query) {
    return { deletedCount: 1 };
  }

  findOne(query) {
    if (query.email) return this.findUserByEmail(query.email);
    if (query._id) return this.findUserById(query._id);
    return null;
  }

  find(query = {}) {
    if (query.email) return [this.findUserByEmail(query.email)].filter(Boolean);
    return this.users;
  }
}

const mockDb = new MockDatabase();

// Initialize with a default admin user
mockDb.createUser({
  firstName: 'System',
  lastName: 'Admin',
  email: 'admin@edumanage.com',
  password: 'admin123', // In real app, this would be hashed
  role: 'admin',
  isVerified: true
});

module.exports = mockDb;
