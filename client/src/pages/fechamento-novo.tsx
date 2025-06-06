import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';
import { VISTORIA_VALUES } from '@/config/values';
import { useNavigate } from 'react-router-dom';

// Tipos auxiliares
interface EntradaComum {
  tipo: string;
  quantidade: number;
  valorUnitario: number;
}

interface EntradaEletronica {
  tipo: string;
  valor: number;
}

interface SaidaOperacional {
  nome: string;
  valor: number;
  dataPagamento: string;
}

interface ContaReceber {
  nome: string;
  placa: string;
  valor: number;
}

export default function FechamentoNovo() {
  const { user } = useAuth();
  const [dataFechamento, setDataFechamento] = useState<string>(new Date().toISOString().split('T')[0]);
  const [operador, setOperador] = useState<string>(user?.nome || '');
  const navigate = useNavigate();

  // Entradas comuns
  const [entradasComuns, setEntradasComuns] = useState<EntradaComum[]>([
    { tipo: 'carro', quantidade: 0, valorUnitario: VISTORIA_VALUES.CARRO },
    { tipo: 'caminhonete', quantidade: 0, valorUnitario: VISTORIA_VALUES.CAMINHONETE },
    { tipo: 'caminhao', quantidade: 0, valorUnitario: VISTORIA_VALUES.CAMINHAO },
    { tipo: 'moto', quantidade: 0, valorUnitario: VISTORIA_VALUES.MOTO },
    { tipo: 'cautelar', quantidade: 0, valorUnitario: VISTORIA_VALUES.CAUTELAR },
    { tipo: 'revistoriaDetran', quantidade: 0, valorUnitario: VISTORIA_VALUES.REVISTORIA_DETRAN },
    { tipo: 'pesquisa', quantidade: 0, valorUnitario: VISTORIA_VALUES.PESQUISA },
  ]);

  // Entradas eletrônicas
  const [entradasEletronicas, setEntradasEletronicas] = useState<EntradaEletronica[]>([
    { tipo: 'Pix', valor: 0 },
    { tipo: 'Cartão', valor: 0 },
    { tipo: 'Depósito', valor: 0 },
  ]);

  // Saídas operacionais
  const [saidasOperacionais, setSaidasOperacionais] = useState<SaidaOperacional[]>([]);
  const [novaSaida, setNovaSaida] = useState<SaidaOperacional>({ nome: '', valor: 0, dataPagamento: dataFechamento });

  // Contas a receber
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [novaConta, setNovaConta] = useState<ContaReceber>({ nome: '', placa: '', valor: 0 });

  // Funções auxiliares
  const handleQuantidadeChange = (tipo: string, quantidade: number) => {
    setEntradasComuns(prev => prev.map(e => e.tipo === tipo ? { ...e, quantidade } : e));
  };

  const handleEntradaEletronicaChange = (tipo: string, valor: number) => {
    setEntradasEletronicas(prev => prev.map(e => e.tipo === tipo ? { ...e, valor } : e));
  };

  const handleAddSaida = () => {
    if (novaSaida.nome && novaSaida.valor > 0) {
      setSaidasOperacionais(prev => [...prev, novaSaida]);
      setNovaSaida({ nome: '', valor: 0, dataPagamento: dataFechamento });
    }
  };

  const handleAddContaReceber = () => {
    if (novaConta.nome && novaConta.placa && novaConta.valor > 0) {
      setContasReceber(prev => [...prev, novaConta]);
      setNovaConta({ nome: '', placa: '', valor: 0 });
    }
  };

  // Cálculos
  const totalEntradasComuns = entradasComuns.reduce((acc, e) => acc + e.quantidade * e.valorUnitario, 0);
  const totalEntradasEletronicas = entradasEletronicas.reduce((acc, e) => acc + e.valor, 0);
  const totalSaidas = saidasOperacionais.reduce((acc, s) => acc + s.valor, 0);
  const totalAReceber = contasReceber.reduce((acc, c) => acc + c.valor, 0);
  const totalEntradasBrutas = totalEntradasComuns + totalAReceber;
  const totalSaidasGeral = totalSaidas + totalAReceber;
  const resultadoParcial = totalEntradasBrutas - totalSaidasGeral;
  const valorEspecie = resultadoParcial - totalEntradasEletronicas;

  // Salvar fechamento (integração futura)
  const handleSalvarFechamento = async () => {
    if (!user) {
      alert('Erro: Usuário não autenticado.');
      return;
    }

    // Mapear entradas comuns para o formato do backend
    const entradasComunsMapped = entradasComuns.reduce((acc, entrada) => {
      // Mapear tipo do frontend para a chave do backend (lidar com singular/plural e nomes)
      const backendKey = entrada.tipo === 'carro' ? 'carros' : entrada.tipo === 'moto' ? 'motos' : entrada.tipo === 'caminhao' ? 'caminhoes' : null; // Adicione outros tipos de veículo se necessário

      if (backendKey) {
        // Atribuir quantidade (é um número no schema do backend)
        (acc as any)[`${backendKey}Quantidade`] = entrada.quantidade;
        // Atribuir valor (é uma string decimal no schema do backend)
        (acc as any)[backendKey] = (entrada.quantidade * entrada.valorUnitario).toFixed(2);
      }
       // Note: outros tipos como cautelar, revistoria, pesquisa não estão mapeados para campos específicos no schema 'fechamentos'.
       // Eles precisariam ser adicionados ao schema ou tratados de forma diferente (e.g., como parte de saidasVariaveis ou um novo campo JSON de 'outrasEntradas').
       // Por enquanto, apenas os tipos 'carro', 'moto', 'caminhao' serão enviados para os campos específicos.

      return acc;
    }, { 
        carrosQuantidade: 0, carros: "0.00",
        motosQuantidade: 0, motos: "0.00",
        caminhoesQuantidade: 0, caminhoes: "0.00",
         // Inicializar saídas fixas com "0.00" por enquanto (baseado no schema do backend)
        aluguel: "0.00",
        energia: "0.00",
        funcionario: "0.00",
        despachante: "0.00",
         // Incluir os outros campos do schema que não são entradas comuns/saídas fixas
        dataFechamento: "", // Será preenchido depois
        lojaId: "", // Será preenchido depois
        userId: "", // Será preenchido depois
        operatorName: operador, // Já temos o operador
        saidasVariaveis: "[]",
        pagamentosRecebidos: "[]",
        aReceber: "[]",
        totalEntradas: "0.00",
        totalSaidasFixas: "0.00",
        totalSaidasVariaveis: "0.00",
        totalSaidas: "0.00",
        totalPagamentosRecebidos: "0.00",
        totalAReceber: "0.00",
        saldoFinal: "0.00",
    } as any); // Usar 'as any' temporariamente para evitar erros de tipo complexos no mapeamento

    // Usar o mock currentUser para uid e lojaId, já que o 'user' do contexto não tem essas propriedades
    // Em um app real, o 'user' autenticado precisaria ter essas infos ou elas viriam de outro lugar.
    const userIdToSend = user.uid; // Usando o mock
    const lojaIdToSend = user.lojaId; // Usando o mock

    const fechamentoData = {
      dataFechamento: dataFechamento, // YYYY-MM-DD
      lojaId: lojaIdToSend,
      userId: userIdToSend,
      operatorName: operador,

      // Entradas Comuns mapeadas (agora já incluem os campos específicos)
      carros: entradasComunsMapped.carros,
      carrosQuantidade: entradasComunsMapped.carrosQuantidade,
      motos: entradasComunsMapped.motos,
      motosQuantidade: entradasComunsMapped.motosQuantidade,
      caminhoes: entradasComunsMapped.caminhoes,
      caminhoesQuantidade: entradasComunsMapped.caminhoesQuantidade,
      // Saídas fixas vêm do inicializador
      aluguel: entradasComunsMapped.aluguel,
      energia: entradasComunsMapped.energia,
      funcionario: entradasComunsMapped.funcionario,
      despachante: entradasComunsMapped.despachante,

      // Saídas Variáveis e Contas a Receber como JSON strings
      saidasVariaveis: JSON.stringify(saidasOperacionais),
      pagamentosRecebidos: JSON.stringify([]), // Não temos essa funcionalidade ainda
      aReceber: JSON.stringify(contasReceber),

      // Totais calculados (formato string com 2 casas decimais)
      totalEntradas: totalEntradasComuns.toFixed(2),
      totalSaidasFixas: (0.00).toFixed(2), // Saídas fixas não estão no frontend atual, enviando 0
      totalSaidasVariaveis: totalSaidas.toFixed(2),
      totalSaidas: totalSaidas.toFixed(2), // Total Saídas = Saídas Fixas + Saídas Variáveis (como fixas são 0 aqui)
      totalPagamentosRecebidos: (0.00).toFixed(2), // Não temos essa funcionalidade ainda, enviando 0
      totalAReceber: totalAReceber.toFixed(2),
      saldoFinal: valorEspecie.toFixed(2),
    };

    console.log('Dados a serem enviados:', fechamentoData);

    try {
      const response = await fetch('/api/fechamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fechamentoData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao salvar fechamento:', errorData);
        alert(`Erro ao salvar fechamento: ${errorData.message || response.statusText}`);
      } else {
        const savedFechamento = await response.json();
        console.log('Fechamento salvo com sucesso!', savedFechamento);
        alert('Fechamento salvo com sucesso!');
        // Opcional: redirecionar para o dashboard ou limpar o formulário
        // navigate('/dashboard');
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('Erro na requisição ao salvar fechamento.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e0e7ef] flex flex-col">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-8 py-4 bg-white shadow-md rounded-b-xl">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo Top Vistorias" className="h-12 drop-shadow" />
        </div>
        <div className="text-[#20446A] font-semibold text-lg">
          {user?.nome || user?.name ? `Top ${user?.nome || user?.name}` : ''}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-10">
        <div className="w-full max-w-5xl space-y-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-extrabold text-[#20446A] tracking-tight">Novo Fechamento de Caixa</h1>
            <button 
              className="px-5 py-2 rounded-lg bg-[#e5e7eb] text-[#20446A] font-semibold border border-gray-200 hover:bg-[#d1d5db] transition-colors shadow-sm"
              onClick={() => navigate('/dashboard')}
            >
              &larr; Voltar ao Painel
            </button>
          </div>

          {/* Informações do Fechamento */}
          <section className="bg-white rounded-2xl shadow-lg p-8 mb-2 border border-slate-100">
            <h2 className="text-xl font-bold text-[#20446A] mb-6">Informações do Fechamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Fechamento</label>
                <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] transition" value={dataFechamento} onChange={e => setDataFechamento(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Operador</label>
                <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] transition" value={operador} onChange={e => setOperador(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Use o formato Dia/Mês/Ano. O operador será registrado no fechamento do sistema.</p>
          </section>

          {/* Entradas Comuns */}
          <section className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
            <h2 className="text-xl font-bold text-[#20446A] mb-6">Entradas Comuns</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-4">
              {entradasComuns.map((entrada, idx) => (
                <div
                  key={entrada.tipo}
                  className="bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col items-center p-6 transition hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2 mb-2">
                    <div className="p-3 rounded-full bg-blue-50 mb-1">
                      {/* Ícone pode ser substituído por SVG/Lucide, aqui uso emoji para exemplo */}
                      <span className="text-3xl">
                        {entrada.tipo === 'carro' && '🚗'}
                        {entrada.tipo === 'caminhonete' && '🛻'}
                        {entrada.tipo === 'caminhao' && '🚚'}
                        {entrada.tipo === 'moto' && '🏍️'}
                        {entrada.tipo === 'cautelar' && '📋'}
                        {entrada.tipo === 'revistoriaDetran' && '✅'}
                        {entrada.tipo === 'pesquisa' && '🔎'}
                      </span>
                    </div>
                    <span className="text-base font-semibold text-gray-800 text-center">
                      {entrada.tipo === 'revistoriaDetran' ? 'Revistoria DETRAN' : entrada.tipo.charAt(0).toUpperCase() + entrada.tipo.slice(1)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    className="w-20 text-center border border-gray-200 rounded-lg py-2 px-2 focus:ring-2 focus:ring-blue-200 outline-none text-lg font-semibold mb-2"
                    value={entrada.quantidade}
                    onChange={e => handleQuantidadeChange(entrada.tipo, Number(e.target.value))}
                  />
                  <span className="text-xs text-gray-500 mb-1">Valor Unitário: <b className="text-blue-600">R$ {entrada.valorUnitario.toFixed(2)}</b></span>
                  <span className="text-sm font-bold text-gray-700 mt-2">Subtotal: R$ {(entrada.quantidade * entrada.valorUnitario).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="text-right font-bold text-[#20446A] text-lg">Total Entradas Comuns: R$ {totalEntradasComuns.toFixed(2)}</div>
          </section>

          {/* Entradas Eletrônicas */}
          <section className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
            <h2 className="text-xl font-bold text-[#20446A] mb-6">Entradas Eletrônicas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-4">
              {entradasEletronicas.map((entrada, idx) => (
                <div
                  key={entrada.tipo}
                  className="bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col items-center p-6 transition hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2 mb-2">
                    <div className="p-3 rounded-full bg-blue-50 mb-1">
                      <span className="text-3xl">
                        {entrada.tipo === 'Pix' && '💸'}
                        {entrada.tipo === 'Cartão' && '💳'}
                        {entrada.tipo === 'Depósito' && '🏦'}
                      </span>
                    </div>
                    <span className="text-base font-semibold text-gray-800 text-center">{entrada.tipo}</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    className="w-24 text-center border border-gray-200 rounded-lg py-2 px-2 focus:ring-2 focus:ring-blue-200 outline-none text-lg font-semibold mb-2"
                    value={entrada.valor}
                    onChange={e => handleEntradaEletronicaChange(entrada.tipo, Number(e.target.value))}
                  />
                  <span className="text-xs text-gray-500">R$</span>
                </div>
              ))}
            </div>
            <div className="text-right font-bold text-[#20446A] text-lg">Total Entradas Eletrônicas: R$ {totalEntradasEletronicas.toFixed(2)}</div>
          </section>

          {/* Saídas Operacionais */}
          <section className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
            <h2 className="text-xl font-bold text-[#dc2626] mb-6">Saídas e Novas Contas a Receber</h2>
            <div className="mb-6">
              <h3 className="font-semibold text-[#dc2626] mb-3">Saídas Operacionais (Loja)</h3>
              <div className="flex flex-col md:flex-row gap-2 mb-2">
                <input type="text" placeholder="Ex: Material de Limpeza" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] transition" value={novaSaida.nome} onChange={e => setNovaSaida({ ...novaSaida, nome: e.target.value })} />
                <input type="number" min={0} placeholder="Valor" className="w-32 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] transition" value={novaSaida.valor} onChange={e => setNovaSaida({ ...novaSaida, valor: Number(e.target.value) })} />
                <input type="date" className="w-40 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] transition" value={novaSaida.dataPagamento} onChange={e => setNovaSaida({ ...novaSaida, dataPagamento: e.target.value })} />
                <button type="button" className="px-4 py-2 rounded-lg bg-[#2563eb] text-white font-semibold hover:bg-[#1d4ed8] transition-colors shadow" onClick={handleAddSaida}>Adicionar Saída</button>
              </div>
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th>Nome de Saída</th>
                    <th>Valor</th>
                    <th>Data Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {saidasOperacionais.length === 0 ? (
                    <tr><td colSpan={3} className="text-center text-gray-400 italic py-4">Nenhuma saída operacional da loja adicionada.</td></tr>
                  ) : saidasOperacionais.map((saida, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td>{saida.nome}</td>
                      <td>R$ {saida.valor.toFixed(2)}</td>
                      <td>{saida.dataPagamento}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Contas a Receber */}
            <div className="mb-6">
              <h3 className="font-semibold text-[#dc2626] mb-3">Adicionar Nova Conta A Receber (Venda Fiado)</h3>
              <div className="flex flex-col md:flex-row gap-2 mb-2">
                <input type="text" placeholder="Nome Completo" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] transition" value={novaConta.nome} onChange={e => setNovaConta({ ...novaConta, nome: e.target.value })} />
                <input type="text" placeholder="Placa" className="w-32 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] transition" value={novaConta.placa} onChange={e => setNovaConta({ ...novaConta, placa: e.target.value })} />
                <input type="number" min={0} placeholder="Valor a Receber" className="w-40 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] transition" value={novaConta.valor} onChange={e => setNovaConta({ ...novaConta, valor: Number(e.target.value) })} />
                <button type="button" className="px-4 py-2 rounded-lg bg-[#2563eb] text-white font-semibold hover:bg-[#1d4ed8] transition-colors shadow" onClick={handleAddContaReceber}>Adicionar A Receber</button>
              </div>
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th>Nome do Cliente</th>
                    <th>Placa</th>
                    <th>Valor a Receber</th>
                  </tr>
                </thead>
                <tbody>
                  {contasReceber.length === 0 ? (
                    <tr><td colSpan={3} className="text-center text-gray-400 italic py-4">Nenhuma nova conta a receber criada para este fechamento.</td></tr>
                  ) : contasReceber.map((conta, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td>{conta.nome}</td>
                      <td>{conta.placa}</td>
                      <td>R$ {conta.valor.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right font-bold text-[#dc2626] text-lg">Total Saídas Geral (Operac. + Novas A Receber): R$ {totalSaidasGeral.toFixed(2)}</div>
          </section>

          {/* Resumo Final do Caixa */}
          <section className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
            <h2 className="text-xl font-bold text-[#20446A] mb-6">Resumo Final do Caixa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div className="flex flex-col gap-3 text-base">
                <span>Entradas Totais Brutas (Comuns + Receb. Pendentes):</span>
                <span>Saídas Totais Gerais (Operacionais + Novas A Receber):</span>
                <span>Resultado Parcial:</span>
                <span>Entradas Eletrônicas (Pix, Cartão, Depósito):</span>
                <span className="font-bold">Valor em Espécie para Conferência:</span>
              </div>
              <div className="flex flex-col gap-3 text-right text-base">
                <span>R$ {totalEntradasBrutas.toFixed(2)}</span>
                <span>R$ {totalSaidasGeral.toFixed(2)}</span>
                <span>R$ {resultadoParcial.toFixed(2)}</span>
                <span className="text-blue-600">R$ {totalEntradasEletronicas.toFixed(2)}</span>
                <span className="font-bold text-[#20446A]">R$ {valorEspecie.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-4">(Entradas Brutas - Saídas Gerais - Entradas Eletrônicas)</div>
            <div className="flex justify-end mt-6">
              <button className="px-8 py-3 rounded-xl bg-[#2563eb] text-white font-bold text-lg hover:bg-[#1d4ed8] transition-colors shadow-lg" onClick={handleSalvarFechamento}>Salvar Fechamento</button>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-gray-400 py-4 mt-auto">
        © {new Date().getFullYear()} Fechamento de Caixa App.<br />
        Desenvolvido por Bruno Gonçalves
      </footer>
    </div>
  );
}