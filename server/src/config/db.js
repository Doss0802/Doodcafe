const { Sequelize } = require('sequelize');

const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:Doss0802@localhost:5433/doodcafe', {
  dialect: 'postgres',
  logging: false,
  ...(isLocal ? { port: 5433 } : {
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }),
});

module.exports = sequelize;
