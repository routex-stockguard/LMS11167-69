import { useEffect, useState, type FormEvent } from 'react';
import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { DEFAULT_SYSTEM_CONFIG, type SystemConfig } from '../types';

interface AdminSettingsProps {
  config: SystemConfig;
  onSaveConfig: (nextConfig: SystemConfig) => void;
  onResetConfig: () => void;
}

export function AdminSettings({
  config,
  onSaveConfig,
  onResetConfig,
}: AdminSettingsProps) {
  const [draft, setDraft] = useState<SystemConfig>(config);
  const [newReason, setNewReason] = useState('');
  const [newZone, setNewZone] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const handleAddReason = () => {
    const trimmed = newReason.trim();
    if (!trimmed) return;
    if (draft.returnReasons.includes(trimmed)) {
      setNewReason('');
      return;
    }
    setDraft((prev) => ({
      ...prev,
      returnReasons: [...prev.returnReasons, trimmed],
    }));
    setNewReason('');
  };

  const handleRemoveReason = (reasonToRemove: string) => {
    if (draft.returnReasons.length <= 1) return;
    setDraft((prev) => ({
      ...prev,
      returnReasons: prev.returnReasons.filter((r) => r !== reasonToRemove),
    }));
  };

  const handleAddZone = () => {
    const trimmed = newZone.trim();
    if (!trimmed) return;
    if (draft.warehouseZones.includes(trimmed)) {
      setNewZone('');
      return;
    }
    setDraft((prev) => ({
      ...prev,
      warehouseZones: [...prev.warehouseZones, trimmed],
    }));
    setNewZone('');
  };

  const handleRemoveZone = (zoneToRemove: string) => {
    if (draft.warehouseZones.length <= 1) return;
    setDraft((prev) => ({
      ...prev,
      warehouseZones: prev.warehouseZones.filter((z) => z !== zoneToRemove),
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...draft,
      brandName: draft.brandName.trim() || DEFAULT_SYSTEM_CONFIG.brandName,
      systemCode: draft.systemCode.trim() || DEFAULT_SYSTEM_CONFIG.systemCode,
      systemTitle: draft.systemTitle.trim() || DEFAULT_SYSTEM_CONFIG.systemTitle,
      contactLine: draft.contactLine.trim() || DEFAULT_SYSTEM_CONFIG.contactLine,
      contactPhone: draft.contactPhone.trim() || DEFAULT_SYSTEM_CONFIG.contactPhone,
      contactEmail: draft.contactEmail.trim() || DEFAULT_SYSTEM_CONFIG.contactEmail,
      defaultFreightCost: Math.max(0, Number(draft.defaultFreightCost) || 0),
      defaultInspectionCost: Math.max(0, Number(draft.defaultInspectionCost) || 0),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าและปรับปรุงระบบ</h1>
          <p className="text-sm text-slate-500 mt-1">
            เพิ่มหรือเปลี่ยนแปลงข้อมูลแบรนด์ ช่องทางติดต่อ สาเหตุการคืน โซนคลังสินค้า และอัตราค่าบริการเริ่มต้น
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {confirmReset ? (
            <div className="flex items-center gap-2 bg-white border border-rose-200 rounded-lg px-3 py-1.5">
              <span className="text-xs text-slate-700">ยืนยันคืนค่าเริ่มต้น?</span>
              <button
                type="button"
                onClick={() => {
                  onResetConfig();
                  setConfirmReset(false);
                }}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded"
              >
                ยืนยัน
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
              >
                ยกเลิก
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>คืนค่าเริ่มต้น</span>
            </button>
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span>บันทึกการเปลี่ยนแปลง</span>
          </button>
        </div>
      </div>

      {/* 1. System Identity & Customer Contact Info */}
      <div className="bg-white border border-rose-200/80 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">ข้อมูลระบบและช่องทางติดต่อเจ้าหน้าที่</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ข้อมูลนี้จะแสดงบนหน้าแรก แถบเมนู และส่วนติดต่อเจ้าหน้าที่สำหรับลูกค้า
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="cfg-brand" className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อแบรนด์ (Brand Name)
            </label>
            <input
              id="cfg-brand"
              type="text"
              required
              value={draft.brandName}
              onChange={(e) => setDraft({ ...draft, brandName: e.target.value })}
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label htmlFor="cfg-code" className="block text-xs font-medium text-slate-700 mb-1.5">
              รหัสระบบ / สาขา
            </label>
            <input
              id="cfg-code"
              type="text"
              required
              value={draft.systemCode}
              onChange={(e) => setDraft({ ...draft, systemCode: e.target.value })}
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label htmlFor="cfg-title" className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อระบบหลัก
            </label>
            <input
              id="cfg-title"
              type="text"
              required
              value={draft.systemTitle}
              onChange={(e) => setDraft({ ...draft, systemTitle: e.target.value })}
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-rose-100 pt-4">
          <div>
            <label htmlFor="cfg-line" className="block text-xs font-medium text-slate-700 mb-1.5">
              Line ติดต่อ
            </label>
            <input
              id="cfg-line"
              type="text"
              required
              value={draft.contactLine}
              onChange={(e) => setDraft({ ...draft, contactLine: e.target.value })}
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label htmlFor="cfg-phone" className="block text-xs font-medium text-slate-700 mb-1.5">
              เบอร์ติดต่อ
            </label>
            <input
              id="cfg-phone"
              type="text"
              required
              value={draft.contactPhone}
              onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })}
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label htmlFor="cfg-email" className="block text-xs font-medium text-slate-700 mb-1.5">
              อีเมลติดต่อ
            </label>
            <input
              id="cfg-email"
              type="email"
              required
              value={draft.contactEmail}
              onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* 2. Return Reasons & Warehouse Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Return Reasons Manager */}
        <div className="bg-white border border-rose-200/80 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">ตัวเลือกสาเหตุการคืนสินค้า</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงในแบบฟอร์มยื่นคำร้องขอคืนสินค้าของลูกค้าและแอดมิน
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddReason();
                }
              }}
              placeholder="เพิ่มสาเหตุการคืนใหม่..."
              className="flex-1 px-3 py-2 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="button"
              onClick={handleAddReason}
              className="inline-flex items-center gap-1 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>เพิ่ม</span>
            </button>
          </div>

          <ul className="divide-y divide-rose-100 border-t border-rose-100">
            {draft.returnReasons.map((reason) => (
              <li key={reason} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-800">{reason}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveReason(reason)}
                  disabled={draft.returnReasons.length <= 1}
                  aria-label={`ลบ ${reason}`}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Warehouse Zones Manager */}
        <div className="bg-white border border-rose-200/80 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">โซนจัดเก็บคลังสินค้า</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ใช้สำหรับพนักงานคลังสินค้าเลือกจัดเก็บเมื่อรับสินค้าคืนเข้าคลัง
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddZone();
                }
              }}
              placeholder="เพิ่มโซนคลังสินค้าใหม่..."
              className="flex-1 px-3 py-2 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="button"
              onClick={handleAddZone}
              className="inline-flex items-center gap-1 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>เพิ่ม</span>
            </button>
          </div>

          <ul className="divide-y divide-rose-100 border-t border-rose-100">
            {draft.warehouseZones.map((zone) => (
              <li key={zone} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-800">{zone}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveZone(zone)}
                  disabled={draft.warehouseZones.length <= 1}
                  aria-label={`ลบ ${zone}`}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. Default Return Cost Rates */}
      <div className="bg-white border border-rose-200/80 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">อัตราต้นทุนมาตรฐานเริ่มต้น</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            กำหนดค่าเริ่มต้นอัตโนมัติเมื่อมีการสร้างคำร้องขอคืนสินค้าใหม่
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div>
            <label htmlFor="cfg-freight" className="block text-xs font-medium text-slate-700 mb-1.5">
              ค่าขนส่งขากลับเริ่มต้น (บาท)
            </label>
            <input
              id="cfg-freight"
              type="number"
              min={0}
              required
              value={draft.defaultFreightCost}
              onChange={(e) => setDraft({ ...draft, defaultFreightCost: Number(e.target.value) })}
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label htmlFor="cfg-inspect" className="block text-xs font-medium text-slate-700 mb-1.5">
              ค่าตรวจสอบสภาพเริ่มต้น (บาท)
            </label>
            <input
              id="cfg-inspect"
              type="number"
              min={0}
              required
              value={draft.defaultInspectionCost}
              onChange={(e) => setDraft({ ...draft, defaultInspectionCost: Number(e.target.value) })}
              className="w-full px-3.5 py-2 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
