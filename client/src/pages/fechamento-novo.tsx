import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Car, 
  Bike, 
  Truck, 
  Calculator, 
  CreditCard,
  Smartphone,
  Building,
  UtensilsCrossed,
  Users,
  PlusCircle,
  Trash2,
  CheckCircle,
  ReceiptText
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Preços fixos dos serviços (conforme mostrado nas imagens)
const PRECOS_SERVICOS = {
  carro: 120.00,
  moto: 100.00,
  caminhonete: 140.00,
  caminhao: 180.00,
  revistoria: 200.00,
  pesquisaProcedencia: 60.00,
  cautelar: 220.00
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatNumber = (value: number): string => {
  return value.toFixed(2).replace('.', ',');
};

type PagamentoPendente = {
  id: string;
  cliente: string;
  valor: number;
};

type SaidaVariavel = {
  id: string;
  nome: string;
  valor: number;
};

type NovaContaReceber = {
  id: string;
  cliente: string;
  placa: string;
  valor: number;
};

// Mock de clientes pendentes (em um app real viria da API)
const clientesPendentes: PagamentoPendente[] = [
  { id: '1', cliente: 'João Silva - ABC-1234', valor: 120.00 },
  { id: '2', cliente: 'Maria Santos - XYZ-5678', valor: 200.00 },
  { id: '3', cliente: 'Pedro Costa - DEF-9012', valor: 140.00 },
];

export default function FechamentoNovoPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Estados para as entradas
  const [carroQtde, setCarroQtde] = useState(0);
  const [caminhoneteQtde, setCaminhoneteQtde] = useState(0);
  const [caminhaoQtde, setCaminhaoQtde] = useState(0);
  const [motoQtde, setMotoQtde] = useState(0);
  const [cautelarQtde, setCautelarQtde] = useState(0);
  const [revistoriaQtde, setRevistoriaQtde] = useState(0);
  const [pesquisaQtde, setPesquisaQtde] = useState(0);
  
  // Estado para pagamentos pendentes
  const [pagamentosPendentes, setPagamentosPendentes] = useState<PagamentoPendente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [valorRecebido, setValorRecebido] = useState<string>('');
  
  // Estados para entradas eletrônicas
  const [cartao, setCartao] = useState(0);
  const [pix, setPix] = useState(0);
  const [deposito, setDeposito] = useState(0);
  
  // Estados para saídas variáveis
  const [saidasVariaveis, setSaidasVariaveis] = useState<SaidaVariavel[]>([]);
  const [nomeSaida, setNomeSaida] = useState('');
  const [valorSaida, setValorSaida] = useState('');
  
  // Estados para novas contas a receber
  const [novasContas, setNovasContas] = useState<NovaContaReceber[]>([]);
  const [nomeCliente, setNomeCliente] = useState('');
  const [placaCliente, setPlacaCliente] = useState('');
  const [valorConta, setValorConta] = useState('');

  // Cálculos automáticos
  const calcularEntradas = () => {
    const carro = carroQtde * PRECOS_SERVICOS.carro;
    const caminhonete = caminhoneteQtde * PRECOS_SERVICOS.caminhonete;
    const caminhao = caminhaoQtde * PRECOS_SERVICOS.caminhao;
    const moto = motoQtde * PRECOS_SERVICOS.moto;
    const cautelar = cautelarQtde * PRECOS_SERVICOS.cautelar;
    const revistoria = revistoriaQtde * PRECOS_SERVICOS.revistoria;
    const pesquisa = pesquisaQtde * PRECOS_SERVICOS.pesquisaProcedencia;
    
    return {
      carro,
      caminhonete,
      caminhao,
      moto,
      cautelar,
      revistoria,
      pesquisa,
      total: carro + caminhonete + caminhao + moto + cautelar + revistoria + pesquisa
    };
  };

  const calcularTotais = () => {
    const entradas = calcularEntradas();
    const totalRecebimentosPendentes = pagamentosPendentes.reduce((sum, p) => sum + p.valor, 0);
    
    // Entradas brutas (serviços + recebimentos pendentes)
    const totalEntradasBrutas = entradas.total + totalRecebimentosPendentes;
    
    // PIX, Cartão e Depósito (entradas eletrônicas)
    const totalEntradasEletonicas = cartao + pix + deposito;
    
    // Saídas: apenas saídas variáveis e contas a receber
    const totalSaidasVariaveis = saidasVariaveis.reduce((sum, s) => sum + s.valor, 0);
    const totalNovasContas = novasContas.reduce((sum, c) => sum + c.valor, 0);
    const totalSaidas = totalSaidasVariaveis + totalNovasContas;
    
    // Saldo líquido = Entradas brutas - Saídas
    const saldoLiquido = totalEntradasBrutas - totalSaidas;
    
    // Saldo eletrônico = Entradas eletrônicas
    const saldoEletronico = totalEntradasEletonicas;
    
    // Saldo em dinheiro = Saldo líquido - Saldo eletrônico
    const saldoEmDinheiro = saldoLiquido - saldoEletronico;

    return {
      totalEntradasPadrao: entradas.total,
      totalRecebimentosPendentes,
      totalEntradasBrutas,
      totalEntradasEletonicas,
      totalSaidasVariaveis,
      totalNovasContas,
      totalSaidas,
      saldoLiquido,
      saldoEletronico,
      saldoEmDinheiro
    };
  };

  // Funções para adicionar itens
  const adicionarPagamentoPendente = () => {
    if (clienteSelecionado && valorRecebido) {
      const cliente = clientesPendentes.find(c => c.id === clienteSelecionado);
      if (cliente) {
        const pagamento: PagamentoPendente = {
          id: Date.now().toString(),
          cliente: cliente.cliente,
          valor: parseFloat(valorRecebido.replace(',', '.')) || 0
        };
        setPagamentosPendentes([...pagamentosPendentes, pagamento]);
        setClienteSelecionado('');
        setValorRecebido('');
      }
    }
  };

  const adicionarSaidaVariavel = () => {
    if (nomeSaida && valorSaida) {
      const saida: SaidaVariavel = {
        id: Date.now().toString(),
        nome: nomeSaida,
        valor: parseFloat(valorSaida.replace(',', '.')) || 0
      };
      setSaidasVariaveis([...saidasVariaveis, saida]);
      setNomeSaida('');
      setValorSaida('');
    }
  };

  const adicionarNovaConta = () => {
    if (nomeCliente && placaCliente && valorConta) {
      const conta: NovaContaReceber = {
        id: Date.now().toString(),
        cliente: nomeCliente,
        placa: placaCliente,
        valor: parseFloat(valorConta.replace(',', '.')) || 0
      };
      setNovasContas([...novasContas, conta]);
      setNomeCliente('');
      setPlacaCliente('');
      setValorConta('');
    }
  };

  // Mutation para salvar fechamento
  const salvarFechamentoMutation = useMutation({
    mutationFn: async (dados: any) => {
      const response = await fetch('/api/fechamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      if (!response.ok) throw new Error('Erro ao salvar fechamento');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fechamento salvo com sucesso!",
        description: "O fechamento de caixa foi registrado.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Erro ao salvar fechamento",
        description: "Ocorreu um erro ao salvar o fechamento.",
        variant: "destructive",
      });
    },
  });

  const salvarFechamento = () => {
    const entradas = calcularEntradas();
    const totais = calcularTotais();
    
    const dados = {
      lojaId: 'capao',
      userId: 'ijNp5AAiFvWrBFCVq7hQ9L05d5Q2',
      operatorName: 'Operador Capão Bonito',
      dataFechamento: format(new Date(), 'yyyy-MM-dd'),
      
      // Entradas
      carro: entradas.carro.toFixed(2),
      carroQtde,
      caminhonete: entradas.caminhonete.toFixed(2),
      caminhoneteQtde,
      caminhao: entradas.caminhao.toFixed(2),
      caminhaoQtde,
      moto: entradas.moto.toFixed(2),
      motoQtde,
      cautelar: entradas.cautelar.toFixed(2),
      cautelarQtde,
      revistoriaDetran: entradas.revistoria.toFixed(2),
      revistoriaDetranQtde: revistoriaQtde,
      pesquisaProcedencia: entradas.pesquisa.toFixed(2),
      pesquisaProcedenciaQtde: pesquisaQtde,
      
      // JSON fields
      pagamentosPendentesRecebidos: JSON.stringify(pagamentosPendentes),
      saidasVariaveis: JSON.stringify(saidasVariaveis),
      novasContasReceber: JSON.stringify(novasContas),
      
      // Saídas fixas
      cartao: cartao.toFixed(2),
      pix: pix.toFixed(2),
      deposito: deposito.toFixed(2),
      
      // Totais calculados
      totalEntradasPadrao: totais.totalEntradasPadrao.toFixed(2),
      totalRecebimentosPendentes: totais.totalRecebimentosPendentes.toFixed(2),
      totalEntradasBrutas: totais.totalEntradasBrutas.toFixed(2),
      totalEntradasEletonicas: totais.totalEntradasEletonicas.toFixed(2),
      totalSaidasVariaveis: totais.totalSaidasVariaveis.toFixed(2),
      totalNovasContasReceber: totais.totalNovasContas.toFixed(2),
      totalSaidas: totais.totalSaidas.toFixed(2),
      saldoLiquido: totais.saldoLiquido.toFixed(2),
      saldoEletronico: totais.saldoEletronico.toFixed(2),
      saldoEmDinheiro: totais.saldoEmDinheiro.toFixed(2),
    };

    salvarFechamentoMutation.mutate(dados);
  };

  const entradas = calcularEntradas();
  const totais = calcularTotais();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Painel
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Novo Fechamento de Caixa</h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Informações do Fechamento */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Fechamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Data do Fechamento</Label>
                  <Input value={format(new Date(), 'dd/MM/yyyy')} disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Data deve ser formato DD/MM/AAAA
                  </p>
                </div>
                <div>
                  <Label>Nome do Operador (Top Capão)</Label>
                  <Input value="Nome de quem fechou" placeholder="Registrado para a Top Capão Bonito" disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entradas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Entradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Carro */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-500" />
                    <Label className="font-semibold">Carro</Label>
                  </div>
                  <Input
                    type="number"
                    placeholder="Qtde"
                    value={carroQtde || ''}
                    onChange={(e) => setCarroQtde(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Valor Unitário: {formatCurrency(PRECOS_SERVICOS.carro)}
                  </p>
                  <p className="text-sm font-semibold">
                    Subtotal: {formatCurrency(entradas.carro)}
                  </p>
                </div>

                {/* Caminhonete */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-orange-500" />
                    <Label className="font-semibold">Caminhonete</Label>
                  </div>
                  <Input
                    type="number"
                    placeholder="Qtde"
                    value={caminhoneteQtde || ''}
                    onChange={(e) => setCaminhoneteQtde(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Valor Unitário: {formatCurrency(PRECOS_SERVICOS.caminhonete)}
                  </p>
                  <p className="text-sm font-semibold">
                    Subtotal: {formatCurrency(entradas.caminhonete)}
                  </p>
                </div>

                {/* Caminhão */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-red-500" />
                    <Label className="font-semibold">Caminhão</Label>
                  </div>
                  <Input
                    type="number"
                    placeholder="Qtde"
                    value={caminhaoQtde || ''}
                    onChange={(e) => setCaminhaoQtde(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Valor Unitário: {formatCurrency(PRECOS_SERVICOS.caminhao)}
                  </p>
                  <p className="text-sm font-semibold">
                    Subtotal: {formatCurrency(entradas.caminhao)}
                  </p>
                </div>

                {/* Moto */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bike className="h-4 w-4 text-green-500" />
                    <Label className="font-semibold">Moto</Label>
                  </div>
                  <Input
                    type="number"
                    placeholder="Qtde"
                    value={motoQtde || ''}
                    onChange={(e) => setMotoQtde(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Valor Unitário: {formatCurrency(PRECOS_SERVICOS.moto)}
                  </p>
                  <p className="text-sm font-semibold">
                    Subtotal: {formatCurrency(entradas.moto)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {/* Cautelar */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ReceiptText className="h-4 w-4 text-purple-500" />
                    <Label className="font-semibold">Cautelar</Label>
                  </div>
                  <Input
                    type="number"
                    placeholder="Qtde"
                    value={cautelarQtde || ''}
                    onChange={(e) => setCautelarQtde(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Valor Unitário: {formatCurrency(PRECOS_SERVICOS.cautelar)}
                  </p>
                  <p className="text-sm font-semibold">
                    Subtotal: {formatCurrency(entradas.cautelar)}
                  </p>
                </div>

                {/* Revistoria DETRAN */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-blue-600" />
                    <Label className="font-semibold">Revistoria DETRAN</Label>
                  </div>
                  <Input
                    type="number"
                    placeholder="Qtde"
                    value={revistoriaQtde || ''}
                    onChange={(e) => setRevistoriaQtde(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Valor Unitário: {formatCurrency(PRECOS_SERVICOS.revistoria)}
                  </p>
                  <p className="text-sm font-semibold">
                    Subtotal: {formatCurrency(entradas.revistoria)}
                  </p>
                </div>

                {/* Pesquisa de Procedência */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-500" />
                    <Label className="font-semibold">Pesquisa de Procedência</Label>
                  </div>
                  <Input
                    type="number"
                    placeholder="Qtde"
                    value={pesquisaQtde || ''}
                    onChange={(e) => setPesquisaQtde(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Valor Unitário: {formatCurrency(PRECOS_SERVICOS.pesquisaProcedencia)}
                  </p>
                  <p className="text-sm font-semibold">
                    Subtotal: {formatCurrency(entradas.pesquisa)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adicionar Pagamento Pendente Recebido */}
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Pagamento Pendente Recebido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Cliente/Vistoria Pendente</Label>
                  <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente/vistoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientesPendentes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.cliente}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor Recebido</Label>
                  <Input
                    placeholder="R$ 0,00"
                    value={valorRecebido}
                    onChange={(e) => setValorRecebido(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={adicionarPagamentoPendente} className="w-full">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar Pagamento
                  </Button>
                </div>
              </div>

              {/* Lista de pagamentos adicionados */}
              {pagamentosPendentes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Pagamentos Adicionados:</h4>
                  {pagamentosPendentes.map((pagamento) => (
                    <div key={pagamento.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span>{pagamento.cliente}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatCurrency(pagamento.valor)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPagamentosPendentes(pagamentosPendentes.filter(p => p.id !== pagamento.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-lg font-semibold text-blue-800">
                  Total Entradas (Padrão + Receb. Pend.): {formatCurrency(totais.totalEntradasPadrao + totais.totalRecebimentosPendentes)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Entradas Eletrônicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600">Entradas Eletrônicas (Controle de Saldo)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Valores que entraram via PIX, cartão ou depósito (para controle do saldo em dinheiro)
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Cartão */}
                <div>
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    Cartão
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={cartao || ''}
                    onChange={(e) => setCartao(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-sm font-semibold text-blue-600">
                    Valor: {formatCurrency(cartao)}
                  </p>
                </div>

                {/* PIX */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-purple-600" />
                    PIX
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={pix || ''}
                    onChange={(e) => setPix(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-sm font-semibold text-purple-600">
                    Valor: {formatCurrency(pix)}
                  </p>
                </div>

                {/* Depósito */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-green-600" />
                    Depósito
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={deposito || ''}
                    onChange={(e) => setDeposito(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-sm font-semibold text-green-600">
                    Valor: {formatCurrency(deposito)}
                  </p>
                </div>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-lg font-semibold text-blue-800">
                  Total Entradas Eletrônicas: {formatCurrency(totais.totalEntradasEletonicas)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Saídas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Saídas</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Saídas Variáveis */}
              <h3 className="text-lg font-semibold mb-4">Saídas Variáveis</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Nome da Saída</Label>
                  <Input
                    placeholder="Ex: Café da Tarde"
                    value={nomeSaida}
                    onChange={(e) => setNomeSaida(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input
                    placeholder="R$ 0,00"
                    value={valorSaida}
                    onChange={(e) => setValorSaida(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={adicionarSaidaVariavel} className="w-full">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar Saída
                  </Button>
                </div>
              </div>

              {/* Lista de saídas variáveis */}
              {saidasVariaveis.length > 0 && (
                <div className="space-y-2 mb-4">
                  {saidasVariaveis.map((saida) => (
                    <div key={saida.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span>{saida.nome}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatCurrency(saida.valor)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSaidasVariaveis(saidasVariaveis.filter(s => s.id !== saida.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {saidasVariaveis.length === 0 && (
                <p className="text-center text-muted-foreground mb-4">
                  Nenhuma saída variável adicionada ainda.
                </p>
              )}

              {/* Adicionar Nova Conta A Receber */}
              <h3 className="text-lg font-semibold text-blue-600 mb-4">Adicionar Nova Conta A Receber (Venda Fiado)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label>Nome do Cliente</Label>
                  <Input
                    placeholder="Nome Completo"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Placa</Label>
                  <Input
                    placeholder="AAA-0000"
                    value={placaCliente}
                    onChange={(e) => setPlacaCliente(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Valor a Receber</Label>
                  <Input
                    placeholder="R$ 0,00"
                    value={valorConta}
                    onChange={(e) => setValorConta(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={adicionarNovaConta} className="w-full">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar A Receber
                  </Button>
                </div>
              </div>

              {/* Lista de novas contas */}
              {novasContas.length > 0 && (
                <div className="space-y-2 mb-4">
                  {novasContas.map((conta) => (
                    <div key={conta.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <span className="font-medium">{conta.cliente}</span>
                        <span className="text-sm text-muted-foreground ml-2">({conta.placa})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-blue-600">{formatCurrency(conta.valor)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNovasContas(novasContas.filter(c => c.id !== conta.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {novasContas.length === 0 && (
                <p className="text-center text-muted-foreground mb-4">
                  Nenhuma conta a receber criada para este fechamento.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Resumo Final */}
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Resumo Final</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Entradas Padrão:</span>
                  <span className="font-bold">{formatCurrency(totais.totalEntradasPadrao)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Receb. Pendentes:</span>
                  <span className="font-bold">{formatCurrency(totais.totalRecebimentosPendentes)}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>Total Entradas Eletrônicas:</span>
                  <span className="font-bold">{formatCurrency(totais.totalEntradasEletonicas)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Total Saídas Variáveis:</span>
                  <span className="font-bold">{formatCurrency(totais.totalSaidasVariaveis)}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>Total Novas A Receber:</span>
                  <span className="font-bold">{formatCurrency(totais.totalNovasContas)}</span>
                </div>
                <div className="flex justify-between text-red-600 text-lg font-bold border-t pt-2">
                  <span>Total Saídas:</span>
                  <span>{formatCurrency(totais.totalSaidas)}</span>
                </div>
                <div className="flex justify-between text-blue-600 border-t pt-2">
                  <span>Total Entradas Brutas:</span>
                  <span className="font-bold">{formatCurrency(totais.totalEntradasBrutas)}</span>
                </div>
                <div className="flex justify-between text-purple-600 text-lg font-bold">
                  <span>Saldo Líquido:</span>
                  <span className="font-bold">{formatCurrency(totais.saldoLiquido)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Saldo Eletrônico (PIX + Cartão + Depósito):</span>
                  <span className="font-bold">{formatCurrency(totais.saldoEletronico)}</span>
                </div>
                <div className="flex justify-between text-2xl font-bold border-t-2 pt-4">
                  <span>SALDO EM DINHEIRO:</span>
                  <span className={totais.saldoEmDinheiro >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(totais.saldoEmDinheiro)}
                  </span>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  (Saldo Líquido - Saldo Eletrônico = Valor físico no caixa)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Botão Salvar */}
          <div className="flex justify-center">
            <Button 
              onClick={salvarFechamento}
              size="lg" 
              disabled={salvarFechamentoMutation.isPending}
              className="min-w-48"
            >
              {salvarFechamentoMutation.isPending ? (
                "Salvando..."
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Salvar Fechamento
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}