const userService = require('../services/user.service');
const { uploadToImageKit } = require('../services/imagekit.service');

const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    let profileImageUrl = null;

    if (req.file) {
      // Upload profile image to ImageKit cloud
      const ikResult = await uploadToImageKit(
        req.file.buffer,
        req.file.originalname,
        'dental-profiles'
      );
      profileImageUrl = ikResult.url;
    }

    const updatedProfile = await userService.updateProfile(req.user.id, {
      name,
      email,
      profileImageUrl,
    });

    const displayName = updatedProfile
      ? `${updatedProfile.firstName || ''} ${updatedProfile.lastName || ''}`.trim()
      : (name || 'System User');

    res.json({
      message: 'Profile updated successfully',
      user: {
        email: email || req.user.email,
        firstName: updatedProfile?.firstName || req.user.employee?.firstName || '',
        lastName: updatedProfile?.lastName || req.user.employee?.lastName || '',
        name: displayName,
        role: req.user.role?.name || 'SECRETARY',
        permissions: req.user.role?.permissions || [],
        employeeId: req.user.employee?.id,
        branch: req.user.employee?.branch || 'Tubli Branch',
        avatar: displayName.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2),
        profileImage: profileImageUrl || updatedProfile?.profileImageUrl || req.user.employee?.profileImageUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
};
