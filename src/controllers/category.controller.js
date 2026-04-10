const categoryService = require('../services/category.service');

exports.getAllCategories = async (req, res, next) => {
  try {
    const { module } = req.query;
    const data = await categoryService.getAllCategories(module);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const data = await categoryService.createCategory(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await categoryService.updateCategory(id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    await categoryService.deleteCategory(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
