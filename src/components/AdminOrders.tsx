import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  PackageMinus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { OrderRecord, ProductItem, ReturnRequest } from '../types';

interface AdminOrdersProps {
  orders: OrderRecord[];
  products: ProductItem[];
  requests: ReturnRequest[];
  onAddOrder: (data: {
    orderNo: string;
    productSku: string;
    productName: string;
    qty: number;
    customerName?: string;
    note?: string;
  }) => { ok: boolean; error?: string };
  onDeleteOrder: (orderNo: string) => void;
}

const ORDER_NO_PATTERN = /^ORD-[A-Z0-9]{6}$/;

export function AdminOrders({
  orders,
  products,
  requests,
  onAddOrder,
  onDeleteOrder,
}: AdminOrdersProps) {
  const [orderNo, setOrderNo] = useState('');
  const [selectedSku, setSelectedSku] = useState<string>(products[0]?.id ?? '');
  const [qty, setQty] = useState<number>(1);
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteOrderNo, setConfirmDeleteOrderNo] = useState<string | null>(null);

  const activeSku =
    products.some((p) => p.id === selectedSku) ? selectedSku : (products[0]?.id ?? '');
  const selectedProduct = products.find((p) => p.id === activeSku);

  const totalShippedUnits = orders.reduce((sum, o) => sum + o.qty, 0);
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      o.orderNo.toLowerCase().includes(q) ||
      o.productSku.toLowerCase().includes(q) ||
      o.productName.toLowerCase().includes(q) ||
      (o.customerName ?? '').toLowerCase().includes(q)
    );
  });

  const handleGenerateOrderNo = () => {
    const existingSet = new Set(orders.map((o) => o.orderNo.toUpperCase()));
    let candidate = '';
    for (let i = 0; i < 20; i += 1) {
      const randomSix = String(Math.floor(100000 + Math.random() * 900000));
      const next = `ORD-${randomSix}`;
      if (!existingSet.has(next)) {
        candidate = next;
        break;
      }
    }
    if (!candidate) {
      candidate = `ORD-${Date.now().toString().slice(-6)}`;
    }
    setOrderNo(candidate);
    if (formError) setFormError('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const normalizedOrderNo = orderNo.trim().toUpperCase();

    if (!ORDER_NO_PATTERN.test(normalizedOrderNo)) {
      setFormError('กรุณากรอกเลขออเดอร์ในรูปแบบ ORD-XXXXXX (เช่น ORD-100001)');
      return;
    }

    if (!selectedProduct) {
      setFormError('กรุณาเลือกสินค้าจากคลังก่อนบันทึกออเดอร์');
      return;
    }

    const numericQty = Math.floor(Number(qty) || 0);
    if (numericQty < 1) {
      setFormError('กรุณาระบุจำนวนสินค้าอย่างน้อย 1 ชิ้น');
      return;
    }

    if (numericQty > selectedProduct.stock) {
      setFormError(
        `สต๊อกสินค้า ${selectedProduct.name} คงเหลือเพียง ${selectedProduct.stock} ชิ้น ไม่เพียงพอสำหรับตัดส่ง ${numericQty} ชิ้น`
      );
      return;
    }

    const result = onAddOrder({
      orderNo: normalizedOrderNo,
      productSku: selectedProduct.id,
      productName: selectedProduct.name,
      qty: numericQty,
      customerName: customerName.trim() || undefined,
      note: note.trim() || undefined,
    });

    if (!result.ok) {
      setFormError(result.error || 'ไม่สามารถบันทึกออเดอร์ได้');
      return;
    }

    setFormError('');
    setOrderNo('');
    setQty(1);
    setCustomerName('');
    setNote('');
  };

  const remainingAfterShip = selectedProduct ? selectedProduct.stock - (Number(qty) || 0) : 0;
  const isInsufficientStock = !selectedProduct || (Number(qty) || 0) > selectedProduct.stock || selectedProduct.stock === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">บันทึกออเดอร์ก่อนส่งของให้ลูกค้า</h1>
        <p className="text-sm text-slate-500 mt-1">
          กรอกเลขออเดอร์ (ORD-XXXXXX) ชื่อสินค้า และจำนวนก่อนจัดส่งสินค้าให้ลูกค้า เพื่อตัดสต๊อกอัตโนมัติและป้องกันการคลาดเคลื่อนของสต๊อก
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-rose-200/80 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">ออเดอร์ที่บันทึกส่งออกแล้ว</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
            {orders.length}{' '}
            <span className="text-sm font-sans font-normal text-slate-500">ออเดอร์</span>
          </div>
          <div className="text-xs text-slate-500 mt-1.5">ใช้ตรวจสอบอ้างอิงเมื่อลูกค้ายื่นขอคืนสินค้า</div>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">จำนวนสินค้าที่ตัดสต๊อกส่งออก</div>
          <div className="text-2xl font-bold text-rose-700 font-mono tabular-nums mt-2">
            {totalShippedUnits.toLocaleString('th-TH')}{' '}
            <span className="text-sm font-sans font-normal text-slate-500">ชิ้น</span>
          </div>
          <div className="text-xs text-slate-500 mt-1.5">หักยอดจากคลังสินค้าตรงตามเลขออเดอร์</div>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">สต๊อกคงเหลือรวมในคลัง</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-2">
            {totalStockUnits.toLocaleString('th-TH')}{' '}
            <span className="text-sm font-sans font-normal text-slate-500">ชิ้น</span>
          </div>
          <div className="text-xs text-slate-500 mt-1.5">อัปเดตทันทีเมื่อบันทึกออเดอร์ก่อนจัดส่ง</div>
        </div>
      </div>

      {/* Pre-shipment Order Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-rose-200/80 rounded-xl p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-900">
            <ClipboardCheck className="w-4 h-4 text-rose-600" aria-hidden="true" />
            <h2 className="text-base font-semibold">กรอกข้อมูลออเดอร์ก่อนส่งของให้ลูกค้า</h2>
          </div>
          <button
            type="button"
            onClick={handleGenerateOrderNo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors w-fit whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>สร้างเลขออเดอร์ ORD-XXXXXX</span>
          </button>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="ord-no" className="block text-xs font-medium text-slate-700 mb-1.5">
              เลขออเดอร์ (ORD-XXXXXX) <span className="text-rose-600 font-semibold">*</span>
            </label>
            <input
              id="ord-no"
              type="text"
              required
              value={orderNo}
              onChange={(e) => {
                setOrderNo(e.target.value.toUpperCase());
                if (formError) setFormError('');
              }}
              placeholder="ORD-100001"
              maxLength={10}
              className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">รูปแบบ ORD- ตามด้วยตัวอักษร/ตัวเลข 6 หลัก</p>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="ord-product" className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อสินค้า (เลือกจากคลังสินค้า) <span className="text-rose-600 font-semibold">*</span>
            </label>
            <select
              id="ord-product"
              required
              value={activeSku}
              onChange={(e) => {
                setSelectedSku(e.target.value);
                if (formError) setFormError('');
              }}
              className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {products.length === 0 ? (
                <option value="">ยังไม่มีสินค้าในคลัง</option>
              ) : (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id}) — คงเหลือ {p.stock} ชิ้น
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="ord-qty" className="block text-xs font-medium text-slate-700 mb-1.5">
              จำนวน (ชิ้น) <span className="text-rose-600 font-semibold">*</span>
            </label>
            <input
              id="ord-qty"
              type="number"
              min={1}
              max={selectedProduct ? Math.max(1, selectedProduct.stock) : 1}
              required
              value={qty}
              onChange={(e) => {
                setQty(Math.max(1, Number(e.target.value) || 1));
                if (formError) setFormError('');
              }}
              className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="ord-customer" className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อลูกค้า / ผู้รับ (ไม่บังคับ)
            </label>
            <input
              id="ord-customer"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="ระบุชื่อผู้สั่งซื้อเพื่อใช้ตรวจสอบย้อนหลัง"
              className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="ord-note" className="block text-xs font-medium text-slate-700 mb-1.5">
              หมายเหตุการจัดส่ง (ไม่บังคับ)
            </label>
            <input
              id="ord-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ตรวจนับครบก่อนแพ็กจัดส่ง"
              className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Live Stock Impact Preview */}
        {selectedProduct && (
          <div
            className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              isInsufficientStock
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-rose-50/40 border-rose-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <PackageMinus
                className={`w-4 h-4 shrink-0 ${
                  isInsufficientStock ? 'text-rose-600' : 'text-rose-500'
                }`}
                aria-hidden="true"
              />
              <span>
                <strong className="text-slate-900">{selectedProduct.name}</strong> · สต๊อกปัจจุบัน{' '}
                <span className="font-mono tabular-nums font-semibold">
                  {selectedProduct.stock}
                </span>{' '}
                ชิ้น
              </span>
            </div>
            <div className="font-mono tabular-nums font-semibold">
              {isInsufficientStock ? (
                <span className="text-rose-700">
                  สต๊อกไม่เพียงพอ (ต้องการ {qty} ชิ้น / คงเหลือ {selectedProduct.stock} ชิ้น)
                </span>
              ) : (
                <span className="text-emerald-700">
                  หลังบันทึกและตัดสต๊อกส่งลูกค้า: คงเหลือ {remainingAfterShip} ชิ้น
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isInsufficientStock}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            บันทึกออเดอร์และตัดสต๊อกก่อนส่ง
          </button>
        </div>
      </form>

      {/* Recorded Outbound Orders Table */}
      <div className="bg-white border border-rose-200/80 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">รายการออเดอร์ที่บันทึกก่อนส่งสินค้า</h2>
          <div className="relative w-full sm:w-72">
            <Search
              className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา ORD-XXXXXX, ชื่อสินค้า, ลูกค้า..."
              aria-label="ค้นหาออเดอร์"
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-700">ไม่พบรายการออเดอร์ที่ตรงกับคำค้นหา</p>
            <p className="text-xs text-slate-500 mt-1">
              กรอกเลขออเดอร์ ORD-XXXXXX ชื่อสินค้า และจำนวนด้านบนเพื่อบันทึกก่อนส่งของให้ลูกค้า
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-rose-100 bg-rose-50/50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">เลขออเดอร์</th>
                  <th className="py-3 px-4 whitespace-nowrap">ชื่อสินค้า / SKU</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">จำนวนที่ส่ง</th>
                  <th className="py-3 px-4 whitespace-nowrap">ลูกค้า / หมายเหตุ</th>
                  <th className="py-3 px-4 whitespace-nowrap">วันที่บันทึก</th>
                  <th className="py-3 px-4 whitespace-nowrap">สถานะอ้างอิงคืนสินค้า</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100/80 text-sm">
                {filteredOrders.map((ord) => {
                  const linkedReturn = requests.find(
                    (r) => r.orderNo.trim().toUpperCase() === ord.orderNo.trim().toUpperCase()
                  );
                  return (
                    <tr key={ord.orderNo} className="hover:bg-rose-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-rose-700 whitespace-nowrap">
                        {ord.orderNo}
                      </td>
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="font-medium text-slate-900">{ord.productName}</div>
                        <div className="text-xs font-mono text-slate-500">{ord.productSku}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {ord.qty} ชิ้น
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 min-w-[160px]">
                        <div className="font-medium text-slate-800">{ord.customerName || '-'}</div>
                        {ord.note && <div className="text-slate-500 truncate max-w-[220px]">{ord.note}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        <div className="font-mono tabular-nums text-slate-700">{ord.createdAt}</div>
                        <div>โดย {ord.createdBy}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        {linkedReturn ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>มีคำร้องคืน ({linkedReturn.id})</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">ส่งออกปกติ (สต๊อกตรง)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {linkedReturn ? (
                          <span className="text-xs text-slate-400">อ้างอิงคำร้องอยู่</span>
                        ) : confirmDeleteOrderNo === ord.orderNo ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteOrder(ord.orderNo);
                                setConfirmDeleteOrderNo(null);
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md"
                            >
                              ยืนยันคืนสต๊อก
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteOrderNo(null)}
                              className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteOrderNo(ord.orderNo)}
                            title="ยกเลิกออเดอร์และคืนยอดสต๊อก"
                            className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>ยกเลิก/คืนสต๊อก</span>
                          </button>
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
