const authService = require('../services/auth.service');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

const getMe = async (req, res, next) => {
  try {
    // req.user is populated by authMiddleware and contains the full role object
    const user = {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.employee?.firstName || '',
      lastName: req.user.employee?.lastName || '',
      role: req.user.role?.name || 'SECRETARY',
      permissions: req.user.role?.permissions || [],
      employeeId: req.user.employee?.id,
      name: req.user.employee ? `${req.user.employee.firstName} ${req.user.employee.lastName}` : 'System User',
      profileImage: req.user.employee?.profileImageUrl,
    };
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  login,
  getMe,
  changePassword,
};
