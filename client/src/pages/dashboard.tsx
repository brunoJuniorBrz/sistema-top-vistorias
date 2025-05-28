import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import StatsCard from "@/components/stats-card";
import SaleForm from "@/components/sale-form";
import TransactionTable from "@/components/transaction-table";
import InventoryTable from "@/components/inventory-table";
import ReconciliationForm from "@/components/reconciliation-form";
import ReportsView from "@/components/reports-view";
import SaleModal from "@/components/sale-modal";
import { useQuery } from "@tanstack/react-query";
import { DailyStats, RegisterSession } from "@shared/schema";

type ViewType = "dashboard" | "transactions" | "inventory" | "reconciliation" | "reports";

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);

  const { data: stats } = useQuery<DailyStats>({
    queryKey: ["/api/stats"],
  });

  const { data: registerSession } = useQuery<RegisterSession>({
    queryKey: ["/api/register"],
  });

  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const recentTransactions = transactions?.slice(0, 5) || [];

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <StatsCard
                title="Vendas Hoje"
                value={`R$ ${stats?.totalSales?.toFixed(2) || "0,00"}`}
                change="+12% vs ontem"
                changeType="positive"
                icon="dollar-sign"
                color="green"
              />
              <StatsCard
                title="Transações"
                value={stats?.transactionCount?.toString() || "0"}
                change="+8% vs ontem"
                changeType="positive"
                icon="receipt"
                color="blue"
              />
              <StatsCard
                title="Valor Médio"
                value={`R$ ${stats?.averageTicket?.toFixed(2) || "0,00"}`}
                change="+3% vs ontem"
                changeType="positive"
                icon="chart-line"
                color="purple"
              />
              <StatsCard
                title="Caixa Atual"
                value={`R$ ${registerSession?.currentBalance || "0,00"}`}
                subtitle="Saldo físico"
                icon="coins"
                color="amber"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <SaleForm 
                  onFinalizeSale={(items) => {
                    setCartItems(items);
                    setShowSaleModal(true);
                  }}
                />
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800">Últimas Vendas</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentTransactions.length === 0 ? (
                      <div className="text-center text-slate-500 py-4">
                        Nenhuma venda hoje
                      </div>
                    ) : (
                      recentTransactions.map((transaction: any) => (
                        <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                          <div>
                            <p className="text-sm font-medium text-slate-800">#{transaction.transactionId}</p>
                            <p className="text-xs text-slate-600">
                              {new Date(transaction.datetime).toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-600">R$ {parseFloat(transaction.total).toFixed(2)}</p>
                            <p className="text-xs text-slate-600">
                              {transaction.paymentMethod === 'cash' ? 'Dinheiro' :
                               transaction.paymentMethod === 'card' ? 'Cartão' : 'PIX'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "transactions":
        return <TransactionTable />;
      case "inventory":
        return <InventoryTable />;
      case "reconciliation":
        return <ReconciliationForm />;
      case "reports":
        return <ReportsView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentView={currentView} registerSession={registerSession} />
        
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>

      <SaleModal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        cartItems={cartItems}
        onSaleComplete={() => {
          setShowSaleModal(false);
          setCartItems([]);
        }}
      />
    </div>
  );
}
