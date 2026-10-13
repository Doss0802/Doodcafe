const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');
const User = require('./User');
const Order = require('./Order');

const Finance = sequelize.define('Finance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM('income', 'expense'),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01,
    },
    get() {
      const rawValue = this.getDataValue('amount');
      return rawValue !== null ? parseFloat(rawValue) : 0;
    },
  },
  description: {
    type: DataTypes.STRING(300),
    defaultValue: '',
  },
  reference: {
    type: DataTypes.STRING(100),
    defaultValue: '',
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id',
    },
  },
  recordedById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  transactionDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('completed', 'pending', 'cancelled'),
    defaultValue: 'completed',
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.id;
    },
  },
}, {
  timestamps: true,
  tableName: 'finances',
  indexes: [
    { fields: ['type', 'transactionDate'] },
    { fields: ['type', 'category', 'transactionDate'] },
    { fields: ['status', 'type', 'transactionDate'] },
    { fields: ['transactionDate'] },
  ],
});

Finance.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Finance.belongsTo(User, { foreignKey: 'recordedById', as: 'recordedBy' });

module.exports = Finance;
