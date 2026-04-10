const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllVendors = async () => {
  return await prisma.vendor.findMany({
    include: { documents: true },
  });
};

const getVendorById = async (id) => {
  return await prisma.vendor.findUnique({
    where: { id: parseInt(id) },
  });
};

const createVendor = async (vendorData) => {
  const { name, contactPerson, categories, phone, email, address, notes, taxId, bankName, bankAccount } = vendorData;
  return await prisma.vendor.create({
    data: {
      name,
      contactName: contactPerson,
      categories: Array.isArray(categories) ? categories.join(',') : categories,
      phone,
      email,
      address,
      notes,
      taxId,
      bankName,
      bankAccount
    },
  });
};

const updateVendor = async (id, vendorData) => {
  const { name, contactPerson, categories, phone, email, address, notes, taxId, bankName, bankAccount } = vendorData;
  return await prisma.vendor.update({
    where: { id: parseInt(id) },
    data: {
      name,
      contactName: contactPerson,
      categories: Array.isArray(categories) ? categories.join(',') : categories,
      phone,
      email,
      address,
      notes,
      taxId,
      bankName,
      bankAccount
    },
  });
};

const deleteVendor = async (id) => {
  try {
    return await prisma.vendor.delete({
      where: { id: parseInt(id) },
    });
  } catch (error) {
    if (error.code === 'P2003') {
      throw new Error('Cannot delete this vendor because they are linked to existing expenses or documents. Please archive them instead.');
    }
    throw error;
  }
};

const importVendors = async (vendorsData) => {
  const data = vendorsData.map(v => ({
    name: v.name || v.Name || 'Unknown Vendor',
    contactName: v.contactName || v.contactPerson || v["Contact Person"] || '',
    phone: v.phone || v.Phone || '',
    email: v.email || v.Email || '',
    address: v.address || v.Address || '',
    categories: Array.isArray(v.categories) ? v.categories.join(',') : (v.categories || v.Category || ''),
    notes: v.notes || '',
    isActive: true
  }));

  return await prisma.vendor.createMany({
    data,
    skipDuplicates: true
  });
};

module.exports = {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  importVendors,
};
