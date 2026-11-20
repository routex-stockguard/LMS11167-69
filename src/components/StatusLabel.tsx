import { Banknote, Clock, CheckCircle2, PackageCheck, SearchCheck, ShieldCheck, Truck, XCircle } from 'lucide-react';
import type { ReturnStatusIndex } from '../types';

interface StatusLabelProps {
  statusIndex: ReturnStatusIndex;
  statusText: string;
}

export function StatusLabel({ statusIndex, statusText }: StatusLabelProps) {
  const config = (() => {
    switch (statusIndex) {
      case -1:
        return { Icon: XCircle, color: 'text-rose-700' };
      case 0:
        return { Icon: Clock, color: 'text-amber-700' };
      case 1:
        return { Icon: CheckCircle2, color: 'text-pink-700' };
      case 3:
        return { Icon: PackageCheck, color: 'text-indigo-700' };
      case 4:
        return { Icon: SearchCheck, color: 'text-amber-700' };
      case 5:
        return { Icon: Truck, color: 'text-purple-700' };
      case 7:
        return { Icon: Banknote, color: 'text-rose-600' };
      case 6:
        return { Icon: ShieldCheck, color: 'text-emerald-700' };
    }
  })();

  const { Icon, color } = config;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{statusText}</span>
    </span>
  );
}
