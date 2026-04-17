const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const { initCron } = require('./cron');

// Initialize Cron Jobs
initCron();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Dental Clinic API is running', version: '1.0.0' });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/lab-cases', require('./routes/labcase.routes'));
app.use('/api/labs', require('./routes/laboratory.routes'));
app.use('/api/vendors', require('./routes/vendor.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/schedules', require('./routes/schedule.routes'));
app.use('/api/leaves', require('./routes/leave.routes'));
app.use('/api/reminders', require('./routes/reminder.routes'));
app.use('/api/leave-requests', require('./routes/leaveRequest.routes'));
app.use('/api/leave-balance', require('./routes/leaveBalance.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/permissions', require('./routes/permission.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/backup', require('./routes/backup.routes'));

app.get('/all', require('./controllers/payment.controller').getAllCombined);

// Error handling middleware
const errorHandler = require('./middleware/error.middleware');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
