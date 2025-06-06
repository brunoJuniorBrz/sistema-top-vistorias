import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  PlusCircle, 
  Search, 
  X,
  Car,
  Truck,
  Bike,
  Receipt,
  Calculator,
  Building,
  Users,
  FileCheck,
  ClipboardCheck,
  ClipboardList
} from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Fechamento } from "@shared/schema";
import { VISTORIA_VALUES, VISTORIA_LABELS, VISTORIA_ICONS, VistoriaType } from "@/config/values";
import logo from '@/assets/logo.png';

const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || !isFinite(numValue)) return 'R$ 0,00';
  return numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getVistoriaIcon = (type: VistoriaType) => {
  const iconMap = {
    Car: Car,
    Bike: Bike,
    Truck: Truck,
    FileCheck: FileCheck,
    ClipboardCheck: ClipboardCheck,
    ClipboardList: ClipboardList,
    Search: Search,
  };
  const iconName = VISTORIA_ICONS[type];
  return iconMap[iconName as keyof typeof iconMap];
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [searchActive, setSearchActive] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { data: fechamentos, isLoading } = useQuery<Fechamento[]>({
    queryKey: ["/api/fechamentos", user?.uid, user?.lojaId, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined],
    queryFn: async () => {
      if (!user?.uid || !user?.lojaId) {
        throw new Error('Usuário não autenticado');
      }

      const params = new URLSearchParams();
      params.append('userId', user.uid);
      params.append('lojaId', user.lojaId);
      if (selectedDate) {
        params.append('date', format(selectedDate, 'yyyy-MM-dd'));
      }
      
      const response = await fetch(`/api/fechamentos?${params}`);
      if (!response.ok) throw new Error('Falha ao buscar fechamentos');
      return response.json();
    },
    enabled: !!user?.uid && !!user?.lojaId,
  });

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setPopoverOpen(false);
    if (date && isValid(date)) {
      setSearchActive(true);
    } else if (!date) {
      setSearchActive(false);
    }
  };

  const handleResetSearch = () => {
    setSelectedDate(undefined);
    setSearchActive(false);
    setPopoverOpen(false);
  };

  const closingsCardTitle = searchActive
    ? selectedDate
        ? `Fechamento de ${format(selectedDate, 'PPP', { locale: ptBR })}`
        : 'Resultado da Consulta'
    : 'Últimos Fechamentos';
  
  const closingsCardDescription = searchActive
    ? `Exibindo fechamento para a data selecionada.`
    : 'Resumo dos 4 fechamentos mais recentes.';

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
        <main className="flex-grow container mx-auto px-4 md:px-8 py-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Skeleton className="h-40 w-full rounded-xl shadow-md" />
            </div>
            <div className="md:col-span-2">
              <Skeleton className="h-16 w-3/4 mb-4 rounded-lg" />
              <Skeleton className="h-8 w-full mb-6 rounded" />
              <div className="space-y-4">
                <Skeleton className="h-20 w-full rounded-xl shadow-sm" />
                <Skeleton className="h-20 w-full rounded-xl shadow-sm" />
                <Skeleton className="h-20 w-full rounded-xl shadow-sm" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-8 py-4 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo Top Vistorias" className="h-10" />
        </div>
        <div className="text-[#20446A] font-semibold text-lg">
          {user?.name ? `Top ${user.name}` : ''}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center py-8">
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl">
          {/* Card de ações rápidas */}
          <div className="bg-white rounded-xl shadow p-8 flex-1 max-w-sm flex flex-col items-start">
            <h2 className="text-xl font-bold text-[#20446A] mb-2">Bem-vindo(a)!</h2>
            <p className="text-gray-500 mb-6">Ações rápidas e consulta de histórico.</p>
            <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded bg-[#2563eb] text-white font-semibold text-base mb-3 hover:bg-[#1d4ed8] transition-colors" onClick={() => navigate('/fechamento-novo')}>
              <PlusCircle className="h-5 w-5" />
              Novo Fechamento de Caixa
            </button>
            <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded bg-[#e5e7eb] text-[#20446A] font-semibold text-base border border-gray-200 hover:bg-[#d1d5db] transition-colors">
              <CalendarIcon className="h-5 w-5" />
              Consultar por Data
            </button>
          </div>

          {/* Card de valores unitários */}
          <div className="bg-white rounded-xl shadow p-8 flex-1 min-w-[320px] flex flex-col">
            <h2 className="text-xl font-bold text-[#20446A] mb-2">Valores Unitários</h2>
            <p className="text-gray-500 mb-6">Valores de referência para cada tipo de vistoria.</p>
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(VISTORIA_VALUES).map(([type, value]) => {
                const Icon = getVistoriaIcon(type as VistoriaType);
                return (
                  <div 
                    key={type} 
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-[#2563eb] hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-[#2563eb]/5">
                        <Icon className="h-5 w-5 text-[#2563eb]" />
                      </div>
                      <span className="font-medium text-gray-700">{VISTORIA_LABELS[type as VistoriaType]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#2563eb]">{formatCurrency(value)}</span>
                      <Badge variant="outline" className="text-xs font-normal">unitário</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-gray-400 py-4 mt-auto">
        © {new Date().getFullYear()} Fechamento de Caixa App.<br />
        Desenvolvido por Bruno Gonçalves
      </footer>
    </div>
  );
}
