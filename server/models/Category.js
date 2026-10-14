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
    allowNull: true,
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
  freezeTableName: true,
  tableName: 'categories',
  hooks: {
    beforeValidate: (category) => {
      if (!category.slug && category.name) {
        category.slug = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
    },
    beforeBulkCreate: (categories) => {
      categories.forEach((cat) => {
        if (!cat.slug && cat.name) {
          cat.slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
      });
    },
  },
  indexes: [
    { fields: ['displayOrder', 'isActive'] },
  ],
});

module.exports = Category;
