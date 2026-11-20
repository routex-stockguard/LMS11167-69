import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
  DISPOSITION_LABELS,
  RESOLUTION_LABELS,
  formatBaht,
  getRequestAgeDays,
  getTotalCost,
  isRequestOverdue,
  type EvidencePhoto,
  type ReturnRequest,
} from '../types';
import { EvidenceVideoPlayer } from './EvidenceVideoPlayer';
import { StatusLabel } from './StatusLabel';
import { RequestTimeline } from './RequestTimeline';

interface RequestDetailModalProps {
  request: ReturnRequest | null;
  onClose: () => void;
}

export function RequestDetailModal({ request, onClose }: RequestDetailModalProps) {
  const [zoomedPhoto, setZoomedPhoto] = useState<EvidencePhoto | null>(null);

  if (!request) return null;

  const totalCost = getTotalCost(request.cost);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-detail-title"
      onClick={onClose}
    >
      <div
        className="bg-white border border-rose-200 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-rose-100 bg-rose-50/40">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 id="request-detail-title" className="text-lg font-semibold text-slate-900 font-mono tabular-nums">
                {request.id}
              </h2>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <StatusLabel statusIndex={request.statusIndex} statusText={request.statusText} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              คำสั่งซื้อ <span className="font-mono">{request.orderNo}</span>
              <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
              <span>{request.productName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างรายละเอียด"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isRequestOverdue(request) && (
            <div
              role="alert"
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <span className="font-semibold">
                  คำร้องนี้ค้างดำเนินการเกิน 3 วันแล้ว (ค้าง {getRequestAgeDays(request)} วัน)
                </span>
                <span className="block text-amber-800 mt-0.5">
                  กรุณาเร่งติดตามและดำเนินการในขั้นตอนถัดไปเพื่อลดความล่าช้าในการให้บริการลูกค้า
                </span>
              </div>
            </div>
          )}

          <section>
            <h3 className="text-xs font-semibold text-slate-500 tracking-wide mb-3">
              ข้อมูลคำร้องและสินค้า
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm border-b border-slate-200 pb-5">
              <div>
                <dt className="text-xs text-slate-500">ลูกค้า</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{request.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">เบอร์โทรศัพท์</dt>
                <dd className="font-mono tabular-nums text-slate-900 mt-0.5">{request.phone}</dd>
              </div>
              {request.notifyContact && (
                <div>
                  <dt className="text-xs text-slate-500">ช่องทางรับการแจ้งเตือน</dt>
                  <dd className="text-slate-900 mt-0.5">{request.notifyContact}</dd>
                </div>
              )}
              {request.orderDate && (
                <div>
                  <dt className="text-xs text-slate-500">วันที่สั่งซื้อสินค้า</dt>
                  <dd className="font-mono tabular-nums text-slate-900 mt-0.5">{request.orderDate}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-500">สินค้า / จำนวน</dt>
                <dd className="font-medium text-slate-900 mt-0.5">
                  {request.productSku && (
                    <span className="font-mono text-xs text-rose-700 mr-1.5">[{request.productSku}]</span>
                  )}
                  {request.productName} <span className="text-slate-500 font-mono tabular-nums">× {request.qty}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">ราคาสินค้า</dt>
                <dd className="font-mono tabular-nums font-medium text-slate-900 mt-0.5">
                  {formatBaht(request.price)}
                </dd>
              </div>
              <div className={request.resolution ? '' : 'sm:col-span-2'}>
                <dt className="text-xs text-slate-500">สาเหตุการคืน</dt>
                <dd className="text-slate-900 mt-0.5">{request.reason}</dd>
              </div>
              {request.resolution && (
                <div>
                  <dt className="text-xs text-slate-500">ความประสงค์ของลูกค้า</dt>
                  <dd className="font-medium text-rose-700 mt-0.5">
                    {RESOLUTION_LABELS[request.resolution]}
                  </dd>
                </div>
              )}
              {request.warehouseZone && (
                <div>
                  <dt className="text-xs text-slate-500">โซนจัดเก็บคลังสินค้า</dt>
                  <dd className="text-slate-900 mt-0.5">{request.warehouseZone}</dd>
                </div>
              )}
              {request.disposition && (
                <div>
                  <dt className="text-xs text-slate-500">ผลการตรวจสอบ</dt>
                  <dd className="text-slate-900 mt-0.5">{DISPOSITION_LABELS[request.disposition]}</dd>
                </div>
              )}
              {request.customerNote && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">อาการหรือรายละเอียดความเสียหายเพิ่มเติม</dt>
                  <dd className="text-slate-700 mt-0.5">{request.customerNote}</dd>
                </div>
              )}
            </dl>
          </section>

          {request.evidencePhotos && request.evidencePhotos.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 tracking-wide mb-3">
                รูปถ่ายหลักฐานที่แนบ ({request.evidencePhotos.length} รูป)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-200 pb-5">
                {request.evidencePhotos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setZoomedPhoto(photo)}
                    className="group text-left bg-rose-50/40 border border-rose-200 rounded-lg overflow-hidden hover:border-rose-400 transition-colors"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="w-full h-24 object-cover group-hover:opacity-90 transition-opacity"
                    />
                    <div className="px-2 py-1 text-[11px] text-slate-600 truncate bg-white border-t border-rose-100">
                      {photo.name}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {request.evidenceVideos && request.evidenceVideos.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 tracking-wide mb-3">
                วิดีโอหลักฐานที่แนบ ({request.evidenceVideos.length} คลิป)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-slate-200 pb-5">
                {request.evidenceVideos.map((video) => (
                  <EvidenceVideoPlayer key={video.id} video={video} />
                ))}
              </div>
            </section>
          )}

          {request.refundSlip && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 tracking-wide mb-3">
                สลิปหลักฐานการโอนเงินคืนลูกค้า
                {typeof request.refundAmount === 'number' && (
                  <span className="ml-2 font-mono text-emerald-700">
                    ({formatBaht(request.refundAmount)})
                  </span>
                )}
              </h3>
              <div className="border-b border-slate-200 pb-5">
                <button
                  type="button"
                  onClick={() => setZoomedPhoto(request.refundSlip!)}
                  className="group text-left bg-emerald-50/40 border border-emerald-200 rounded-lg overflow-hidden hover:border-emerald-400 transition-colors max-w-xs"
                >
                  <img
                    src={request.refundSlip.dataUrl}
                    alt={request.refundSlip.name}
                    className="w-48 h-36 object-cover group-hover:opacity-90 transition-opacity"
                  />
                  <div className="px-2.5 py-1.5 text-[11px] text-slate-700 truncate bg-white border-t border-emerald-100">
                    {request.refundSlip.name} (คลิกเพื่อขยาย)
                  </div>
                </button>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-slate-500 tracking-wide mb-3">
              โครงสร้างต้นทุนการรับคืน (Reverse Logistics Cost)
            </h3>
            <div
              className={`grid grid-cols-2 ${
                typeof request.refundAmount === 'number' ? 'sm:grid-cols-6' : 'sm:grid-cols-5'
              } gap-3 border-b border-slate-200 pb-5`}
            >
              <div>
                <div className="text-xs text-slate-500">ค่าขนส่ง</div>
                <div className="text-sm font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {formatBaht(request.cost.freight)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">ค่าตรวจสอบ</div>
                <div className="text-sm font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {formatBaht(request.cost.inspection)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">ค่าซ่อมแซม</div>
                <div className="text-sm font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {formatBaht(request.cost.repair)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">มูลค่าสินทรัพย์เสี่ยง</div>
                <div className="text-sm font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {formatBaht(request.cost.assetLoss)}
                </div>
              </div>
              {typeof request.refundAmount === 'number' && (
                <div>
                  <div className="text-xs text-slate-500">โอนคืนลูกค้า</div>
                  <div className="text-sm font-mono tabular-nums font-semibold text-emerald-700 mt-0.5">
                    {formatBaht(request.refundAmount)}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-slate-500">ต้นทุนรวม</div>
                <div className="text-sm font-mono tabular-nums font-bold text-rose-600 mt-0.5">
                  {formatBaht(totalCost)}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-slate-500 tracking-wide mb-3">
              ประวัติการดำเนินการ
            </h3>
            <RequestTimeline timeline={request.timeline} />
          </section>
        </div>

        <div className="px-6 py-3.5 border-t border-rose-100 bg-rose-50/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ภาพถ่ายหลักฐานขนาดใหญ่"
          onClick={(e) => {
            e.stopPropagation();
            setZoomedPhoto(null);
          }}
        >
          <div
            className="bg-white border border-rose-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-rose-100">
              <span className="text-xs font-medium text-slate-700 truncate">{zoomedPhoto.name}</span>
              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                aria-label="ปิดภาพขยาย"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-center max-h-[75vh]">
              <img
                src={zoomedPhoto.dataUrl}
                alt={zoomedPhoto.name}
                className="max-h-[68vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
