const { verifyToken } = require('../utils/jwt.utils');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { 
        employee: true,
        role: {
          include: { permissions: true }
        }
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Unauthorized or inactive account' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user.role?.name;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};

const checkPermission = (module, action) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !user.role) {
      return res.status(403).json({ message: 'No role assigned' });
    }

    if (user.role.name === 'ADMIN') {
      return next();
    }

    const permission = user.role.permissions.find(p => p.module === module);
    
    if (!permission) {
      return res.status(403).json({ message: `Permission denied for ${module}:${action}` });
    }

    // Map common frontend actions to schema fields
    const actionMap = {
      'view': 'canView',
      'create': 'canCreate',
      'edit': 'canUpdate',
      'update': 'canUpdate',
      'delete': 'canDelete',
      'export': 'canExport'
    };

    const targetAction = actionMap[action.toLowerCase()] || action;
    
    if (!permission[targetAction]) {
      console.log(`[AUTH] Permission DENIED for user ${user.email} (Role: ${user.role.name}) on ${module}:${action}`);
      return res.status(403).json({ message: `Permission denied for ${module}:${action}` });
    }

    next();
  };
};

const isAdmin = (req, res, next) => {
  if (req.user.role?.name !== 'ADMIN' && req.user.role?.name !== 'MANAGER') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = {
  authMiddleware,
  authenticateToken: authMiddleware, // Alias for consistency
  authorize,
  checkPermission,
  isAdmin
};
