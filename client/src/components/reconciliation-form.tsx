import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, Plus, Minus, Calculator } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RegisterSession, DailyStats } from "@shared/schema";

export default function ReconciliationForm() {
  const [physicalAmount, setPhysicalAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [reconciliationResult, setReconciliationResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: registerSession } = useQuery<RegisterSession>({
    queryKey: ["/api/register"],
  });

  const { data: stats } = useQuery<DailyStats>({
    queryKey: ["/api/stats"],
  });

  const reconcileMutation = useMutation({
    mutationFn: (data: { physicalBalance: number; notes: string }) =>
      apiRequest("POST", "/api/register/reconcile", data),
    onSuccess: (result) => {
      setReconciliationResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/register"] });
      
      const message = result.status === 'balanced' 
        ? "Caixa conferido com sucesso!"
        : result.status === 'overage'
        ? "Sobra no caixa detectada"
        : "Falta no caixa detectada";
      
      toast({
        title: "Conciliação Realizada",
        description: message,
        variant: result.status === 'balanced' ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao realizar conciliação",
        variant: "destructive",
      });
    },
  });

  const handleReconcile = () => {
    const physical = parseFloat(physicalAmount);
    if (isNaN(physical) || physical < 0) {
      toast({
        title: "Erro",
        description: "Insira um valor válido",
        variant: "destructive",
      });
      return;
    }

    reconcileMutation.mutate({ 
      physicalBalance: physical, 
      notes 
    });
  };

  const openingBalance = parseFloat(registerSession?.openingBalance || "0");
  const currentBalance = parseFloat(registerSession?.currentBalance || "0");
  const cashSales = stats?.cashSales || 0;
  const withdrawals = 0; // TODO: Add withdrawals tracking

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="bg-white shadow-sm border border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Conciliação de Caixa
          </CardTitle>
          <p className="text-sm text-slate-600">Compare os valores esperados com o físico</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Valor Inicial</p>
                <p className="text-xl font-bold text-slate-800">
                  R$ {openingBalance.toFixed(2)}
                </p>
              </div>
              <Wallet className="text-slate-400 text-2xl" size={32} />
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Vendas em Dinheiro</p>
                <p className="text-xl font-bold text-green-600">
                  R$ {cashSales.toFixed(2)}
                </p>
              </div>
              <Plus className="text-green-400 text-2xl" size={32} />
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Retiradas</p>
                <p className="text-xl font-bold text-red-600">
                  R$ {withdrawals.toFixed(2)}
                </p>
              </div>
              <Minus className="text-red-400 text-2xl" size={32} />
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600">Valor Esperado</p>
                  <p className="text-2xl font-bold text-primary-600">
                    R$ {currentBalance.toFixed(2)}
                  </p>
                </div>
                <Calculator className="text-primary-400 text-2xl" size={32} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm border border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Contagem Física
          </CardTitle>
          <p className="text-sm text-slate-600">Insira o valor real do caixa</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2">
                Valor Físico do Caixa
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={physicalAmount}
                onChange={(e) => setPhysicalAmount(e.target.value)}
                className="text-xl font-bold"
              />
            </div>

            {reconciliationResult && (
              <div className={`p-4 rounded-lg ${
                reconciliationResult.status === 'balanced' ? 'bg-green-50' :
                reconciliationResult.status === 'overage' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Diferença:</span>
                  <span className={`text-xl font-bold ${
                    reconciliationResult.status === 'balanced' ? 'text-green-600' :
                    reconciliationResult.status === 'overage' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {reconciliationResult.status === 'overage' ? '+' : ''}
                    R$ {Math.abs(parseFloat(reconciliationResult.difference)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2">
                Observações
              </Label>
              <Textarea
                placeholder="Adicione observações sobre a conciliação..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleReconcile}
              disabled={reconcileMutation.isPending}
              className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 font-medium"
            >
              {reconcileMutation.isPending ? "Processando..." : "Realizar Conciliação"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
