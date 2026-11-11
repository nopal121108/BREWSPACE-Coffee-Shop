'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ReceiptModal from '@/components/ReceiptModal';
import { useToast } from '@/components/Toast';
import { Product, Category, CartItem, User } from '@/types';
import { formatRupiah } from '@/lib/utils';
import { getProductImage } from '@/lib/coffee-images';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  Coffee,
  Receipt,
  User as UserIcon,
  CreditCard,
  Banknote
} from 'lucide-react';

export default function PosPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [taxPct, setTaxPct] = useState(0);

  // Checkout inputs
  const [customerName, setCustomerName] = useState('');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'debit'>('cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Load User & Products
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.user) {
          router.push('/');
        } else {
          setUser(data.user);
        }
      })
      .catch(() => router.push('/'));

    // Fetch tax settings
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings?.tax_percentage) {
          setTaxPct(parseFloat(data.settings.tax_percentage) || 0);
        }
      })
      .catch(() => {});

    // Fetch POS products
    fetch('/api/pos/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.products || []);
          setCategories(data.categories || []);
        }
      })
      .catch(() => showToast('Gagal memuat produk POS.', 'error'));
  }, [router, showToast]);

  // Cart Management
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast(`Stok ${product.name} telah habis!`, 'error');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast(`Stok ${product.name} hanya tersisa ${product.stock}!`, 'error');
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock) {
              showToast(`Maksimal stok tercapai (${item.product.stock})`, 'error');
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCashReceived('');
    setCustomerName('');
    setNotes('');
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const taxAmount = Math.round((subtotal * taxPct) / 100);
  const totalAmount = subtotal + taxAmount;
  const currentCash = typeof cashReceived === 'number' ? cashReceived : 0;
  const changeAmount = currentCash >= totalAmount ? currentCash - totalAmount : 0;

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === 'all' || p.category_slug === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  // Handle Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Keranjang belanja masih kosong.', 'error');
      return;
    }

    if (currentCash < totalAmount && paymentMethod === 'cash') {
      showToast(`Uang tunai kurang dari total tagihan (${formatRupiah(totalAmount)})`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        cashReceived: paymentMethod === 'cash' ? currentCash : totalAmount,
        customerName: customerName || 'Tamu',
        notes: notes || null,
        paymentMethod,
      };

      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Gagal memproses transaksi.', 'error');
        setIsSubmitting(false);
        return;
      }

      showToast('Transaksi berhasil!', 'success');
      setReceiptData(data.receipt);

      // Refresh product stock
      fetch('/api/pos/products')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setProducts(d.products);
        });

      clearCart();
    } catch {
      showToast('Kesalahan saat memproses transaksi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-coffee-100">
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title="Point of Sale (POS)"
          subtitle="Katalog Menu & Pemrosesan Transaksi Kasir Cepat"
          user={user}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Product Catalog */}
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            {/* Search & Category Filter Bar */}
            <div className="space-y-4 mb-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari menu kopi, minuman, atau makanan..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-coffee-200 bg-white focus:outline-none focus:ring-2 focus:ring-coffee-600 text-sm shadow-sm"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-coffee-600 text-white shadow-sm'
                      : 'bg-white text-stone-600 hover:bg-coffee-50 border border-coffee-200'
                  }`}
                >
                  Semua Menu ({products.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat.slug
                        ? 'bg-coffee-600 text-white shadow-sm'
                        : 'bg-white text-stone-600 hover:bg-coffee-50 border border-coffee-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 py-12">
                  <Coffee className="w-12 h-12 text-stone-300 mb-2" />
                  <p className="text-sm font-medium">Tidak ada menu yang sesuai.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((p) => {
                    const isOutOfStock = p.stock <= 0;
                    const isLowStock = p.stock > 0 && p.stock <= p.min_stock;
                    const imgSrc = getProductImage(p.image_url, p.name, p.category_slug);

                    return (
                      <div
                        key={p.id}
                        onClick={() => !isOutOfStock && addToCart(p)}
                        className={`group bg-white rounded-2xl border border-coffee-200/80 overflow-hidden shadow-sm flex flex-col transition-all text-left ${
                          isOutOfStock
                            ? 'opacity-60 cursor-not-allowed'
                            : 'cursor-pointer hover:shadow-md hover:border-coffee-400 hover:-translate-y-0.5'
                        }`}
                      >
                        {/* Image Banner */}
                        <div className="relative aspect-video w-full bg-coffee-200 overflow-hidden">
                          <img
                            src={imgSrc}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* Stock Badge */}
                          <div className="absolute top-2 right-2">
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow">
                                Habis
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow">
                                Sisa {p.stock}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 backdrop-blur-sm text-white">
                                {p.stock} pcs
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-semibold text-coffee-500 uppercase tracking-wider">
                              {p.category_name}
                            </span>
                            <h4 className="font-semibold text-sm text-stone-900 group-hover:text-coffee-700 line-clamp-1">
                              {p.name}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100">
                            <span className="font-bold text-coffee-800 text-sm">
                              {formatRupiah(p.price)}
                            </span>
                            <span className="w-7 h-7 rounded-lg bg-coffee-50 text-coffee-600 flex items-center justify-center group-hover:bg-coffee-600 group-hover:text-white transition">
                              <Plus className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart & Checkout Sidebar */}
          <div className="w-96 bg-white border-l border-coffee-200/80 flex flex-col shadow-lg shrink-0">
            {/* Cart Header */}
            <div className="p-4 border-b border-coffee-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-coffee-600" />
                <h3 className="font-bold text-base font-display text-stone-900">
                  Keranjang ({cart.reduce((a, b) => a + b.quantity, 0)})
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 py-12">
                  <div className="w-16 h-16 rounded-2xl bg-coffee-50 flex items-center justify-center text-coffee-300 mb-3">
                    <ShoppingCart className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-stone-600">Keranjang Masih Kosong</p>
                  <p className="text-xs text-stone-400 text-center mt-1">
                    Pilih menu di sebelah kiri untuk menambahkan pesanan
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 rounded-xl border border-coffee-100 bg-coffee-50/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-xs text-stone-900 truncate">
                        {item.product.name}
                      </h5>
                      <p className="text-[11px] text-coffee-700 font-medium">
                        {formatRupiah(item.product.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-coffee-200 bg-white rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="p-1 hover:bg-coffee-100 text-stone-600 rounded-l-lg transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="p-1 hover:bg-coffee-100 text-stone-600 rounded-r-lg transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-stone-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer & Notes Input */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-coffee-100 bg-coffee-50/30 space-y-2.5">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-stone-400 shrink-0" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama Pelanggan (opsional)"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-200 text-xs focus:ring-1 focus:ring-coffee-600 focus:outline-none bg-white"
                  />
                </div>

                {/* Payment Method Selector */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {(['cash', 'qris', 'debit'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method);
                        if (method !== 'cash') setCashReceived(totalAmount);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize border transition ${
                        paymentMethod === method
                          ? 'bg-coffee-600 text-white border-coffee-600 shadow-sm'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-coffee-50'
                      }`}
                    >
                      {method.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Quick Cash Buttons for Cash Payment */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        onClick={() => setCashReceived(totalAmount)}
                        className="py-1 px-1 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-bold text-stone-700"
                      >
                        Pas
                      </button>
                      <button
                        onClick={() => setCashReceived(50000)}
                        className="py-1 px-1 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-bold text-stone-700"
                      >
                        50k
                      </button>
                      <button
                        onClick={() => setCashReceived(100000)}
                        className="py-1 px-1 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-bold text-stone-700"
                      >
                        100k
                      </button>
                      <button
                        onClick={() => setCashReceived(200000)}
                        className="py-1 px-1 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-bold text-stone-700"
                      >
                        200k
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) =>
                          setCashReceived(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                        }
                        placeholder="Nominal uang diterima"
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold font-mono focus:ring-1 focus:ring-coffee-600 focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cart Summary & Checkout Button */}
            <div className="p-4 border-t border-coffee-200 bg-stone-50 space-y-3">
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-stone-800">{formatRupiah(subtotal)}</span>
                </div>
                {taxPct > 0 && (
                  <div className="flex justify-between">
                    <span>Pajak ({taxPct}%):</span>
                    <span className="font-semibold text-stone-800">{formatRupiah(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-coffee-800 pt-1 border-t border-stone-200">
                  <span>Total Tagihan:</span>
                  <span>{formatRupiah(totalAmount)}</span>
                </div>

                {paymentMethod === 'cash' && currentCash > 0 && (
                  <div className="flex justify-between text-xs font-semibold text-emerald-700 pt-1">
                    <span>Uang Kembalian:</span>
                    <span>{formatRupiah(changeAmount)}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-coffee-600 hover:bg-coffee-700 active:bg-coffee-800 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-md shadow-coffee-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Receipt className="w-4 h-4" />
                    <span>Selesaikan Transaksi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Thermal Receipt Modal Preview */}
      {receiptData && (
        <ReceiptModal receipt={receiptData} onClose={() => setReceiptData(null)} />
      )}
    </div>
  );
}

