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
  password: {
    type: DataTypes.STRING,
    field: 'passwordHash',
    allowNull: false,
  },
  passwordHash: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('password');
    },
    set(value) {
      if (value) {
        this.setDataValue('password', value);
      }
    },
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
      const pwd = user.password || user.passwordHash;
      if (pwd && !pwd.startsWith('$2a$') && !pwd.startsWith('$2b$')) {
        user.password = await bcrypt.hash(pwd, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') || user.changed('passwordHash')) {
        const pwd = user.password || user.passwordHash;
        if (pwd && !pwd.startsWith('$2a$') && !pwd.startsWith('$2b$')) {
          user.password = await bcrypt.hash(pwd, 10);
        }
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
  const hash = this.password || this.passwordHash;
  if (!hash) return false;
  return bcrypt.compare(enteredPassword, hash);
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
