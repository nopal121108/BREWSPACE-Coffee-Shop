import { CustomerOrder, CustomerOrderItem, OrderStatus, Product, Category } from '@/types';

// Mock Categories for Customer Menu
export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: 'Signature Coffee', slug: 'signature-coffee', description: 'Kopi racikan khas Brewspace dengan cita rasa unik', status: 'active', product_count: 3 },
  { id: 2, name: 'Classic Espresso', slug: 'classic-espresso', description: 'Espresso murni dan sajian kopi berbasis espresso klasik', status: 'active', product_count: 4 },
  { id: 3, name: 'Manual Brew', slug: 'manual-brew', description: 'Kopi seduh manual dari biji kopi single origin pilihan', status: 'active', product_count: 2 },
  { id: 4, name: 'Non-Coffee', slug: 'non-coffee', description: 'Minuman segar teh, artisan matcha, dan cokelat premium', status: 'active', product_count: 3 },
  { id: 5, name: 'Pastry & Bakery', slug: 'pastry-bakery', description: 'Pastry renyah, croissant hangat, dan cake lezat', status: 'active', product_count: 3 },
];

// Mock Products for Customer Menu Catalog
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    category_id: 1,
    name: 'Brewspace Aren Latte',
    description: 'Espresso ganda berpadu susu segar murni dan sirup gula aren organik premium khas nusantara.',
    price: 28000,
    stock: 45,
    min_stock: 10,
    image_url: 'aren-latte.jpg',
    status: 'active',
    category_name: 'Signature Coffee',
    category_slug: 'signature-coffee'
  },
  {
    id: 2,
    category_id: 1,
    name: 'Caramel Macchiato Velvet',
    description: 'Espresso dengan baluran sirup vanilla lembut, steamed milk creamy, dan saus karamel leleh.',
    price: 33000,
    stock: 30,
    min_stock: 8,
    image_url: 'caramel-macchiato.jpg',
    status: 'active',
    category_name: 'Signature Coffee',
    category_slug: 'signature-coffee'
  },
  {
    id: 3,
    category_id: 1,
    name: 'Cold Brew Citrus Bliss',
    description: 'Seduhan dingin kopi arabika 16 jam dengan sentuhan aroma jeruk sitrus yang menyegarkan dahaga.',
    price: 30000,
    stock: 25,
    min_stock: 5,
    image_url: 'cold-brew.jpg',
    status: 'active',
    category_name: 'Signature Coffee',
    category_slug: 'signature-coffee'
  },
  {
    id: 4,
    category_id: 2,
    name: 'Espresso Solo Extra Rich',
    description: 'Ekstraksi murni 30ml biji kopi House Blend Arabika 100% dengan crema tebal keemasan.',
    price: 18000,
    stock: 60,
    min_stock: 15,
    image_url: 'espresso.jpg',
    status: 'active',
    category_name: 'Classic Espresso',
    category_slug: 'classic-espresso'
  },
  {
    id: 5,
    category_id: 2,
    name: 'Americano Classico',
    description: 'Double shot espresso berpadu air mineral murni panas atau dingin. Kaya rasa dan bersih.',
    price: 24000,
    stock: 50,
    min_stock: 10,
    image_url: 'americano.jpg',
    status: 'active',
    category_name: 'Classic Espresso',
    category_slug: 'classic-espresso'
  },
  {
    id: 6,
    category_id: 2,
    name: 'Creamy Cappuccino',
    description: 'Keseimbangan sepertiga espresso, steamed milk, dan foam susu tebal bertabur bubuk kakao.',
    price: 29000,
    stock: 40,
    min_stock: 10,
    image_url: 'cappuccino.jpg',
    status: 'active',
    category_name: 'Classic Espresso',
    category_slug: 'classic-espresso'
  },
  {
    id: 7,
    category_id: 2,
    name: 'Cafe Latte Art',
    description: 'Espresso halus dipadukan dengan microfoam susu segar dan sentuhan seni latte art indah.',
    price: 30000,
    stock: 35,
    min_stock: 10,
    image_url: 'latte.jpg',
    status: 'active',
    category_name: 'Classic Espresso',
    category_slug: 'classic-espresso'
  },
  {
    id: 8,
    category_id: 3,
    name: 'V60 Single Origin Gayo',
    description: 'Manual pour over biji kopi Aceh Gayo dengan notes floral harum, sweet peach, dan body lembut.',
    price: 35000,
    stock: 20,
    min_stock: 5,
    image_url: 'v60.jpg',
    status: 'active',
    category_name: 'Manual Brew',
    category_slug: 'manual-brew'
  },
  {
    id: 9,
    category_id: 3,
    name: 'Japanese Iced Drip Flores',
    description: 'Kopi filter Flores Bajawa diseduh langsung menetes di atas es batu kristal segar dan jernih.',
    price: 36000,
    stock: 20,
    min_stock: 5,
    image_url: 'japanese-drip.jpg',
    status: 'active',
    category_name: 'Manual Brew',
    category_slug: 'manual-brew'
  },
  {
    id: 10,
    category_id: 4,
    name: 'Uji Matcha Latte Imperial',
    description: 'Bubuk matcha murni asal Kyoto Jepang dengan susu segar pilihan, creamy dan manis seimbang.',
    price: 32000,
    stock: 35,
    min_stock: 8,
    image_url: 'matcha-latte.jpg',
    status: 'active',
    category_name: 'Non-Coffee',
    category_slug: 'non-coffee'
  },
  {
    id: 11,
    category_id: 4,
    name: 'Dark Chocolate Hazelnut',
    description: 'Cokelat hitam Belgia pekat dengan sirup hazelnut harum dan susu hangat yang menenangkan.',
    price: 30000,
    stock: 28,
    min_stock: 8,
    image_url: 'chocolate.jpg',
    status: 'active',
    category_name: 'Non-Coffee',
    category_slug: 'non-coffee'
  },
  {
    id: 12,
    category_id: 5,
    name: 'Butter Croissant Artisanal',
    description: 'Croissant panggang fresh dari oven dengan lapisan renyah bermentega Prancis gurih.',
    price: 24000,
    stock: 22,
    min_stock: 5,
    image_url: 'croissant.jpg',
    status: 'active',
    category_name: 'Pastry & Bakery',
    category_slug: 'pastry-bakery'
  },
  {
    id: 13,
    category_id: 5,
    name: 'Pain au Chocolat Crisp',
    description: 'Pastry lipat klasik dengan isian batangan cokelat manis legit yang meleleh lembut di mulut.',
    price: 26000,
    stock: 18,
    min_stock: 5,
    image_url: 'pain-chocolat.jpg',
    status: 'active',
    category_name: 'Pastry & Bakery',
    category_slug: 'pastry-bakery'
  }
];

// In-Memory Global Mock Orders Store
declare global {
  // eslint-disable-next-line no-var
  var __brewspace_orders: CustomerOrder[] | undefined;
}

function getInitialMockOrders(): CustomerOrder[] {
  const now = new Date();
  const formatTime = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60000).toISOString();

  return [
    {
      id: 'ORD-20261117-001',
      orderNumber: 'ORD-20261117-001',
      customerId: 'cust_sample_1',
      customerName: 'Budi Santoso',
      tableNumber: 'Meja 03',
      notes: 'Gula aren sedikit saja ya kak (less sweet)',
      items: [
        { productId: 1, name: 'Brewspace Aren Latte', categoryName: 'Signature Coffee', price: 28000, quantity: 2, subtotal: 56000 },
        { productId: 12, name: 'Butter Croissant Artisanal', categoryName: 'Pastry & Bakery', price: 24000, quantity: 1, subtotal: 24000 }
      ],
      subtotal: 80000,
      tax: 0,
      totalAmount: 80000,
      status: 'menunggu_konfirmasi',
      statusNotes: 'Pesanan baru diajukan pelanggan, menunggu verifikasi kasir',
      createdAt: formatTime(4),
      updatedAt: formatTime(4)
    },
    {
      id: 'ORD-20261117-002',
      orderNumber: 'ORD-20261117-002',
      customerId: 'cust_sample_2',
      customerName: 'Annisa Putri',
      tableNumber: 'Meja 07',
      notes: 'Es batu banyak (extra ice)',
      items: [
        { productId: 2, name: 'Caramel Macchiato Velvet', categoryName: 'Signature Coffee', price: 33000, quantity: 1, subtotal: 33000 },
        { productId: 10, name: 'Uji Matcha Latte Imperial', categoryName: 'Non-Coffee', price: 32000, quantity: 1, subtotal: 32000 }
      ],
      subtotal: 65000,
      tax: 0,
      totalAmount: 65000,
      status: 'dikonfirmasi',
      statusNotes: 'Pesanan telah diterima oleh kasir, antrean dapur',
      createdAt: formatTime(15),
      updatedAt: formatTime(12),
      confirmedAt: formatTime(12),
      confirmedBy: 'Siti Rahma (Kasir)'
    },
    {
      id: 'ORD-20261117-003',
      orderNumber: 'ORD-20261117-003',
      customerId: 'cust_sample_3',
      customerName: 'Dimas Pratama',
      tableNumber: 'Takeaway',
      notes: 'Cup dipisah sedotan ramah lingkungan',
      items: [
        { productId: 8, name: 'V60 Single Origin Gayo', categoryName: 'Manual Brew', price: 35000, quantity: 1, subtotal: 35000 }
      ],
      subtotal: 35000,
      tax: 0,
      totalAmount: 35000,
      status: 'sedang_disiapkan',
      statusNotes: 'Barista sedang meracik pesanan Anda',
      createdAt: formatTime(28),
      updatedAt: formatTime(20),
      confirmedAt: formatTime(25),
      confirmedBy: 'Siti Rahma (Kasir)'
    },
    {
      id: 'ORD-20261117-004',
      orderNumber: 'ORD-20261117-004',
      customerId: 'cust_sample_4',
      customerName: 'Rian Ardiansyah',
      tableNumber: 'Meja 02',
      notes: 'Sajikan dengan piring kecil',
      items: [
        { productId: 6, name: 'Creamy Cappuccino', categoryName: 'Classic Espresso', price: 29000, quantity: 2, subtotal: 58000 },
        { productId: 13, name: 'Pain au Chocolat Crisp', categoryName: 'Pastry & Bakery', price: 26000, quantity: 2, subtotal: 52000 }
      ],
      subtotal: 110000,
      tax: 0,
      totalAmount: 110000,
      status: 'siap_diambil',
      statusNotes: 'Pesanan telah siap di pick-up counter',
      createdAt: formatTime(42),
      updatedAt: formatTime(10),
      confirmedAt: formatTime(38),
      confirmedBy: 'Siti Rahma (Kasir)'
    },
    {
      id: 'ORD-20261117-005',
      orderNumber: 'ORD-20261117-005',
      customerId: 'cust_sample_5',
      customerName: 'Maya Lestari',
      tableNumber: 'Meja 01',
      notes: '',
      items: [
        { productId: 1, name: 'Brewspace Aren Latte', categoryName: 'Signature Coffee', price: 28000, quantity: 1, subtotal: 28000 }
      ],
      subtotal: 28000,
      tax: 0,
      totalAmount: 28000,
      status: 'selesai',
      statusNotes: 'Pesanan telah selesai dan diterima pelanggan',
      createdAt: formatTime(75),
      updatedAt: formatTime(45),
      confirmedAt: formatTime(70),
      confirmedBy: 'Siti Rahma (Kasir)'
    },
    {
      id: 'ORD-20261117-006',
      orderNumber: 'ORD-20261117-006',
      customerId: 'cust_sample_6',
      customerName: 'Hendra Wijaya',
      tableNumber: 'Meja 09',
      notes: 'Minta susu almond',
      items: [
        { productId: 7, name: 'Cafe Latte Art', categoryName: 'Classic Espresso', price: 30000, quantity: 2, subtotal: 60000 }
      ],
      subtotal: 60000,
      tax: 0,
      totalAmount: 60000,
      status: 'ditolak',
      statusNotes: 'Pesanan ditolak oleh kasir',
      rejectedReason: 'Maaf, persediaan susu almond dan alternatif saat ini sedang kosong.',
      createdAt: formatTime(90),
      updatedAt: formatTime(85)
    }
  ];
}

if (!global.__brewspace_orders) {
  global.__brewspace_orders = getInitialMockOrders();
}

const orders = global.__brewspace_orders;

// Helper to generate Unique Order Number
export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSeq = Math.floor(100 + Math.random() * 900);
  return `ORD-${year}${month}${day}-${randomSeq}`;
}

// Queries & Mutations
export function getAllOrders(): CustomerOrder[] {
  return [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getCustomerOrders(customerId: string): CustomerOrder[] {
  if (!customerId) return [];
  return orders
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getOrderById(id: string): CustomerOrder | null {
  return orders.find((o) => o.id === id || o.orderNumber === id) || null;
}

export function createOrder(data: {
  customerId: string;
  customerName: string;
  tableNumber?: string;
  notes?: string;
  items: CustomerOrderItem[];
  subtotal: number;
  tax?: number;
  totalAmount: number;
}): CustomerOrder {
  const orderNumber = generateOrderNumber();
  const now = new Date().toISOString();

  const newOrder: CustomerOrder = {
    id: orderNumber,
    orderNumber,
    customerId: data.customerId,
    customerName: data.customerName.trim(),
    tableNumber: data.tableNumber ? data.tableNumber.trim() : 'Meja Umum',
    notes: data.notes ? data.notes.trim() : '',
    items: data.items,
    subtotal: data.subtotal,
    tax: data.tax || 0,
    totalAmount: data.totalAmount,
    status: 'menunggu_konfirmasi',
    statusNotes: 'Pesanan telah diajukan dan sedang menunggu konfirmasi kasir.',
    createdAt: now,
    updatedAt: now
  };

  orders.unshift(newOrder);
  return newOrder;
}

export function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  options?: {
    cashierName?: string;
    rejectedReason?: string;
    statusNotes?: string;
  }
): { success: boolean; order?: CustomerOrder; error?: string } {
  const index = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  if (index === -1) {
    return { success: false, error: 'Pesanan tidak ditemukan.' };
  }

  const order = orders[index];
  const now = new Date().toISOString();

  // Validate state transitions
  if (order.status === 'selesai') {
    return { success: false, error: 'Pesanan yang sudah selesai tidak dapat diubah statusnya.' };
  }
  if (order.status === 'ditolak' || order.status === 'dibatalkan') {
    return { success: false, error: 'Pesanan yang sudah dibatalkan atau ditolak tidak dapat diubah.' };
  }

  let defaultNote = '';
  if (newStatus === 'dikonfirmasi') {
    order.confirmedAt = now;
    order.confirmedBy = options?.cashierName || 'Kasir';
    defaultNote = 'Pesanan dikonfirmasi oleh kasir dan masuk antrean.';
  } else if (newStatus === 'sedang_disiapkan') {
    defaultNote = 'Pesanan sedang disiapkan di bar / dapur.';
  } else if (newStatus === 'siap_diambil') {
    defaultNote = 'Pesanan siap diambil di counter pick-up.';
  } else if (newStatus === 'selesai') {
    defaultNote = 'Pesanan telah selesai diserahkan kepada pelanggan.';
  } else if (newStatus === 'ditolak') {
    order.rejectedReason = options?.rejectedReason || 'Pesanan ditolak oleh kasir.';
    defaultNote = 'Pesanan tidak dapat diproses: ' + (options?.rejectedReason || 'Ditolak');
  }

  order.status = newStatus;
  order.statusNotes = options?.statusNotes || defaultNote;
  order.updatedAt = now;

  return { success: true, order };
}

export function cancelCustomerOrder(
  orderId: string,
  customerId: string
): { success: boolean; order?: CustomerOrder; error?: string } {
  const index = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  if (index === -1) {
    return { success: false, error: 'Pesanan tidak ditemukan.' };
  }

  const order = orders[index];

  // Rule: Check customer ownership
  if (order.customerId !== customerId) {
    return { success: false, error: 'Anda hanya memiliki wewenang membatalkan pesanan milik Anda sendiri.' };
  }

  // Rule: Only cancellable if still "menunggu_konfirmasi"
  if (order.status !== 'menunggu_konfirmasi') {
    return {
      success: false,
      error: 'Pesanan tidak dapat dibatalkan karena sudah dikonfirmasi atau sedang diproses oleh kasir.'
    };
  }

  const now = new Date().toISOString();
  order.status = 'dibatalkan';
  order.statusNotes = 'Pesanan dibatalkan oleh pelanggan.';
  order.cancelledAt = now;
  order.updatedAt = now;

  return { success: true, order };
}

