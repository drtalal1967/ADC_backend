const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const managerUser = await prisma.user.findFirst({
    where: { role: { name: 'MANAGER' } },
    include: { role: { include: { permissions: true } } }
  });

  if (!managerUser) {
    console.log('No Manager user found');
    process.exit(1);
  }

  console.log(`Testing for Manager User: ${managerUser.email}`);
  
  // Check permission check logic equivalent
  const module = 'payments';
  const action = 'canView';
  const permission = managerUser.role.permissions.find(p => p.module === module);
  console.log(`Permission for ${module}:`, permission ? permission[action] : 'Not Found');

  // Check data fetching
  const payments = await prisma.payment.findMany({
    include: { 
      expense: { include: { vendor: true } }, 
      labCase: { include: { laboratory: true } }
    }
  });
  console.log(`Total payments in DB: ${payments.length}`);
  
  process.exit(0);
}

test();
