import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  ArrowLeft, 
  Car, 
  Bike, 
  Truck, 
  Calculator, 
  DollarSign,
  Zap,
  Users,
  FileText,
  PlusCircle,
  Trash2,
  CheckCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";
import { insertFechamentoSchema, type InsertFechamento, User } from "@shared/schema";

// Mock current user - in real app this would come from auth context
const currentUser: User = {
  id: 2,
  uid: 'ijNp5AAiFvWrBFCVq7hQ9L05d5Q2',
  email: 'topcapaobonito@hotmail.com',
  name: 'Operador Capão Bonito',
  lojaId: 'capao',
  role: 'user',
  createdAt: new Date()
};

const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || !isFinite(numValue)) return 'R$ 0,00';
  return numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
};

type VariableExit = {
  id: string;
  description: string;
  amount: number;
  icon: string;
};

type ReceivedPayment = {
  id: string;
  nomeCliente: string;
  placa: string;
  valorPago: number;
  formaPagamento: string;
};

type ReceivableInput = {
  id: string;
  nomeCliente: string;
  placa: string;
  valorReceber: number;
  dataDebito: string;
};

// Form schema
const fechamentoFormSchema = insertFechamentoSchema.extend({
  carros: z.string().min(1, "Campo obrigatório"),
  carrosQuantidade: z.number().min(0, "Deve ser um número positivo"),
  motos: z.string().min(1, "Campo obrigatório"),
  motosQuantidade: z.number().min(0, "Deve ser um número positivo"),
  caminhoes: z.string().min(1, "Campo obrigatório"),
  caminhoesQuantidade: z.number().min(0, "Deve ser um número positivo"),
  aluguel: z.string().min(1, "Campo obrigatório"),
  energia: z.string().min(1, "Campo obrigatório"),
  funcionario: z.string().min(1, "Campo obrigatório"),
  despachante: z.string().min(1, "Campo obrigatório"),
});

export default function FechamentoPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // State for dynamic sections
  const [saidasVariaveis, setSaidasVariaveis] = useState<VariableExit[]>([]);
  const [pagamentosRecebidos, setPagamentosRecebidos] = useState<ReceivedPayment[]>([]);
  const [aReceber, setAReceber] = useState<ReceivableInput[]>([]);
  
  // State for new items
  const [newVariableExit, setNewVariableExit] = useState({ description: '', amount: '' });
  const [newReceivedPayment, setNewReceivedPayment] = useState({ 
    nomeCliente: '', 
    placa: '', 
    valorPago: '', 
    formaPagamento: 'Dinheiro' 
  });
  const [newReceivable, setNewReceivable] = useState({ 
    nomeCliente: '', 
    placa: '', 
    valorReceber: '', 
    dataDebito: format(new Date(), 'yyyy-MM-dd') 
  });

  const form = useForm<z.infer<typeof fechamentoFormSchema>>({
    resolver: zodResolver(fechamentoFormSchema),
    defaultValues: {
      lojaId: currentUser.lojaId,
      userId: currentUser.uid,
      operatorName: currentUser.name,
      dataFechamento: format(new Date(), 'yyyy-MM-dd'),
      carros: "0.00",
      carrosQuantidade: 0,
      motos: "0.00",
      motosQuantidade: 0,
      caminhoes: "0.00",
      caminhoesQuantidade: 0,
      aluguel: "0.00",
      energia: "0.00",
      funcionario: "0.00",
      despachante: "0.00",
    },
  });

  // Calculate totals
  const calculateTotals = () => {
    const formValues = form.getValues();
    
    const totalEntradas = parseCurrency(formValues.carros) + 
                         parseCurrency(formValues.motos) + 
                         parseCurrency(formValues.caminhoes);
    
    const totalSaidasFixas = parseCurrency(formValues.aluguel) + 
                            parseCurrency(formValues.energia) + 
                            parseCurrency(formValues.funcionario) + 
                            parseCurrency(formValues.despachante);
    
    const totalSaidasVariaveis = saidasVariaveis.reduce((sum, item) => sum + item.amount, 0);
    const totalSaidas = totalSaidasFixas + totalSaidasVariaveis;
    const totalPagamentosRecebidos = pagamentosRecebidos.reduce((sum, item) => sum + item.valorPago, 0);
    const totalAReceber = aReceber.reduce((sum, item) => sum + item.valorReceber, 0);
    const saldoFinal = totalEntradas - totalSaidas + totalPagamentosRecebidos;

    return {
      totalEntradas,
      totalSaidasFixas,
      totalSaidasVariaveis,
      totalSaidas,
      totalPagamentosRecebidos,
      totalAReceber,
      saldoFinal
    };
  };

  const totals = calculateTotals();

  // Add variable exit
  const addVariableExit = () => {
    if (newVariableExit.description && newVariableExit.amount) {
      const exit: VariableExit = {
        id: Date.now().toString(),
        description: newVariableExit.description,
        amount: parseCurrency(newVariableExit.amount),
        icon: 'receipt'
      };
      setSaidasVariaveis([...saidasVariaveis, exit]);
      setNewVariableExit({ description: '', amount: '' });
    }
  };

  // Add received payment
  const addReceivedPayment = () => {
    if (newReceivedPayment.nomeCliente && newReceivedPayment.placa && newReceivedPayment.valorPago) {
      const payment: ReceivedPayment = {
        id: Date.now().toString(),
        nomeCliente: newReceivedPayment.nomeCliente,
        placa: newReceivedPayment.placa,
        valorPago: parseCurrency(newReceivedPayment.valorPago),
        formaPagamento: newReceivedPayment.formaPagamento
      };
      setPagamentosRecebidos([...pagamentosRecebidos, payment]);
      setNewReceivedPayment({ nomeCliente: '', placa: '', valorPago: '', formaPagamento: 'Dinheiro' });
    }
  };

  // Add receivable
  const addReceivable = () => {
    if (newReceivable.nomeCliente && newReceivable.placa && newReceivable.valorReceber) {
      const receivable: ReceivableInput = {
        id: Date.now().toString(),
        nomeCliente: newReceivable.nomeCliente,
        placa: newReceivable.placa,
        valorReceber: parseCurrency(newReceivable.valorReceber),
        dataDebito: newReceivable.dataDebito
      };
      setAReceber([...aReceber, receivable]);
      setNewReceivable({ 
        nomeCliente: '', 
        placa: '', 
        valorReceber: '', 
        dataDebito: format(new Date(), 'yyyy-MM-dd') 
      });
    }
  };

  // Create fechamento mutation
  const createFechamentoMutation = useMutation({
    mutationFn: async (data: InsertFechamento) => {
      const response = await fetch('/api/fechamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create fechamento');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fechamentos"] });
      toast({
        title: "Fechamento criado com sucesso!",
        description: "O fechamento de caixa foi registrado.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Erro ao criar fechamento",
        description: "Ocorreu um erro ao salvar o fechamento.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof fechamentoFormSchema>) => {
    const fechamentoData: InsertFechamento = {
      ...data,
      saidasVariaveis: JSON.stringify(saidasVariaveis),
      pagamentosRecebidos: JSON.stringify(pagamentosRecebidos),
      aReceber: JSON.stringify(aReceber),
      totalEntradas: totals.totalEntradas.toFixed(2),
      totalSaidasFixas: totals.totalSaidasFixas.toFixed(2),
      totalSaidasVariaveis: totals.totalSaidasVariaveis.toFixed(2),
      totalSaidas: totals.totalSaidas.toFixed(2),
      totalPagamentosRecebidos: totals.totalPagamentosRecebidos.toFixed(2),
      totalAReceber: totals.totalAReceber.toFixed(2),
      saldoFinal: totals.saldoFinal.toFixed(2),
    };

    createFechamentoMutation.mutate(fechamentoData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Novo Fechamento de Caixa</h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Summary Card */}
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Entradas</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(totals.totalEntradas)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Saídas</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(totals.totalSaidas)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Pagamentos Recebidos</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.totalPagamentosRecebidos)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Saldo Final</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totals.saldoFinal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Entradas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Entradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Carros */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-blue-500" />
                      <h3 className="font-semibold">Carros</h3>
                    </div>
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="carrosQuantidade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantidade</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="carros"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Total</FormLabel>
                            <FormControl>
                              <Input placeholder="0,00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Motos */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Bike className="h-5 w-5 text-green-500" />
                      <h3 className="font-semibold">Motos</h3>
                    </div>
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="motosQuantidade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantidade</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="motos"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Total</FormLabel>
                            <FormControl>
                              <Input placeholder="0,00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Caminhões */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-orange-500" />
                      <h3 className="font-semibold">Caminhões</h3>
                    </div>
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="caminhoesQuantidade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantidade</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="caminhoes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Total</FormLabel>
                            <FormControl>
                              <Input placeholder="0,00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saídas Fixas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-red-600" />
                  Saídas Fixas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="aluguel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aluguel</FormLabel>
                        <FormControl>
                          <Input placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="energia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Energia</FormLabel>
                        <FormControl>
                          <Input placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="funcionario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Funcionário</FormLabel>
                        <FormControl>
                          <Input placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="despachante"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Despachante</FormLabel>
                        <FormControl>
                          <Input placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Saídas Variáveis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-600" />
                  Saídas Variáveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Add new variable exit */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <Input
                      placeholder="Descrição da saída"
                      value={newVariableExit.description}
                      onChange={(e) => setNewVariableExit({ ...newVariableExit, description: e.target.value })}
                    />
                    <Input
                      placeholder="Valor"
                      value={newVariableExit.amount}
                      onChange={(e) => setNewVariableExit({ ...newVariableExit, amount: e.target.value })}
                    />
                    <Button type="button" onClick={addVariableExit}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>

                  {/* List variable exits */}
                  {saidasVariaveis.map((saida) => (
                    <div key={saida.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <div>
                        <p className="font-medium">{saida.description}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(saida.amount)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSaidasVariaveis(saidasVariaveis.filter(s => s.id !== saida.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="lg" 
                disabled={createFechamentoMutation.isPending}
                className="min-w-40"
              >
                {createFechamentoMutation.isPending ? (
                  "Salvando..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finalizar Fechamento
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}