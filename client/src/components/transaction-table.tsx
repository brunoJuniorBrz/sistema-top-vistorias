import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, PrinterCheck, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function TransactionTable() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/transactions"],
  });

  if (isLoading) {
    return <div className="text-center py-8">Carregando transações...</div>;
  }

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Histórico de Transações
          </CardTitle>
          <div className="flex items-center space-x-3">
            <Input type="date" className="w-auto" />
            <Button variant="outline" className="text-slate-700">
              <Filter className="mr-2" size={16} />
              Filtrar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-medium text-slate-500 uppercase">ID</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Data/Hora</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Itens</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Valor</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Pagamento</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Status</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.map((transaction: any) => (
                <TableRow key={transaction.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium text-slate-800">
                    #{transaction.transactionId}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {new Date(transaction.datetime).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {transaction.items?.length || 0} itens
                  </TableCell>
                  <TableCell className="font-bold text-green-600">
                    R$ {parseFloat(transaction.total).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {transaction.paymentMethod === 'cash' ? 'Dinheiro' :
                     transaction.paymentMethod === 'card' ? 'Cartão' : 'PIX'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Concluída
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-800">
                        <Eye size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800">
                        <PrinterCheck size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
