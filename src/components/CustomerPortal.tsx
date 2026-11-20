import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, CheckCircle2, Film, ImagePlus, Search, Video, X } from 'lucide-react';
import {
  RESOLUTION_LABELS,
  formatBaht,
  type CustomerResolution,
  type EvidencePhoto,
  type EvidenceVideo,
  type OrderRecord,
  type ProductItem,
  type ReturnRequest,
} from '../types';
import { deleteVideoBlob, saveVideoBlob } from '../utils/mediaStorage';
import { EvidenceVideoPlayer } from './EvidenceVideoPlayer';
import { StatusLabel } from './StatusLabel';
import { RequestTimeline } from './RequestTimeline';

interface CustomerSubmitData {
  customerName: string;
  phone: string;
  notifyContact: string;
  orderNo: string;
  orderDate: string;
  productSku: string;
  productName: string;
  qty: number;
  price: number;
  reason: string;
  customerNote: string;
  resolution: CustomerResolution;
  evidencePhotos: EvidencePhoto[];
  evidenceVideos: EvidenceVideo[];
}

interface CustomerPortalProps {
  activeTab: 'submit-request' | 'track-request';
  requests: ReturnRequest[];
  products: ProductItem[];
  orders: OrderRecord[];
  returnReasons: string[];
  onSubmitRequest: (data: CustomerSubmitData) => string;
  onSwitchTab: (tab: 'submit-request' | 'track-request') => void;
}

const PROGRESS_STEPS = [
  'ยื่นคำร้อง',
  'อนุมัติคำขอ',
  'รับเข้าคลัง',
  'ตรวจสอบสภาพ',
  'ส่งใหม่ / โอนคืน',
  'ปิดรายการ',
] as const;

function getProgressStep(statusIndex: ReturnRequest['statusIndex']): number {
  if (statusIndex === -1) return 0;
  if (statusIndex === 0) return 1;
  if (statusIndex === 1) return 2;
  if (statusIndex === 3) return 3;
  if (statusIndex === 4) return 4;
  if (statusIndex === 5 || statusIndex === 7) return 5;
  return 6;
}

const MAX_EVIDENCE_PHOTOS = 5;
const MAX_EVIDENCE_VIDEOS = 2;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB per video

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
}

async function compressImageToPhoto(file: File): Promise<EvidencePhoto> {
  const rawDataUrl = await readFileAsDataUrl(file);
  const compressedDataUrl = await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 960;
      const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    dataUrl: compressedDataUrl,
  };
}

export function CustomerPortal({
  activeTab,
  requests,
  products,
  orders,
  returnReasons,
  onSubmitRequest,
  onSwitchTab,
}: CustomerPortalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [notifyContact, setNotifyContact] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [productName, setProductName] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [reason, setReason] = useState<string>(returnReasons[0] ?? 'สินค้าชำรุดหรือเสียหาย');
  const [customerNote, setCustomerNote] = useState('');
  const [resolution, setResolution] = useState<CustomerResolution>('replace');
  const [evidencePhotos, setEvidencePhotos] = useState<EvidencePhoto[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [evidenceVideos, setEvidenceVideos] = useState<EvidenceVideo[]>([]);
  const [videoError, setVideoError] = useState('');
  const [isProcessingVideos, setIsProcessingVideos] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<EvidencePhoto | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [trackQuery, setTrackQuery] = useState('');
  const [orderQtyError, setOrderQtyError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedOrderNo = orderNo.trim().toUpperCase();
  const matchedOrder = normalizedOrderNo
    ? orders.find((o) => o.orderNo.trim().toUpperCase() === normalizedOrderNo)
    : undefined;

  const handleOrderNoChange = (rawValue: string) => {
    const nextValue = rawValue.toUpperCase();
    setOrderNo(nextValue);
    setOrderQtyError('');
    const found = orders.find((o) => o.orderNo.trim().toUpperCase() === nextValue.trim());
    if (found) {
      if (found.customerName && !customerName.trim()) {
        setCustomerName(found.customerName);
      }
      const catalogProduct = products.find((p) => p.id === found.productSku);
      setSelectedSku(catalogProduct ? catalogProduct.id : '__custom__');
      setProductName(found.productName);
      setQty(found.qty);
      if (catalogProduct) {
        setPrice(catalogProduct.price * found.qty);
      }
    }
  };

  const handleSelectCatalogProduct = (sku: string) => {
    setSelectedSku(sku);
    if (!sku || sku === '__custom__') {
      setProductName('');
      setQty(1);
      setPrice(sku === '__custom__' ? 500 : 0);
      return;
    }
    const found = products.find((p) => p.id === sku);
    if (found) {
      setProductName(found.name);
      setQty(found.defaultQty);
      setPrice(found.price * found.defaultQty);
    }
  };

  const handlePhotoFilesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setPhotoError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (เช่น JPG, PNG, WEBP)');
      return;
    }

    const remainingSlots = MAX_EVIDENCE_PHOTOS - evidencePhotos.length;
    if (remainingSlots <= 0) {
      setPhotoError(`แนบรูปถ่ายหลักฐานได้สูงสุด ${MAX_EVIDENCE_PHOTOS} รูปต่อคำร้อง`);
      return;
    }

    const filesToProcess = imageFiles.slice(0, remainingSlots);
    setIsProcessingPhotos(true);
    setPhotoError('');
    try {
      const processed = await Promise.all(filesToProcess.map(compressImageToPhoto));
      setEvidencePhotos((prev) => [...prev, ...processed]);
      if (imageFiles.length > remainingSlots) {
        setPhotoError(`เลือกเพิ่มได้อีก ${remainingSlots} รูป (สูงสุด ${MAX_EVIDENCE_PHOTOS} รูปต่อคำร้อง)`);
      }
    } catch {
      setPhotoError('ไม่สามารถประมวลผลไฟล์รูปภาพที่เลือกได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setEvidencePhotos((prev) => prev.filter((p) => p.id !== photoId));
    setPhotoError('');
  };

  const handleVideoFilesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const videoFiles = files.filter((file) => file.type.startsWith('video/'));
    if (videoFiles.length === 0) {
      setVideoError('กรุณาเลือกไฟล์วิดีโอเท่านั้น (เช่น MP4, MOV, WEBM)');
      return;
    }

    const oversized = videoFiles.find((file) => file.size > MAX_VIDEO_SIZE_BYTES);
    if (oversized) {
      setVideoError(`ไฟล์วิดีโอ ${oversized.name} มีขนาดเกิน 50 MB กรุณาเลือกไฟล์ที่ขนาดเล็กลง`);
      return;
    }

    const remainingSlots = MAX_EVIDENCE_VIDEOS - evidenceVideos.length;
    if (remainingSlots <= 0) {
      setVideoError(`แนบวิดีโอหลักฐานได้สูงสุด ${MAX_EVIDENCE_VIDEOS} คลิปต่อคำร้อง`);
      return;
    }

    const filesToProcess = videoFiles.slice(0, remainingSlots);
    setIsProcessingVideos(true);
    setVideoError('');
    try {
      const processed: EvidenceVideo[] = await Promise.all(
        filesToProcess.map(async (file) => {
          const id = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          await saveVideoBlob(id, file);
          return {
            id,
            name: file.name,
            mimeType: file.type || 'video/mp4',
            sizeBytes: file.size,
          };
        })
      );
      setEvidenceVideos((prev) => [...prev, ...processed]);
      if (videoFiles.length > remainingSlots) {
        setVideoError(`เลือกเพิ่มได้อีก ${remainingSlots} คลิป (สูงสุด ${MAX_EVIDENCE_VIDEOS} คลิปต่อคำร้อง)`);
      }
    } catch {
      setVideoError('ไม่สามารถบันทึกไฟล์วิดีโอที่เลือกได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsProcessingVideos(false);
    }
  };

  const handleRemoveVideo = (videoId: string) => {
    setEvidenceVideos((prev) => prev.filter((v) => v.id !== videoId));
    setVideoError('');
    void deleteVideoBlob(videoId);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    let hasMediaError = false;
    if (evidencePhotos.length === 0) {
      setPhotoError('กรุณาแนบรูปถ่ายหลักฐานสินค้าอย่างน้อย 1 รูป ก่อนส่งคำร้อง');
      hasMediaError = true;
    }
    if (evidenceVideos.length === 0) {
      setVideoError('กรุณาแนบวิดีโอหลักฐานสินค้า/แกะกล่องอย่างน้อย 1 คลิป ก่อนส่งคำร้อง');
      hasMediaError = true;
    }
    const numericQty = Math.max(1, Number(qty) || 1);
    if (matchedOrder && numericQty > matchedOrder.qty) {
      setOrderQtyError(
        `จำนวนสินค้าที่ขอคืน (${numericQty} ชิ้น) เกินกว่าจำนวนที่จัดส่งในออเดอร์ ${matchedOrder.orderNo} (${matchedOrder.qty} ชิ้น)`
      );
      hasMediaError = true;
    }
    if (hasMediaError) return;

    const resolvedProductSku = selectedSku && selectedSku !== '__custom__' ? selectedSku : '';

    const createdId = onSubmitRequest({
      customerName: customerName.trim(),
      phone: phone.trim(),
      notifyContact: notifyContact.trim(),
      orderNo: orderNo.trim(),
      orderDate,
      productSku: resolvedProductSku,
      productName: productName.trim(),
      qty: Math.max(1, Number(qty) || 1),
      price: Math.max(0, Number(price) || 0),
      reason,
      customerNote: customerNote.trim(),
      resolution,
      evidencePhotos,
      evidenceVideos,
    });
    setLastCreatedId(createdId);
    setCustomerName('');
    setPhone('');
    setNotifyContact('');
    setOrderNo('');
    setOrderDate('');
    setSelectedSku('');
    setProductName('');
    setQty(1);
    setPrice(0);
    setReason(returnReasons[0] ?? 'สินค้าชำรุดหรือเสียหาย');
    setCustomerNote('');
    setResolution('replace');
    setEvidencePhotos([]);
    setPhotoError('');
    setEvidenceVideos([]);
    setVideoError('');
  };

  if (activeTab === 'submit-request') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ยื่นคำร้องขอคืนสินค้า</h1>
            <p className="text-sm text-slate-500 mt-1">
              กรอกรายละเอียดคำสั่งซื้อและสินค้าที่ต้องการส่งคืน เพื่อรับหมายเลขติดตามสถานะ
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSwitchTab('track-request')}
            className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            ติดตามสถานะคำร้อง
          </button>
        </div>

        {lastCreatedId && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-emerald-950">ส่งคำร้องขอคืนสินค้าเรียบร้อยแล้ว</p>
                <p className="text-xs text-emerald-800 mt-1">
                  หมายเลขติดตามของคุณคือ{' '}
                  <span className="font-mono font-bold text-emerald-950">{lastCreatedId}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setTrackQuery(lastCreatedId);
                onSwitchTab('track-request');
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              ติดตามคำร้องนี้
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-rose-200/80 rounded-xl p-6 space-y-7"
        >
          {/* Section 1 */}
          <section className="space-y-4">
            <div className="border-b border-rose-100 pb-2.5">
              <h2 className="text-sm font-bold text-rose-700">1. ข้อมูลผู้ยื่นคำร้องและคำสั่งซื้อ</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cust-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                  ชื่อ-นามสกุลผู้สั่งซื้อ <span className="text-rose-600 font-semibold">*</span>
                </label>
                <input
                  id="cust-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="ระบุชื่อ-นามสกุลผู้สั่งซื้อ"
                  className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div>
                <label htmlFor="cust-phone" className="block text-xs font-medium text-slate-700 mb-1.5">
                  เบอร์โทรศัพท์ติดต่อ <span className="text-rose-600 font-semibold">*</span>
                </label>
                <input
                  id="cust-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="เช่น 089-123-4567"
                  className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div>
                <label htmlFor="cust-notify" className="block text-xs font-medium text-slate-700 mb-1.5">
                  อีเมลหรือเบอร์สำหรับรับการแจ้งเตือน
                </label>
                <input
                  id="cust-notify"
                  type="text"
                  value={notifyContact}
                  onChange={(e) => setNotifyContact(e.target.value)}
                  placeholder="เช่น name@example.com หรือเบอร์โทรสำรอง"
                  className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div>
                <label htmlFor="cust-order" className="block text-xs font-medium text-slate-700 mb-1.5">
                  หมายเลขคำสั่งซื้อ (Order Number) <span className="text-rose-600 font-semibold">*</span>
                </label>
                <input
                  id="cust-order"
                  type="text"
                  required
                  value={orderNo}
                  onChange={(e) => handleOrderNoChange(e.target.value)}
                  placeholder="เช่น ORD-099881"
                  className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
                {matchedOrder ? (
                  <p className="text-[11px] font-medium text-emerald-700 mt-1">
                    พบข้อมูลออเดอร์ในระบบ: {matchedOrder.productName} × {matchedOrder.qty} ชิ้น
                  </p>
                ) : normalizedOrderNo.length >= 6 ? (
                  <p className="text-[11px] text-amber-700 mt-1">
                    ไม่พบเลขออเดอร์นี้ในรายการจัดส่งของแอดมิน (รูปแบบ ORD-XXXXXX)
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="border-b border-rose-100 pb-2.5">
              <h2 className="text-sm font-bold text-rose-700">2. รายละเอียดสินค้าและสาเหตุการคืน</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cust-catalog" className="block text-xs font-medium text-slate-700 mb-1.5">
                  เลือกสินค้า (SKU) <span className="text-rose-600 font-semibold">*</span>
                </label>
                <select
                  id="cust-catalog"
                  required
                  value={selectedSku}
                  onChange={(e) => handleSelectCatalogProduct(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="">-- กรุณาเลือกสินค้า (SKU) --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name} ({formatBaht(p.price)}/ชิ้น)
                    </option>
                  ))}
                  <option value="__custom__">สินค้าอื่นๆ นอกรายการ (ระบุชื่อเอง)</option>
                </select>
              </div>

              <div>
                <label htmlFor="cust-order-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                  วันที่สั่งซื้อสินค้า
                </label>
                <input
                  id="cust-order-date"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
            </div>

            {selectedSku === '__custom__' && (
              <div>
                <label htmlFor="cust-product" className="block text-xs font-medium text-slate-700 mb-1.5">
                  ชื่อสินค้าที่ต้องการคืน <span className="text-rose-600 font-semibold">*</span>
                </label>
                <input
                  id="cust-product"
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="ระบุรุ่นหรือชื่อสินค้า"
                  className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="cust-qty" className="block text-xs font-medium text-slate-700 mb-1.5">
                  จำนวน (ชิ้น)
                </label>
                <input
                  id="cust-qty"
                  type="number"
                  min={1}
                  max={matchedOrder ? matchedOrder.qty : undefined}
                  required
                  value={qty}
                  onChange={(e) => {
                    const nextQty = Math.max(1, Number(e.target.value) || 1);
                    setQty(nextQty);
                    setOrderQtyError('');
                    const matched = products.find((p) => p.id === selectedSku);
                    if (matched) {
                      setPrice(matched.price * nextQty);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
                {orderQtyError && (
                  <p className="text-[11px] font-medium text-rose-600 mt-1">{orderQtyError}</p>
                )}
              </div>

              <div>
                <label htmlFor="cust-price" className="block text-xs font-medium text-slate-700 mb-1.5">
                  ราคาสินค้ารวม (บาท)
                </label>
                <input
                  id="cust-price"
                  type="number"
                  min={0}
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div>
                <label htmlFor="cust-reason" className="block text-xs font-medium text-slate-700 mb-1.5">
                  สาเหตุการขอคืนสินค้า <span className="text-rose-600 font-semibold">*</span>
                </label>
                <select
                  id="cust-reason"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                >
                  {returnReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="cust-note" className="block text-xs font-medium text-slate-700 mb-1.5">
                อาการหรือรายละเอียดความเสียหายเพิ่มเติม
              </label>
              <textarea
                id="cust-note"
                rows={3}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="อธิบายอาการชำรุด ตำหนิ หรือข้อมูลเพิ่มเติมสำหรับทีมตรวจสอบ..."
                className="w-full px-3.5 py-2.5 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="space-y-4 pt-1">
              <div className="text-xs font-semibold text-slate-800">
                ภาพถ่าย/วีดีโอหลักฐานสินค้าที่ต้องการคืน <span className="text-rose-600">* จำเป็นต้องแนบทั้งภาพถ่ายและวิดีโอ</span>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="cust-evidence" className="block text-xs font-medium text-slate-700">
                    ภาพถ่ายหลักฐานสินค้า <span className="text-rose-600 font-semibold">*</span>
                  </label>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500">
                    {evidencePhotos.length}/{MAX_EVIDENCE_PHOTOS} รูป
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  id="cust-evidence"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoFilesChange}
                  className="sr-only"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingPhotos || evidencePhotos.length >= MAX_EVIDENCE_PHOTOS}
                  className={`w-full border border-dashed rounded-xl px-4 py-4 text-center transition-colors ${
                    photoError && evidencePhotos.length === 0
                      ? 'border-rose-400 bg-rose-50/70'
                      : 'border-rose-300 bg-rose-50/30 hover:bg-rose-50/70'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-lg bg-white border border-rose-200 flex items-center justify-center text-rose-600">
                      {evidencePhotos.length > 0 ? (
                        <ImagePlus className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Camera className="w-4 h-4" aria-hidden="true" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-rose-700">
                      {isProcessingPhotos
                        ? 'กำลังเตรียมรูปถ่ายหลักฐาน...'
                        : evidencePhotos.length > 0
                          ? 'เพิ่มรูปถ่ายหลักฐานเพิ่มเติม'
                          : 'คลิกเพื่ออัปโหลดภาพถ่ายหลักฐาน'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      รองรับ JPG, PNG, WEBP อย่างน้อย 1 รูป (สูงสุด {MAX_EVIDENCE_PHOTOS} รูป)
                    </p>
                  </div>
                </button>

                {photoError && (
                  <p className="text-xs font-medium text-rose-600 mt-1.5">{photoError}</p>
                )}

                {evidencePhotos.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {evidencePhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group bg-rose-50/40 border border-rose-200 rounded-lg overflow-hidden"
                      >
                        <img
                          src={photo.dataUrl}
                          alt={photo.name}
                          className="w-full h-24 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          aria-label={`ลบรูป ${photo.name}`}
                          className="absolute top-1.5 right-1.5 p-1 bg-slate-900/75 hover:bg-rose-600 text-white rounded-md transition-colors"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <div className="px-2 py-1 text-[11px] text-slate-600 truncate bg-white border-t border-rose-100">
                          {photo.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="cust-evidence-video" className="block text-xs font-medium text-slate-700">
                    วิดีโอหลักฐานสินค้า / แกะกล่อง <span className="text-rose-600 font-semibold">*</span>
                  </label>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500">
                    {evidenceVideos.length}/{MAX_EVIDENCE_VIDEOS} คลิป
                  </span>
                </div>

                <input
                  ref={videoInputRef}
                  id="cust-evidence-video"
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleVideoFilesChange}
                  className="sr-only"
                />

                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isProcessingVideos || evidenceVideos.length >= MAX_EVIDENCE_VIDEOS}
                  className={`w-full border border-dashed rounded-xl px-4 py-4 text-center transition-colors ${
                    videoError && evidenceVideos.length === 0
                      ? 'border-rose-400 bg-rose-50/70'
                      : 'border-rose-300 bg-rose-50/30 hover:bg-rose-50/70'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-lg bg-white border border-rose-200 flex items-center justify-center text-rose-600">
                      {evidenceVideos.length > 0 ? (
                        <Film className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Video className="w-4 h-4" aria-hidden="true" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-rose-700">
                      {isProcessingVideos
                        ? 'กำลังเตรียมไฟล์วิดีโอ...'
                        : evidenceVideos.length > 0
                          ? 'เพิ่มวิดีโอหลักฐานเพิ่มเติม'
                          : 'คลิกเพื่ออัปโหลดวิดีโอหลักฐาน'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      รองรับ MP4, MOV, WEBM อย่างน้อย 1 คลิป (ไม่เกิน 50 MB/คลิป สูงสุด {MAX_EVIDENCE_VIDEOS} คลิป)
                    </p>
                  </div>
                </button>

                {videoError && (
                  <p className="text-xs font-medium text-rose-600 mt-1.5">{videoError}</p>
                )}

                {evidenceVideos.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {evidenceVideos.map((video) => (
                      <div key={video.id} className="relative">
                        <EvidenceVideoPlayer video={video} compact />
                        <button
                          type="button"
                          onClick={() => handleRemoveVideo(video.id)}
                          aria-label={`ลบวิดีโอ ${video.name}`}
                          className="absolute top-2 right-2 p-1.5 bg-slate-900/75 hover:bg-rose-600 text-white rounded-md transition-colors z-10"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="border-b border-rose-100 pb-2.5">
              <h2 className="text-sm font-bold text-rose-700">
                3. ความประสงค์เมื่อสินค้ามีข้อผิดพลาด <span className="text-rose-600">*</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['replace', 'refund'] as const).map((option) => {
                const selected = resolution === option;
                return (
                  <label
                    key={option}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                      selected
                        ? 'border-rose-500 bg-rose-50/70'
                        : 'border-rose-200 bg-white hover:bg-rose-50/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="customer-resolution"
                      value={option}
                      checked={selected}
                      onChange={() => setResolution(option)}
                      className="mt-0.5 accent-rose-600"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {RESOLUTION_LABELS[option]}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {option === 'replace'
                          ? 'เปลี่ยนและจัดส่งสินค้าชิ้นใหม่ทดแทนรายการที่เสียหาย'
                          : 'คืนเงินค่าสินค้าตามช่องทางที่ลูกค้าชำระไว้'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isProcessingPhotos || isProcessingVideos}
              className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              ส่งคำร้องขอคืนสินค้า
            </button>
          </div>
        </form>
      </div>
    );
  }

  const normalizedQuery = trackQuery.trim().toLowerCase();
  const matchedRequests = normalizedQuery
    ? requests.filter((r) => r.id.trim().toLowerCase() === normalizedQuery)
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ติดตามสถานะคำร้อง</h1>
          <p className="text-sm text-slate-500 mt-1">
            กรอกเลขที่คำร้องของคุณให้ครบถ้วนเพื่อตรวจสอบสถานะ (ระบบสงวนสิทธิ์ไม่แสดงคำร้องของผู้อื่น)
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSwitchTab('submit-request')}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          ยื่นคำร้องใหม่
        </button>
      </div>

      <div className="relative">
        <Search
          className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={trackQuery}
          onChange={(e) => setTrackQuery(e.target.value)}
          placeholder="กรอกเลขที่คำร้อง เช่น RTX-YYYYMMDD-XXXX"
          aria-label="กรอกเลขที่คำร้องเพื่อติดตามสถานะ"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-rose-200 rounded-xl text-sm font-mono placeholder:font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
        />
      </div>

      {!normalizedQuery ? (
        <div className="bg-white border border-rose-200/80 rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-slate-700">กรุณากรอกเลขที่คำร้อง</p>
          <p className="text-xs text-slate-500 mt-1">
            ใส่เลขที่คำร้องที่ได้รับหลังยื่นคำร้อง (เช่น <span className="font-mono">RTX-YYYYMMDD-XXXX</span>) เพื่อดูความคืบหน้าของรายการของคุณ
          </p>
        </div>
      ) : matchedRequests.length === 0 ? (
        <div className="bg-white border border-rose-200/80 rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-slate-700">ไม่พบข้อมูลคำร้องสำหรับเลขที่นี้</p>
          <p className="text-xs text-slate-500 mt-1">
            กรุณาตรวจสอบเลขที่คำร้องให้ถูกต้องครบถ้วนทุกตัวอักษร
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matchedRequests.map((r) => {
            const currentStep = getProgressStep(r.statusIndex);
            return (
              <div key={r.id} className="bg-white border border-rose-200/80 rounded-xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono tabular-nums font-semibold text-rose-700 text-sm">{r.id}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{r.orderNo}</span>
                      {r.productSku && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">SKU: {r.productSku}</span>
                        </>
                      )}
                      {r.orderDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">สั่งซื้อ {r.orderDate}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-base font-semibold text-slate-900 mt-1">
                      {r.productName}{' '}
                      <span className="text-xs font-mono tabular-nums font-normal text-slate-500">
                        × {r.qty} ({formatBaht(r.price)})
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ผู้ยื่นคำร้อง: {r.customerName}
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                      สาเหตุ: {r.reason}
                      {r.resolution && (
                        <>
                          <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                          <span className="text-rose-700 font-medium">
                            ความประสงค์: {RESOLUTION_LABELS[r.resolution]}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <StatusLabel statusIndex={r.statusIndex} statusText={r.statusText} />
                </div>

                {/* Step Progress Indicator */}
                {r.statusIndex !== -1 && (
                  <div className="grid grid-cols-6 gap-2">
                    {PROGRESS_STEPS.map((label, idx) => {
                      const stepNum = idx + 1;
                      const reached = currentStep >= stepNum;
                      const stepLabel =
                        idx === 4
                          ? r.resolution === 'refund'
                            ? 'โอนเงินคืน'
                            : r.resolution === 'replace'
                              ? 'จัดส่งสินค้าใหม่'
                              : label
                          : label;
                      return (
                        <div key={label} className="space-y-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-colors ${
                              reached ? 'bg-rose-500' : 'bg-rose-100'
                            }`}
                          />
                          <div
                            className={`text-[11px] leading-tight ${
                              reached ? 'text-slate-900 font-medium' : 'text-slate-400'
                            }`}
                          >
                            {stepLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {r.evidencePhotos && r.evidencePhotos.length > 0 && (
                  <div className="pt-1">
                    <h3 className="text-xs font-semibold text-slate-500 mb-2.5">
                      รูปถ่ายหลักฐานที่แนบ ({r.evidencePhotos.length} รูป)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {r.evidencePhotos.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setPreviewPhoto(photo)}
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
                  </div>
                )}

                {r.evidenceVideos && r.evidenceVideos.length > 0 && (
                  <div className="pt-1">
                    <h3 className="text-xs font-semibold text-slate-500 mb-2.5">
                      วิดีโอหลักฐานที่แนบ ({r.evidenceVideos.length} คลิป)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {r.evidenceVideos.map((video) => (
                        <EvidenceVideoPlayer key={video.id} video={video} compact />
                      ))}
                    </div>
                  </div>
                )}

                {r.refundSlip && (
                  <div className="pt-1">
                    <h3 className="text-xs font-semibold text-slate-500 mb-2.5">
                      หลักฐานสลิปโอนเงินคืนจากทางร้าน
                      {typeof r.refundAmount === 'number' && (
                        <span className="ml-2 font-mono text-emerald-700">
                          ({formatBaht(r.refundAmount)})
                        </span>
                      )}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(r.refundSlip!)}
                      className="group text-left bg-emerald-50/40 border border-emerald-200 rounded-lg overflow-hidden hover:border-emerald-400 transition-colors max-w-xs"
                    >
                      <img
                        src={r.refundSlip.dataUrl}
                        alt={r.refundSlip.name}
                        className="w-48 h-36 object-cover group-hover:opacity-90 transition-opacity"
                      />
                      <div className="px-2.5 py-1.5 text-[11px] text-slate-700 truncate bg-white border-t border-emerald-100">
                        {r.refundSlip.name} (คลิกเพื่อดูสลิปขนาดใหญ่)
                      </div>
                    </button>
                  </div>
                )}

                <div className="pt-1">
                  <h3 className="text-xs font-semibold text-slate-500 mb-3">ประวัติการดำเนินการ</h3>
                  <RequestTimeline timeline={r.timeline} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ดูรูปถ่ายหลักฐานขนาดใหญ่"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white border border-rose-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-rose-100">
              <span className="text-xs font-medium text-slate-700 truncate">{previewPhoto.name}</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                aria-label="ปิดภาพตัวอย่าง"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-center max-h-[75vh]">
              <img
                src={previewPhoto.dataUrl}
                alt={previewPhoto.name}
                className="max-h-[68vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
