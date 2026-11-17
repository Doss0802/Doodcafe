const { DataTypes, Op } = require('sequelize');
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
    type: DataTypes.ENUM('takeaway', 'delivery', 'dine-in'),
    defaultValue: 'takeaway',
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'handed_over'),
    defaultValue: 'pending',
  },
  paymentMode: {
    type: DataTypes.ENUM('cash', 'upi'),
    defaultValue: 'cash',
  },
  paymentStatus: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
  },
  customerName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  customerPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  billNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  tableNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  tableNo: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('tableNumber');
    },
    set(val) {
      this.setDataValue('tableNumber', val ? String(val) : null);
    },
  },
  handedOverAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  handedOverBy: {
    type: DataTypes.UUID,
    allowNull: true,
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
  idempotencyKey: {
    type: DataTypes.STRING(64),
    allowNull: true,
    defaultValue: null,
  },
  paytmOrderId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
  },
  bankTxnId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
  },
  gatewayName: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null,
  },
  rawGatewayResponse: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
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
    { fields: ['billNumber'] },
    { fields: ['paymentStatus'] },
    { fields: ['idempotencyKey'], unique: true, where: { idempotencyKey: { [Op.ne]: null } } },
    { fields: ['paytmOrderId'] },
    { fields: ['transactionId'] },
  ],
  hooks: {
    beforeCreate: async (order, options) => {
      if (!order.status) {
        order.status = 'pending';
      }
      if (!order.paymentStatus) {
        order.paymentStatus = 'pending';
      }
      // orderNumber/billNumber are set by the controller inside a transaction.
      // This fallback only runs for non-transactional callers.
      if (!order.orderNumber) {
        try {
          if (options && options.transaction) {
            try {
              await sequelize.query('SELECT pg_advisory_xact_lock(987654321);', { transaction: options.transaction });
            } catch (_) {}
            const [maxResult] = await sequelize.query(
              'SELECT COALESCE(MAX("orderNumber"), 1000) + 1 AS next FROM orders',
              { type: sequelize.constructor.QueryTypes.SELECT, transaction: options.transaction }
            );
            order.orderNumber = (maxResult && maxResult.next) ? Number(maxResult.next) : 1001;
          } else {
            const maxOrder = await Order.max('orderNumber');
            order.orderNumber = Math.max(1001, (Number(maxOrder) || 1000) + 1);
          }
        } catch (e) {
          order.orderNumber = 1001;
        }
      }
      if (!order.billNumber) {
        order.billNumber = `ORD-${order.orderNumber}`;
      }
    },
  },
});

// Associations
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });

module.exports = Order;
