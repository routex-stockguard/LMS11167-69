import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, CheckCheck, ChevronRight, Clock } from 'lucide-react';
import {
  formatBaht,
  getRequestAgeDays,
  isRequestOverdue,
  type ReturnRequest,
  type StaffNotification,
  type StaffRole,
} from '../types';

interface StaffNotificationBellProps {
  role: StaffRole;
  requests: ReturnRequest[];
  notifications: StaffNotification[];
  onOpenRequest: (request: ReturnRequest) => void;
  onNavigateQueue: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: (role: StaffRole) => void;
}

export interface PendingStaffTask {
  request: ReturnRequest;
  taskLabel: string;
  badgeClass: string;
}

export function getPendingTasksForRole(
  role: StaffRole,
  requests: ReturnRequest[]
): PendingStaffTask[] {
  if (role === 'admin') {
    return requests
      .filter((r) => r.statusIndex === 0 || r.statusIndex === 7)
      .map((r) =>
        r.statusIndex === 0
          ? {
              request: r,
              taskLabel: 'รออนุมัติคำขอคืน',
              badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
            }
          : {
              request: r,
              taskLabel: 'รอโอนเงินคืนลูกค้า',
              badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
            }
      );
  }

  if (role === 'warehouse') {
    return requests
      .filter((r) => r.statusIndex === 1 || r.statusIndex === 5)
      .map((r) =>
        r.statusIndex === 1
          ? {
              request: r,
              taskLabel: 'รอรับสินค้าเข้าคลัง',
              badgeClass: 'bg-pink-50 text-pink-800 border-pink-200',
            }
          : {
              request: r,
              taskLabel: 'รอจัดส่งสินค้าใหม่',
              badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
            }
      );
  }

  return requests
    .filter((r) => r.statusIndex === 3 || r.statusIndex === 4)
    .map((r) =>
      r.statusIndex === 3
        ? {
            request: r,
            taskLabel: 'รอเริ่มตรวจสอบสภาพ',
            badgeClass: 'bg-violet-50 text-violet-800 border-violet-200',
          }
        : {
            request: r,
            taskLabel: 'กำลังตรวจ / รอบันทึกผล',
            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
          }
    );
}

export function getOverdueRequestsForRole(
  role: StaffRole,
  requests: ReturnRequest[]
): ReturnRequest[] {
  if (role === 'admin') {
    return requests.filter((r) => isRequestOverdue(r));
  }
  return getPendingTasksForRole(role, requests)
    .map((t) => t.request)
    .filter((r) => isRequestOverdue(r));
}

export function StaffNotificationBell({
  role,
  requests,
  notifications,
  onOpenRequest,
  onNavigateQueue,
  onMarkRead,
  onMarkAllRead,
}: StaffNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const pendingTasks = getPendingTasksForRole(role, requests);
  const overdueRequests = getOverdueRequestsForRole(role, requests);
  const roleNotifications = notifications.filter((n) => n.targetRole === role);
  const unreadNotifications = roleNotifications.filter((n) => !n.read);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const badgeCount = Math.max(pendingTasks.length, unreadNotifications.length, overdueRequests.length);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`แจ้งเตือนงานพนักงาน (${badgeCount} รายการ)`}
        aria-expanded={open}
        className={`relative inline-flex items-center justify-center p-2 rounded-lg border transition-colors ${
          open
            ? 'bg-rose-50 border-rose-300 text-rose-700'
            : overdueRequests.length > 0
              ? 'bg-amber-50/70 border-amber-300 text-amber-800 hover:bg-amber-100/70'
              : 'bg-white border-rose-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
        }`}
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {badgeCount > 0 && (
          <span
            className={`ml-1.5 px-1.5 py-0.5 text-[11px] leading-none font-mono tabular-nums font-bold text-white rounded ${
              overdueRequests.length > 0 ? 'bg-amber-600' : 'bg-rose-600'
            }`}
          >
            {badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-rose-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">
                แจ้งเตือนงานของคุณ
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                งานรอดำเนินการ {pendingTasks.length} รายการ
                {overdueRequests.length > 0 && ` · เกิน 3 วัน ${overdueRequests.length}`}
                {unreadNotifications.length > 0 && ` · ใหม่ ${unreadNotifications.length}`}
              </p>
            </div>
            {unreadNotifications.length > 0 && (
              <button
                type="button"
                onClick={() => onMarkAllRead(role)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 hover:text-rose-800 px-2 py-1 rounded hover:bg-rose-100/70 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>อ่านแล้ว</span>
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-rose-100/80">
            {overdueRequests.length > 0 && (
              <div className="p-3 bg-amber-50/80 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                  <span>คำร้องค้างดำเนินการเกิน 3 วัน ({overdueRequests.length})</span>
                </div>
                {overdueRequests.slice(0, 5).map((req) => {
                  const ageDays = getRequestAgeDays(req);
                  return (
                    <button
                      key={`overdue-${req.id}`}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onOpenRequest(req);
                      }}
                      className="w-full text-left p-2.5 bg-white hover:bg-amber-50/70 border border-amber-200 rounded-lg transition-colors flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono tabular-nums text-[11px] font-semibold text-rose-700">
                            {req.id}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                            เกิน 3 วัน (ค้าง {ageDays} วัน)
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-900 truncate mt-1">
                          {req.productName} · {req.statusText}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-500 shrink-0 mt-1" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}

            {unreadNotifications.length > 0 && (
              <div className="p-3 bg-rose-50/40 space-y-2">
                <div className="text-[11px] font-semibold text-rose-700">
                  งานใหม่ที่เพิ่งส่งต่อถึงคุณ ({unreadNotifications.length})
                </div>
                {unreadNotifications.slice(0, 5).map((item) => {
                  const targetReq = requests.find((r) => r.id === item.requestId);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onMarkRead(item.id);
                        setOpen(false);
                        if (targetReq) {
                          onOpenRequest(targetReq);
                        } else {
                          onNavigateQueue();
                        }
                      }}
                      className="w-full text-left p-2.5 bg-white hover:bg-rose-50/70 border border-rose-200 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-rose-700">{item.title}</span>
                        <span className="text-[10px] font-mono tabular-nums text-slate-400">
                          {item.createdAt}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{item.message}</p>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="p-3 space-y-2">
              <div className="text-[11px] font-semibold text-slate-500">
                คิวงานที่รอดำเนินการ ({pendingTasks.length})
              </div>

              {pendingTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  ไม่มีงานค้างในคิวของคุณขณะนี้
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pendingTasks.map(({ request, taskLabel, badgeClass }) => {
                    const latestDate =
                      request.timeline[request.timeline.length - 1]?.date ?? '';
                    const overdue = isRequestOverdue(request);
                    const ageDays = getRequestAgeDays(request);
                    return (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onOpenRequest(request);
                        }}
                        className="w-full text-left p-2.5 rounded-lg border border-rose-100 hover:border-rose-300 hover:bg-rose-50/40 transition-colors flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badgeClass}`}
                            >
                              {taskLabel}
                            </span>
                            {overdue && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                เกิน 3 วัน ({ageDays} วัน)
                              </span>
                            )}
                            <span className="font-mono tabular-nums text-[11px] font-semibold text-rose-700">
                              {request.id}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-slate-900 truncate">
                            {request.productName}{' '}
                            <span className="font-mono text-slate-500">
                              × {request.qty} ({formatBaht(request.price)})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="truncate">{request.customerName}</span>
                            {latestDate && (
                              <span className="inline-flex items-center gap-0.5 font-mono shrink-0">
                                <Clock className="w-3 h-3" aria-hidden="true" />
                                {latestDate}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight
                          className="w-4 h-4 text-rose-400 shrink-0 mt-1"
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-3 py-2.5 bg-rose-50/40 border-t border-rose-100 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNavigateQueue();
              }}
              className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              ไปที่หน้าจัดการงานทั้งหมด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
