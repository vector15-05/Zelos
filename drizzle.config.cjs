const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

module.exports = {
  schema: './packages/db/src/schema.ts',
  out: './packages/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
