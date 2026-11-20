import {
  ArrowRight,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  Search,
  SearchCheck,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  ROLE_LABELS,
  STAFF_ROLE_DESCRIPTIONS,
  STAFF_ROLE_ORDER,
  type CurrentUser,
  type StaffRole,
  type StaffUser,
  type SystemConfig,
} from '../types';

interface LoginPortalProps {
  users: StaffUser[];
  config: SystemConfig;
  onLoginStaff: (user: CurrentUser) => void;
  onEnterCustomerPortal: (initialTab: 'submit-request' | 'track-request') => void;
}

const ROLE_ICONS: Record<StaffRole, typeof ShieldCheck> = {
  admin: ShieldCheck,
  warehouse: PackageCheck,
  inspector: SearchCheck,
};

export function LoginPortal({
  users,
  config,
  onLoginStaff,
  onEnterCustomerPortal,
}: LoginPortalProps) {
  const orderedStaff: StaffUser[] = STAFF_ROLE_ORDER.map((role) => {
    const found = users.find((u) => u.role === role);
    return (
      found ?? {
        role,
        name: ROLE_LABELS[role],
        level: role === 'admin' ? 1 : 2,
      }
    );
  });

  const handleSelectRole = (staff: StaffUser) => {
    onLoginStaff({
      role: staff.role,
      name: staff.name,
      level: staff.level,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9FB] via-white to-rose-50/80 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl bg-white border border-rose-200/80 rounded-2xl shadow-[0_24px_60px_-28px_rgba(225,29,72,0.18)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Left Brand & Process Column */}
        <div className="lg:col-span-5 bg-gradient-to-b from-rose-50/90 via-pink-50/45 to-white p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-rose-100 flex flex-col justify-between gap-8">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-mono font-semibold text-rose-600 tracking-wide">
                {config.systemCode}
              </p>
              <div className="text-2xl font-display font-bold tracking-tight text-slate-900">
                {config.brandName}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 leading-snug text-balance">
                {config.systemTitle}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                ศูนย์กลางการยื่นคำร้องขอคืนสินค้า ตรวจรับเข้าคลัง ตรวจสอบสภาพ และติดตามสถานะอย่างเป็นระบบ
              </p>
            </div>
          </div>

          <div className="border-t border-rose-200/70 pt-6 space-y-4">
            <p className="text-xs font-semibold text-slate-500">ขั้นตอนการบริการคืนสินค้า</p>
            <ol className="space-y-3.5 text-xs">
              <li className="flex items-start gap-3">
                <span className="font-mono font-bold text-rose-600 shrink-0 pt-0.5">01.</span>
                <div>
                  <div className="font-semibold text-slate-900">ยื่นคำร้องและแนบหลักฐาน</div>
                  <div className="text-slate-500 mt-0.5">
                    ระบุข้อมูลคำสั่งซื้อ แนบภาพถ่าย วิดีโอ และเลือกจัดส่งใหม่หรือขอรับเงินคืน
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono font-bold text-rose-600 shrink-0 pt-0.5">02.</span>
                <div>
                  <div className="font-semibold text-slate-900">รับสินค้าเข้าคลังและตรวจสอบสภาพ</div>
                  <div className="text-slate-500 mt-0.5">
                    คลังสินค้าจัดเก็บและเจ้าหน้าที่ประเมินสภาพพร้อมกำหนดโซนจัดเก็บอย่างแม่นยำ
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono font-bold text-rose-600 shrink-0 pt-0.5">03.</span>
                <div>
                  <div className="font-semibold text-slate-900">จัดส่งสินค้าใหม่หรือโอนเงินคืน</div>
                  <div className="text-slate-500 mt-0.5">
                    ดำเนินการตามความประสงค์ลูกค้าพร้อมหลักฐานสลิปหรือเลขพัสดุปิดรายการ
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Right Action Column */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-white">
          {/* 1. Customer Section */}
          <div className="p-8 sm:p-10 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-slate-900">
                <UserCheck className="w-4 h-4 text-rose-600" aria-hidden="true" />
                <h2 className="text-lg font-bold">สำหรับลูกค้า</h2>
              </div>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                ยื่นคำร้องขอคืนสินค้าพร้อมแนบหลักฐาน หรือติดตามความคืบหน้าด้วยเลขที่คำร้องของคุณ
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onEnterCustomerPortal('submit-request')}
                className="py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
              >
                <span>เข้าสู่ระบบลูกค้า</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onEnterCustomerPortal('track-request')}
                className="py-3 px-4 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span>ติดตามสถานะคำร้อง</span>
              </button>
            </div>

            {/* Contact Staff directly beneath Customer Portal CTA */}
            <div className="border-t border-rose-100 pt-5 space-y-3">
              <p className="text-xs font-semibold text-slate-700">ติดต่อเจ้าหน้าที่</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-rose-50/50 border border-rose-100 px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MessageCircle className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
                    <span>Line</span>
                  </div>
                  <div className="font-mono font-semibold text-slate-900 mt-1 truncate">
                    {config.contactLine}
                  </div>
                </div>

                <div className="rounded-lg bg-rose-50/50 border border-rose-100 px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
                    <span>เบอร์ติดต่อ</span>
                  </div>
                  <a
                    href={`tel:${config.contactPhone}`}
                    className="block font-mono font-semibold text-rose-700 hover:underline mt-1 truncate"
                  >
                    {config.contactPhone}
                  </a>
                </div>

                <div className="rounded-lg bg-rose-50/50 border border-rose-100 px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
                    <span>อีเมลติดต่อ</span>
                  </div>
                  <a
                    href={`mailto:${config.contactEmail}`}
                    className="block font-mono font-semibold text-rose-700 hover:underline mt-1 truncate"
                  >
                    {config.contactEmail}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Staff Section: Direct Role Entry (3 Positions, No Employee ID) */}
          <div className="p-8 sm:p-10 bg-rose-50/45 border-t border-rose-100 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900">
                <Users className="w-4 h-4 text-rose-600" aria-hidden="true" />
                <h2 className="text-base font-semibold">สำหรับพนักงาน (เลือกตำแหน่งเข้าสู่ระบบ)</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                เลือกหน้าที่ที่ต้องการเข้าใช้งานได้ทันทีโดยไม่ต้องกรอกรหัสพนักงาน
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {orderedStaff.map((staff) => {
                const Icon = ROLE_ICONS[staff.role];
                return (
                  <button
                    key={staff.role}
                    type="button"
                    onClick={() => handleSelectRole(staff)}
                    className="group w-full text-left px-4 py-3 bg-white hover:bg-rose-50/80 border border-rose-200/80 hover:border-rose-300 rounded-xl transition-all flex items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold text-slate-900">
                            {ROLE_LABELS[staff.role]}
                          </span>
                          <span className="text-xs font-medium text-rose-700">
                            · {staff.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {STAFF_ROLE_DESCRIPTIONS[staff.role]}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 group-hover:text-rose-700 whitespace-nowrap shrink-0">
                      <span>เข้าหน้าที่</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
