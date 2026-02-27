// Plain JS config for Docker/production (no TypeScript runtime needed)
require('dotenv/config');

module.exports = {
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
};
