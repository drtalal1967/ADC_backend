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

    res.json({
      message: 'Profile updated successfully',
      user: {
        ...req.user,
        email: email || req.user.email,
        name: name || req.user.name,
        profileImage: profileImageUrl || req.user.profileImage,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
};
