const bcrypt = require('bcryptjs');

// In-memory storage
const storage = {
  users: [],
  courses: [],
  enrollments: [],
  assignments: [],
  submissions: [],
  grades: [],
  notifications: [],
  messages: [],
  attendance: [],
  nextId: {
    user: 1,
    course: 1,
    enrollment: 1,
    assignment: 1,
    submission: 1,
    grade: 1,
    notification: 1,
    message: 1,
    attendance: 1
  }
};

// Initialize with default admin user (synchronously)
(function() {
  const salt = 10; // Default bcrypt salt rounds
  bcrypt.hash('admin123', salt, (err, hashedPassword) => {
    if (!err) {
      storage.users.push({
        _id: storage.nextId.user++,
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@edumanage.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  });
})();

// Generic Mock Model
class MockModel {
  static storage = storage;

  constructor(data) {
    Object.assign(this, data);
  }

  async save() {
    const collection = this.constructor.collectionName;
    if (this._id) {
      const index = MockModel.storage[collection].findIndex(item => item._id === this._id);
      if (index !== -1) {
        MockModel.storage[collection][index] = { ...this };
      }
    } else {
      const idKey = collection.slice(0, -1); // users -> user
      this._id = MockModel.storage.nextId[idKey]++;
      this.createdAt = new Date();
      this.updatedAt = new Date();
      MockModel.storage[collection].push({ ...this });
    }
    return this;
  }

  static async findOne(query) {
    const collection = this.storage[this.collectionName];
    for (const [key, value] of Object.entries(query)) {
      const item = collection.find(item => item[key] === value);
      if (item) return new this(item);
    }
    return null;
  }

  static async findById(id) {
    const collection = this.storage[this.collectionName];
    const item = collection.find(item => item._id === (typeof id === 'string' ? parseInt(id) : id));
    return item ? new this(item) : null;
  }

  static async find(query = {}) {
    const collection = this.storage[this.collectionName];
    if (Object.keys(query).length === 0) return collection.map(item => new this(item));
    
    return collection.filter(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    }).map(item => new this(item));
  }

  static async countDocuments(query = {}) {
    const collection = this.storage[this.collectionName];
    if (Object.keys(query).length === 0) return collection.length;
    
    return collection.filter(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    }).length;
  }

  static async updateOne(query, updates) {
    const collection = this.storage[this.collectionName];
    const index = collection.findIndex(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    });
    
    if (index !== -1) {
      collection[index] = { ...collection[index], ...updates, updatedAt: new Date() };
      return { modifiedCount: 1 };
    }
    return { modifiedCount: 0 };
  }

  static async updateMany(query, updates) {
    const collection = this.storage[this.collectionName];
    let count = 0;
    
    collection.forEach((item, index) => {
      if (Object.entries(query).every(([key, value]) => item[key] === value)) {
        collection[index] = { ...item, ...updates, updatedAt: new Date() };
        count++;
      }
    });
    
    return { modifiedCount: count };
  }

  static async deleteOne(query) {
    const collection = this.storage[this.collectionName];
    const index = collection.findIndex(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    });
    
    if (index !== -1) {
      collection.splice(index, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  static async deleteMany(query) {
    const collection = this.storage[this.collectionName];
    const initialLength = collection.length;
    
    for (let i = collection.length - 1; i >= 0; i--) {
      if (Object.entries(query).every(([key, value]) => collection[i][key] === value)) {
        collection.splice(i, 1);
      }
    }
    
    return { deletedCount: initialLength - collection.length };
  }
}

// User Model
class User extends MockModel {
  static collectionName = 'users';

  async save() {
    if (!this.password.startsWith('$2')) { // Not already hashed
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
    return super.save();
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  getPublicProfile() {
    const { password, ...publicData } = this;
    return publicData;
  }

  toObject() {
    return { ...this };
  }
}

// Course Model
class Course extends MockModel {
  static collectionName = 'courses';
}

// Enrollment Model
class Enrollment extends MockModel {
  static collectionName = 'enrollments';
}

// Assignment Model
class Assignment extends MockModel {
  static collectionName = 'assignments';
}

// Submission Model
class Submission extends MockModel {
  static collectionName = 'submissions';
}

// Grade Model
class Grade extends MockModel {
  static collectionName = 'grades';
}

// Notification Model
class Notification extends MockModel {
  static collectionName = 'notifications';
}

// Message Model
class Message extends MockModel {
  static collectionName = 'messages';
}

// Attendance Model
class Attendance extends MockModel {
  static collectionName = 'attendance';
}

module.exports = {
  User,
  Course,
  Enrollment,
  Assignment,
  Submission,
  Grade,
  Notification,
  Message,
  Attendance,
  storage
};
