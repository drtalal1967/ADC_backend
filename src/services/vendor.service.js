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

const buildVendorData = (vendorData) => {
  const data = {};
  const fieldMap = {
    name: 'name',
    contactPerson: 'contactName',
    contactName: 'contactName',
    phone: 'phone',
    email: 'email',
    address: 'address',
    notes: 'notes',
    taxId: 'taxId',
    bankName: 'bankName',
    bankAccount: 'bankAccount',
    isActive: 'isActive'
  };

  Object.entries(fieldMap).forEach(([sourceField, targetField]) => {
    if (Object.prototype.hasOwnProperty.call(vendorData, sourceField)) {
      data[targetField] = vendorData[sourceField];
    }
  });

  if (Object.prototype.hasOwnProperty.call(vendorData, 'categories')) {
    data.categories = Array.isArray(vendorData.categories) ? vendorData.categories.join(',') : vendorData.categories;
  }

  return data;
};

const createVendor = async (vendorData) => {
  const { logoUrl, documents } = vendorData;
  
  return await prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: buildVendorData(vendorData),
    });

    if (Object.prototype.hasOwnProperty.call(vendorData, 'logoUrl')) {
      await tx.$executeRaw`UPDATE vendors SET logo_url = ${logoUrl || null} WHERE id = ${vendor.id}`;
    }

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

    return { ...vendor, logoUrl: logoUrl || null };
  });
};

const updateVendor = async (id, vendorData) => {
  const { logoUrl, documents } = vendorData;
  
  return await prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.update({
      where: { id: parseInt(id) },
      data: buildVendorData(vendorData),
    });

    if (Object.prototype.hasOwnProperty.call(vendorData, 'logoUrl')) {
      await tx.$executeRaw`UPDATE vendors SET logo_url = ${logoUrl || null} WHERE id = ${parseInt(id)}`;
    }

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

    return { ...vendor, logoUrl: logoUrl ?? vendor.logoUrl ?? null };
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
