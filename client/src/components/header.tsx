import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { RegisterSession } from "@shared/schema";

interface HeaderProps {
  currentView: string;
  registerSession?: RegisterSession;
}

const viewTitles = {
  dashboard: 'Dashboard',
  transactions: 'Transações',
  inventory: 'Estoque',
  reconciliation: 'Conciliação',
  reports: 'Relatórios'
};

export default function Header({ currentView, registerSession }: HeaderProps) {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const status = registerSession?.isOpen ? 'Aberto' : 'Fechado';
  const statusColor = registerSession?.isOpen ? 'text-green-600' : 'text-red-600';

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">
            {viewTitles[currentView as keyof typeof viewTitles] || 'Dashboard'}
          </h2>
          <p className="text-slate-600 text-sm">
            {currentDate} • Status: <span className={`font-medium ${statusColor}`}>{status}</span>
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-slate-600">Operador</p>
            <p className="font-medium">{registerSession?.operatorName || 'Sistema'}</p>
          </div>
          <Avatar className="w-10 h-10 bg-primary-100">
            <AvatarFallback>
              <User className="text-primary-600" size={20} />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
