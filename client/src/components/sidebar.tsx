import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  ScanBarcode, 
  Package, 
  Receipt, 
  Scale, 
  Lock,
  Unlock
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const openRegisterMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/register/open", { 
      openingBalance: 200.00, 
      operatorName: "João Silva" 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/register"] });
      toast({
        title: "Caixa Aberto",
        description: "Caixa aberto com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao abrir o caixa",
        variant: "destructive",
      });
    },
  });

  const closeRegisterMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/register/close", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/register"] });
      toast({
        title: "Caixa Fechado",
        description: "Caixa fechado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao fechar o caixa",
        variant: "destructive",
      });
    },
  });

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "transactions", label: "Transações", icon: Receipt },
    { id: "inventory", label: "Estoque", icon: Package },
    { id: "reconciliation", label: "Conciliação", icon: Scale },
    { id: "reports", label: "Relatórios", icon: BarChart3 },
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-r border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center">
          <ScanBarcode className="text-primary mr-2" size={24} />
          CaixaPro
        </h1>
        <p className="text-sm text-slate-500 mt-1">Sistema de Caixa</p>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <li key={item.id}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    isActive 
                      ? "bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  onClick={() => onViewChange(item.id)}
                >
                  <Icon className="mr-3" size={18} />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
        
        <Separator className="my-6" />
        
        <div className="space-y-2">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={() => openRegisterMutation.mutate()}
            disabled={openRegisterMutation.isPending}
          >
            <Unlock className="mr-2" size={16} />
            Abrir Caixa
          </Button>
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            onClick={() => closeRegisterMutation.mutate()}
            disabled={closeRegisterMutation.isPending}
          >
            <Lock className="mr-2" size={16} />
            Fechar Caixa
          </Button>
        </div>
      </nav>
    </div>
  );
}
