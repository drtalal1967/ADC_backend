const permissionService = require('../services/permission.service');

const getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const permissions = await permissionService.getRolePermissions(roleId);
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching permissions', error: err.message });
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;
    await permissionService.updateRolePermissions(roleId, permissions);
    res.json({ message: 'Permissions updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating permissions', error: err.message });
  }
};

const getAllRoles = async (req, res) => {
    try {
        const roles = await permissionService.getAllRoles();
        res.json(roles);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching roles', error: err.message });
    }
};

module.exports = {
  getRolePermissions,
  updateRolePermissions,
  getAllRoles
};
