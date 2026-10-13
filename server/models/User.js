const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Name is required' },
      len: [1, 50],
    },
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: { msg: 'Email address already in use' },
    validate: {
      isEmail: { msg: 'Please provide a valid email address' },
    },
    set(value) {
      if (value) this.setDataValue('email', value.toLowerCase().trim());
    },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('customer', 'manager', 'admin'),
    defaultValue: 'customer',
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
  },
  tokenVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  failedLoginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refreshToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  password: {
    type: DataTypes.VIRTUAL,
    set(value) {
      if (value) {
        this.setDataValue('password', value);
        this.setDataValue('passwordHash', value);
      }
    },
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.id;
    },
  },
  isLocked: {
    type: DataTypes.VIRTUAL,
    get() {
      return !!(this.lockUntil && new Date(this.lockUntil) > new Date());
    },
  },
}, {
  timestamps: true,
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.passwordHash && !user.passwordHash.startsWith('$2a$') && !user.passwordHash.startsWith('$2b$')) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('passwordHash') && user.passwordHash && !user.passwordHash.startsWith('$2a$') && !user.passwordHash.startsWith('$2b$')) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
      }
    },
  },
});

User.findById = function (id, options = {}) {
  return this.findByPk(id, options);
};

User.countDocuments = function (filter = {}) {
  return this.count({ where: filter });
};

// Compare password instance method
User.prototype.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

// Handle failed login attempt for lockout protection
User.prototype.incFailedLogin = async function () {
  if (this.lockUntil && new Date(this.lockUntil) < new Date()) {
    this.failedLoginAttempts = 1;
    this.lockUntil = null;
    return this.save();
  }

  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= 5 && !this.isLocked) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  return this.save();
};

// Reset failed attempts on successful login
User.prototype.resetFailedLogin = async function () {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  return this.save();
};

module.exports = User;
