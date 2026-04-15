const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  const docs = await prisma.document.findMany({ 
    where: { 
      vendorId: null, 
      employeeId: null, 
      expenseId: null, 
      paymentId: null, 
      labCaseId: null, 
      laboratoryId: null, 
      OR: [ 
        { fileName: { contains: 'blob' } }, 
        { title: { contains: 'blob' } }, 
        { fileName: { contains: 'screencapture' } }, 
        { fileName: { contains: 'Lab_Cases_Report' } } 
      ] 
    } 
  }); 

  console.log('Found ' + docs.length + ' ghost documents to delete.'); 

  for (const d of docs) { 
    await prisma.document.delete({ where: { id: d.id } }); 
    console.log('Deleted ID ' + d.id + ': ' + d.fileName); 
  } 
} 

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
