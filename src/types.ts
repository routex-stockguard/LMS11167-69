export type StaffRole = 'admin' | 'warehouse' | 'inspector';
export type UserRole = StaffRole | 'customer';

export interface StaffUser {
  role: StaffRole;
  name: string;
  level: 1 | 2;
}

export interface CurrentUser {
  role: UserRole;
  name: string;
  level?: 1 | 2;
}

export interface StaffNotification {
  id: string;
  targetRole: StaffRole;
  requestId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export type ReturnStatusIndex = -1 | 0 | 1 | 3 | 4 | 5 | 7 | 6;

export type ReturnDisposition = 'restock' | 'repair' | 'writeoff';

export type CustomerResolution = 'replace' | 'refund';

export interface TimelineEvent {
  status: string;
  date: string;
  actor: string;
  note: string;
}

export interface ReturnCost {
  freight: number;
  repair: number;
  inspection: number;
  assetLoss: number;
}

export interface EvidencePhoto {
  id: string;
  name: string;
  dataUrl: string;
}

export interface EvidenceVideo {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
}

export interface ReturnRequest {
  id: string;
  customerName: string;
  phone: string;
  notifyContact?: string;
  orderNo: string;
  orderDate?: string;
  productSku?: string;
  productName: string;
  qty: number;
  price: number;
  reason: string;
  customerNote?: string;
  resolution?: CustomerResolution;
  evidencePhotos?: EvidencePhoto[];
  evidenceVideos?: EvidenceVideo[];
  refundAmount?: number;
  refundSlip?: EvidencePhoto;
  warehouseZone?: string;
  disposition?: ReturnDisposition;
  statusIndex: ReturnStatusIndex;
  statusText: string;
  timeline: TimelineEvent[];
  cost: ReturnCost;
}

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  defaultQty: number;
  stock: number;
}

export interface OrderRecord {
  orderNo: string;
  productSku: string;
  productName: string;
  qty: number;
  customerName?: string;
  note?: string;
  createdAt: string;
  createdBy: string;
}

export const RETURN_REASONS = [
  'สินค้าชำรุดหรือเสียหาย',
  'ได้รับสินค้าผิดรุ่น',
  'สินค้าไม่ตรงกับรายละเอียด',
  'ลูกค้าเปลี่ยนใจ',
] as const;

export const WAREHOUSE_ZONES = [
  'โซน A (รอตรวจสอบ)',
  'โซน B (สินค้าแตกหัก/เสียหาย)',
  'โซน C (คืนเข้าสต็อกด่วน)',
] as const;

export interface SystemConfig {
  brandName: string;
  systemCode: string;
  systemTitle: string;
  contactLine: string;
  contactPhone: string;
  contactEmail: string;
  returnReasons: string[];
  warehouseZones: string[];
  defaultFreightCost: number;
  defaultInspectionCost: number;
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  brandName: 'RouteX',
  systemCode: 'RouteX LSM11167',
  systemTitle: 'Return Management System',
  contactLine: '140525455',
  contactPhone: '0639569177',
  contactEmail: 'Route_X@gmail.com',
  returnReasons: [...RETURN_REASONS],
  warehouseZones: [...WAREHOUSE_ZONES],
  defaultFreightCost: 50,
  defaultInspectionCost: 100,
};

export const STATUS_LABELS: Record<ReturnStatusIndex, string> = {
  '-1': 'ไม่อนุมัติคำขอคืนสินค้า',
  0: 'รออนุมัติคำขอคืนสินค้า',
  1: 'อนุมัติการคืนสินค้า',
  3: 'ได้รับสินค้าแล้ว',
  4: 'กำลังตรวจสอบสินค้า',
  5: 'รอคลังจัดส่งสินค้าใหม่',
  7: 'รอแอดมินโอนเงินคืน',
  6: 'ดำเนินการเสร็จสิ้น / ปิดรายการ',
};

export const DISPOSITION_LABELS: Record<ReturnDisposition, string> = {
  restock: 'ผ่านการตรวจสอบ (คืนเข้าสต็อก)',
  repair: 'ส่งซ่อมแซมก่อนนำกลับขาย',
  writeoff: 'เสียหายถาวร (ตัดจำหน่าย)',
};

export const RESOLUTION_LABELS: Record<CustomerResolution, string> = {
  replace: 'จัดส่งสินค้าใหม่',
  refund: 'ขอรับเงินคืน',
};

export const STAFF_ROLE_ORDER: StaffRole[] = ['admin', 'warehouse', 'inspector'];

export const STAFF_ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  admin: 'อนุมัติคำร้อง โอนเงินคืนลูกค้า จัดการสินค้า และดูภาพรวมระบบ',
  warehouse: 'รับสินค้าคืนเข้าคลัง กำหนดโซนจัดเก็บ และจัดส่งสินค้าใหม่',
  inspector: 'ตรวจสอบสภาพสินค้า บันทึกค่าตรวจสอบ/ค่าซ่อม และจัดโซนหลังตรวจ',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'ผู้ดูแลระบบ (Admin)',
  warehouse: 'พนักงานคลังสินค้า (Warehouse)',
  inspector: 'เจ้าหน้าที่ตรวจสอบ (Inspector)',
  customer: 'ลูกค้า (Customer Portal)',
};

export function formatBaht(amount: number): string {
  return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatNow(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export function getTotalCost(cost: ReturnCost): number {
  return cost.freight + cost.repair + cost.inspection + cost.assetLoss;
}

export const OVERDUE_THRESHOLD_DAYS = 3;

export function getRequestCreatedDate(req: ReturnRequest): Date | null {
  const firstDateStr = req.timeline[0]?.date?.trim();
  if (firstDateStr) {
    const match = firstDateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const hour = match[4] ? Number(match[4]) : 0;
      const minute = match[5] ? Number(match[5]) : 0;
      const parsed = new Date(year, month, day, hour, minute);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  const idMatch = req.id.match(/(\d{4})(\d{2})(\d{2})/);
  if (idMatch) {
    const parsed = new Date(Number(idMatch[1]), Number(idMatch[2]) - 1, Number(idMatch[3]));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

export function getRequestAgeDays(req: ReturnRequest, nowMs: number = Date.now()): number {
  const created = getRequestCreatedDate(req);
  if (!created) return 0;
  const diffMs = nowMs - created.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isRequestOverdue(req: ReturnRequest, nowMs: number = Date.now()): boolean {
  if (req.statusIndex === 6 || req.statusIndex === -1) return false;
  const created = getRequestCreatedDate(req);
  if (!created) return false;
  return nowMs - created.getTime() > OVERDUE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}
