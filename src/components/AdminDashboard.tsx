import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Eye,
  ReceiptText,
  SearchCheck,
  Truck,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatBaht,
  getRequestAgeDays,
  getTotalCost,
  isRequestOverdue,
  type ReturnRequest,
  type ReturnStatusIndex,
  type StaffUser,
} from '../types';
import { StatusLabel } from './StatusLabel';

interface AdminDashboardProps {
  requests: ReturnRequest[];
  users: StaffUser[];
  productsCount: number;
  ordersCount: number;
  onNavigateTab: (
    tab: 'manage-requests' | 'user-management' | 'products' | 'outbound-orders' | 'system-settings'
  ) => void;
  onSelectRequest: (req: ReturnRequest) => void;
}

interface StatusChartDatum {
  statusIndex: ReturnStatusIndex;
  name: string;
  value: number;
  color: string;
}

const STATUS_CHART_META: Record<
  ReturnStatusIndex,
  { label: string; color: string }
> = {
  0: { label: 'รออนุมัติคำขอ', color: '#F59E0B' },
  1: { label: 'อนุมัติแล้ว / รอรับเข้าคลัง', color: '#EC4899' },
  3: { label: 'ได้รับสินค้าแล้ว', color: '#8B5CF6' },
  4: { label: 'กำลังตรวจสอบสินค้า', color: '#E11D48' },
  5: { label: 'รอคลังจัดส่งสินค้าใหม่', color: '#6366F1' },
  7: { label: 'รอแอดมินโอนเงินคืน', color: '#FB7185' },
  6: { label: 'ปิดรายการแล้ว', color: '#10B981' },
  '-1': { label: 'ไม่อนุมัติคำขอ', color: '#94A3B8' },
};

const STATUS_DISPLAY_ORDER: ReturnStatusIndex[] = [0, 1, 3, 4, 5, 7, 6, -1];

type CostPeriodMode = 'all' | 'monthly' | 'yearly';

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

function extractRequestPeriod(req: ReturnRequest): {
  year: string;
  month: string;
  yearMonth: string;
} {
  for (const ev of req.timeline) {
    const match = ev.date.match(/^(\d{4})-(\d{2})/);
    if (match) {
      return {
        year: match[1],
        month: match[2],
        yearMonth: `${match[1]}-${match[2]}`,
      };
    }
  }
  const idMatch = req.id.match(/(\d{4})(\d{2})\d{2}/);
  if (idMatch) {
    return {
      year: idMatch[1],
      month: idMatch[2],
      yearMonth: `${idMatch[1]}-${idMatch[2]}`,
    };
  }
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return { year, month, yearMonth: `${year}-${month}` };
}

function formatThaiMonth(yearMonth: string, full = false): string {
  const [y, m] = yearMonth.split('-');
  const monthIdx = Math.max(0, Math.min(11, Number(m) - 1));
  const beYear = Number(y) + 543;
  const monthName = full ? THAI_MONTHS_FULL[monthIdx] : THAI_MONTHS_SHORT[monthIdx];
  return `${monthName} ${beYear}`;
}

function formatThaiYear(year: string): string {
  const beYear = Number(year) + 543;
  return `ปี ${beYear} (${year})`;
}

function isDamagedRequest(req: ReturnRequest): boolean {
  return (
    req.disposition === 'writeoff' ||
    req.disposition === 'repair' ||
    req.reason.includes('ชำรุด') ||
    req.reason.includes('เสียหาย')
  );
}

interface PeriodSummaryRow {
  key: string;
  label: string;
  requestCount: number;
  freight: number;
  inspection: number;
  repair: number;
  operationalTotal: number;
  damagedQty: number;
  damagedCases: number;
  damagedValue: number;
}

export function AdminDashboard({
  requests,
  users,
  productsCount,
  ordersCount,
  onNavigateTab,
  onSelectRequest,
}: AdminDashboardProps) {
  const [costPeriodMode, setCostPeriodMode] = useState<CostPeriodMode>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [showClosedCosts, setShowClosedCosts] = useState<boolean>(false);

  const totalRequests = requests.length;
  const pendingApproval = requests.filter((r) => r.statusIndex === 0).length;
  const inProgress = requests.filter((r) => r.statusIndex > 0 && r.statusIndex !== 6).length;
  const closedCount = requests.filter((r) => r.statusIndex === 6).length;
  const totalLogisticsCost = requests.reduce((sum, r) => sum + getTotalCost(r.cost), 0);

  const { availableMonths, availableYears } = useMemo(() => {
    const months = new Set<string>();
    const years = new Set<string>();
    for (const r of requests) {
      const p = extractRequestPeriod(r);
      months.add(p.yearMonth);
      years.add(p.year);
    }
    return {
      availableMonths: Array.from(months).sort((a, b) => b.localeCompare(a)),
      availableYears: Array.from(years).sort((a, b) => b.localeCompare(a)),
    };
  }, [requests]);

  const activeMonthFilter =
    selectedMonth !== 'all' && availableMonths.includes(selectedMonth) ? selectedMonth : 'all';
  const activeYearFilter =
    selectedYear !== 'all' && availableYears.includes(selectedYear) ? selectedYear : 'all';

  const costRequests = useMemo(() => {
    if (costPeriodMode === 'monthly' && activeMonthFilter !== 'all') {
      return requests.filter((r) => extractRequestPeriod(r).yearMonth === activeMonthFilter);
    }
    if (costPeriodMode === 'yearly' && activeYearFilter !== 'all') {
      return requests.filter((r) => extractRequestPeriod(r).year === activeYearFilter);
    }
    return requests;
  }, [requests, costPeriodMode, activeMonthFilter, activeYearFilter]);

  const periodBreakdown: PeriodSummaryRow[] = useMemo(() => {
    if (costPeriodMode === 'all') return [];
    const grouped = new Map<string, ReturnRequest[]>();
    for (const r of requests) {
      const p = extractRequestPeriod(r);
      const key = costPeriodMode === 'monthly' ? p.yearMonth : p.year;
      const list = grouped.get(key) ?? [];
      list.push(r);
      grouped.set(key, list);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, items]) => {
        const freight = items.reduce((s, r) => s + r.cost.freight, 0);
        const inspection = items.reduce((s, r) => s + r.cost.inspection, 0);
        const repair = items.reduce((s, r) => s + r.cost.repair, 0);
        const damaged = items.filter(isDamagedRequest);
        return {
          key,
          label: costPeriodMode === 'monthly' ? formatThaiMonth(key) : formatThaiYear(key),
          requestCount: items.length,
          freight,
          inspection,
          repair,
          operationalTotal: freight + inspection + repair,
          damagedQty: damaged.reduce((s, r) => s + r.qty, 0),
          damagedCases: damaged.length,
          damagedValue: damaged.reduce((s, r) => s + r.price, 0),
        };
      });
  }, [requests, costPeriodMode]);

  const totalFreight = costRequests.reduce((sum, r) => sum + r.cost.freight, 0);
  const totalInspection = costRequests.reduce((sum, r) => sum + r.cost.inspection, 0);
  const totalRepair = costRequests.reduce((sum, r) => sum + r.cost.repair, 0);
  const totalOperationalCost = totalFreight + totalInspection + totalRepair;

  const freightCount = costRequests.filter((r) => r.cost.freight > 0).length;
  const inspectionCount = costRequests.filter((r) => r.cost.inspection > 0).length;
  const repairCount = costRequests.filter(
    (r) => r.cost.repair > 0 || r.disposition === 'repair'
  ).length;

  const damagedRequests = costRequests.filter(isDamagedRequest);
  const damagedCaseCount = damagedRequests.length;
  const damagedQty = damagedRequests.reduce((sum, r) => sum + r.qty, 0);
  const damagedValue = damagedRequests.reduce((sum, r) => sum + r.price, 0);

  const closedCostRequests = costRequests.filter((r) => r.statusIndex === 6);

  const activePeriodLabel =
    costPeriodMode === 'monthly'
      ? activeMonthFilter === 'all'
        ? 'สรุปรายเดือน (ทุกเดือน)'
        : `เดือน ${formatThaiMonth(activeMonthFilter, true)}`
      : costPeriodMode === 'yearly'
        ? activeYearFilter === 'all'
          ? 'สรุปรายปี (ทุกปี)'
          : formatThaiYear(activeYearFilter)
        : 'ทั้งหมดตั้งแต่เปิดระบบ';

  const statusChartData: StatusChartDatum[] = STATUS_DISPLAY_ORDER.map((statusIndex) => {
    const count = requests.filter((r) => r.statusIndex === statusIndex).length;
    const meta = STATUS_CHART_META[statusIndex];
    return {
      statusIndex,
      name: meta.label,
      value: count,
      color: meta.color,
    };
  }).filter((item) => item.value > 0);

  const reasonCounts = requests.reduce<Record<string, number>>((acc, req) => {
    acc[req.reason] = (acc[req.reason] || 0) + 1;
    return acc;
  }, {});

  const reasonEntries = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ภาพรวมระบบคืนสินค้า</h1>
          <p className="text-sm text-slate-500 mt-1">
            บันทึกออเดอร์ลูกค้าก่อนจัดส่ง ติดตามคำร้องเกินกำหนด และสรุปต้นทุนการรับคืนทั้งหมด
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('outbound-orders')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shadow-sm"
          >
            <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
            <span>บันทึกออเดอร์ลูกค้า</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('manage-requests')}
            className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <span>จัดการคำร้องทั้งหมด</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Priority Top Panel: Customer Outbound Order Recording */}
      <div className="bg-gradient-to-r from-rose-50/90 via-pink-50/50 to-white border border-rose-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                บันทึกออเดอร์ลูกค้าก่อนส่งสินค้า (ORD-XXXXXX)
              </h2>
              <span className="text-[11px] font-mono tabular-nums font-semibold text-rose-700 bg-white border border-rose-200 px-2 py-0.5 rounded-md">
                บันทึกแล้ว {ordersCount} ออเดอร์
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              กรอกเลขออเดอร์ <span className="font-mono font-semibold text-slate-800">ORD-XXXXXX</span> ชื่อสินค้า และจำนวนก่อนจัดส่งของให้ลูกค้าทุกครั้ง เพื่อตัดสต๊อกอัตโนมัติและป้องกันสต๊อกคลาดเคลื่อน
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('outbound-orders')}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shadow-sm"
          >
            <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
            <span>บันทึกออเดอร์ส่งลูกค้าใหม่</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('products')}
            className="px-3.5 py-2.5 bg-white hover:bg-rose-50 text-slate-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            ตรวจสอบสต๊อกสินค้า ({productsCount})
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <div className="bg-white border border-rose-200/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">คำร้องทั้งหมด</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
              {totalRequests} <span className="text-sm font-sans font-normal text-slate-500">รายการ</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-rose-100/70">
            พนักงานในระบบ <span className="font-mono tabular-nums font-medium text-slate-700">{users.length}</span> ตำแหน่ง
          </div>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">รออนุมัติ / กำลังดำเนินการ</div>
            <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-2">
              {pendingApproval + inProgress} <span className="text-sm font-sans font-normal text-slate-500">รายการ</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-rose-100/70">
            รออนุมัติ <span className="font-mono tabular-nums font-medium text-slate-700">{pendingApproval}</span>
            <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
            คลังและตรวจสอบ <span className="font-mono tabular-nums font-medium text-slate-700">{inProgress}</span>
          </div>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">ตรวจสอบเสร็จสิ้น / ปิดเคส</div>
            <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-2">
              {closedCount} <span className="text-sm font-sans font-normal text-slate-500">รายการ</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-rose-100/70">
            อัตราปิดเคส{' '}
            <span className="font-mono tabular-nums font-medium text-slate-700">
              {totalRequests > 0 ? Math.round((closedCount / totalRequests) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">ต้นทุนและมูลค่าสินทรัพย์เสี่ยงรวม</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
              {formatBaht(totalLogisticsCost)}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-rose-100/70">
            รวมค่าขนส่ง ตรวจสอบ ซ่อมแซม และมูลค่าสินค้า
          </div>
        </div>
      </div>

      {/* Cost & Damaged Products Breakdown */}
      <div className="bg-white border border-rose-200/80 rounded-xl p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-rose-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                สรุปค่าใช้จ่ายและสินค้าที่เสียหาย
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                <span>{activePeriodLabel}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ยอดรวมค่าขนส่ง ค่าตรวจสอบ ค่าซ่อมแซม และจำนวนสินค้าที่เสียหาย ({costRequests.length} คำร้อง)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1 p-1 bg-rose-100/70 rounded-lg">
              {(
                [
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'monthly', label: 'รายเดือน' },
                  { id: 'yearly', label: 'รายปี' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCostPeriodMode(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    costPeriodMode === tab.id
                      ? 'bg-white text-rose-700 shadow-sm'
                      : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {costPeriodMode === 'monthly' && (
              <select
                value={activeMonthFilter}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="เลือกเดือนที่ต้องการสรุปค่าใช้จ่าย"
                className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">ทุกเดือน ({availableMonths.length} เดือน)</option>
                {availableMonths.map((ym) => (
                  <option key={ym} value={ym}>
                    {formatThaiMonth(ym, true)}
                  </option>
                ))}
              </select>
            )}

            {costPeriodMode === 'yearly' && (
              <select
                value={activeYearFilter}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="เลือกปีที่ต้องการสรุปค่าใช้จ่าย"
                className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">ทุกปี ({availableYears.length} ปี)</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {formatThaiYear(yr)}
                  </option>
                ))}
              </select>
            )}

            <div className="text-xs text-slate-600 pl-1">
              รวมค่าดำเนินการ{' '}
              <span className="font-mono tabular-nums font-bold text-rose-700 text-sm ml-1">
                {formatBaht(totalOperationalCost)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-rose-100 rounded-xl bg-rose-50/25 overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col justify-between border-b sm:border-r lg:border-b-0 border-rose-100">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600">รวมค่าขนส่ง</span>
              <Truck className="w-4 h-4 text-rose-500 shrink-0" aria-hidden="true" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-2.5">
              {formatBaht(totalFreight)}
            </div>
            <div className="text-xs text-slate-500 mt-1.5">
              คำร้องที่มีค่าขนส่ง{' '}
              <span className="font-mono tabular-nums font-medium text-slate-700">
                {freightCount}
              </span>{' '}
              รายการ
            </div>
          </div>

          <div className="p-4 sm:p-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-rose-100">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600">รวมค่าตรวจสอบ</span>
              <SearchCheck className="w-4 h-4 text-violet-600 shrink-0" aria-hidden="true" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-2.5">
              {formatBaht(totalInspection)}
            </div>
            <div className="text-xs text-slate-500 mt-1.5">
              คำร้องที่มีค่าตรวจสอบ{' '}
              <span className="font-mono tabular-nums font-medium text-slate-700">
                {inspectionCount}
              </span>{' '}
              รายการ
            </div>
          </div>

          <div className="p-4 sm:p-5 flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-rose-100">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600">รวมค่าซ่อมแซม</span>
              <Wrench className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-2.5">
              {formatBaht(totalRepair)}
            </div>
            <div className="text-xs text-slate-500 mt-1.5">
              รายการส่งซ่อม/มีค่าซ่อม{' '}
              <span className="font-mono tabular-nums font-medium text-slate-700">
                {repairCount}
              </span>{' '}
              รายการ
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-rose-50/70 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-rose-800">สินค้าที่เสียหาย</span>
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            </div>
            <div className="text-xl font-bold text-rose-700 font-mono tabular-nums mt-2.5">
              {damagedQty}{' '}
              <span className="text-sm font-sans font-normal text-slate-600">
                ชิ้น ({damagedCaseCount} รายการ)
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-1.5">
              มูลค่าสินค้าเสียหาย{' '}
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatBaht(damagedValue)}
              </span>
            </div>
          </div>
        </div>

        {costPeriodMode !== 'all' && (
          <div className="border-t border-rose-100 pt-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-700">
                {costPeriodMode === 'monthly'
                  ? 'เปรียบเทียบค่าใช้จ่ายและสินค้าเสียหายรายเดือน'
                  : 'เปรียบเทียบค่าใช้จ่ายและสินค้าเสียหายรายปี'}
              </h3>
              <span className="text-[11px] text-slate-500">
                คลิกที่แถวในตารางเพื่อดูเฉพาะช่วงเวลานั้น
              </span>
            </div>

            {periodBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">ยังไม่มีข้อมูลสำหรับช่วงเวลานี้</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-5 h-56 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={periodBreakdown}
                      margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#FCE7F3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        axisLine={{ stroke: '#FBCFE8' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `฿${v.toLocaleString('th-TH')}`}
                      />
                      <Tooltip
                        formatter={(value: unknown, name: unknown) => [
                          formatBaht(Number(value) || 0),
                          String(name),
                        ]}
                        contentStyle={{
                          borderRadius: '0.5rem',
                          borderColor: '#FECDD3',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="freight" name="ค่าขนส่ง" fill="#E11D48" radius={[4, 4, 0, 0]} />
                      <Bar
                        dataKey="inspection"
                        name="ค่าตรวจสอบ"
                        fill="#8B5CF6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar dataKey="repair" name="ค่าซ่อมแซม" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="lg:col-span-7 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-rose-100 text-slate-500 font-semibold">
                        <th className="py-2 pr-3 whitespace-nowrap">
                          {costPeriodMode === 'monthly' ? 'เดือน' : 'ปี'}
                        </th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">คำร้อง</th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">ค่าขนส่ง</th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">ค่าตรวจสอบ</th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">ค่าซ่อมแซม</th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">สินค้าเสียหาย</th>
                        <th className="py-2 pl-2 text-right whitespace-nowrap">รวมดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100/70">
                      {[...periodBreakdown].reverse().map((row) => {
                        const isSelected =
                          (costPeriodMode === 'monthly' && activeMonthFilter === row.key) ||
                          (costPeriodMode === 'yearly' && activeYearFilter === row.key);
                        return (
                          <tr
                            key={row.key}
                            onClick={() => {
                              if (costPeriodMode === 'monthly') {
                                setSelectedMonth((prev) => (prev === row.key ? 'all' : row.key));
                              } else if (costPeriodMode === 'yearly') {
                                setSelectedYear((prev) => (prev === row.key ? 'all' : row.key));
                              }
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-rose-100/70 font-semibold' : 'hover:bg-rose-50/50'
                            }`}
                          >
                            <td className="py-2.5 pr-3 text-slate-900 whitespace-nowrap">
                              {row.label}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {row.requestCount}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                              {formatBaht(row.freight)}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                              {formatBaht(row.inspection)}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                              {formatBaht(row.repair)}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono tabular-nums text-rose-700 whitespace-nowrap">
                              {row.damagedQty} ชิ้น ({formatBaht(row.damagedValue)})
                            </td>
                            <td className="py-2.5 pl-2 text-right font-mono tabular-nums font-bold text-rose-700 whitespace-nowrap">
                              {formatBaht(row.operationalTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Closed Requests Expense Breakdown Toggle & Table */}
        <div className="border-t border-rose-100 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs text-slate-600">
              ค่าใช้จ่ายรายคำร้องที่ปิดรายการแล้วใน{activePeriodLabel}{' '}
              <span className="font-mono tabular-nums font-semibold text-emerald-700">
                ({closedCostRequests.length} รายการ)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowClosedCosts((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors w-fit"
            >
              <ReceiptText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {showClosedCosts
                  ? 'ซ่อนค่าใช้จ่ายคำร้องที่ปิดแล้ว'
                  : `กดดูค่าใช้จ่ายคำร้องที่ปิดแล้ว (${closedCostRequests.length})`}
              </span>
              {showClosedCosts ? (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          {showClosedCosts && (
            <div className="mt-4">
              {closedCostRequests.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 bg-rose-50/30 rounded-lg border border-rose-100">
                  ยังไม่มีคำร้องที่ปิดรายการแล้วในช่วงเวลาที่เลือก
                </div>
              ) : (
                <div className="overflow-x-auto border border-rose-100 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-rose-50/60 border-b border-rose-100 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3 whitespace-nowrap">เลขที่คำร้อง / วันที่ปิด</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">สินค้า / ลูกค้า</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">ค่าขนส่ง</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">ค่าตรวจสอบ</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">ค่าซ่อมแซม</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">สินทรัพย์เสี่ยง</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">โอนคืนลูกค้า</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">ต้นทุนรวม</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">ดูรายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100/70">
                      {closedCostRequests.map((req) => {
                        const closedDate = req.timeline[req.timeline.length - 1]?.date ?? '-';
                        return (
                          <tr
                            key={req.id}
                            onClick={() => onSelectRequest(req)}
                            className="hover:bg-rose-50/50 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-mono tabular-nums font-semibold text-rose-700">
                                {req.id}
                              </div>
                              <div className="font-mono tabular-nums text-[11px] text-slate-500 mt-0.5">
                                {closedDate}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 min-w-[180px]">
                              <div className="font-medium text-slate-900 truncate max-w-[220px]">
                                {req.productName}{' '}
                                <span className="font-mono text-slate-500">× {req.qty}</span>
                              </div>
                              <div className="text-[11px] text-slate-500">{req.customerName}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                              {formatBaht(req.cost.freight)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                              {formatBaht(req.cost.inspection)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                              {formatBaht(req.cost.repair)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                              {formatBaht(req.cost.assetLoss)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                              {typeof req.refundAmount === 'number'
                                ? formatBaht(req.refundAmount)
                                : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-rose-700 whitespace-nowrap">
                              {formatBaht(getTotalCost(req.cost))}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectRequest(req);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-800 px-2 py-1 rounded hover:bg-rose-100/60 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>ดูใบคำร้อง</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Pie Chart & Return Reason Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Recharts Pie Chart: Request Status Summary */}
        <div className="bg-white border border-rose-200/80 rounded-xl p-6 lg:col-span-7 min-w-0 flex flex-col justify-between">
          <div className="flex items-baseline justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">สรุปสถานะคำร้องทั้งหมด</h2>
              <p className="text-xs text-slate-500 mt-0.5">สัดส่วนคำร้องแยกตามขั้นตอนการดำเนินงานปัจจุบัน</p>
            </div>
            <span className="text-xs font-mono tabular-nums text-rose-700 font-semibold shrink-0">
              รวม {totalRequests} รายการ
            </span>
          </div>

          {totalRequests === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              ยังไม่มีคำร้องขอคืนสินค้าสำหรับแสดงกราฟสถานะ
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              <div className="sm:col-span-6 h-60 relative min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={statusChartData.length > 1 ? 3 : 0}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    >
                      {statusChartData.map((entry) => (
                        <Cell key={entry.statusIndex} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const item = payload[0].payload as StatusChartDatum;
                        const pct = totalRequests > 0 ? Math.round((item.value / totalRequests) * 100) : 0;
                        return (
                          <div className="bg-white border border-rose-200 rounded-lg px-3 py-2 shadow-md text-xs">
                            <div className="flex items-center gap-2 font-semibold text-slate-900">
                              <span
                                className="w-2.5 h-2.5 rounded-sm shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span>{item.name}</span>
                            </div>
                            <div className="mt-1 font-mono tabular-nums text-slate-600">
                              {item.value} รายการ ({pct}%)
                            </div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {totalRequests}
                  </span>
                  <span className="text-[11px] text-slate-500">คำร้องทั้งหมด</span>
                </div>
              </div>

              <div className="sm:col-span-6 space-y-2.5">
                {STATUS_DISPLAY_ORDER.map((statusIndex) => {
                  const meta = STATUS_CHART_META[statusIndex];
                  const count = requests.filter((r) => r.statusIndex === statusIndex).length;
                  const pct = totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0;
                  return (
                    <div
                      key={statusIndex}
                      className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-rose-100/70 last:border-b-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: meta.color }}
                          aria-hidden="true"
                        />
                        <span className="text-slate-700 truncate">{meta.label}</span>
                      </div>
                      <div className="font-mono tabular-nums text-slate-900 font-medium shrink-0">
                        {count}{' '}
                        <span className="text-slate-400 font-normal">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Return Reason Breakdown & Staff Quick Link */}
        <div className="bg-white border border-rose-200/80 rounded-xl p-6 lg:col-span-5 flex flex-col justify-between gap-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-4">สัดส่วนสาเหตุการคืนสินค้า</h2>
            {reasonEntries.length === 0 ? (
              <p className="text-sm text-slate-500">ไม่มีข้อมูลสาเหตุการคืน</p>
            ) : (
              <div className="space-y-4">
                {reasonEntries.map(([reason, count]) => {
                  const pct = Math.round((count / totalRequests) * 100);
                  return (
                    <div key={reason}>
                      <div className="flex items-baseline justify-between text-xs mb-1.5 gap-2">
                        <span className="text-slate-700 font-medium truncate">{reason}</span>
                        <span className="font-mono tabular-nums text-slate-500 shrink-0">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-rose-100/70 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-rose-100 pt-4 space-y-2">
            <div className="text-xs text-slate-500">การจัดการระบบและผู้ใช้งาน</div>
            <button
              type="button"
              onClick={() => onNavigateTab('outbound-orders')}
              className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              บันทึกออเดอร์ส่งลูกค้า ({ordersCount} ออเดอร์)
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('products')}
              className="w-full py-2 px-3 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg transition-colors"
            >
              จัดการสินค้าและสต๊อก ({productsCount} รายการ)
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('user-management')}
              className="w-full py-2 px-3 bg-white hover:bg-rose-50 border border-rose-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              จัดการพนักงาน ({users.length} ตำแหน่ง)
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('system-settings')}
              className="w-full py-2 px-3 bg-white hover:bg-rose-50 border border-rose-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              ตั้งค่าและปรับปรุงระบบ
            </button>
          </div>
        </div>
      </div>

      {/* Recent Return Requests Table */}
      <div className="bg-white border border-rose-200/80 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">รายการคำร้องล่าสุด</h2>
          <button
            type="button"
            onClick={() => onNavigateTab('manage-requests')}
            className="text-xs font-medium text-rose-600 hover:text-rose-700 whitespace-nowrap"
          >
            ดูทั้งหมด
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            ยังไม่มีคำร้องขอคืนสินค้าในระบบ
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-rose-100 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4 whitespace-nowrap">เลขที่คำร้อง</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">สินค้า / ลูกค้า</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">สาเหตุการคืน</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">สถานะ</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">ต้นทุนรวม</th>
                  <th className="py-2.5 pl-3 text-right whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100/80 text-sm">
                {requests.slice(0, 6).map((req) => {
                  const overdue = isRequestOverdue(req);
                  const ageDays = getRequestAgeDays(req);
                  return (
                  <tr key={req.id} className="hover:bg-rose-50/40 transition-colors">
                    <td className="py-3 pr-4 font-mono tabular-nums text-xs font-medium text-rose-700 whitespace-nowrap">
                      <div>{req.id}</div>
                      {overdue && (
                        <div className="text-[11px] font-sans font-semibold text-amber-700 mt-0.5">
                          เกิน 3 วัน (ค้าง {ageDays} วัน)
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 min-w-[200px]">
                      <div className="font-medium text-slate-900 truncate max-w-[260px]">{req.productName}</div>
                      <div className="text-xs text-slate-500">{req.customerName}</div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                      {req.reason}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusLabel statusIndex={req.statusIndex} statusText={req.statusText} />
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectRequest(req)}
                        className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-900 hover:text-rose-700 underline decoration-rose-200 underline-offset-4 transition-colors"
                      >
                        {formatBaht(getTotalCost(req.cost))}
                      </button>
                    </td>
                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectRequest(req)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>รายละเอียด</span>
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
