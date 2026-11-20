import { Fragment, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Banknote,
  Camera,
  Check,
  Eye,
  Film,
  ImagePlus,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  RESOLUTION_LABELS,
  STATUS_LABELS,
  formatBaht,
  getRequestAgeDays,
  getTotalCost,
  isRequestOverdue,
  type CustomerResolution,
  type EvidencePhoto,
  type OrderRecord,
  type ProductItem,
  type ReturnRequest,
  type ReturnStatusIndex,
} from '../types';
import { compressImageToPhoto } from '../utils/imageCompression';
import { StatusLabel } from './StatusLabel';

type RequestFilter = 'all' | 'overdue' | 'pending' | 'refund' | 'active' | 'closed' | 'rejected';

interface AdminRequestsProps {
  requests: ReturnRequest[];
  products: ProductItem[];
  orders: OrderRecord[];
  returnReasons: string[];
  warehouseZones: string[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, note: string) => void;
  onCompleteRefund: (
    requestId: string,
    payload: { refundAmount: number; note: string; refundSlip: EvidencePhoto }
  ) => void;
  onAddRequest: (data: {
    customerName: string;
    phone: string;
    orderNo: string;
    productSku?: string;
    productName: string;
    qty: number;
    price: number;
    reason: string;
    customerNote: string;
    resolution?: CustomerResolution;
  }) => void;
  onUpdateRequest: (
    requestId: string,
    updates: {
      productName: string;
      qty: number;
      price: number;
      reason: string;
      statusIndex: ReturnStatusIndex;
      warehouseZone?: string;
      freight: number;
      inspection: number;
      repair: number;
      note: string;
    }
  ) => void;
  onDeleteRequest: (requestId: string) => void;
  onSelectRequest: (req: ReturnRequest) => void;
}

const STATUS_OPTIONS: ReturnStatusIndex[] = [0, 1, 3, 4, 5, 7, 6, -1];

export function AdminRequests({
  requests,
  products,
  orders,
  returnReasons,
  warehouseZones,
  onApprove,
  onReject,
  onCompleteRefund,
  onAddRequest,
  onUpdateRequest,
  onDeleteRequest,
  onSelectRequest,
}: AdminRequestsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<RequestFilter>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundNote, setRefundNote] = useState('');
  const [refundSlip, setRefundSlip] = useState<EvidencePhoto | null>(null);
  const [refundSlipError, setRefundSlipError] = useState('');
  const [isProcessingSlip, setIsProcessingSlip] = useState(false);
  const refundSlipInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedCostId, setExpandedCostId] = useState<string | null>(null);

  // Add new request state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newOrderNo, setNewOrderNo] = useState('');
  const [newSelectedSku, setNewSelectedSku] = useState('__custom__');
  const [newProductName, setNewProductName] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(500);
  const [newReason, setNewReason] = useState(returnReasons[0] ?? 'สินค้าชำรุดหรือเสียหาย');
  const [newResolution, setNewResolution] = useState<CustomerResolution>('replace');
  const [newNote, setNewNote] = useState('');

  // Edit existing request state
  const [editingReq, setEditingReq] = useState<ReturnRequest | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editQty, setEditQty] = useState(1);
  const [editPrice, setEditPrice] = useState(0);
  const [editReason, setEditReason] = useState('');
  const [editStatus, setEditStatus] = useState<ReturnStatusIndex>(0);
  const [editZone, setEditZone] = useState('');
  const [editFreight, setEditFreight] = useState(0);
  const [editInspection, setEditInspection] = useState(0);
  const [editRepair, setEditRepair] = useState(0);
  const [editNote, setEditNote] = useState('');

  const filteredRequests = requests.filter((r) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'overdue'
          ? isRequestOverdue(r)
          : filter === 'pending'
            ? r.statusIndex === 0
            : filter === 'refund'
              ? r.statusIndex === 7
              : filter === 'active'
                ? r.statusIndex === 1 || r.statusIndex === 3 || r.statusIndex === 4 || r.statusIndex === 5
                : filter === 'closed'
                  ? r.statusIndex === 6
                  : r.statusIndex === -1;

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.orderNo.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  const overdueCount = requests.filter((r) => isRequestOverdue(r)).length;

  const tabs: { key: RequestFilter; label: string; count: number }[] = [
    { key: 'all', label: 'ทั้งหมด', count: requests.length },
    { key: 'overdue', label: 'เกิน 3 วัน', count: overdueCount },
    { key: 'pending', label: 'รออนุมัติ', count: requests.filter((r) => r.statusIndex === 0).length },
    { key: 'refund', label: 'รอโอนเงินคืน', count: requests.filter((r) => r.statusIndex === 7).length },
    {
      key: 'active',
      label: 'กำลังดำเนินการ',
      count: requests.filter(
        (r) => r.statusIndex === 1 || r.statusIndex === 3 || r.statusIndex === 4 || r.statusIndex === 5
      ).length,
    },
    { key: 'closed', label: 'ปิดรายการแล้ว', count: requests.filter((r) => r.statusIndex === 6).length },
    { key: 'rejected', label: 'ไม่อนุมัติ', count: requests.filter((r) => r.statusIndex === -1).length },
  ];

  const handleConfirmReject = (requestId: string) => {
    onReject(requestId, rejectReason.trim() || 'ไม่เข้าเงื่อนไขการรับคืนสินค้า');
    setRejectingId(null);
    setRejectReason('');
  };

  const handleRefundSlipChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setRefundSlipError('กรุณาอัปโหลดไฟล์รูปภาพสลิปเท่านั้น (JPG, PNG, WEBP)');
      return;
    }

    setIsProcessingSlip(true);
    setRefundSlipError('');
    try {
      const processed = await compressImageToPhoto(file);
      setRefundSlip(processed);
    } catch {
      setRefundSlipError('ไม่สามารถอ่านไฟล์รูปสลิปได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsProcessingSlip(false);
    }
  };

  const handleConfirmRefund = (requestId: string) => {
    if (!refundSlip) {
      setRefundSlipError('กรุณาแนบสลิปการโอนเงินคืนลูกค้าก่อนกดยืนยัน');
      return;
    }
    onCompleteRefund(requestId, {
      refundAmount: Math.max(0, Number(refundAmount) || 0),
      note: refundNote.trim() || 'โอนเงินคืนเข้าบัญชีลูกค้าเรียบร้อยแล้ว',
      refundSlip,
    });
    setRefundingId(null);
    setRefundNote('');
    setRefundSlip(null);
    setRefundSlipError('');
  };

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    onAddRequest({
      customerName: newCustomerName.trim(),
      phone: newPhone.trim(),
      orderNo: newOrderNo.trim(),
      productSku: newSelectedSku !== '__custom__' ? newSelectedSku : undefined,
      productName: newProductName.trim(),
      qty: Math.max(1, Number(newQty) || 1),
      price: Math.max(0, Number(newPrice) || 0),
      reason: newReason,
      customerNote: newNote.trim(),
      resolution: newResolution,
    });
    setNewCustomerName('');
    setNewPhone('');
    setNewOrderNo('');
    setNewSelectedSku('__custom__');
    setNewProductName('');
    setNewQty(1);
    setNewPrice(500);
    setNewReason(returnReasons[0] ?? 'สินค้าชำรุดหรือเสียหาย');
    setNewResolution('replace');
    setNewNote('');
    setShowAddForm(false);
  };

  const openEditModal = (req: ReturnRequest) => {
    setEditingReq(req);
    setEditProductName(req.productName);
    setEditQty(req.qty);
    setEditPrice(req.price);
    setEditReason(req.reason);
    setEditStatus(req.statusIndex);
    setEditZone(req.warehouseZone || '');
    setEditFreight(req.cost.freight);
    setEditInspection(req.cost.inspection);
    setEditRepair(req.cost.repair);
    setEditNote('');
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingReq) return;
    onUpdateRequest(editingReq.id, {
      productName: editProductName.trim() || editingReq.productName,
      qty: Math.max(1, Number(editQty) || 1),
      price: Math.max(0, Number(editPrice) || 0),
      reason: editReason,
      statusIndex: editStatus,
      warehouseZone: editZone || undefined,
      freight: Math.max(0, Number(editFreight) || 0),
      inspection: Math.max(0, Number(editInspection) || 0),
      repair: Math.max(0, Number(editRepair) || 0),
      note: editNote.trim() || 'ผู้ดูแลระบบปรับปรุงข้อมูลคำร้อง',
    });
    setEditingReq(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการคำร้องและอนุมัติ</h1>
          <p className="text-sm text-slate-500 mt-1">
            เพิ่ม แก้ไข ปรับสถานะ อนุมัติหรือปฏิเสธคำร้องขอคืนสินค้าทั้งหมดในระบบ
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shadow-sm shrink-0"
        >
          {showAddForm ? <X className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
          <span>{showAddForm ? 'ปิดฟอร์มเพิ่มคำร้อง' : 'เพิ่มคำร้องใหม่'}</span>
        </button>
      </div>

      {/* Admin Add Request Panel */}
      {showAddForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white border border-rose-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-900">เพิ่มคำร้องขอคืนสินค้าใหม่ (โดยผู้ดูแลระบบ)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อลูกค้า</label>
              <input
                type="text"
                required
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">เบอร์โทร</label>
              <input
                type="text"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="08X-XXX-XXXX"
                className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">เลขที่คำสั่งซื้อ</label>
              <input
                type="text"
                required
                value={newOrderNo}
                onChange={(e) => setNewOrderNo(e.target.value)}
                placeholder="ORD-XXXXX"
                className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">เลือกจากสต๊อกสินค้า</label>
              <select
                value={newSelectedSku}
                onChange={(e) => {
                  const sku = e.target.value;
                  setNewSelectedSku(sku);
                  const found = products.find((p) => p.id === sku);
                  if (found) {
                    setNewProductName(found.name);
                    setNewQty(found.defaultQty);
                    setNewPrice(found.price * found.defaultQty);
                  } else {
                    setNewProductName('');
                    setNewQty(1);
                    setNewPrice(500);
                  }
                }}
                className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="__custom__">ระบุชื่อสินค้าเอง</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatBaht(p.price)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อสินค้า</label>
              <input
                type="text"
                required
                value={newProductName}
                onChange={(e) => {
                  setNewProductName(e.target.value);
                  setNewSelectedSku('__custom__');
                }}
                placeholder="ระบุชื่อสินค้า"
                className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">จำนวน (ชิ้น)</label>
              <input
                type="number"
                min={1}
                required
                value={newQty}
                onChange={(e) => {
                  const nextQty = Math.max(1, Number(e.target.value) || 1);
                  setNewQty(nextQty);
                  const found = products.find((p) => p.id === newSelectedSku);
                  if (found) {
                    setNewPrice(found.price * nextQty);
                  }
                }}
                className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ราคาสินค้า (บาท)</label>
              <input
                type="number"
                min={0}
                required
                value={newPrice}
                onChange={(e) => setNewPrice(Number(e.target.value))}
                className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">สาเหตุการคืน</label>
              <select
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {returnReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ความประสงค์ลูกค้า</label>
              <select
                value={newResolution}
                onChange={(e) => setNewResolution(e.target.value as CustomerResolution)}
                className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="replace">{RESOLUTION_LABELS.replace}</option>
                <option value="refund">{RESOLUTION_LABELS.refund}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">หมายเหตุ</label>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม"
                className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              บันทึกคำร้องใหม่
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-rose-100/70 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.key
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 font-mono tabular-nums text-rose-400">({tab.count})</span>
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search
            className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารหัสคำร้อง, ลูกค้า, สินค้า..."
            aria-label="ค้นหาคำร้อง"
            className="w-full pl-9 pr-3 py-2 bg-white border border-rose-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-rose-200/80 rounded-xl overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-700">ไม่พบคำร้องที่ตรงกับเงื่อนไข</p>
            <p className="text-xs text-slate-500 mt-1">ลองปรับตัวกรองสถานะหรือคำค้นหาใหม่อีกครั้ง</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-rose-100 bg-rose-50/50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">เลขที่คำร้อง / คำสั่งซื้อ</th>
                  <th className="py-3 px-4 whitespace-nowrap">ลูกค้า</th>
                  <th className="py-3 px-4 whitespace-nowrap">สินค้าและสาเหตุ</th>
                  <th className="py-3 px-4 whitespace-nowrap">สถานะ</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">ราคา / ต้นทุน</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100/80 text-sm">
                {filteredRequests.map((r) => {
                  const matchedOrder = orders.find(
                    (o) => o.orderNo.trim().toUpperCase() === r.orderNo.trim().toUpperCase()
                  );
                  return (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-rose-50/40 transition-colors">
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-mono tabular-nums font-semibold text-rose-700 text-xs">{r.id}</div>
                        <div className="font-mono tabular-nums text-xs text-slate-500 mt-0.5">{r.orderNo}</div>
                        {matchedOrder ? (
                          r.qty <= matchedOrder.qty ? (
                            <div className="text-[11px] font-medium text-emerald-700 mt-0.5">
                              ✓ ตรงออเดอร์ส่งออก ({matchedOrder.qty} ชิ้น)
                            </div>
                          ) : (
                            <div className="text-[11px] font-medium text-rose-700 mt-0.5">
                              ⚠ เกินยอดส่งออก ({matchedOrder.qty} ชิ้น)
                            </div>
                          )
                        ) : (
                          <div className="text-[11px] text-amber-700 mt-0.5">
                            ⚠ ไม่พบออเดอร์ในบันทึกส่งออก
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-medium text-slate-900">{r.customerName}</div>
                        <div className="font-mono tabular-nums text-xs text-slate-500 mt-0.5">{r.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 align-top min-w-[200px]">
                        <div className="font-medium text-slate-900">
                          {r.productName}{' '}
                          <span className="text-xs font-mono tabular-nums text-slate-500">× {r.qty}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {r.reason}
                          {r.resolution && (
                            <>
                              <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                              <span className="text-rose-700 font-medium">{RESOLUTION_LABELS[r.resolution]}</span>
                            </>
                          )}
                        </div>
                        {((r.evidencePhotos && r.evidencePhotos.length > 0) ||
                          (r.evidenceVideos && r.evidenceVideos.length > 0) ||
                          r.refundSlip) && (
                          <button
                            type="button"
                            onClick={() => onSelectRequest(r)}
                            className="mt-1 inline-flex items-center gap-2 text-[11px] font-medium text-rose-600 hover:text-rose-700"
                          >
                            {r.evidencePhotos && r.evidencePhotos.length > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Camera className="w-3 h-3" aria-hidden="true" />
                                <span>รูป {r.evidencePhotos.length}</span>
                              </span>
                            )}
                            {r.evidenceVideos && r.evidenceVideos.length > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Film className="w-3 h-3" aria-hidden="true" />
                                <span>วิดีโอ {r.evidenceVideos.length}</span>
                              </span>
                            )}
                            {r.refundSlip && (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <ReceiptText className="w-3 h-3" aria-hidden="true" />
                                <span>มีสลิปคืนเงิน</span>
                              </span>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <StatusLabel statusIndex={r.statusIndex} statusText={r.statusText} />
                        {isRequestOverdue(r) && (
                          <div className="mt-1 text-[11px] font-semibold text-amber-700">
                            ⚠ เกิน 3 วัน (ค้าง {getRequestAgeDays(r)} วัน)
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="font-mono tabular-nums font-medium text-slate-900">
                          {formatBaht(r.price)}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCostId((prev) => (prev === r.id ? null : r.id))
                          }
                          className="mt-0.5 inline-flex items-center justify-end gap-1 font-mono tabular-nums text-xs text-rose-700 hover:text-rose-900 underline decoration-rose-200 underline-offset-2"
                        >
                          <span>
                            {expandedCostId === r.id ? 'ซ่อนค่าใช้จ่าย' : `ต้นทุน ${formatBaht(getTotalCost(r.cost))}`}
                          </span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.statusIndex === 0 && rejectingId !== r.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => onApprove(r.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>อนุมัติ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRefundingId(null);
                                setRejectingId(r.id);
                                setRejectReason('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors"
                            >
                              <X className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>ปฏิเสธ</span>
                            </button>
                          </>
                        )}
                        {r.statusIndex === 7 && refundingId !== r.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRefundingId(r.id);
                              setRefundAmount(r.price);
                              setRefundNote('โอนเงินคืนเข้าบัญชีลูกค้าเรียบร้อยแล้ว');
                              setRefundSlip(null);
                              setRefundSlipError('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Banknote className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>โอนเงินคืน & ปิดรายการ</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectRequest(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-rose-50 text-slate-700 border border-rose-200 text-xs font-medium rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>ดู</span>
                        </button>
                        {confirmDeleteId === r.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteRequest(r.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg"
                            >
                              ลบ
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(r.id)}
                            aria-label={`ลบคำร้อง ${r.id}`}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      {rejectingId === r.id && (
                        <div className="mt-2.5 flex items-center justify-end gap-2">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="ระบุเหตุผลที่ไม่อนุมัติ..."
                            className="w-48 px-2.5 py-1 text-xs border border-rose-200 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleConfirmReject(r.id)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md"
                          >
                            ยืนยัน
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingId(null)}
                            className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      )}

                      {refundingId === r.id && (
                        <div className="mt-3 p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl text-left whitespace-normal w-full max-w-md ml-auto space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">
                              รายละเอียดการโอนเงินคืนลูกค้า
                            </span>
                            <span className="text-[11px] font-medium text-rose-700">
                              * ต้องแนบสลิปก่อนยืนยัน
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                                ยอดเงินคืน (บาท)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(Number(e.target.value))}
                                aria-label="ยอดเงินคืน (บาท)"
                                className="w-full px-2.5 py-1.5 bg-white text-xs font-mono tabular-nums border border-rose-200 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                                เลขอ้างอิง / หมายเหตุ
                              </label>
                              <input
                                type="text"
                                value={refundNote}
                                onChange={(e) => setRefundNote(e.target.value)}
                                placeholder="เลขอ้างอิง/หมายเหตุการโอนคืน..."
                                className="w-full px-2.5 py-1.5 bg-white text-xs border border-rose-200 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">
                              สลิปโอนเงินคืนลูกค้า <span className="text-rose-600 font-semibold">*</span>
                            </label>
                            <input
                              ref={refundSlipInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleRefundSlipChange}
                              className="sr-only"
                            />
                            {!refundSlip ? (
                              <button
                                type="button"
                                onClick={() => refundSlipInputRef.current?.click()}
                                disabled={isProcessingSlip}
                                className="w-full border border-dashed border-rose-300 bg-white hover:bg-rose-50/70 rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-rose-700 transition-colors disabled:opacity-60"
                              >
                                <ImagePlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                                <span>
                                  {isProcessingSlip
                                    ? 'กำลังเตรียมรูปสลิป...'
                                    : 'คลิกเพื่อแนบสลิปคืนเงินลูกค้า (JPG, PNG)'}
                                </span>
                              </button>
                            ) : (
                              <div className="flex items-center justify-between gap-3 bg-white border border-emerald-200 rounded-lg p-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={refundSlip.dataUrl}
                                    alt={refundSlip.name}
                                    className="w-11 h-11 rounded object-cover border border-rose-100 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium text-slate-800 truncate">
                                      {refundSlip.name}
                                    </div>
                                    <div className="text-[11px] text-emerald-700 font-medium">
                                      แนบสลิปคืนเงินเรียบร้อยแล้ว
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => refundSlipInputRef.current?.click()}
                                    className="px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50 rounded"
                                  >
                                    เปลี่ยน
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRefundSlip(null)}
                                    aria-label="ลบสลิปโอนเงินคืน"
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  >
                                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                            )}
                            {refundSlipError && (
                              <p className="text-[11px] font-medium text-rose-600 mt-1">
                                {refundSlipError}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setRefundingId(null);
                                setRefundSlip(null);
                                setRefundSlipError('');
                              }}
                              className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="button"
                              disabled={!refundSlip || isProcessingSlip}
                              onClick={() => handleConfirmRefund(r.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md transition-colors"
                            >
                              ยืนยันโอนเงินคืน
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedCostId === r.id && (
                    <tr className="bg-rose-50/40">
                      <td colSpan={6} className="px-4 py-3 border-t border-rose-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 text-xs flex-1">
                            <div>
                              <div className="text-[11px] text-slate-500">ค่าขนส่ง</div>
                              <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                                {formatBaht(r.cost.freight)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-500">ค่าตรวจสอบ</div>
                              <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                                {formatBaht(r.cost.inspection)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-500">ค่าซ่อมแซม</div>
                              <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                                {formatBaht(r.cost.repair)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-500">สินทรัพย์เสี่ยง</div>
                              <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                                {formatBaht(r.cost.assetLoss)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-500">โอนคืนลูกค้า</div>
                              <div className="font-mono tabular-nums font-semibold text-emerald-700 mt-0.5">
                                {typeof r.refundAmount === 'number'
                                  ? formatBaht(r.refundAmount)
                                  : '-'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-500">รวมต้นทุนทั้งหมด</div>
                              <div className="font-mono tabular-nums font-bold text-rose-700 mt-0.5">
                                {formatBaht(getTotalCost(r.cost))}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onSelectRequest(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium rounded-lg transition-colors shrink-0 self-start sm:self-center"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>เปิดรายละเอียดเต็ม</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Edit Request Modal */}
      {editingReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-req-title"
          onClick={() => setEditingReq(null)}
        >
          <form
            onSubmit={handleEditSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-rose-200 rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/40">
              <div>
                <h2 id="edit-req-title" className="text-base font-semibold text-slate-900">
                  แก้ไขข้อมูลคำร้อง <span className="font-mono text-rose-700">{editingReq.id}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ลูกค้า: {editingReq.customerName} ({editingReq.orderNo})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingReq(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อสินค้า</label>
                  <input
                    type="text"
                    required
                    value={editProductName}
                    onChange={(e) => setEditProductName(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">จำนวน (ชิ้น)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editQty}
                    onChange={(e) => setEditQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ราคาสินค้า (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">สาเหตุการคืน</label>
                  <select
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {Array.from(new Set([...returnReasons, editReason])).map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">สถานะคำร้อง</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(Number(e.target.value) as ReturnStatusIndex)}
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">โซนคลังสินค้า</label>
                  <select
                    value={editZone}
                    onChange={(e) => setEditZone(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">ยังไม่ระบุโซน</option>
                    {Array.from(new Set([...warehouseZones, ...(editZone ? [editZone] : [])])).map(
                      (z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ค่าขนส่ง (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    value={editFreight}
                    onChange={(e) => setEditFreight(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ค่าตรวจสอบ (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    value={editInspection}
                    onChange={(e) => setEditInspection(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ค่าซ่อมแซม (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    value={editRepair}
                    onChange={(e) => setEditRepair(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">หมายเหตุการเปลี่ยนแปลง</label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="บันทึกเหตุผลการปรับปรุงข้อมูลในไทม์ไลน์"
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-rose-100 bg-rose-50/40 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingReq(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
