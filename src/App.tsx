import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackageCheck,
  SearchCheck,
  Settings,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import {
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_REQUESTS,
  INITIAL_USERS,
} from './data/initialData';
import {
  DEFAULT_SYSTEM_CONFIG,
  DISPOSITION_LABELS,
  RESOLUTION_LABELS,
  ROLE_LABELS,
  STAFF_ROLE_ORDER,
  STATUS_LABELS,
  formatBaht,
  formatNow,
  getRequestAgeDays,
  type CurrentUser,
  type CustomerResolution,
  type EvidencePhoto,
  type EvidenceVideo,
  type OrderRecord,
  type ProductItem,
  type ReturnDisposition,
  type ReturnRequest,
  type ReturnStatusIndex,
  type StaffNotification,
  type StaffRole,
  type StaffUser,
  type SystemConfig,
} from './types';
import { deleteVideoBlob } from './utils/mediaStorage';
import { LoginPortal } from './components/LoginPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminRequests } from './components/AdminRequests';
import { AdminUsers } from './components/AdminUsers';
import { AdminProducts } from './components/AdminProducts';
import { AdminOrders } from './components/AdminOrders';
import { AdminSettings } from './components/AdminSettings';
import { CustomerPortal } from './components/CustomerPortal';
import { WarehousePortal } from './components/WarehousePortal';
import { InspectorPortal } from './components/InspectorPortal';
import { RequestDetailModal } from './components/RequestDetailModal';
import {
  StaffNotificationBell,
  getOverdueRequestsForRole,
  getPendingTasksForRole,
} from './components/StaffNotificationBell';
import { ToastContainer, type ToastMessage } from './components/Toast';

type ActiveTab =
  | 'dashboard'
  | 'manage-requests'
  | 'products'
  | 'outbound-orders'
  | 'user-management'
  | 'system-settings'
  | 'submit-request'
  | 'track-request'
  | 'warehouse-receive'
  | 'inspector-check';

const STORAGE_USERS_KEY = 'routex_rms_users_v1';
const STORAGE_REQUESTS_KEY = 'routex_rms_requests_v1';
const STORAGE_PRODUCTS_KEY = 'routex_rms_products_v1';
const STORAGE_ORDERS_KEY = 'routex_rms_orders_v1';
const STORAGE_CONFIG_KEY = 'routex_rms_config_v1';
const STORAGE_NOTIFICATIONS_KEY = 'routex_rms_notifications_v1';

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeStaffUsers(loaded: StaffUser[]): StaffUser[] {
  return STAFF_ROLE_ORDER.map((role) => {
    const fallback = INITIAL_USERS.find((u) => u.role === role)!;
    const match = Array.isArray(loaded)
      ? loaded.find((u) => u && u.role === role && typeof u.name === 'string' && u.name.trim())
      : undefined;
    return {
      role,
      name: match ? match.name.trim() : fallback.name,
      level: role === 'admin' ? 1 : 2,
    };
  });
}

export default function App() {
  const [users, setUsers] = useState<StaffUser[]>(() =>
    normalizeStaffUsers(loadStored<StaffUser[]>(STORAGE_USERS_KEY, INITIAL_USERS))
  );
  const [requests, setRequests] = useState<ReturnRequest[]>(() =>
    loadStored<ReturnRequest[]>(STORAGE_REQUESTS_KEY, INITIAL_REQUESTS)
  );
  const [products, setProducts] = useState<ProductItem[]>(() =>
    loadStored<ProductItem[]>(STORAGE_PRODUCTS_KEY, INITIAL_PRODUCTS)
  );
  const [orders, setOrders] = useState<OrderRecord[]>(() =>
    loadStored<OrderRecord[]>(STORAGE_ORDERS_KEY, INITIAL_ORDERS)
  );
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() =>
    loadStored<SystemConfig>(STORAGE_CONFIG_KEY, DEFAULT_SYSTEM_CONFIG)
  );
  const [staffNotifications, setStaffNotifications] = useState<StaffNotification[]>(() =>
    loadStored<StaffNotification[]>(STORAGE_NOTIFICATIONS_KEY, [])
  );
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [overdueBannerDismissed, setOverdueBannerDismissed] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch {
      // Ignore storage quota issues
    }
  }, [users]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(requests));
    } catch {
      // Ignore storage quota issues
    }
  }, [requests]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
    } catch {
      // Ignore storage quota issues
    }
  }, [products]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
    } catch {
      // Ignore storage quota issues
    }
  }, [orders]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(systemConfig));
    } catch {
      // Ignore storage quota issues
    }
  }, [systemConfig]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_NOTIFICATIONS_KEY,
        JSON.stringify(staffNotifications)
      );
    } catch {
      // Ignore storage quota issues
    }
  }, [staffNotifications]);

  const pushToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  const pushStaffNotification = (
    targetRole: StaffRole,
    requestId: string,
    title: string,
    message: string
  ) => {
    const item: StaffNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      targetRole,
      requestId,
      title,
      message,
      createdAt: formatNow(),
      read: false,
    };
    setStaffNotifications((prev) => [item, ...prev].slice(0, 40));
  };

  const markStaffNotificationRead = (id: string) => {
    setStaffNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllStaffNotificationsRead = (role: StaffRole) => {
    setStaffNotifications((prev) =>
      prev.map((n) => (n.targetRole === role ? { ...n, read: true } : n))
    );
  };

  const handleStaffLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    setMobileMenuOpen(false);
    setOverdueBannerDismissed(false);
    if (user.role === 'admin') setActiveTab('dashboard');
    else if (user.role === 'warehouse') setActiveTab('warehouse-receive');
    else if (user.role === 'inspector') setActiveTab('inspector-check');
    pushToast({
      type: 'info',
      title: `เข้าสู่ระบบสำเร็จ`,
      description: `ยินดีต้อนรับ ${user.name}`,
    });

    if (user.role !== 'customer') {
      const pendingTasks = getPendingTasksForRole(user.role, requests);
      if (pendingTasks.length > 0) {
        const preview = pendingTasks
          .slice(0, 2)
          .map((t) => `${t.request.id} (${t.taskLabel})`)
          .join(', ');
        pushToast({
          type: 'info',
          title: `แจ้งเตือน: คุณมีงานรอดำเนินการ ${pendingTasks.length} รายการ`,
          description:
            pendingTasks.length > 2
              ? `${preview} และอีก ${pendingTasks.length - 2} รายการ`
              : preview,
        });
      }

      const overdueList = getOverdueRequestsForRole(user.role, requests);
      if (overdueList.length > 0) {
        pushToast({
          type: 'error',
          title: `แจ้งเตือนคำร้องเกิน 3 วัน: พบ ${overdueList.length} รายการ`,
          description: `คำร้อง ${overdueList
            .slice(0, 2)
            .map((r) => `${r.id} (${getRequestAgeDays(r)} วัน)`)
            .join(', ')}${overdueList.length > 2 ? ` และอีก ${overdueList.length - 2} รายการ` : ''}`,
        });
      }
    }
  };

  const handleEnterCustomerPortal = (initialTab: 'submit-request' | 'track-request') => {
    setCurrentUser({ role: 'customer', name: 'ลูกค้าทั่วไป' });
    setActiveTab(initialTab);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedRequest(null);
    setMobileMenuOpen(false);
  };

  const handleUpdateUser = (role: StaffRole, name: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.role === role
          ? {
              ...u,
              name,
              level: role === 'admin' ? 1 : 2,
            }
          : u
      )
    );
    if (currentUser?.role === role) {
      setCurrentUser((prev) => (prev ? { ...prev, name } : prev));
    }
    pushToast({
      type: 'success',
      title: 'อัปเดตข้อมูลพนักงานแล้ว',
      description: `บันทึกชื่อผู้รับผิดชอบตำแหน่ง ${ROLE_LABELS[role]} เป็น ${name} เรียบร้อย`,
    });
  };

  const buildNewRequest = (
    data: {
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
      customerNote: string;
      resolution?: CustomerResolution;
      evidencePhotos?: EvidencePhoto[];
      evidenceVideos?: EvidenceVideo[];
    },
    actorLabel: string,
    noteText: string
  ): ReturnRequest => {
    const dateSlug = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newId = `RTX-${dateSlug}-${randomSuffix}`;
    return {
      id: newId,
      customerName: data.customerName,
      phone: data.phone,
      notifyContact: data.notifyContact || undefined,
      orderNo: data.orderNo,
      orderDate: data.orderDate || undefined,
      productSku: data.productSku || undefined,
      productName: data.productName,
      qty: data.qty,
      price: data.price,
      reason: data.reason,
      customerNote: data.customerNote || undefined,
      resolution: data.resolution,
      evidencePhotos: data.evidencePhotos && data.evidencePhotos.length > 0 ? data.evidencePhotos : undefined,
      evidenceVideos: data.evidenceVideos && data.evidenceVideos.length > 0 ? data.evidenceVideos : undefined,
      statusIndex: 0,
      statusText: STATUS_LABELS[0],
      timeline: [
        {
          status: STATUS_LABELS[0],
          date: formatNow(),
          actor: actorLabel,
          note: noteText,
        },
      ],
      cost: {
        freight: systemConfig.defaultFreightCost,
        repair: 0,
        inspection: systemConfig.defaultInspectionCost,
        assetLoss: data.price,
      },
    };
  };

  const handleCustomerSubmit = (data: {
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
  }): string => {
    const newReq = buildNewRequest(
      data,
      data.customerName,
      `ยื่นคำร้องผ่านพอร์ทัลลูกค้า (${RESOLUTION_LABELS[data.resolution]} · แนบรูป ${data.evidencePhotos.length} รูป, วิดีโอ ${data.evidenceVideos.length} คลิป)`
    );
    setRequests((prev) => [newReq, ...prev]);
    pushStaffNotification(
      'admin',
      newReq.id,
      'มีคำร้องขอคืนสินค้าใหม่รออนุมัติ',
      `${newReq.id} จาก ${data.customerName} (${data.productName})`
    );
    pushToast({
      type: 'success',
      title: 'ส่งคำร้องขอคืนสินค้าสำเร็จ',
      description: `หมายเลขติดตามของคุณคือ ${newReq.id}`,
    });
    return newReq.id;
  };

  const handleAddAdminRequest = (data: {
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
  }) => {
    const actor = currentUser?.name || 'ผู้ดูแลระบบ';
    const newReq = buildNewRequest(data, actor, 'สร้างคำร้องโดยผู้ดูแลระบบ');
    setRequests((prev) => [newReq, ...prev]);
    pushToast({
      type: 'success',
      title: 'เพิ่มคำร้องใหม่เรียบร้อย',
      description: `สร้างรหัสคำร้อง ${newReq.id} เข้าระบบแล้ว`,
    });
  };

  const handleUpdateRequest = (
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
  ) => {
    const actor = currentUser?.name || 'ผู้ดูแลระบบ';
    const nextStatusText = STATUS_LABELS[updates.statusIndex];
    setRequests((prev) =>
      prev.map((item) => {
        if (item.id !== requestId) return item;
        const assetLoss =
          updates.statusIndex === -1
            ? 0
            : item.disposition === 'restock'
              ? 0
              : updates.price;
        return {
          ...item,
          productName: updates.productName,
          qty: updates.qty,
          price: updates.price,
          reason: updates.reason,
          statusIndex: updates.statusIndex,
          statusText: nextStatusText,
          warehouseZone: updates.warehouseZone,
          cost: {
            freight: updates.freight,
            inspection: updates.inspection,
            repair: updates.repair,
            assetLoss,
          },
          timeline: [
            ...item.timeline,
            {
              status: nextStatusText,
              date: formatNow(),
              actor,
              note: updates.note,
            },
          ],
        };
      })
    );
    pushToast({
      type: 'success',
      title: 'แก้ไขข้อมูลคำร้องแล้ว',
      description: `บันทึกการเปลี่ยนแปลงสำหรับ ${requestId} เรียบร้อย`,
    });
  };

  const handleDeleteRequest = (requestId: string) => {
    const target = requests.find((item) => item.id === requestId);
    if (target?.evidenceVideos) {
      target.evidenceVideos.forEach((v) => {
        void deleteVideoBlob(v.id);
      });
    }
    setRequests((prev) => prev.filter((item) => item.id !== requestId));
    if (selectedRequest?.id === requestId) {
      setSelectedRequest(null);
    }
    pushToast({
      type: 'info',
      title: 'ลบคำร้องออกจากระบบแล้ว',
      description: `นำคำร้อง ${requestId} ออกจากรายการเรียบร้อย`,
    });
  };

  const handleAddProduct = (item: ProductItem): { ok: boolean; error?: string } => {
    if (products.some((p) => p.id.toLowerCase() === item.id.toLowerCase())) {
      return { ok: false, error: `รหัสสินค้า ${item.id} มีอยู่ในระบบแล้ว` };
    }
    setProducts((prev) => [item, ...prev]);
    pushToast({
      type: 'success',
      title: 'เพิ่มรายการสินค้าแล้ว',
      description: `เพิ่ม ${item.name} (${item.id}) เข้าระบบเรียบร้อย`,
    });
    return { ok: true };
  };

  const handleUpdateProduct = (id: string, updates: Omit<ProductItem, 'id'>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    pushToast({
      type: 'success',
      title: 'อัปเดตสินค้าและสต๊อกแล้ว',
      description: `บันทึกข้อมูล ${updates.name} (${id}) เรียบร้อย`,
    });
  };

  const handleAdjustStock = (id: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p
      )
    );
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    pushToast({
      type: 'info',
      title: 'ลบรายการสินค้าแล้ว',
      description: `นำรหัสสินค้า ${id} ออกจากแค็ตตาล็อกเรียบร้อย`,
    });
  };

  const handleAddOrder = (data: {
    orderNo: string;
    productSku: string;
    productName: string;
    qty: number;
    customerName?: string;
    note?: string;
  }): { ok: boolean; error?: string } => {
    const normalizedNo = data.orderNo.trim().toUpperCase();
    if (orders.some((o) => o.orderNo.toUpperCase() === normalizedNo)) {
      return { ok: false, error: `เลขออเดอร์ ${normalizedNo} มีการบันทึกส่งออกแล้ว` };
    }

    const targetProduct = products.find((p) => p.id === data.productSku);
    if (!targetProduct) {
      return { ok: false, error: 'ไม่พบสินค้าที่เลือกในคลังสินค้า' };
    }
    if (data.qty > targetProduct.stock) {
      return {
        ok: false,
        error: `สต๊อกสินค้า ${targetProduct.name} คงเหลือ ${targetProduct.stock} ชิ้น ไม่เพียงพอสำหรับตัดส่ง ${data.qty} ชิ้น`,
      };
    }

    const nextStock = Math.max(0, targetProduct.stock - data.qty);
    const newOrder: OrderRecord = {
      orderNo: normalizedNo,
      productSku: targetProduct.id,
      productName: targetProduct.name,
      qty: data.qty,
      customerName: data.customerName,
      note: data.note,
      createdAt: formatNow(),
      createdBy: currentUser?.name || 'ผู้ดูแลระบบ',
    };

    setOrders((prev) => [newOrder, ...prev]);
    setProducts((prev) =>
      prev.map((p) => (p.id === targetProduct.id ? { ...p, stock: nextStock } : p))
    );

    pushToast({
      type: 'success',
      title: 'บันทึกออเดอร์และตัดสต๊อกแล้ว',
      description: `${normalizedNo}: ${targetProduct.name} × ${data.qty} ชิ้น (คงเหลือ ${nextStock} ชิ้น)`,
    });
    return { ok: true };
  };

  const handleDeleteOrder = (orderNo: string) => {
    const target = orders.find(
      (o) => o.orderNo.toUpperCase() === orderNo.trim().toUpperCase()
    );
    if (!target) return;

    setOrders((prev) => prev.filter((o) => o.orderNo !== target.orderNo));
    setProducts((prev) =>
      prev.map((p) =>
        p.id === target.productSku ? { ...p, stock: p.stock + target.qty } : p
      )
    );
    pushToast({
      type: 'info',
      title: 'ยกเลิกออเดอร์และคืนสต๊อกแล้ว',
      description: `คืนยอด ${target.productName} +${target.qty} ชิ้น จากออเดอร์ ${target.orderNo}`,
    });
  };

  const handleSaveSystemConfig = (nextConfig: SystemConfig) => {
    setSystemConfig(nextConfig);
    pushToast({
      type: 'success',
      title: 'บันทึกการตั้งค่าระบบแล้ว',
      description: 'การเปลี่ยนแปลงมีผลใช้งานทั่วทั้งระบบทันที',
    });
  };

  const handleResetSystemConfig = () => {
    setSystemConfig(DEFAULT_SYSTEM_CONFIG);
    pushToast({
      type: 'info',
      title: 'คืนค่าเริ่มต้นของระบบแล้ว',
      description: 'รีเซ็ตชื่อระบบ ช่องทางติดต่อ สาเหตุการคืน และโซนคลังเป็นค่าเริ่มต้น',
    });
  };

  const handleApproveRequest = (requestId: string) => {
    if (!currentUser) return;
    const target = requests.find((item) => item.id === requestId);
    setRequests((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              statusIndex: 1,
              statusText: 'อนุมัติการคืนสินค้า',
              timeline: [
                ...item.timeline,
                {
                  status: 'อนุมัติการคืนสินค้า',
                  date: formatNow(),
                  actor: currentUser.name,
                  note: 'ผู้ดูแลระบบอนุมัติคำร้องแล้ว รอจัดส่งเข้าคลัง',
                },
              ],
            }
          : item
      )
    );
    pushStaffNotification(
      'warehouse',
      requestId,
      'มีรายการอนุมัติคืน รอรับเข้าคลัง',
      `คำร้อง ${requestId}${target ? ` (${target.productName})` : ''} รอคลังรับสินค้าเข้าคลัง`
    );
    pushToast({
      type: 'success',
      title: 'อนุมัติคำร้องแล้ว',
      description: `คำร้อง ${requestId} ถูกส่งต่อไปยังคิวรับสินค้าคลังสินค้า`,
    });
  };

  const handleRejectRequest = (requestId: string, note: string) => {
    if (!currentUser) return;
    setRequests((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              statusIndex: -1,
              statusText: 'ไม่อนุมัติคำขอคืนสินค้า',
              cost: { ...item.cost, freight: 0, inspection: 0, repair: 0, assetLoss: 0 },
              timeline: [
                ...item.timeline,
                {
                  status: 'ไม่อนุมัติคำขอคืนสินค้า',
                  date: formatNow(),
                  actor: currentUser.name,
                  note,
                },
              ],
            }
          : item
      )
    );
    pushToast({
      type: 'info',
      title: 'บันทึกปฏิเสธคำร้องแล้ว',
      description: `ปิดคำร้อง ${requestId} ด้วยสถานะไม่อนุมัติ`,
    });
  };

  const handleWarehouseReceive = (
    requestId: string,
    payload: { zone: string; note: string }
  ) => {
    if (!currentUser) return;
    setRequests((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              statusIndex: 3,
              statusText: 'ได้รับสินค้าแล้ว',
              warehouseZone: payload.zone,
              timeline: [
                ...item.timeline,
                {
                  status: 'ได้รับสินค้าแล้ว',
                  date: formatNow(),
                  actor: currentUser.name,
                  note: `${payload.zone} — ${payload.note}`,
                },
              ],
            }
          : item
      )
    );
    pushStaffNotification(
      'inspector',
      requestId,
      'คลังรับสินค้าเข้าแล้ว รอตรวจสอบสภาพ',
      `คำร้อง ${requestId} จัดเก็บที่ ${payload.zone} พร้อมเข้าคิวตรวจสอบ`
    );
    pushToast({
      type: 'success',
      title: 'ยืนยันรับสินค้าเข้าคลังแล้ว',
      description: `คำร้อง ${requestId} จัดเก็บที่ ${payload.zone}`,
    });
  };

  const handleStartInspection = (requestId: string) => {
    if (!currentUser) return;
    setRequests((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              statusIndex: 4,
              statusText: 'กำลังตรวจสอบสินค้า',
              timeline: [
                ...item.timeline,
                {
                  status: 'กำลังตรวจสอบสินค้า',
                  date: formatNow(),
                  actor: currentUser.name,
                  note: 'เริ่มดำเนินการตรวจสอบสภาพสินค้า',
                },
              ],
            }
          : item
      )
    );
    pushToast({
      type: 'info',
      title: 'เริ่มตรวจสอบสภาพสินค้า',
      description: `อัปเดตสถานะคำร้อง ${requestId} เป็นกำลังตรวจสอบสินค้า`,
    });
  };

  const handleCompleteInspection = (
    requestId: string,
    payload: {
      disposition: ReturnDisposition;
      warehouseZone: string;
      inspectionCost: number;
      repairCost: number;
      note: string;
    }
  ) => {
    if (!currentUser) return;
    if (!payload.warehouseZone.trim()) return;
    const targetReq = requests.find((item) => item.id === requestId);
    const nextStatusIndex: ReturnStatusIndex =
      targetReq?.resolution === 'replace'
        ? 5
        : targetReq?.resolution === 'refund'
          ? 7
          : 6;
    const nextStatusText = STATUS_LABELS[nextStatusIndex];
    const routingNote =
      nextStatusIndex === 5
        ? 'ส่งเรื่องกลับไปที่พนักงานคลังเพื่อจัดส่งสินค้าใหม่ให้ลูกค้า'
        : nextStatusIndex === 7
          ? 'ส่งเรื่องให้แอดมินดำเนินการโอนเงินคืนลูกค้า'
          : 'ปิดรายการ';

    setRequests((prev) =>
      prev.map((item) => {
        if (item.id !== requestId) return item;
        const nextAssetLoss = payload.disposition === 'restock' ? 0 : item.price;
        return {
          ...item,
          statusIndex: nextStatusIndex,
          statusText: nextStatusText,
          disposition: payload.disposition,
          warehouseZone: payload.warehouseZone,
          cost: {
            ...item.cost,
            inspection: payload.inspectionCost,
            repair: payload.repairCost,
            assetLoss: nextAssetLoss,
          },
          timeline: [
            ...item.timeline,
            {
              status: nextStatusText,
              date: formatNow(),
              actor: currentUser.name,
              note: `${DISPOSITION_LABELS[payload.disposition]} · โซนจัดเก็บ: ${payload.warehouseZone} — ${payload.note} (${routingNote})`,
            },
          ],
        };
      })
    );
    let restockedProductName: string | null = null;
    if (payload.disposition === 'restock' && targetReq) {
      setProducts((prev) =>
        prev.map((p) => {
          const matchedBySku =
            targetReq.productSku &&
            p.id.toLowerCase() === targetReq.productSku.trim().toLowerCase();
          const matchedByName =
            p.name.trim().toLowerCase() === targetReq.productName.trim().toLowerCase();
          if (matchedBySku || matchedByName) {
            restockedProductName = p.name;
            return { ...p, stock: p.stock + targetReq.qty };
          }
          return p;
        })
      );
    }
    if (nextStatusIndex === 5) {
      pushStaffNotification(
        'warehouse',
        requestId,
        'ตรวจสภาพเสร็จแล้ว รอจัดส่งสินค้าใหม่',
        `คำร้อง ${requestId} ลูกค้าขอจัดส่งสินค้าทดแทน กรุณาจัดส่งให้ลูกค้า`
      );
    } else if (nextStatusIndex === 7) {
      pushStaffNotification(
        'admin',
        requestId,
        'ตรวจสภาพเสร็จแล้ว รอโอนเงินคืนลูกค้า',
        `คำร้อง ${requestId} ลูกค้าขอรับเงินคืน กรุณาโอนเงินคืนและแนบสลิป`
      );
    }
    pushToast({
      type: 'success',
      title:
        nextStatusIndex === 5
          ? 'ตรวจสอบเสร็จสิ้น — ส่งต่อคลังจัดส่งสินค้าใหม่'
          : nextStatusIndex === 7
            ? 'ตรวจสอบเสร็จสิ้น — ส่งต่อแอดมินโอนเงินคืน'
            : 'บันทึกผลตรวจสอบและปิดเคสแล้ว',
      description: restockedProductName
        ? `คำร้อง ${requestId} ${routingNote} และคืนสต๊อก ${restockedProductName} +${targetReq?.qty} ชิ้น`
        : `คำร้อง ${requestId}: ${routingNote}`,
    });
  };

  const handleWarehouseDispatchReplacement = (
    requestId: string,
    payload: { trackingNo: string; note: string }
  ) => {
    if (!currentUser) return;
    const targetReq = requests.find((item) => item.id === requestId);
    const trackingSuffix = payload.trackingNo.trim()
      ? ` (เลขพัสดุ: ${payload.trackingNo.trim()})`
      : '';
    const detailNote = payload.note.trim() ? ` — ${payload.note.trim()}` : '';

    setRequests((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              statusIndex: 6,
              statusText: STATUS_LABELS[6],
              timeline: [
                ...item.timeline,
                {
                  status: STATUS_LABELS[6],
                  date: formatNow(),
                  actor: currentUser.name,
                  note: `พนักงานคลังจัดส่งสินค้าใหม่ให้ลูกค้าเรียบร้อยแล้ว${trackingSuffix}${detailNote}`,
                },
              ],
            }
          : item
      )
    );

    if (targetReq) {
      setProducts((prev) =>
        prev.map((p) => {
          const matchedBySku =
            targetReq.productSku &&
            p.id.toLowerCase() === targetReq.productSku.trim().toLowerCase();
          const matchedByName =
            p.name.trim().toLowerCase() === targetReq.productName.trim().toLowerCase();
          if (matchedBySku || matchedByName) {
            return { ...p, stock: Math.max(0, p.stock - targetReq.qty) };
          }
          return p;
        })
      );
    }

    pushToast({
      type: 'success',
      title: 'จัดส่งสินค้าใหม่และปิดรายการแล้ว',
      description: `คำร้อง ${requestId} ดำเนินการจัดส่งสินค้าทดแทนให้ลูกค้าเรียบร้อย${trackingSuffix}`,
    });
  };

  const handleAdminCompleteRefund = (
    requestId: string,
    payload: { refundAmount: number; note: string; refundSlip: EvidencePhoto }
  ) => {
    if (!currentUser) return;
    if (!payload.refundSlip?.dataUrl) return;
    const noteSuffix = payload.note.trim() ? ` — ${payload.note.trim()}` : '';
    setRequests((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              statusIndex: 6,
              statusText: STATUS_LABELS[6],
              refundAmount: payload.refundAmount,
              refundSlip: payload.refundSlip,
              timeline: [
                ...item.timeline,
                {
                  status: STATUS_LABELS[6],
                  date: formatNow(),
                  actor: currentUser.name,
                  note: `แอดมินโอนเงินคืนลูกค้าจำนวน ${formatBaht(payload.refundAmount)} พร้อมแนบสลิปโอนเงินเรียบร้อยแล้ว${noteSuffix}`,
                },
              ],
            }
          : item
      )
    );

    pushToast({
      type: 'success',
      title: 'โอนเงินคืนและปิดรายการแล้ว',
      description: `บันทึกการโอนเงินคืน ${formatBaht(payload.refundAmount)} และแนบสลิปสำหรับคำร้อง ${requestId} เรียบร้อย`,
    });
  };

  const adminTaskCount = requests.filter((r) => r.statusIndex === 0 || r.statusIndex === 7).length;
  const warehouseTaskCount = requests.filter((r) => r.statusIndex === 1 || r.statusIndex === 5).length;
  const inspectorTaskCount = requests.filter((r) => r.statusIndex === 3 || r.statusIndex === 4).length;

  const allNavItems: {
    id: ActiveTab;
    label: string;
    Icon: typeof LayoutDashboard;
    visible: boolean;
    badgeCount?: number;
  }[] = currentUser
    ? [
        {
          id: 'dashboard',
          label: 'ภาพรวม Dashboard',
          Icon: LayoutDashboard,
          visible: currentUser.role === 'admin',
        },
        {
          id: 'outbound-orders',
          label: 'บันทึกออเดอร์ส่งลูกค้า',
          Icon: ClipboardCheck,
          visible: currentUser.role === 'admin',
        },
        {
          id: 'manage-requests',
          label: 'จัดการคำร้องและอนุมัติ',
          Icon: ClipboardList,
          visible: currentUser.role === 'admin',
          badgeCount: adminTaskCount,
        },
        {
          id: 'products',
          label: 'จัดการสินค้าและสต๊อก',
          Icon: Package,
          visible: currentUser.role === 'admin',
        },
        {
          id: 'user-management',
          label: 'จัดการผู้ใช้งาน',
          Icon: ShieldCheck,
          visible: currentUser.role === 'admin',
        },
        {
          id: 'system-settings',
          label: 'ตั้งค่าระบบ',
          Icon: Settings,
          visible: currentUser.role === 'admin',
        },
        {
          id: 'submit-request',
          label: 'ยื่นคำร้องขอคืนสินค้า',
          Icon: FilePlus2,
          visible: currentUser.role === 'customer',
        },
        {
          id: 'track-request',
          label: 'ติดตามสถานะคำร้อง',
          Icon: Truck,
          visible: currentUser.role === 'customer',
        },
        {
          id: 'warehouse-receive',
          label: 'คลังสินค้า (รับคืน / ส่งใหม่)',
          Icon: PackageCheck,
          visible: currentUser.role === 'warehouse',
          badgeCount: warehouseTaskCount,
        },
        {
          id: 'inspector-check',
          label: 'ตรวจสอบสภาพสินค้า',
          Icon: SearchCheck,
          visible: currentUser.role === 'inspector',
          badgeCount: inspectorTaskCount,
        },
      ]
    : [];

  const navItems = allNavItems.filter((item) => item.visible);

  const activeNavLabel = navItems.find((n) => n.id === activeTab)?.label ?? 'พื้นที่ทำงาน';

  const getQueueTabForRole = (role: StaffRole): ActiveTab => {
    if (role === 'admin') return 'manage-requests';
    if (role === 'warehouse') return 'warehouse-receive';
    return 'inspector-check';
  };

  const overdueForCurrentStaff =
    currentUser && currentUser.role !== 'customer'
      ? getOverdueRequestsForRole(currentUser.role, requests)
      : [];

  return (
    <>
      {!currentUser ? (
        <LoginPortal
          users={users}
          config={systemConfig}
          onLoginStaff={handleStaffLogin}
          onEnterCustomerPortal={handleEnterCustomerPortal}
        />
      ) : (
        <div className="min-h-screen bg-[#FFF9FB] flex flex-col text-slate-900">
          {/* Top Header Bar (Single Row, 3 Zones) */}
          <header className="h-16 bg-white/95 backdrop-blur-sm border-b border-rose-100 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="เปิดเมนูนำทาง"
                className="md:hidden p-2 -ml-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <span className="font-display font-bold text-lg tracking-tight text-rose-600 whitespace-nowrap shrink-0">
                {systemConfig.brandName}
              </span>
              <span className="hidden sm:inline text-rose-200" aria-hidden="true">
                /
              </span>
              <span className="hidden sm:inline text-sm font-medium text-slate-600 truncate">
                {activeNavLabel}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {currentUser.role !== 'customer' && (
                <StaffNotificationBell
                  role={currentUser.role}
                  requests={requests}
                  notifications={staffNotifications}
                  onOpenRequest={(req) => {
                    setActiveTab(getQueueTabForRole(currentUser.role as StaffRole));
                    setSelectedRequest(req);
                  }}
                  onNavigateQueue={() =>
                    setActiveTab(getQueueTabForRole(currentUser.role as StaffRole))
                  }
                  onMarkRead={markStaffNotificationRead}
                  onMarkAllRead={markAllStaffNotificationsRead}
                />
              )}
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-500 whitespace-nowrap">
                  {ROLE_LABELS[currentUser.role]}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </header>

          <div className="flex flex-1 relative">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-white border-r border-rose-100 text-slate-700 p-4 hidden md:flex flex-col justify-between shrink-0">
              <nav aria-label="เมนูหลัก" className="space-y-1.5">
                <div className="px-3 pb-2 text-xs font-semibold text-rose-500">
                  เมนูการทำงาน
                </div>
                {navItems.map(({ id, label, Icon, badgeCount }) => {
                  const isActive = activeTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveTab(id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap ${
                        isActive
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{label}</span>
                      </span>
                      {typeof badgeCount === 'number' && badgeCount > 0 && (
                        <span
                          className={`px-1.5 py-0.5 text-[11px] leading-none font-mono tabular-nums font-bold rounded shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-rose-100 pt-4 px-3 text-xs text-slate-500">
                <div className="font-medium text-rose-700">{systemConfig.systemCode}</div>
                <div className="mt-0.5">{systemConfig.systemTitle}</div>
              </div>
            </aside>

            {/* Mobile Navigation Drawer */}
            {mobileMenuOpen && (
              <div
                className="fixed inset-0 top-16 z-30 bg-rose-950/25 backdrop-blur-[1px] md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              >
                <nav
                  aria-label="เมนูมือถือ"
                  className="w-64 h-full bg-white border-r border-rose-100 text-slate-700 p-4 space-y-1 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 pb-2 mb-2 border-b border-rose-100">
                    <div className="text-sm font-semibold text-slate-900">{currentUser.name}</div>
                    <div className="text-xs text-slate-500">{ROLE_LABELS[currentUser.role]}</div>
                  </div>
                  {navItems.map(({ id, label, Icon, badgeCount }) => {
                    const isActive = activeTab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setActiveTab(id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                          isActive
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>{label}</span>
                        </span>
                        {typeof badgeCount === 'number' && badgeCount > 0 && (
                          <span
                            className={`px-1.5 py-0.5 text-[11px] leading-none font-mono tabular-nums font-bold rounded shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            )}

            {/* Main Workspace Viewport */}
            <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-y-auto">
              <div className="max-w-7xl mx-auto space-y-6">
                {currentUser.role !== 'customer' &&
                  overdueForCurrentStaff.length > 0 &&
                  !overdueBannerDismissed && (
                    <div
                      role="alert"
                      className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <AlertTriangle
                          className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-amber-950">
                            แจ้งเตือนคำร้องเกิน 3 วัน: พบ {overdueForCurrentStaff.length} รายการที่ค้างดำเนินการ
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {overdueForCurrentStaff.slice(0, 4).map((req) => (
                              <button
                                key={req.id}
                                type="button"
                                onClick={() => setSelectedRequest(req)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-amber-100/70 border border-amber-200 rounded-lg text-xs text-slate-800 transition-colors"
                              >
                                <span className="font-mono font-semibold text-rose-700">
                                  {req.id}
                                </span>
                                <span className="text-amber-800 font-medium">
                                  · ค้าง {getRequestAgeDays(req)} วัน
                                </span>
                              </button>
                            ))}
                            {overdueForCurrentStaff.length > 4 && (
                              <span className="text-xs text-amber-800 font-medium px-1">
                                และอีก {overdueForCurrentStaff.length - 4} รายการ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveTab(getQueueTabForRole(currentUser.role as StaffRole))
                          }
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                        >
                          ไปหน้าจัดการคำร้อง
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverdueBannerDismissed(true)}
                          aria-label="ซ่อนแถบแจ้งเตือนคำร้องเกิน 3 วัน"
                          className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100/70 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}

                {currentUser.role === 'admin' && activeTab === 'dashboard' && (
                  <AdminDashboard
                    requests={requests}
                    users={users}
                    productsCount={products.length}
                    ordersCount={orders.length}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                    onSelectRequest={setSelectedRequest}
                  />
                )}

                {currentUser.role === 'admin' && activeTab === 'manage-requests' && (
                  <AdminRequests
                    requests={requests}
                    products={products}
                    orders={orders}
                    returnReasons={systemConfig.returnReasons}
                    warehouseZones={systemConfig.warehouseZones}
                    onApprove={handleApproveRequest}
                    onReject={handleRejectRequest}
                    onCompleteRefund={handleAdminCompleteRefund}
                    onAddRequest={handleAddAdminRequest}
                    onUpdateRequest={handleUpdateRequest}
                    onDeleteRequest={handleDeleteRequest}
                    onSelectRequest={setSelectedRequest}
                  />
                )}

                {currentUser.role === 'admin' && activeTab === 'products' && (
                  <AdminProducts
                    products={products}
                    onAddProduct={handleAddProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onAdjustStock={handleAdjustStock}
                    onDeleteProduct={handleDeleteProduct}
                    onOpenOutboundOrders={() => setActiveTab('outbound-orders')}
                  />
                )}

                {currentUser.role === 'admin' && activeTab === 'outbound-orders' && (
                  <AdminOrders
                    orders={orders}
                    products={products}
                    requests={requests}
                    onAddOrder={handleAddOrder}
                    onDeleteOrder={handleDeleteOrder}
                  />
                )}

                {currentUser.role === 'admin' && activeTab === 'user-management' && (
                  <AdminUsers
                    users={users}
                    currentRole={currentUser.role}
                    onUpdateUser={handleUpdateUser}
                  />
                )}

                {currentUser.role === 'admin' && activeTab === 'system-settings' && (
                  <AdminSettings
                    config={systemConfig}
                    onSaveConfig={handleSaveSystemConfig}
                    onResetConfig={handleResetSystemConfig}
                  />
                )}

                {currentUser.role === 'customer' &&
                  (activeTab === 'submit-request' || activeTab === 'track-request') && (
                    <CustomerPortal
                      activeTab={activeTab}
                      requests={requests}
                      products={products}
                      orders={orders}
                      returnReasons={systemConfig.returnReasons}
                      onSubmitRequest={handleCustomerSubmit}
                      onSwitchTab={(tab) => setActiveTab(tab)}
                    />
                  )}

                {currentUser.role === 'warehouse' && activeTab === 'warehouse-receive' && (
                  <WarehousePortal
                    requests={requests}
                    warehouseZones={systemConfig.warehouseZones}
                    onReceiveItem={handleWarehouseReceive}
                    onDispatchReplacement={handleWarehouseDispatchReplacement}
                    onSelectRequest={setSelectedRequest}
                  />
                )}

                {currentUser.role === 'inspector' && activeTab === 'inspector-check' && (
                  <InspectorPortal
                    requests={requests}
                    warehouseZones={systemConfig.warehouseZones}
                    onStartInspection={handleStartInspection}
                    onCompleteInspection={handleCompleteInspection}
                    onSelectRequest={setSelectedRequest}
                  />
                )}
              </div>
            </main>
          </div>

          <RequestDetailModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
          />
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
