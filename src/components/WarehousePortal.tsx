import { useState } from 'react';
import { Camera, Eye, Film, PackageCheck, Search, Truck } from 'lucide-react';
import {
  RESOLUTION_LABELS,
  formatBaht,
  getRequestAgeDays,
  isRequestOverdue,
  type ReturnRequest,
} from '../types';
import { StatusLabel } from './StatusLabel';

interface WarehousePortalProps {
  requests: ReturnRequest[];
  warehouseZones: string[];
  onReceiveItem: (requestId: string, payload: { zone: string; note: string }) => void;
  onDispatchReplacement: (requestId: string, payload: { trackingNo: string; note: string }) => void;
  onSelectRequest: (req: ReturnRequest) => void;
}

export function WarehousePortal({
  requests,
  warehouseZones,
  onReceiveItem,
  onDispatchReplacement,
  onSelectRequest,
}: WarehousePortalProps) {
  const [filter, setFilter] = useState<'awaiting' | 'replacement' | 'received'>('awaiting');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReceiveId, setActiveReceiveId] = useState<string | null>(null);
  const [zone, setZone] = useState<string>(warehouseZones[0] ?? 'โซน A (รอตรวจสอบ)');
  const [note, setNote] = useState<string>('');

  const [activeDispatchId, setActiveDispatchId] = useState<string | null>(null);
  const [trackingNo, setTrackingNo] = useState<string>('');
  const [dispatchNote, setDispatchNote] = useState<string>('');

  const awaitingList = requests.filter((r) => r.statusIndex === 1);
  const replacementList = requests.filter((r) => r.statusIndex === 5);
  const receivedList = requests.filter(
    (r) => r.statusIndex === 3 || r.statusIndex === 4 || r.statusIndex === 7 || r.statusIndex === 6
  );

  const sourceList =
    filter === 'awaiting'
      ? awaitingList
      : filter === 'replacement'
        ? replacementList
        : receivedList;

  const visibleList = sourceList.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      r.id.toLowerCase().includes(q) ||
      r.orderNo.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q)
    );
  });

  const openReceivePanel = (req: ReturnRequest) => {
    setActiveDispatchId(null);
    setActiveReceiveId(req.id);
    setZone(warehouseZones[0] ?? 'โซน A (รอตรวจสอบ)');
    setNote('ตรวจนับจำนวนครบถ้วน รับเข้าคลังสินค้าคืนเรียบร้อย');
  };

  const confirmReceive = (requestId: string) => {
    onReceiveItem(requestId, {
      zone,
      note: note.trim() || `รับเข้าคลัง ${zone}`,
    });
    setActiveReceiveId(null);
  };

  const openDispatchPanel = (req: ReturnRequest) => {
    setActiveReceiveId(null);
    setActiveDispatchId(req.id);
    setTrackingNo('');
    setDispatchNote('จัดเตรียมสินค้าใหม่และส่งมอบให้ขนส่งเรียบร้อย');
  };

  const confirmDispatch = (requestId: string) => {
    onDispatchReplacement(requestId, {
      trackingNo: trackingNo.trim(),
      note: dispatchNote.trim() || 'จัดส่งสินค้าใหม่ให้ลูกค้าเรียบร้อย',
    });
    setActiveDispatchId(null);
    setTrackingNo('');
    setDispatchNote('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">พนักงานคลังสินค้า: ตรวจรับสินค้าคืน & จัดส่งสินค้าใหม่</h1>
        <p className="text-sm text-slate-500 mt-1">
          รับสินค้าคืนเข้าคลังตามคำร้องที่อนุมัติ และจัดส่งสินค้าใหม่ให้ลูกค้าสำหรับรายการที่ผ่านการตรวจสอบแล้ว
        </p>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-rose-100/70 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setFilter('awaiting')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === 'awaiting'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            รอรับเข้าคลัง <span className="ml-1 font-mono tabular-nums text-rose-400">({awaitingList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('replacement')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === 'replacement'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            รอจัดส่งสินค้าใหม่ <span className="ml-1 font-mono tabular-nums text-rose-400">({replacementList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('received')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === 'received'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            ดำเนินการแล้ว <span className="ml-1 font-mono tabular-nums text-rose-400">({receivedList.length})</span>
          </button>
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
            placeholder="ค้นหารหัสคำร้อง, สินค้า..."
            aria-label="ค้นหารายการคลังสินค้า"
            className="w-full pl-9 pr-3 py-2 bg-white border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>
      </div>

      {visibleList.length === 0 ? (
        <div className="bg-white border border-rose-200/80 rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-slate-700">
            {filter === 'awaiting'
              ? 'ไม่มีรายการสินค้าที่รอรับเข้าคลังในขณะนี้'
              : filter === 'replacement'
                ? 'ไม่มีรายการที่รอจัดส่งสินค้าใหม่ให้ลูกค้าในขณะนี้'
                : 'ไม่พบประวัติการดำเนินการที่ตรงกับคำค้นหา'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {filter === 'replacement'
              ? 'เมื่อเจ้าหน้าที่ตรวจสอบเสร็จสิ้นและลูกค้าระบุความประสงค์ "จัดส่งสินค้าใหม่" รายการจะมาปรากฏที่นี่'
              : 'คำร้องที่ผ่านการอนุมัติจากผู้ดูแลระบบแล้วจะแสดงในรายการรอรับเข้าคลังโดยอัตโนมัติ'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleList.map((r) => (
            <div key={r.id} className="bg-white border border-rose-200/80 rounded-xl p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <span className="font-mono tabular-nums font-semibold text-rose-700">{r.id}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-slate-500">{r.orderNo}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <StatusLabel statusIndex={r.statusIndex} statusText={r.statusText} />
                    {isRequestOverdue(r) && (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        เกิน 3 วัน (ค้าง {getRequestAgeDays(r)} วัน)
                      </span>
                    )}
                  </div>
                  <div className="text-base font-semibold text-slate-900">
                    {r.productSku && (
                      <span className="font-mono text-xs text-rose-700 mr-1.5">[{r.productSku}]</span>
                    )}
                    {r.productName}{' '}
                    <span className="text-xs font-mono tabular-nums font-normal text-slate-500">
                      จำนวน {r.qty} ชิ้น · มูลค่า {formatBaht(r.price)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    ลูกค้า: {r.customerName} ({r.phone})
                    <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                    สาเหตุ: {r.reason}
                    {r.resolution && (
                      <>
                        <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                        <span className="text-rose-700 font-medium">{RESOLUTION_LABELS[r.resolution]}</span>
                      </>
                    )}
                    {r.warehouseZone && (
                      <>
                        <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                        <span>จัดเก็บที่ {r.warehouseZone}</span>
                      </>
                    )}
                    {r.evidencePhotos && r.evidencePhotos.length > 0 && (
                      <>
                        <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                          <Camera className="w-3 h-3" aria-hidden="true" />
                          รูป {r.evidencePhotos.length}
                        </span>
                      </>
                    )}
                    {r.evidenceVideos && r.evidenceVideos.length > 0 && (
                      <>
                        <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                          <Film className="w-3 h-3" aria-hidden="true" />
                          วิดีโอ {r.evidenceVideos.length}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {r.statusIndex === 1 && activeReceiveId !== r.id && (
                    <button
                      type="button"
                      onClick={() => openReceivePanel(r)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-sm"
                    >
                      <PackageCheck className="w-4 h-4" aria-hidden="true" />
                      <span>ยืนยันรับสินค้าเข้าคลัง</span>
                    </button>
                  )}
                  {r.statusIndex === 5 && activeDispatchId !== r.id && (
                    <button
                      type="button"
                      onClick={() => openDispatchPanel(r)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-sm"
                    >
                      <Truck className="w-4 h-4" aria-hidden="true" />
                      <span>จัดส่งสินค้าใหม่ & ปิดรายการ</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectRequest(r)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>รายละเอียด</span>
                  </button>
                </div>
              </div>

              {activeReceiveId === r.id && (
                <div className="border-t border-rose-100 pt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      โซนจัดเก็บในคลัง
                    </label>
                    <select
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="w-full px-3 py-2 border border-rose-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      {warehouseZones.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      หมายเหตุการรับเข้าคลัง
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="ระบุสภาพกล่อง/จำนวน"
                      className="w-full px-3 py-2 border border-rose-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveReceiveId(null)}
                      className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmReceive(r.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      บันทึกรับเข้าคลัง
                    </button>
                  </div>
                </div>
              )}

              {activeDispatchId === r.id && (
                <div className="border-t border-rose-100 pt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      หมายเลขพัสดุ (Tracking No.)
                    </label>
                    <input
                      type="text"
                      value={trackingNo}
                      onChange={(e) => setTrackingNo(e.target.value)}
                      placeholder="เช่น TH-882910445 (ไม่บังคับ)"
                      className="w-full px-3 py-2 border border-rose-200 rounded-lg text-xs font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      หมายเหตุการจัดส่งสินค้าใหม่
                    </label>
                    <input
                      type="text"
                      value={dispatchNote}
                      onChange={(e) => setDispatchNote(e.target.value)}
                      placeholder="เช่น จัดส่งสินค้าชิ้นใหม่ผ่านขนส่งเรียบร้อย"
                      className="w-full px-3 py-2 border border-rose-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveDispatchId(null)}
                      className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDispatch(r.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      ยืนยันจัดส่งใหม่ & ปิดรายการ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
