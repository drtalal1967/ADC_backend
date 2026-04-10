const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CategoryService {
  async getAllCategories(module) {
    const where = {};
    if (module) {
      where.module = module.toUpperCase();
    }
    return await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async createCategory(data) {
    return await prisma.category.create({
      data: {
        name: data.name,
        module: data.module.toUpperCase()
      }
    });
  }

  async updateCategory(id, data) {
    return await prisma.category.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name,
        module: data.module?.toUpperCase()
      }
    });
  }

  async deleteCategory(id) {
    return await prisma.category.delete({
      where: { id: parseInt(id) }
    });
  }
}

module.exports = new CategoryService();
