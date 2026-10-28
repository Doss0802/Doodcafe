const { Sequelize } = require('sequelize');

const rawDbUrl = process.env.DATABASE_URL;
const isLocal = !rawDbUrl || rawDbUrl.includes('localhost') || rawDbUrl.includes('127.0.0.1');
const useSSL = (process.env.NODE_ENV === 'production' || !isLocal) && !isLocal;

const dbOptions = {
  dialect: 'postgres',
  logging: false,
};

if (useSSL) {
  dbOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  };
} else if (!rawDbUrl) {
  dbOptions.port = 5433;
}

const sequelize = new Sequelize(rawDbUrl || 'postgres://postgres:Doss0802@localhost:5433/doodcafe', dbOptions);

module.exports = sequelize;
