import { useState } from 'react';
import { Camera, CheckCircle2, Eye, Film, Play, Search } from 'lucide-react';
import {
  DISPOSITION_LABELS,
  RESOLUTION_LABELS,
  formatBaht,
  getRequestAgeDays,
  isRequestOverdue,
  type ReturnDisposition,
  type ReturnRequest,
} from '../types';
import { StatusLabel } from './StatusLabel';

interface InspectorPortalProps {
  requests: ReturnRequest[];
  warehouseZones: string[];
  onStartInspection: (requestId: string) => void;
  onCompleteInspection: (
    requestId: string,
    payload: {
      disposition: ReturnDisposition;
      warehouseZone: string;
      inspectionCost: number;
      repairCost: number;
      note: string;
    }
  ) => void;
  onSelectRequest: (req: ReturnRequest) => void;
}

export function InspectorPortal({
  requests,
  warehouseZones,
  onStartInspection,
  onCompleteInspection,
  onSelectRequest,
}: InspectorPortalProps) {
  const [filter, setFilter] = useState<'queue' | 'completed'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeInspectId, setActiveInspectId] = useState<string | null>(null);
  const [disposition, setDisposition] = useState<ReturnDisposition>('restock');
  const [warehouseZone, setWarehouseZone] = useState<string>('');
  const [zoneError, setZoneError] = useState<string>('');
  const [inspectionCost, setInspectionCost] = useState<number>(100);
  const [repairCost, setRepairCost] = useState<number>(0);
  const [note, setNote] = useState<string>('');

  const queueList = requests.filter((r) => r.statusIndex === 3 || r.statusIndex === 4);
  const completedList = requests.filter(
    (r) => r.statusIndex === 5 || r.statusIndex === 7 || r.statusIndex === 6
  );

  const visibleList = (filter === 'queue' ? queueList : completedList).filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      r.id.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.orderNo.toLowerCase().includes(q)
    );
  });

  const openInspectionForm = (req: ReturnRequest) => {
    setActiveInspectId(req.id);
    setDisposition('restock');
    setWarehouseZone('');
    setZoneError('');
    setInspectionCost(req.cost.inspection);
    setRepairCost(req.cost.repair);
    setNote('ผ่านการตรวจสอบสภาพ คืนเข้าสต็อกเรียบร้อย');
  };

  const handleSaveInspection = (requestId: string) => {
    if (!warehouseZone.trim()) {
      setZoneError('กรุณาเลือกโซนจัดเก็บสินค้าก่อนยืนยันผลตรวจสอบ');
      return;
    }
    onCompleteInspection(requestId, {
      disposition,
      warehouseZone: warehouseZone.trim(),
      inspectionCost: Math.max(0, Number(inspectionCost) || 0),
      repairCost: Math.max(0, Number(repairCost) || 0),
      note: note.trim() || DISPOSITION_LABELS[disposition],
    });
    setActiveInspectId(null);
    setWarehouseZone('');
    setZoneError('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">เจ้าหน้าที่ตรวจสอบ: ตรวจสอบสภาพสินค้า</h1>
        <p className="text-sm text-slate-500 mt-1">
          ประเมินสภาพสินค้าที่รับเข้าคลัง กำหนดแนวทางจัดการ (คืนสต็อก / ซ่อมแซม / ตัดจำหน่าย) และบันทึกต้นทุน
        </p>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-rose-100/70 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setFilter('queue')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === 'queue'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            คิวรอตรวจสอบ <span className="ml-1 font-mono tabular-nums text-rose-400">({queueList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === 'completed'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            ปิดรายการ / ส่งต่อแล้ว <span className="ml-1 font-mono tabular-nums text-rose-400">({completedList.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารหัสคำร้อง, สินค้า..."
            aria-label="ค้นหารายการตรวจสอบ"
            className="w-full pl-9 pr-3 py-2 bg-white border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>
      </div>

      {visibleList.length === 0 ? (
        <div className="bg-white border border-rose-200/80 rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-slate-700">
            {filter === 'queue' ? 'ไม่มีสินค้าในคิวรอตรวจสอบขณะนี้' : 'ยังไม่มีรายการที่ปิดเคสแล้ว'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            สินค้าที่คลังยืนยันรับเข้าแล้วจะปรากฏในคิวตรวจสอบโดยอัตโนมัติ
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
                    {r.productName}{' '}
                    <span className="text-xs font-mono tabular-nums font-normal text-slate-500">
                      × {r.qty} ({formatBaht(r.price)})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    สาเหตุที่แจ้ง: {r.reason}
                    {r.warehouseZone && (
                      <>
                        <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                        <span>{r.warehouseZone}</span>
                      </>
                    )}
                    {r.disposition && (
                      <>
                        <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                        <span className="text-emerald-700 font-medium">{DISPOSITION_LABELS[r.disposition]}</span>
                      </>
                    )}
                    {r.resolution && (
                      <>
                        <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                        <span className="text-rose-700 font-medium">
                          ความประสงค์: {RESOLUTION_LABELS[r.resolution]}
                        </span>
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

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {r.statusIndex === 3 && activeInspectId !== r.id && (
                    <button
                      type="button"
                      onClick={() => onStartInspection(r.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>เริ่มตรวจสภาพ</span>
                    </button>
                  )}

                  {(r.statusIndex === 3 || r.statusIndex === 4) && activeInspectId !== r.id && (
                    <button
                      type="button"
                      onClick={() => openInspectionForm(r)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {r.resolution ? 'บันทึกผล & ส่งต่อ' : 'บันทึกผล & ปิดเคส'}
                      </span>
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

              {activeInspectId === r.id && (
                <div className="border-t border-rose-100 pt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ผลการตรวจสอบสภาพสินค้า
                      </label>
                      <select
                        value={disposition}
                        onChange={(e) => {
                          const next = e.target.value as ReturnDisposition;
                          setDisposition(next);
                          if (next === 'restock') {
                            setRepairCost(0);
                            setNote('สินค้าสภาพสมบูรณ์ คืนเข้าสต็อกพร้อมจำหน่าย');
                          } else if (next === 'repair') {
                            setNote('ส่งซ่อมแซมอะไหล่ก่อนนำกลับเข้าคลัง');
                          } else {
                            setRepairCost(0);
                            setNote('สินค้าเสียหายถาวร ดำเนินการตัดจำหน่าย');
                          }
                        }}
                        className="w-full px-3 py-2 border border-rose-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="restock">{DISPOSITION_LABELS.restock}</option>
                        <option value="repair">{DISPOSITION_LABELS.repair}</option>
                        <option value="writeoff">{DISPOSITION_LABELS.writeoff}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        เลือกโซนจัดเก็บ <span className="text-rose-600 font-semibold">*</span>
                      </label>
                      <select
                        value={warehouseZone}
                        onChange={(e) => {
                          setWarehouseZone(e.target.value);
                          setZoneError('');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                          !warehouseZone ? 'border-rose-300' : 'border-rose-200'
                        }`}
                      >
                        <option value="">-- เลือกโซนจัดเก็บ --</option>
                        {Array.from(
                          new Set([
                            ...warehouseZones,
                            ...(r.warehouseZone ? [r.warehouseZone] : []),
                          ])
                        ).map((z) => (
                          <option key={z} value={z}>
                            {z}
                          </option>
                        ))}
                      </select>
                      {r.warehouseZone && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          โซนรับเข้าเดิม: {r.warehouseZone}
                        </p>
                      )}
                      {zoneError && (
                        <p className="text-[11px] font-medium text-rose-600 mt-1">{zoneError}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ค่าตรวจสอบ (บาท)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={inspectionCost}
                        onChange={(e) => setInspectionCost(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-rose-200 rounded-lg text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ค่าซ่อมแซม (บาท)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={repairCost}
                        onChange={(e) => setRepairCost(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-rose-200 rounded-lg text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        บันทึกผลการตรวจสอบ
                      </label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="ระบุสภาพสินค้าและความเห็นผู้ตรวจสอบ"
                        className="w-full px-3 py-2 border border-rose-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 justify-end shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveInspectId(null);
                          setWarehouseZone('');
                          setZoneError('');
                        }}
                        className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        disabled={!warehouseZone}
                        onClick={() => handleSaveInspection(r.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                      >
                        {r.resolution === 'replace'
                          ? 'ยืนยันผล & ส่งคลังจัดส่งใหม่'
                          : r.resolution === 'refund'
                            ? 'ยืนยันผล & ส่งแอดมินโอนคืน'
                            : 'ยืนยันผลตรวจสอบ & ปิดรายการ'}
                      </button>
                    </div>
                  </div>
                  {!warehouseZone && (
                    <p className="text-[11px] font-medium text-rose-600">
                      * กรุณากำหนดเลือกโซนจัดเก็บสินค้าก่อนกดยืนยันผลตรวจสอบ
                    </p>
                  )}
                  {r.resolution && (
                    <p className="text-xs text-rose-700 bg-rose-50/70 border border-rose-200/80 rounded-lg px-3 py-2">
                      {r.resolution === 'replace'
                        ? 'ลูกค้าระบุขอ "จัดส่งสินค้าใหม่": เมื่อบันทึกผลตรวจสอบแล้ว ระบบจะส่งเรื่องกลับไปยังพนักงานคลังเพื่อดำเนินการส่งสินค้าใหม่ให้ลูกค้า'
                        : 'ลูกค้าระบุขอ "ขอรับเงินคืน": เมื่อบันทึกผลตรวจสอบแล้ว ระบบจะส่งเรื่องไปยังแอดมินเพื่อดำเนินการโอนเงินคืนให้ลูกค้า'}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
