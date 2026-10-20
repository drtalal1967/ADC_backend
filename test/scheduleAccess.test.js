const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');

// Load real route/controller/middleware code with synthetic identities and services.
// No real Prisma client, credentials, database or production requests are used.
function load(file, dependencies) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    module, exports: module.exports, console, Intl, Date,
    require: name => {
      if (!(name in dependencies)) throw new Error('Unexpected dependency: ' + name);
      return dependencies[name];
    },
  });
  return module.exports;
}

test('all six roles see availability but retain their leave-request scope', async () => {
  const roles = ['ACCOUNTANT', 'ASSISTANT', 'DENTIST', 'MANAGER', 'SECRETARY', 'ADMIN'];
  const users = roles.map((name, index) => ({ id: index + 1, isActive: true, employee: { id: 10 },
    role: { name, permissions: [
      { module: 'work_schedule', canView: true }, { module: 'leaves', canView: true },
      { module: 'leaves_all', canView: index >= 3 },
    ] },
  }));
  users.push({ id: 7, isActive: true, role: { name: 'NO_ACCESS', permissions: [] } });
  const auth = load('src/middleware/auth.middleware.js', {
    '../utils/jwt.utils': { verifyToken: token => ({ id: Number(token) }) },
    '@prisma/client': { PrismaClient: class { user = { findUnique: async ({ where }) => users.find(user => user.id === where.id) }; } },
  });
  const scheduleController = load('src/controllers/schedule.controller.js', {
    '../services/schedule.service': { getScheduleAbsences: async () => [{ employeeId: 10 }, { employeeId: 20 }] },
  });
  const leaveController = load('src/controllers/leave.controller.js', {
    '../services/leave.service': { getAllLeaveRequests: async ({ canViewAll, employeeId }) =>
      canViewAll ? [{ employeeId: 10 }, { employeeId: 20 }] : [{ employeeId }] },
  });
  const app = express();
  app.use('/schedules', load('src/routes/schedule.routes.js', {
    express, '../controllers/schedule.controller': scheduleController, '../middleware/auth.middleware': auth,
  }));
  app.get('/leave-requests', auth.authMiddleware, auth.checkPermission('leaves', 'canView'), leaveController.getAllLeaveRequests);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base + '/schedules/absences')).status, 401);
    assert.equal((await fetch(base + '/schedules/absences', { headers: { authorization: 'Bearer 7' } })).status, 403);
    for (let index = 0; index < roles.length; index++) {
      const headers = { authorization: 'Bearer ' + (index + 1) };
      const schedule = await fetch(base + '/schedules/absences?start=2026-11-01&end=2026-11-30', { headers });
      assert.equal(schedule.status, 200, roles[index]);
      assert.equal((await schedule.json()).length, 2, roles[index]);
      const leaves = await fetch(base + '/leave-requests', { headers });
      assert.equal(leaves.status, 200);
      assert.equal((await leaves.json()).length, index >= 3 ? 2 : 1, roles[index]);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
