import { useState, type FormEvent } from 'react';
import { AlertCircle, Check, ClipboardCheck, Minus, PackagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { formatBaht, type ProductItem } from '../types';

interface AdminProductsProps {
  products: ProductItem[];
  onAddProduct: (item: ProductItem) => { ok: boolean; error?: string };
  onUpdateProduct: (id: string, updates: Omit<ProductItem, 'id'>) => void;
  onAdjustStock: (id: string, delta: number) => void;
  onDeleteProduct: (id: string) => void;
  onOpenOutboundOrders?: () => void;
}

export function AdminProducts({
  products,
  onAddProduct,
  onUpdateProduct,
  onAdjustStock,
  onDeleteProduct,
  onOpenOutboundOrders,
}: AdminProductsProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState(500);
  const [defaultQty, setDefaultQty] = useState(1);
  const [stock, setStock] = useState(10);
  const [formError, setFormError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editDefaultQty, setEditDefaultQty] = useState(1);
  const [editStock, setEditStock] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const totalProducts = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalStockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock <= 5).length;

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedSku = sku.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedSku || !trimmedName) {
      setFormError('กรุณากรอกรหัสสินค้า (SKU) และชื่อสินค้าให้ครบถ้วน');
      return;
    }

    const result = onAddProduct({
      id: trimmedSku,
      name: trimmedName,
      price: Math.max(0, Number(price) || 0),
      defaultQty: Math.max(1, Number(defaultQty) || 1),
      stock: Math.max(0, Number(stock) || 0),
    });

    if (!result.ok) {
      setFormError(result.error || 'ไม่สามารถเพิ่มรายการสินค้าได้');
      return;
    }

    setFormError('');
    setSku('');
    setName('');
    setPrice(500);
    setDefaultQty(1);
    setStock(10);
  };

  const startEdit = (item: ProductItem) => {
    setConfirmDeleteId(null);
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(item.price);
    setEditDefaultQty(item.defaultQty);
    setEditStock(item.stock);
  };

  const saveEdit = (id: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;
    onUpdateProduct(id, {
      name: trimmedName,
      price: Math.max(0, Number(editPrice) || 0),
      defaultQty: Math.max(1, Number(editDefaultQty) || 1),
      stock: Math.max(0, Number(editStock) || 0),
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการสินค้า ราคา จำนวน และสต๊อก</h1>
          <p className="text-sm text-slate-500 mt-1">
            ตั้งค่ารายการสินค้า ราคาต่อหน่วย จำนวนมาตรฐาน และปรับยอดสต๊อกคงเหลือในคลังสินค้า
          </p>
        </div>
        {onOpenOutboundOrders && (
          <button
            type="button"
            onClick={onOpenOutboundOrders}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
            <span>บันทึกออเดอร์ก่อนส่งลูกค้า</span>
          </button>
        )}
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-rose-200/80 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">รายการสินค้าทั้งหมด</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
            {totalProducts} <span className="text-sm font-sans font-normal text-slate-500">รายการ</span>
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            ใกล้หมด (≤ 5 ชิ้น){' '}
            <span className="font-mono tabular-nums font-medium text-amber-700">{lowStockCount}</span> รายการ
          </div>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">จำนวนสต๊อกรวมในคลัง</div>
          <div className="text-2xl font-bold text-rose-700 font-mono tabular-nums mt-2">
            {totalStockUnits.toLocaleString('th-TH')}{' '}
            <span className="text-sm font-sans font-normal text-slate-500">ชิ้น</span>
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            อัปเดตอัตโนมัติเมื่อคืนสินค้าเข้าสต็อก
          </div>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">มูลค่าสต๊อกคงเหลือรวม</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
            {formatBaht(totalStockValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">คำนวณจากราคาต่อหน่วย × สต๊อกคงเหลือ</div>
        </div>
      </div>

      {/* Add New Product Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-rose-200/80 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-center gap-2 text-slate-900">
          <PackagePlus className="w-4 h-4 text-rose-600" aria-hidden="true" />
          <h2 className="text-base font-semibold">เพิ่มรายการสินค้าใหม่</h2>
        </div>

        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="prod-sku" className="block text-xs font-medium text-slate-700 mb-1.5">
              รหัสสินค้า (SKU)
            </label>
            <input
              id="prod-sku"
              type="text"
              required
              value={sku}
              onChange={(e) => {
                setSku(e.target.value);
                if (formError) setFormError('');
              }}
              placeholder="เช่น SKU-005"
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="prod-name" className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อสินค้า
            </label>
            <input
              id="prod-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ระบุชื่อสินค้า"
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label htmlFor="prod-price" className="block text-xs font-medium text-slate-700 mb-1.5">
              ราคาต่อหน่วย (บาท)
            </label>
            <input
              id="prod-price"
              type="number"
              min={0}
              required
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label htmlFor="prod-qty" className="block text-xs font-medium text-slate-700 mb-1.5">
              จำนวนมาตรฐาน (ชิ้น)
            </label>
            <input
              id="prod-qty"
              type="number"
              min={1}
              required
              value={defaultQty}
              onChange={(e) => setDefaultQty(Number(e.target.value))}
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label htmlFor="prod-stock" className="block text-xs font-medium text-slate-700 mb-1.5">
              สต๊อกคงเหลือ (ชิ้น)
            </label>
            <input
              id="prod-stock"
              type="number"
              min={0}
              required
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            บันทึกเพิ่มรายการสินค้า
          </button>
        </div>
      </form>

      {/* Product & Stock Table */}
      <div className="bg-white border border-rose-200/80 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">รายการสินค้าและสต๊อกในคลัง</h2>
          <div className="relative w-full sm:w-64">
            <Search
              className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารหัสหรือชื่อสินค้า..."
              aria-label="ค้นหารายการสินค้า"
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-700">ไม่พบรายการสินค้าที่ตรงกับคำค้นหา</p>
            <p className="text-xs text-slate-500 mt-1">ลองล้างคำค้นหาหรือเพิ่มรายการสินค้าใหม่ด้านบน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-rose-100 bg-rose-50/50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">รหัสสินค้า</th>
                  <th className="py-3 px-4 whitespace-nowrap">ชื่อสินค้า</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">ราคาต่อหน่วย</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">จำนวนมาตรฐาน</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">สต๊อกคงเหลือ</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">มูลค่ารวม</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100/80 text-sm">
                {filteredProducts.map((item) => {
                  const isEditing = editingId === item.id;
                  const isLowStock = item.stock <= 5;

                  return (
                    <tr key={item.id} className="hover:bg-rose-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-rose-700 whitespace-nowrap">
                        {item.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 min-w-[200px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            aria-label="แก้ไขชื่อสินค้า"
                            className="w-full px-2.5 py-1 border border-rose-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={editPrice}
                            onChange={(e) => setEditPrice(Number(e.target.value))}
                            aria-label="แก้ไขราคาสินค้า"
                            className="w-24 px-2 py-1 border border-rose-300 rounded-md text-sm text-right font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        ) : (
                          formatBaht(item.price)
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editDefaultQty}
                            onChange={(e) => setEditDefaultQty(Number(e.target.value))}
                            aria-label="แก้ไขจำนวนมาตรฐาน"
                            className="w-20 px-2 py-1 border border-rose-300 rounded-md text-sm text-right font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        ) : (
                          `${item.defaultQty} ชิ้น`
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={editStock}
                            onChange={(e) => setEditStock(Number(e.target.value))}
                            aria-label="แก้ไขสต๊อกคงเหลือ"
                            className="w-24 px-2 py-1 border border-rose-300 rounded-md text-sm text-right font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onAdjustStock(item.id, -1)}
                              disabled={item.stock <= 0}
                              aria-label={`ลดสต๊อก ${item.name}`}
                              className="p-1 border border-rose-200 rounded hover:bg-rose-50 text-slate-600 disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <Minus className="w-3 h-3" aria-hidden="true" />
                            </button>
                            <span
                              className={`min-w-[3.5rem] text-center font-mono tabular-nums font-semibold ${
                                item.stock === 0
                                  ? 'text-rose-700'
                                  : isLowStock
                                    ? 'text-amber-700'
                                    : 'text-slate-900'
                              }`}
                            >
                              {item.stock} ชิ้น
                            </span>
                            <button
                              type="button"
                              onClick={() => onAdjustStock(item.id, 1)}
                              aria-label={`เพิ่มสต๊อก ${item.name}`}
                              className="p-1 border border-rose-200 rounded hover:bg-rose-50 text-slate-600"
                            >
                              <Plus className="w-3 h-3" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {formatBaht(item.price * item.stock)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveEdit(item.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md"
                            >
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>บันทึก</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                            >
                              <X className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>ยกเลิก</span>
                            </button>
                          </div>
                        ) : confirmDeleteId === item.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteProduct(item.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md"
                            >
                              ยืนยันลบ
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:text-rose-900 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>แก้ไข</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              aria-label={`ลบสินค้า ${item.name}`}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
