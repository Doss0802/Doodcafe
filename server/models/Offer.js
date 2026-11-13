const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');

const Offer = sequelize.define('Offer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(80),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Title is required' },
      len: { args: [1, 80], msg: 'Title must be at most 80 characters' },
    },
  },
  description: {
    type: DataTypes.STRING(300),
    allowNull: true,
    validate: {
      len: { args: [0, 300], msg: 'Description must be at most 300 characters' },
    },
  },
  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  offerType: {
    type: DataTypes.ENUM('dine-in', 'delivery'),
    allowNull: false,
    validate: {
      isIn: { args: [['dine-in', 'delivery']], msg: 'offerType must be dine-in or delivery' },
    },
  },
  startAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
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
  tableName: 'offers',
});

module.exports = Offer;
