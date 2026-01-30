const bcrypt = require('bcryptjs');
const mockDb = require('./mockDb');

// Mock User model - Mongoose-compatible interface for mock DB
class MockUser {
  constructor(data) {
    Object.assign(this, data);
    this._id = this._id || mockDb.nextUserId++;
  }

  async save() {
    // Check if user already has ID (update)
    if (this._id && mockDb.users.some(u => u._id === this._id)) {
      const index = mockDb.users.findIndex(u => u._id === this._id);
      mockDb.users[index] = { ...this };
    } else {
      // New user
      if (!this.password) throw new Error('Password is required');
      
      // Hash password
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      
      this._id = mockDb.nextUserId++;
      this.createdAt = new Date();
      this.updatedAt = new Date();
      mockDb.users.push({ ...this });
    }
    return this;
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  getPublicProfile() {
    const { password, ...publicProfile } = this;
    return publicProfile;
  }

  toObject() {
    return { ...this };
  }
}

// Mock User statics
MockUser.findOne = async (query) => {
  if (query.email) {
    const user = mockDb.users.find(u => u.email === query.email);
    return user ? new MockUser(user) : null;
  }
  if (query._id) {
    const user = mockDb.users.find(u => u._id === query._id);
    return user ? new MockUser(user) : null;
  }
  return null;
};

MockUser.findById = async (id) => {
  const user = mockDb.users.find(u => u._id === parseInt(id));
  return user ? new MockUser(user) : null;
};

MockUser.find = async (query = {}) => {
  if (query.role) {
    return mockDb.users.filter(u => u.role === query.role).map(u => new MockUser(u));
  }
  return mockDb.users.map(u => new MockUser(u));
};

MockUser.countDocuments = async (query = {}) => {
  if (query.role) {
    return mockDb.users.filter(u => u.role === query.role).length;
  }
  return mockDb.users.length;
};

MockUser.updateOne = async (query, updates) => {
  if (query._id) {
    const index = mockDb.users.findIndex(u => u._id === query._id);
    if (index !== -1) {
      mockDb.users[index] = { ...mockDb.users[index], ...updates, updatedAt: new Date() };
      return { modifiedCount: 1 };
    }
  }
  return { modifiedCount: 0 };
};

MockUser.deleteOne = async (query) => {
  if (query._id) {
    const index = mockDb.users.findIndex(u => u._id === query._id);
    if (index !== -1) {
      mockDb.users.splice(index, 1);
      return { deletedCount: 1 };
    }
  }
  return { deletedCount: 0 };
};

module.exports = MockUser;
