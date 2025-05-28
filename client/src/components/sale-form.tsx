import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Product, CartItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface SaleFormProps {
  onFinalizeSale: (items: CartItem[]) => void;
}

export default function SaleForm({ onFinalizeSale }: SaleFormProps) {
  const [productCode, setProductCode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const searchProduct = () => {
    if (!productCode.trim()) return;
    
    const product = products?.find(p => 
      p.code === productCode || 
      p.name.toLowerCase().includes(productCode.toLowerCase())
    );
    
    if (product) {
      setSelectedProduct(product);
    } else {
      setSelectedProduct(null);
      toast({
        title: "Produto não encontrado",
        description: "Verifique o código ou nome do produto",
        variant: "destructive",
      });
    }
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    
    if (selectedProduct.stock < quantity) {
      toast({
        title: "Estoque insuficiente",
        description: `Apenas ${selectedProduct.stock} unidades disponíveis`,
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find(item => item.code === selectedProduct.code);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.code === selectedProduct.code 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, {
        code: selectedProduct.code,
        name: selectedProduct.name,
        price: parseFloat(selectedProduct.price),
        quantity
      }]);
    }

    // Reset form
    setProductCode("");
    setQuantity(1);
    setSelectedProduct(null);
  };

  const removeFromCart = (code: string) => {
    setCart(cart.filter(item => item.code !== code));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchProduct();
    }
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-lg font-semibold text-slate-800">Nova Venda</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2">Código do Produto</Label>
            <div className="flex">
              <Input
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite ou escaneie"
                className="rounded-r-none"
              />
              <Button
                onClick={searchProduct}
                className="px-4 bg-primary-600 hover:bg-primary-700 rounded-l-none"
              >
                <Search size={16} />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2">Quantidade</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
            />
          </div>
        </div>

        {selectedProduct && (
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{selectedProduct.name}</p>
                <p className="text-sm text-slate-600">R$ {parseFloat(selectedProduct.price).toFixed(2)}</p>
                <p className="text-xs text-slate-500">Estoque: {selectedProduct.stock}</p>
              </div>
              <Button
                onClick={addToCart}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus size={16} className="mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-800">Itens da Venda</h4>
            <span className="text-sm text-slate-600">
              Total: <span className="font-bold text-green-600">R$ {total.toFixed(2)}</span>
            </span>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center text-slate-500 py-4">
                Nenhum item adicionado
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.code} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-600">
                      {item.quantity}x R$ {item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.code)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <Button
            onClick={() => onFinalizeSale(cart)}
            disabled={cart.length === 0}
            className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 font-medium"
          >
            Finalizar Venda
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
