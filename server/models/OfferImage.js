const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');

const OfferImage = sequelize.define('OfferImage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  offerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'offers',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  mimeType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'image/jpeg',
  },
  data: {
    type: DataTypes.BLOB('long'),
    allowNull: false,
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: true,
  freezeTableName: true,
  tableName: 'offer_images',
});

module.exports = OfferImage;
