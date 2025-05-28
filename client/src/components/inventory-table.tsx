import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";

export default function InventoryTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  if (isLoading) {
    return <div className="text-center py-8">Carregando produtos...</div>;
  }

  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    const matchesStatus = !statusFilter || 
      (statusFilter === "in-stock" && product.stock > 10) ||
      (statusFilter === "low-stock" && product.stock <= 10 && product.stock > 0) ||
      (statusFilter === "out-of-stock" && product.stock === 0);
    
    return matchesSearch && matchesCategory && matchesStatus;
  }) || [];

  const categories = [...new Set(products?.map(p => p.category) || [])];

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Esgotado", variant: "destructive" as const };
    if (stock <= 10) return { label: "Estoque baixo", variant: "secondary" as const };
    return { label: "Em estoque", variant: "default" as const };
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Gerenciamento de Estoque
          </CardTitle>
          <Button className="bg-primary-600 hover:bg-primary-700">
            <Plus className="mr-2" size={16} />
            Adicionar Produto
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as categorias</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os status</SelectItem>
              <SelectItem value="in-stock">Em estoque</SelectItem>
              <SelectItem value="low-stock">Estoque baixo</SelectItem>
              <SelectItem value="out-of-stock">Esgotado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Código</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Produto</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Categoria</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Preço</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Estoque</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Status</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock);
                return (
                  <TableRow key={product.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-800">
                      {product.code}
                    </TableCell>
                    <TableCell className="text-sm text-slate-800">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {product.category}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800">
                      R$ {parseFloat(product.price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {product.stock}
                    </TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.variant}>
                        {stockStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-800">
                          <Edit size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
