const leaveService = require('../services/leave.service');

const applyLeave = async (req, res, next) => {
  try {
    const leave = await leaveService.applyLeave(req.body);
    res.status(201).json(leave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateLeaveStatus = async (req, res, next) => {
  try {
    const leave = await leaveService.updateLeaveStatus(req.params.id, {
      ...req.body,
      reviewedBy: req.user.id, // Assuming req.user exists from authMiddleware
    });
    res.json(leave);
  } catch (error) {
    next(error);
  }
};

const getAllLeaveRequests = async (req, res, next) => {
  try {
    const leaves = await leaveService.getAllLeaveRequests();
    res.json(leaves);
  } catch (error) {
    next(error);
  }
};

const getLeaveBalances = async (req, res, next) => {
  try {
    const { year } = req.query;
    const balances = await leaveService.getLeaveBalances(year);
    res.json(balances);
  } catch (error) {
    next(error);
  }
};

const getEmployeeBalance = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const balance = await leaveService.getEmployeeBalance(employeeId);
    res.json(balance);
  } catch (error) {
    next(error);
  }
};

const updateEmployeeBalances = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const balance = await leaveService.updateEmployeeBalances(employeeId, req.body);
    res.json(balance);
  } catch (error) {
    next(error);
  }
};

const runMonthlyUpdate = async (req, res, next) => {
  try {
    await leaveService.runMonthlyAutoUpdate();
    res.json({ message: 'Monthly leave update completed successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteLeaveRequest = async (req, res, next) => {
  try {
    await leaveService.deleteLeaveRequest(req.params.id);
    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteLeaveBalance = async (req, res, next) => {
  try {
    await leaveService.deleteLeaveBalance(req.params.employeeId);
    res.json({ message: 'Leave balances for employee deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  updateLeaveStatus,
  getAllLeaveRequests,
  getLeaveBalances,
  getEmployeeBalance,
  updateEmployeeBalances,
  runMonthlyUpdate,
  deleteLeaveRequest,
  deleteLeaveBalance
};
