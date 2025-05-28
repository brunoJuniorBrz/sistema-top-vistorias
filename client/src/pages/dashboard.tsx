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
  Users
} from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Fechamento, User } from "@shared/schema";

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

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [searchActive, setSearchActive] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { data: fechamentos, isLoading } = useQuery<Fechamento[]>({
    queryKey: ["/api/fechamentos", currentUser.uid, currentUser.lojaId, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('userId', currentUser.uid);
      params.append('lojaId', currentUser.lojaId);
      if (selectedDate) {
        params.append('date', format(selectedDate, 'yyyy-MM-dd'));
      }
      
      const response = await fetch(`/api/fechamentos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch fechamentos');
      return response.json();
    },
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
    <TooltipProvider>
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
        <main className="flex-grow container mx-auto px-4 md:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Left Column: Actions */}
            <div className="md:col-span-1 space-y-6 sticky top-[calc(var(--navbar-height,64px)+1.5rem)]">
              <Card className="shadow-lg border border-border/50 bg-white overflow-hidden rounded-xl">
                <CardHeader className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10">
                  <div className="relative z-10">
                    <CardTitle className="text-xl font-bold text-foreground">Bem-vindo(a)!</CardTitle>
                    <CardDescription className="text-muted-foreground mt-1">
                      Ações rápidas e consulta de histórico.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 p-6">
                  <Link href="/fechamento">
                    <Button
                      size="lg"
                      className="w-full justify-start gap-3 shadow-sm hover:shadow-md border border-border/30 transition-all duration-150 hover:bg-primary/90 hover:text-primary-foreground rounded-lg text-base h-11"
                      aria-label="Iniciar novo fechamento de caixa"
                    >
                      <PlusCircle className="h-5 w-5" />
                      Novo Fechamento de Caixa
                    </Button>
                  </Link>
                  
                  {/* Date Picker */}
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="lg"
                        className={cn(
                          "w-full justify-start text-left font-normal gap-3 transition-all duration-150 rounded-lg h-11 text-base",
                          !selectedDate && "text-muted-foreground"
                        )}
                        aria-label="Consultar fechamento por data"
                      >
                        <CalendarIcon className="h-5 w-5" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Consultar por Data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>

                  {searchActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetSearch}
                      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Limpar Consulta
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Closings List */}
            <div className="md:col-span-2">
              <Card className="shadow-lg border border-border/50 bg-white overflow-hidden rounded-xl">
                <CardHeader className="border-b border-border/50 bg-gradient-to-r from-background to-muted/20 p-6">
                  <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <Receipt className="h-6 w-6 text-primary" />
                    {closingsCardTitle}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground mt-2">
                    {closingsCardDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {fechamentos && fechamentos.length > 0 ? (
                      fechamentos.map((fechamento) => (
                        <Card 
                          key={fechamento.id} 
                          className="group border border-border/50 bg-gradient-to-r from-background to-muted/5 hover:from-primary/5 hover:to-primary/10 transition-all duration-200 hover:shadow-md cursor-pointer rounded-lg"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center justify-center w-16 h-16 bg-primary/10 rounded-lg border border-primary/20">
                                  <span className="text-xs font-medium text-primary/70 uppercase">
                                    {format(new Date(fechamento.dataFechamento), 'MMM', { locale: ptBR })}
                                  </span>
                                  <span className="text-lg font-bold text-primary">
                                    {format(new Date(fechamento.dataFechamento), 'dd')}
                                  </span>
                                </div>
                                
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                    Fechamento de {format(new Date(fechamento.dataFechamento), 'PPP', { locale: ptBR })}
                                  </h3>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {fechamento.operatorName}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Building className="h-3 w-3" />
                                      {fechamento.lojaId.charAt(0).toUpperCase() + fechamento.lojaId.slice(1)}
                                    </span>
                                  </div>
                                  
                                  {/* Summary Stats */}
                                  <div className="flex items-center gap-6 mt-3">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Car className="h-4 w-4 text-blue-500" />
                                      <span className="text-muted-foreground">Carros:</span>
                                      <span className="font-medium">{fechamento.carrosQuantidade}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <Bike className="h-4 w-4 text-green-500" />
                                      <span className="text-muted-foreground">Motos:</span>
                                      <span className="font-medium">{fechamento.motosQuantidade}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <Truck className="h-4 w-4 text-orange-500" />
                                      <span className="text-muted-foreground">Caminhões:</span>
                                      <span className="font-medium">{fechamento.caminhoesQuantidade}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calculator className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Saldo Final</span>
                                </div>
                                <span className="text-2xl font-bold text-green-600">
                                  {formatCurrency(fechamento.saldoFinal)}
                                </span>
                                <div className="flex items-center justify-end gap-2 mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    Receita: {formatCurrency(fechamento.totalEntradas)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-muted-foreground mb-2">
                          {searchActive ? "Nenhum fechamento encontrado" : "Nenhum fechamento registrado"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {searchActive 
                            ? "Não há fechamentos para a data selecionada." 
                            : "Comece criando seu primeiro fechamento de caixa."
                          }
                        </p>
                        {!searchActive && (
                          <Link href="/fechamento">
                            <Button className="mt-4" size="sm">
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Criar Primeiro Fechamento
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-muted/50 py-3 border-t border-border/60 mt-auto text-center text-xs text-muted-foreground w-full">
          <p>Sistema de Fechamento de Caixa - TopVistorias</p>
          <p className="mt-1">© 2025 Todos os direitos reservados</p>
        </footer>
      </div>
    </TooltipProvider>
  );
}
