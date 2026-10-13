const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');

const Inventory = sequelize.define('Inventory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true,
  },
  sku: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    get() {
      const v = this.getDataValue('quantity');
      return v !== null ? parseFloat(v) : 0;
    },
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'units',
  },
  costPerUnit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    get() {
      const v = this.getDataValue('costPerUnit');
      return v !== null ? parseFloat(v) : 0;
    },
  },
  reorderLevel: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 10,
    get() {
      const v = this.getDataValue('reorderLevel');
      return v !== null ? parseFloat(v) : 10;
    },
  },
  supplier: {
    type: DataTypes.JSON,
    defaultValue: { name: '', contact: '' },
  },
  lastRestocked: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING(100),
    defaultValue: 'Main Kitchen',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.id;
    },
  },
  isLowStock: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.quantity <= this.reorderLevel;
    },
  },
  totalValue: {
    type: DataTypes.VIRTUAL,
    get() {
      return +(this.quantity * this.costPerUnit).toFixed(2);
    },
  },
}, {
  timestamps: true,
  tableName: 'inventories',
  indexes: [
    { fields: ['category', 'isActive'] },
    { fields: ['quantity', 'reorderLevel'] },
    { fields: ['expiryDate', 'isActive'] },
  ],
});

module.exports = Inventory;
