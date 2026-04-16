const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllVendors = async () => {
  return await prisma.vendor.findMany({
    include: { documents: true },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ]
  });
};

const getVendorById = async (id) => {
  return await prisma.vendor.findUnique({
    where: { id: parseInt(id) },
  });
};

const createVendor = async (vendorData) => {
  const { name, contactPerson, categories, phone, email, address, notes, taxId, bankName, bankAccount, documents } = vendorData;
  
  return await prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
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

    if (documents && documents.length > 0) {
      await tx.document.createMany({
        data: documents.map(doc => ({
          fileName: doc.fileName || doc.title || 'Vendor Attachment',
          fileUrl: doc.fileUrl || doc,
          fileType: doc.fileType || 'image/jpeg',
          fileSizeKb: doc.fileSizeKb || 0,
          category: 'INVOICE',
          title: doc.title || 'Vendor Attachment',
          vendorId: vendor.id
        }))
      });
    }

    return vendor;
  });
};

const updateVendor = async (id, vendorData) => {
  const { name, contactPerson, categories, phone, email, address, notes, taxId, bankName, bankAccount, documents } = vendorData;
  
  return await prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.update({
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

    if (documents && documents.length > 0) {
      // Filter out documents that are already linked (optional, but safer to just add new ones)
      // For now, we assume the frontend sends NEW documents that need to be linked.
      await tx.document.createMany({
        data: documents.map(doc => ({
          fileName: doc.fileName || doc.title || 'Vendor Attachment',
          fileUrl: doc.fileUrl || doc,
          fileType: doc.fileType || 'image/jpeg',
          fileSizeKb: doc.fileSizeKb || 0,
          category: 'INVOICE',
          title: doc.title || 'Vendor Attachment',
          vendorId: vendor.id
        }))
      });
    }

    return vendor;
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
