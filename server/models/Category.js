const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Category name is required' },
      len: [1, 50],
    },
  },
  slug: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    set(value) {
      if (value) this.setDataValue('slug', value.toLowerCase().trim());
    },
  },
  icon: {
    type: DataTypes.STRING,
    defaultValue: '🍽️',
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.id;
    },
  },
}, {
  timestamps: true,
  tableName: 'categories',
  indexes: [
    { fields: ['displayOrder', 'isActive'] },
  ],
});

module.exports = Category;
