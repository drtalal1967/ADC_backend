const laboratoryService = require('../services/laboratory.service');

const getAllLaboratories = async (req, res, next) => {
  try {
    const labs = await laboratoryService.getAllLaboratories();
    res.json(labs);
  } catch (error) {
    next(error);
  }
};

const getLaboratoryById = async (req, res, next) => {
  try {
    const lab = await laboratoryService.getLaboratoryById(req.params.id);
    if (!lab) return res.status(404).json({ message: 'Laboratory not found' });
    res.json(lab);
  } catch (error) {
    next(error);
  }
};

const createLaboratory = async (req, res, next) => {
  try {
    const lab = await laboratoryService.createLaboratory(req.body);
    res.status(201).json(lab);
  } catch (error) {
    next(error);
  }
};

const updateLaboratory = async (req, res, next) => {
  try {
    const lab = await laboratoryService.updateLaboratory(req.params.id, req.body);
    res.json(lab);
  } catch (error) {
    next(error);
  }
};

const deleteLaboratory = async (req, res, next) => {
  try {
    await laboratoryService.deleteLaboratory(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const importLaboratories = async (req, res) => {
  try {
    const result = await laboratoryService.importLaboratories(req.body);
    res.status(201).json({
      message: 'Laboratories imported successfully',
      count: result.count
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAllLaboratories,
  getLaboratoryById,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
  importLaboratories
};
