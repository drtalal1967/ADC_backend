'use strict';

// Refuse arbitrary URLs, including Railway and ordinary local databases.
const url = new URL(process.env.ACCRUAL_TEST_DATABASE_URL || 'file:///missing');
if (url.protocol !== 'mysql:' || url.hostname !== '127.0.0.1' || url.port !== '33379' ||
    url.pathname !== '/adc_accrual_synthetic') {
  throw new Error('Tests require the dedicated loopback adc_accrual_synthetic database on port 33379');
}
process.env.DATABASE_URL = url.href;
const { PrismaClient } = require('@prisma/client');
module.exports = () => new PrismaClient({ datasources: { db: { url: url.href } } });
