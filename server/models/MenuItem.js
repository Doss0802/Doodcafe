const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');
const Category = require('./Category');

const MenuItem = sequelize.define('MenuItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(80),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Item name is required' },
      len: [1, 80],
    },
  },
  description: {
    type: DataTypes.STRING(300),
    allowNull: true,
    defaultValue: '',
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Price cannot be negative' },
    },
    get() {
      const rawValue = this.getDataValue('price');
      return rawValue !== null ? parseFloat(rawValue) : 0;
    },
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'categories',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  imageUrl: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  image: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isVeg: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isBestseller: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  preparationTime: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
  },
  show_prices_to_public: {
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
  tableName: 'menu_items',
  indexes: [
    { fields: ['categoryId', 'available', 'price'] },
    { fields: ['isBestseller', 'available'] },
    { fields: ['available', 'isVeg'] },
  ],
});

// Associations
MenuItem.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(MenuItem, { foreignKey: 'categoryId', as: 'items' });

module.exports = MenuItem;
