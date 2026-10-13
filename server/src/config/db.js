const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:your_password@localhost:5432/doodcafe', {
  dialect: 'postgres',
  logging: false,
  dialectOptions: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

module.exports = sequelize;
