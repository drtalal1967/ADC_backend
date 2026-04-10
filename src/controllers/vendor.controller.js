const vendorService = require('../services/vendor.service');

const getAllVendors = async (req, res, next) => {
  try {
    const vendors = await vendorService.getAllVendors();
    res.json(vendors);
  } catch (error) {
    next(error);
  }
};

const getVendorById = async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    next(error);
  }
};

const createVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.createVendor(req.body);
    res.status(201).json(vendor);
  } catch (error) {
    next(error);
  }
};

const updateVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.updateVendor(req.params.id, req.body);
    res.json(vendor);
  } catch (error) {
    next(error);
  }
};

const deleteVendor = async (req, res, next) => {
  try {
    await vendorService.deleteVendor(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const importVendors = async (req, res, next) => {
  try {
    const result = await vendorService.importVendors(req.body);
    res.status(201).json({
      message: 'Vendors imported successfully',
      count: result.count
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  importVendors
};
