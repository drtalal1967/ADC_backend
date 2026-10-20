const db = require('./synthetic-db')();
const { createMonthlyAccrual } = require('../src/services/monthlyAccrual.service');
createMonthlyAccrual(db, { clock: async () => new Date(process.argv[2]) })()
  .then(result => console.log(JSON.stringify(result)))
  .catch(error => { console.error(error.code || error.name); process.exitCode = 1; })
  .finally(() => db.$disconnect());
