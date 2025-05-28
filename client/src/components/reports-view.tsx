import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DailyStats } from "@shared/schema";

export default function ReportsView() {
  const { data: stats } = useQuery<DailyStats>({
    queryKey: ["/api/stats"],
  });

  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
  });

  // Calculate top products
  const topProducts = transactions?.reduce((acc: any[], transaction: any) => {
    transaction.items?.forEach((item: any) => {
      const existing = acc.find(p => p.code === item.productCode);
      if (existing) {
        existing.sold += item.quantity;
        existing.revenue += parseFloat(item.price) * item.quantity;
      } else {
        acc.push({
          code: item.productCode,
          name: item.productName,
          sold: item.quantity,
          revenue: parseFloat(item.price) * item.quantity
        });
      }
    });
    return acc;
  }, []).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5) || [];

  const exportReport = () => {
    // Simple CSV export
    const csvData = [
      ['Relatório de Vendas'],
      ['Data', new Date().toLocaleDateString('pt-BR')],
      [''],
      ['Resumo'],
      ['Receita Total', `R$ ${stats?.totalSales?.toFixed(2) || '0,00'}`],
      ['Total de Vendas', stats?.transactionCount?.toString() || '0'],
      ['Ticket Médio', `R$ ${stats?.averageTicket?.toFixed(2) || '0,00'}`],
      [''],
      ['Vendas por Método de Pagamento'],
      ['Dinheiro', `R$ ${stats?.cashSales?.toFixed(2) || '0,00'}`],
      ['Cartão', `R$ ${stats?.cardSales?.toFixed(2) || '0,00'}`],
      ['PIX', `R$ ${stats?.pixSales?.toFixed(2) || '0,00'}`]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-vendas-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-sm border border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800">
              Relatórios de Vendas
            </CardTitle>
            <div className="flex items-center space-x-3">
              <Select defaultValue="today">
                <SelectTrigger className="w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportReport} className="bg-green-600 hover:bg-green-700">
                <Download className="mr-2" size={16} />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Receita Total</p>
              <p className="text-3xl font-bold text-green-600">
                R$ {stats?.totalSales?.toFixed(2) || "0,00"}
              </p>
            </div>
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Total de Vendas</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats?.transactionCount || 0}
              </p>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Ticket Médio</p>
              <p className="text-3xl font-bold text-purple-600">
                R$ {stats?.averageTicket?.toFixed(2) || "0,00"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold text-slate-800 mb-4">
                Vendas por Método de Pagamento
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-slate-700">Dinheiro</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    R$ {stats?.cashSales?.toFixed(2) || "0,00"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm text-slate-700">Cartão</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    R$ {stats?.cardSales?.toFixed(2) || "0,00"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-sm text-slate-700">PIX</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    R$ {stats?.pixSales?.toFixed(2) || "0,00"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-md font-semibold text-slate-800 mb-4">
                Produtos Mais Vendidos
              </h4>
              <div className="space-y-3">
                {topProducts.length === 0 ? (
                  <div className="text-center text-slate-500 py-4">
                    Nenhuma venda registrada
                  </div>
                ) : (
                  topProducts.map((product: any, index: number) => (
                    <div key={product.code} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{product.name}</p>
                        <p className="text-xs text-slate-600">{product.sold} vendidos</p>
                      </div>
                      <span className="font-bold text-slate-800">
                        R$ {product.revenue.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
