const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');
const User = require('./User');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      hasItems(value) {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('Order must contain at least one item');
        }
      },
    },
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Total amount cannot be negative' },
    },
    get() {
      const rawValue = this.getDataValue('totalAmount');
      return rawValue !== null ? parseFloat(rawValue) : 0;
    },
  },
  orderType: {
    type: DataTypes.ENUM('takeaway', 'delivery'),
    defaultValue: 'takeaway',
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'),
    defaultValue: 'delivered',
  },
  paymentMode: {
    type: DataTypes.ENUM('cash', 'upi'),
    defaultValue: 'cash',
  },
  customer_location: {
    type: DataTypes.STRING(200),
    defaultValue: 'Coimbatore, Tamil Nadu',
  },
  deliveryAddress: {
    type: DataTypes.STRING(250),
    defaultValue: 'Coimbatore, Tamil Nadu',
  },
  coordinates: {
    type: DataTypes.JSON,
    defaultValue: { lat: 11.0168, lng: 76.9558 },
  },
  specialInstructions: {
    type: DataTypes.STRING(200),
    allowNull: true,
    defaultValue: '',
  },
  estimatedTime: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
  },
  orderNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.id;
    },
  },
}, {
  timestamps: true,
  tableName: 'orders',
  indexes: [
    { fields: ['userId', 'createdAt'] },
    { fields: ['status', 'createdAt'] },
    { fields: ['createdAt'] },
    { fields: ['orderType', 'createdAt'] },
  ],
  hooks: {
    beforeCreate: async (order) => {
      if (order.orderType === 'takeaway' && (!order.status || order.status === 'pending')) {
        order.status = 'delivered';
      }
      if (!order.orderNumber) {
        try {
          const userOrderCount = await Order.count({ where: { userId: order.userId } });
          order.orderNumber = userOrderCount + 1;
        } catch (e) {
          order.orderNumber = 1;
        }
      }
    },
  },
});

// Associations
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });

module.exports = Order;
