import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // 1. Clear existing data
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.topping.deleteMany({});
  await prisma.inventoryLog.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.employee.deleteMany({});

  // 2. Seed Employee (Initial Admin)
  const admin = await prisma.employee.create({
    data: {
      name: 'Quản lý Quán',
      email: 'admin@cafe.com',
      phone: '0987654321',
      role: 'admin',
      isActive: true,
    },
  });
  console.log(`Created admin employee: ${admin.email}`);

  // 3. Seed Toppings
  const toppingsData = [
    { name: 'Trân châu đen', price: 10000 },
    { name: 'Trân châu trắng', price: 10000 },
    { name: 'Thạch trái cây', price: 10000 },
    { name: 'Kem cheese', price: 15000 },
    { name: 'Shot espresso', price: 15000 },
  ];

  const toppings = [];
  for (const t of toppingsData) {
    const topping = await prisma.topping.create({ data: t });
    toppings.push(topping);
  }
  console.log(`Seeded ${toppings.length} toppings.`);

  // 4. Seed Categories
  const categoriesData = [
    { name: 'Cà phê', icon: '☕', sortOrder: 1 },
    { name: 'Trà sữa', icon: '🧋', sortOrder: 2 },
    { name: 'Trà trái cây', icon: '🍵', sortOrder: 3 },
    { name: 'Nước ép', icon: '🧃', sortOrder: 4 },
    { name: 'Bánh ngọt', icon: '🍰', sortOrder: 5 },
  ];

  const categoriesMap: Record<string, string> = {};
  for (const c of categoriesData) {
    const category = await prisma.category.create({ data: c });
    categoriesMap[c.name] = category.id;
  }
  console.log('Seeded product categories.');

  // 5. Seed Products
  const productsData = [
    // Coffee
    {
      name: 'Cà phê sữa đá',
      categoryId: categoriesMap['Cà phê'],
      priceS: 25000,
      priceM: 35000,
      priceL: 45000,
      isAvailable: true,
    },
    {
      name: 'Cà phê đen đá',
      categoryId: categoriesMap['Cà phê'],
      priceS: 20000,
      priceM: 29000,
      priceL: 39000,
      isAvailable: true,
    },
    {
      name: 'Bạc xỉu nóng/đá',
      categoryId: categoriesMap['Cà phê'],
      priceS: 29000,
      priceM: 39000,
      priceL: 49000,
      isAvailable: true,
    },
    // Milk Tea
    {
      name: 'Trà sữa truyền thống',
      categoryId: categoriesMap['Trà sữa'],
      priceS: 30000,
      priceM: 39000,
      priceL: 49000,
      isAvailable: true,
    },
    {
      name: 'Trà sữa matcha',
      categoryId: categoriesMap['Trà sữa'],
      priceS: 35000,
      priceM: 45000,
      priceL: 55000,
      isAvailable: true,
    },
    // Fruit Tea
    {
      name: 'Trà đào cam sả',
      categoryId: categoriesMap['Trà trái cây'],
      priceS: 35000,
      priceM: 45000,
      priceL: 55000,
      isAvailable: true,
    },
    // Juices
    {
      name: 'Nước ép cam nguyên chất',
      categoryId: categoriesMap['Nước ép'],
      priceM: 35000,
      priceL: 45000,
      isAvailable: true,
    },
    // Cakes
    {
      name: 'Tiramisu truyền thống',
      categoryId: categoriesMap['Bánh ngọt'],
      priceM: 40000,
      isAvailable: true,
    },
  ];

  for (const p of productsData) {
    await prisma.product.create({ data: p });
  }
  console.log('Seeded products.');

  // 6. Seed Inventory Items
  const inventoryData = [
    { name: 'Bột cà phê Robusta', unit: 'kg', quantity: 10, minQuantity: 2, costPrice: 120000 },
    { name: 'Sữa đặc Ngôi sao', unit: 'hộp', quantity: 24, minQuantity: 6, costPrice: 18000 },
    { name: 'Sữa tươi Dalat Milk', unit: 'lít', quantity: 15, minQuantity: 4, costPrice: 32000 },
    { name: 'Trân châu đen', unit: 'gói', quantity: 20, minQuantity: 5, costPrice: 25000 },
    { name: 'Bột trà sữa Matcha', unit: 'kg', quantity: 5, minQuantity: 1, costPrice: 220000 },
  ];

  for (const item of inventoryData) {
    const invItem = await prisma.inventoryItem.create({ data: item });
    
    // Create initial import log
    await prisma.inventoryLog.create({
      data: {
        itemId: invItem.id,
        type: 'import',
        quantity: item.quantity,
        note: 'Nhập kho khởi tạo hệ thống',
        employeeId: admin.id,
        employeeName: admin.name
      }
    });
  }
  console.log('Seeded warehouse items.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
