import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default administrator account...');

  // Check if admin employee already exists
  const existingAdmin = await prisma.employee.findUnique({
    where: { email: 'admin@pos.com' }
  });

  if (!existingAdmin) {
    const admin = await prisma.employee.create({
      data: {
        name: 'Quản trị viên',
        email: 'admin@pos.com',
        phone: '0987654321',
        role: 'admin',
        isActive: true,
      }
    });
    console.log('✅ Created default Admin in database:', admin);
  } else {
    console.log('ℹ️ Default Admin already exists in database.');
  }

  // Create default categories if empty
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    console.log('Seeding default categories...');
    const coffee = await prisma.category.create({
      data: {
        name: 'Cà phê',
        icon: '☕',
        sortOrder: 1,
        isActive: true,
      }
    });
    const tea = await prisma.category.create({
      data: {
        name: 'Trà sữa',
        icon: '🧋',
        sortOrder: 2,
        isActive: true,
      }
    });
    const juice = await prisma.category.create({
      data: {
        name: 'Nước ép / Đá xay',
        icon: '🍹',
        sortOrder: 3,
        isActive: true,
      }
    });
    console.log('✅ Default categories created successfully.');

    // Seed default products
    console.log('Seeding default products...');
    await prisma.product.createMany({
      data: [
        {
          name: 'Cà phê sữa đá',
          categoryId: coffee.id,
          priceS: 25000,
          priceM: 29000,
          priceL: 35000,
          isAvailable: true,
        },
        {
          name: 'Cà phê đen đá',
          categoryId: coffee.id,
          priceS: 20000,
          priceM: 25000,
          priceL: 30000,
          isAvailable: true,
        },
        {
          name: 'Trà sữa Trân châu đường đen',
          categoryId: tea.id,
          priceS: 35000,
          priceM: 39000,
          priceL: 45000,
          isAvailable: true,
        },
        {
          name: 'Trà sữa Matcha',
          categoryId: tea.id,
          priceS: 35000,
          priceM: 39000,
          priceL: 45000,
          isAvailable: true,
        },
        {
          name: 'Nước ép cam nguyên chất',
          categoryId: juice.id,
          priceM: 35000,
          priceL: 40000,
          isAvailable: true,
        }
      ]
    });
    console.log('✅ Default products created successfully.');

    // Seed default toppings
    console.log('Seeding default toppings...');
    await prisma.topping.createMany({
      data: [
        { name: 'Trân châu đen', price: 5000, isActive: true },
        { name: 'Trân châu trắng', price: 6000, isActive: true },
        { name: 'Thạch trái cây', price: 5000, isActive: true },
        { name: 'Kem cheese', price: 10000, isActive: true }
      ]
    });
    console.log('✅ Default toppings created successfully.');
  }
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
