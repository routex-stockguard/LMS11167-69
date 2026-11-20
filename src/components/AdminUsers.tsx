import { useState } from 'react';
import { Check, PackageCheck, Pencil, SearchCheck, ShieldCheck, X } from 'lucide-react';
import {
  ROLE_LABELS,
  STAFF_ROLE_DESCRIPTIONS,
  STAFF_ROLE_ORDER,
  type StaffRole,
  type StaffUser,
  type UserRole,
} from '../types';

interface AdminUsersProps {
  users: StaffUser[];
  currentRole?: UserRole;
  onUpdateUser: (role: StaffRole, name: string) => void;
}

const ROLE_ICONS: Record<StaffRole, typeof ShieldCheck> = {
  admin: ShieldCheck,
  warehouse: PackageCheck,
  inspector: SearchCheck,
};

export function AdminUsers({ users, currentRole, onUpdateUser }: AdminUsersProps) {
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null);
  const [editName, setEditName] = useState('');

  const orderedUsers: StaffUser[] = STAFF_ROLE_ORDER.map((role) => {
    const found = users.find((u) => u.role === role);
    return (
      found ?? {
        role,
        name: ROLE_LABELS[role],
        level: role === 'admin' ? 1 : 2,
      }
    );
  });

  const startEdit = (user: StaffUser) => {
    setEditingRole(user.role);
    setEditName(user.name);
  };

  const saveEdit = (role: StaffRole) => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;
    onUpdateUser(role, trimmedName);
    setEditingRole(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">จัดการพนักงาน (3 ตำแหน่ง)</h1>
        <p className="text-sm text-slate-500 mt-1">
          ระบบกำหนดบทบาทพนักงานไว้ 3 ตำแหน่งหลักโดยไม่ต้องใช้รหัสพนักงาน สามารถแก้ไขชื่อผู้รับผิดชอบแต่ละตำแหน่งได้ทันที
        </p>
      </div>

      {/* 3-Position Overview Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orderedUsers.map((u) => {
          const Icon = ROLE_ICONS[u.role];
          const isCurrent = currentRole === u.role;
          return (
            <div
              key={u.role}
              className="bg-white border border-rose-200/80 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-500">ตำแหน่ง</div>
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {ROLE_LABELS[u.role]}
                    </div>
                  </div>
                </div>
                {isCurrent && (
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                    กำลังใช้งาน
                  </span>
                )}
              </div>

              <div className="border-t border-rose-100 pt-3 flex items-baseline justify-between gap-2">
                <span className="text-xs text-slate-500">ผู้รับผิดชอบ</span>
                <span className="text-sm font-semibold text-slate-900 truncate">{u.name}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3 Fixed Staff Positions Table */}
      <div className="bg-white border border-rose-200/80 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">รายชื่อผู้รับผิดชอบตามตำแหน่งงาน</h2>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {orderedUsers.length} ตำแหน่ง
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-rose-100 bg-rose-50/50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 whitespace-nowrap">ตำแหน่ง</th>
                <th className="py-3 px-4 whitespace-nowrap">หน้าที่รับผิดชอบ</th>
                <th className="py-3 px-4 whitespace-nowrap">ชื่อผู้รับผิดชอบ</th>
                <th className="py-3 px-4 whitespace-nowrap">ระดับสิทธิ์</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100/80 text-sm">
              {orderedUsers.map((u) => {
                const isEditing = editingRole === u.role;

                return (
                  <tr key={u.role} className="hover:bg-rose-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {ROLE_LABELS[u.role]}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 min-w-[240px]">
                      {STAFF_ROLE_DESCRIPTIONS[u.role]}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveEdit(u.role);
                            } else if (e.key === 'Escape') {
                              setEditingRole(null);
                            }
                          }}
                          autoFocus
                          aria-label={`แก้ไขชื่อผู้รับผิดชอบตำแหน่ง ${ROLE_LABELS[u.role]}`}
                          className="px-2.5 py-1 border border-rose-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      ) : (
                        u.name
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {u.role === 'admin' ? 'ผู้ดูแลระบบ (สิทธิ์เต็ม)' : 'พนักงานปฏิบัติการ'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => saveEdit(u.role)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md"
                          >
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>บันทึก</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRole(null)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>ยกเลิก</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(u)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:text-rose-900 px-2.5 py-1 rounded hover:bg-rose-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>แก้ไขชื่อ</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
