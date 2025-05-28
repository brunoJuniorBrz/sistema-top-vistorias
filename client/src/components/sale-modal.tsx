import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CartItem } from "@shared/schema";

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onSaleComplete: () => void;
}

export default function SaleModal({ isOpen, onClose, cartItems, onSaleComplete }: SaleModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [change, setChange] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  useEffect(() => {
    if (paymentMethod === "cash" && receivedAmount) {
      const received = parseFloat(receivedAmount) || 0;
      const calculatedChange = Math.max(0, received - total);
      setChange(calculatedChange);
    } else {
      setChange(0);
    }
  }, [receivedAmount, total, paymentMethod]);

  const saleMutation = useMutation({
    mutationFn: (saleData: any) => apiRequest("POST", "/api/sales", saleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/register"] });
      
      toast({
        title: "Venda Realizada",
        description: "Venda realizada com sucesso!",
      });
      
      onSaleComplete();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro na Venda",
        description: error.message || "Erro ao processar venda",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setPaymentMethod("cash");
    setReceivedAmount("");
    setChange(0);
  };

  const handleConfirmSale = () => {
    if (paymentMethod === "cash") {
      const received = parseFloat(receivedAmount) || 0;
      if (received < total) {
        toast({
          title: "Valor Insuficiente",
          description: "O valor recebido é menor que o total da venda",
          variant: "destructive",
        });
        return;
      }
    }

    const saleData = {
      items: cartItems,
      paymentMethod,
      receivedAmount: paymentMethod === "cash" ? parseFloat(receivedAmount) : undefined,
    };

    saleMutation.mutate(saleData);
  };

  const handleClose = () => {
    if (!saleMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-800">
            Finalizar Venda
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <p className="text-sm text-slate-600 mb-2">Total da Venda</p>
            <p className="text-3xl font-bold text-green-600">R$ {total.toFixed(2)}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2">
              Método de Pagamento
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "cash" && (
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2">
                Valor Recebido
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
              />
              {change > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-slate-600">
                    Troco: <span className="font-bold text-green-600">R$ {change.toFixed(2)}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saleMutation.isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSale}
              disabled={saleMutation.isPending}
              className="flex-1 bg-primary-600 hover:bg-primary-700"
            >
              {saleMutation.isPending ? "Processando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
