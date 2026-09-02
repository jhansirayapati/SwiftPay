import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clear existing data
  await prisma.transaction.deleteMany();
  await prisma.user.deleteMany();

  // Create users with realistic INR balances
  const user1 = await prisma.user.create({
    data: {
      id: 'user_001',
      name: 'Alice Johnson',
      email: 'alice@swiftpay.com',
      currency: 'INR',
      balance: new Decimal('100000.00'),
    },
  });

  const user2 = await prisma.user.create({
    data: {
      id: 'user_002',
      name: 'Bob Smith',
      email: 'bob@swiftpay.com',
      currency: 'INR',
      balance: new Decimal('50000.00'),
    },
  });

  const user3 = await prisma.user.create({
    data: {
      id: 'user_003',
      name: 'Charlie Brown',
      email: 'charlie@swiftpay.com',
      currency: 'INR',
      balance: new Decimal('25000.00'),
    },
  });

  console.log('✓ Created 3 test users:');
  console.log(`  - ${user1.name} (${user1.id}): ₹${user1.balance}`);
  console.log(`  - ${user2.name} (${user2.id}): ₹${user2.balance}`);
  console.log(`  - ${user3.name} (${user3.id}): ₹${user3.balance}`);

  console.log('✓ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('✗ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
