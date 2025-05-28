'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
    auth,
    db,
    collectionGroup,
    query,
    where,
    getDocs,
    Timestamp,
    doc,
    updateDoc,
    collection,
    orderBy,
    limit,
    getDoc
} from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/navbar';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { format, parse, isValid, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Filter, DollarSign, TrendingUp, TrendingDown, Building, Car, Truck, Bike, FileSearch, ClipboardPen, CreditCard, QrCode, Banknote, Utensils, UserMinus, Receipt, Package, CheckCircle, CircleDollarSign, XCircle, ListChecks, type LucideIcon, Wallet, Landmark, Hourglass } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend, ResponsiveContainer, useChart } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Define interface for closing data
interface ClosingData {
    id: string;
    dataFechamento: string; // YYYY-MM-DD
    calculatedTotals: {
        saldoFinal?: number;
        totalEntradas?: number;
        totalSaidas?: number;
        totalSaidasFixas?: number;
        totalSaidasDinamicas?: number;
    };
    entradas?: Record<string, number>;
    saidasFixas?: Record<string, number>;
    saidasDinamicas?: { nome: string; valor: number }[];
    recebimentos?: { nomeCliente: string; valor: number; receivableId: string }[];
    userEmail?: string;
    lojaId?: string;
    userId?: string;
    operatorName?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// Define interface for aggregated stats
interface StoreStats {
    totalEntradas: number;
    totalSaidas: number;
    totalSaidasCaixa: number;
    totalEntradasNaoCaixa: number;
    saldoFinalCaixa: number;
    totalRecebimentosPendentes: number;
    count: number;
}

// Define interface for chart data
interface ChartData {
    name: string;
    total: number;
    fill: string;
    fillOpacity?: number;
}

type ReceivableStatus = 'pendente' | 'pago' | 'baixado';
interface ReceivableData {
    id: string;
    nomeCliente: string;
    placa: string;
    valorReceber: number;
    dataDebito: string; // YYYY-MM-DD
    lojaId: string;
    userId: string;
    status: ReceivableStatus;
    createdAt: Timestamp;
    fechamentoId: string;
    dataPagamento: Timestamp | null;
    dataBaixa: Timestamp | null;
}


const ADMIN_UID = "txxp9hdSthOmlDKGipwduZJNNak1";
const ADMIN_NAME = "Simone";

const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getStoreName = (email: string | null | undefined): string => {
    if (!email) return 'Desconhecida';
    if (email === 'topcapaobonito@hotmail.com') return 'Top Capão Bonito';
    if (email === 'topguapiara@hotmail.com') return 'Top Guapiara';
    if (email === 'topribeiraobranco@hotmail.com') return 'Top Ribeirão Branco';
    if (email === 'adm@topvistorias.com') return 'Administrador';
    return email;
};

const getStoreIdFromDoc = (docData: ClosingData): string | 'all' => {
    if (docData.lojaId) return docData.lojaId;
    if (!docData.userEmail) return 'all';
    if (docData.userEmail === 'topcapaobonito@hotmail.com') return 'capao';
    if (docData.userEmail === 'topguapiara@hotmail.com') return 'guapiara';
    if (docData.userEmail === 'topribeiraobranco@hotmail.com') return 'ribeirao';
    if (docData.userEmail === 'adm@topvistorias.com') return 'admin';
    return 'all';
};

const getEmailFromStoreId = (storeId: string): string | null => {
    if (storeId === 'capao') return 'topcapaobonito@hotmail.com';
    if (storeId === 'guapiara') return 'topguapiara@hotmail.com';
    if (storeId === 'ribeirao') return 'topribeiraobranco@hotmail.com';
    if (storeId === 'admin') return 'adm@topvistorias.com';
    return null;
}

const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
};

const parseInputDate = (dateString: string): string | null => {
    if (!dateString || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return null;
    }
    try {
        const parsedDate = parse(dateString, 'dd/MM/yyyy', new Date());
        if (isValid(parsedDate)) {
            return format(parsedDate, 'yyyy-MM-dd');
        }
        return null;
    } catch (e) {
        console.error("Error parsing date string:", dateString, e);
        return null;
    }
};

const entradaIdToLabelMap: Record<string, { label: string; icon: LucideIcon }> = {
    carro: { label: "Carro", icon: Car },
    caminhonete: { label: "Caminhonete", icon: Truck },
    caminhao: { label: "Caminhão", icon: Truck },
    moto: { label: "Moto", icon: Bike },
    cautelar: { label: "Cautelar", icon: ClipboardPen },
    revistoriaDetran: { label: "Revistoria DETRAN", icon: Building },
    pesquisaProcedencia: { label: "Pesquisa de Procedência", icon: FileSearch },
    recebimentoPendente: { label: "Recebimento Pendente", icon: Wallet },
};

const saidaFixaIdToLabelMap: Record<string, { label: string; icon: LucideIcon; isCashReducing: boolean }> = {
    cartao: { label: "Cartão", icon: CreditCard, isCashReducing: false },
    pix: { label: "Pix", icon: QrCode, isCashReducing: false },
    deposito: { label: "Depósito", icon: Banknote, isCashReducing: false },
    almoco: { label: "Almoço", icon: Utensils, isCashReducing: true },
    retiradaSimone: { label: "Retirada Simone", icon: UserMinus, isCashReducing: true },
    vale: { label: "Vale", icon: Receipt, isCashReducing: true },
};

const generateChartConfig = (map: Record<string, { label: string; icon?: LucideIcon; isCashReducing?: boolean }>): ChartConfig => {
  const config: ChartConfig = {};
  Object.entries(map).forEach(([key, value], index) => {
      config[value.label] = {
        label: value.label,
        icon: value.icon,
        color: `hsl(var(--chart-${(index % 5) + 1}))`
      };
  });
  if ('cartao' in map) {
     config['Outras Saídas'] = {
         label: 'Outras Saídas',
         icon: Package,
         color: `hsl(var(--chart-${(Object.keys(map).length % 5) + 1}))`
     }
  }
  if ('recebimentoPendente' in map) {
     config['Recebimento Pendente'] = { label: 'Recebimento Pendente', icon: Wallet, color: `hsl(var(--chart-3))`};
  }
  return config;
};

const entradaChartConfig = generateChartConfig(entradaIdToLabelMap);
const saidaChartConfig = generateChartConfig(saidaFixaIdToLabelMap);

const ChartLegendContent = React.memo(({ payload }: { payload?: any[] }) => {
    const { config } = useChart();
    if (!payload || !config) return null;

    return (
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {payload.map((item) => {
            const name = item.payload?.name || item.name;
            const itemConfig = config[name as keyof typeof config];
            if (!itemConfig) return null;
            const Icon = itemConfig?.icon;
            const label = itemConfig?.label || name;
            return (
                <div key={name} className="flex items-center gap-1.5">
                 <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: item.color }}
                 />
                  {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
                 <span>{label}</span>
               </div>
             );
        })}
      </div>
    );
});
ChartLegendContent.displayName = 'ChartLegendContent';

enum ReceivableFilterStatus {
    Pendente = 'pendente',
    PagoPendenteBaixa = 'pago_pendente_baixa',
    Baixado = 'baixado',
    Todos = 'todos'
}

export default function AdminDashboardPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = React.useState<User | null>(null);
    const [authLoading, setAuthLoading] = React.useState(true);
    const [dataLoading, setDataLoading] = React.useState(false);
    const [closingsData, setClosingsData] = React.useState<ClosingData[]>([]);
    const [stats, setStats] = React.useState<Record<string, StoreStats>>({});
    const [totalStats, setTotalStats] = React.useState<StoreStats>({ totalEntradas: 0, totalSaidas: 0, totalSaidasCaixa: 0, totalEntradasNaoCaixa: 0, saldoFinalCaixa: 0, totalRecebimentosPendentes: 0, count: 0 });
    const [startDateInput, setStartDateInput] = React.useState<string>('');
    const [endDateInput, setEndDateInput] = React.useState<string>('');
    const [selectedStore, setSelectedStore] = React.useState<string>('all');
    const [greeting, setGreeting] = React.useState<string>('');
    const [entradasChartData, setEntradasChartData] = React.useState<ChartData[]>([]);
    const [saidasChartData, setSaidasChartData] = React.useState<ChartData[]>([]);
    const [receivablesData, setReceivablesData] = React.useState<ReceivableData[]>([]);
    const [receivablesLoading, setReceivablesLoading] = React.useState(false);
    const [selectedReceivableStatus, setSelectedReceivableStatus] = React.useState<ReceivableFilterStatus>(ReceivableFilterStatus.PagoPendenteBaixa);


    React.useEffect(() => {
        setGreeting(getGreeting());
    }, []);

    const fetchAllClosings = async (startDate: string | null, endDate: string | null, currentStore: string) => {
        console.log(`Admin Dashboard: Fetching closings... StartDate: ${startDate}, EndDate: ${endDate}, Store: ${currentStore}`);
        setDataLoading(true);
        setClosingsData([]);
        setStats({});
        setTotalStats({ totalEntradas: 0, totalSaidas: 0, totalSaidasCaixa: 0, totalEntradasNaoCaixa: 0, saldoFinalCaixa: 0, totalRecebimentosPendentes: 0, count: 0 });
        setEntradasChartData([]);
        setSaidasChartData([]);

        try {
            let q = query(collectionGroup(db, 'fechamentos'));
            let queryDescription = "Querying collection group 'fechamentos'";

            if (startDate) {
                q = query(q, where("dataFechamento", ">=", startDate));
                queryDescription += ` from ${startDate}`;
            }
            if (endDate) {
                if (startDate && endDate !== startDate) { // Range query
                    q = query(q, where("dataFechamento", "<=", endDate));
                    queryDescription += ` to ${endDate}`;
                } else if (startDate && endDate === startDate) { // Single day query, already handled by >=
                    // If only one date is provided, it's treated as startDate.
                    // To ensure only that day, the previous >= and a new == would be redundant.
                    // If exact match is needed for single date, this logic needs slight adjustment.
                    // For now, >= startDate covers a single day if endDate is not different.
                    // Let's make it explicit for single day:
                    if (endDate === startDate) {
                         q = query(collectionGroup(db, 'fechamentos'), where("dataFechamento", "==", startDate));
                         queryDescription = `Querying collection group 'fechamentos' for date ${startDate}`;
                    }
                }
            }

            if (currentStore !== 'all') {
                q = query(q, where("lojaId", "==", currentStore));
                queryDescription += ` for store ${currentStore}`;
            }
            
            // Always order by date descending to get recent first if no date filter, or to order within range
            q = query(q, orderBy("dataFechamento", "desc"));
            queryDescription += ` ordered by dataFechamento desc.`;


            console.log(`Admin Dashboard: Firestore Query: ${queryDescription}`);
            const querySnapshot = await getDocs(q);
            console.log(`Admin Dashboard: Found ${querySnapshot.size} total documents with query.`);

            const fetchedData: ClosingData[] = [];
            const storeStatsAccumulator: Record<string, StoreStats> = {
                capao: { totalEntradas: 0, totalSaidas: 0, totalSaidasCaixa: 0, totalEntradasNaoCaixa: 0, saldoFinalCaixa: 0, totalRecebimentosPendentes: 0, count: 0 },
                guapiara: { totalEntradas: 0, totalSaidas: 0, totalSaidasCaixa: 0, totalEntradasNaoCaixa: 0, saldoFinalCaixa: 0, totalRecebimentosPendentes: 0, count: 0 },
                ribeirao: { totalEntradas: 0, totalSaidas: 0, totalSaidasCaixa: 0, totalEntradasNaoCaixa: 0, saldoFinalCaixa: 0, totalRecebimentosPendentes: 0, count: 0 },
            };
            let totalStatsAccumulator: StoreStats = { totalEntradas: 0, totalSaidas: 0, totalSaidasCaixa: 0, totalEntradasNaoCaixa: 0, saldoFinalCaixa: 0, totalRecebimentosPendentes: 0, count: 0 };
            const entradasAggregator: Record<string, number> = { 'Recebimento Pendente': 0 };
            const saidasAggregator: Record<string, number> = { 'Outras Saídas': 0 };

            querySnapshot.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() } as ClosingData;

                 if (!data.dataFechamento || !data.calculatedTotals || !data.entradas || !data.saidasFixas) {
                     console.warn("Admin Dashboard: Skipping closing document due to missing core data:", doc.id, data);
                     return;
                 }

                // Client-side filtering is now mostly handled by Firestore query
                // However, if currentStore was 'all', we still need to identify storeId for per-store stats
                const storeIdForStats = getStoreIdFromDoc(data);

                fetchedData.push(data);

                let currentSaidasCaixa = 0;
                let currentEntradasNaoCaixa = 0;
                let currentRecebimentosPendentes = 0;

                 Object.entries(data.saidasFixas).forEach(([key, value]) => {
                    const numericValue = Number(value) || 0;
                    const exitInfo = saidaFixaIdToLabelMap[key];
                    if (exitInfo?.isCashReducing) {
                        currentSaidasCaixa += numericValue;
                    } else if (key === 'cartao' || key === 'pix' || key === 'deposito') {
                        currentEntradasNaoCaixa += numericValue;
                    }
                });
                 (data.saidasDinamicas || []).forEach(exit => {
                    currentSaidasCaixa += Number(exit.valor) || 0;
                 });
                (data.recebimentos || []).forEach(receipt => {
                    currentRecebimentosPendentes += Number(receipt.valor) || 0;
                });

                const totalEntradasNum = (Number(data.calculatedTotals.totalEntradas) || 0) + currentRecebimentosPendentes;
                const currentSaldoCaixa = totalEntradasNum - currentEntradasNaoCaixa - currentSaidasCaixa;

                totalStatsAccumulator.totalEntradas += totalEntradasNum;
                totalStatsAccumulator.totalSaidas += Number(data.calculatedTotals.totalSaidas) || 0;
                totalStatsAccumulator.totalSaidasCaixa += currentSaidasCaixa;
                totalStatsAccumulator.totalEntradasNaoCaixa += currentEntradasNaoCaixa;
                totalStatsAccumulator.saldoFinalCaixa += currentSaldoCaixa;
                totalStatsAccumulator.totalRecebimentosPendentes += currentRecebimentosPendentes;
                totalStatsAccumulator.count += 1;

                // Accumulate stats per store if 'all' stores are selected (or if specific store matches)
                if (storeIdForStats !== 'all' && storeStatsAccumulator[storeIdForStats]) {
                   storeStatsAccumulator[storeIdForStats].totalEntradas += totalEntradasNum;
                   storeStatsAccumulator[storeIdForStats].totalSaidas += Number(data.calculatedTotals.totalSaidas) || 0;
                   storeStatsAccumulator[storeIdForStats].totalSaidasCaixa += currentSaidasCaixa;
                   storeStatsAccumulator[storeIdForStats].totalEntradasNaoCaixa += currentEntradasNaoCaixa;
                   storeStatsAccumulator[storeIdForStats].saldoFinalCaixa += currentSaldoCaixa;
                   storeStatsAccumulator[storeIdForStats].totalRecebimentosPendentes += currentRecebimentosPendentes;
                   storeStatsAccumulator[storeIdForStats].count += 1;
                }

                 Object.entries(data.entradas).forEach(([key, value]) => {
                   const readableKey = entradaIdToLabelMap[key]?.label || key;
                   entradasAggregator[readableKey] = (entradasAggregator[readableKey] || 0) + (Number(value) || 0);
                 });
                 (data.recebimentos || []).forEach(receipt => {
                    entradasAggregator['Recebimento Pendente'] += Number(receipt.valor) || 0;
                 });
                 Object.entries(data.saidasFixas).forEach(([key, value]) => {
                     const readableKey = saidaFixaIdToLabelMap[key]?.label || key;
                     saidasAggregator[readableKey] = (saidasAggregator[readableKey] || 0) + (Number(value) || 0);
                 });
                 (data.saidasDinamicas || []).forEach(exit => {
                     saidasAggregator['Outras Saídas'] += Number(exit.valor) || 0;
                 });
            });

            console.log(`Admin Dashboard: Processed ${fetchedData.length} closing documents after Firestore query.`);
            // Data is already sorted by Firestore query (orderBy dataFechamento desc)

             const finalEntradasChartData = Object.entries(entradasAggregator)
                 .filter(([, total]) => total > 0)
                 .map(([name, total]) => ({
                     name,
                     total,
                     fill: entradaChartConfig[name]?.color ?? 'hsl(var(--chart-1))'
                    }));

              const finalSaidasChartData = Object.entries(saidasAggregator)
                 .filter(([, total]) => total > 0)
                 .map(([name, total]) => ({
                     name,
                     total,
                     fill: saidaChartConfig[name]?.color ?? 'hsl(var(--chart-2))'
                    }));

            setClosingsData(fetchedData);
            setStats(storeStatsAccumulator);
            setTotalStats(totalStatsAccumulator);
            setEntradasChartData(finalEntradasChartData);
            setSaidasChartData(finalSaidasChartData);
            console.log("Admin Dashboard: Closing data fetched and processed successfully.");

        } catch (error: any) {
            console.error("Admin Dashboard: Error fetching closing data:", error);
            let description = "Não foi possível carregar os dados dos fechamentos.";
             if (error.code === 'permission-denied') {
                description = "Permissão negada para acessar os dados. Verifique as regras de segurança do Firestore.";
            } else if (error.code === 'failed-precondition' || error.message?.toLowerCase().includes("index")) {
                 description = "Índice do Firestore para 'fechamentos' ausente ou sendo criado.";
                 console.warn("Firestore index missing for 'fechamentos' collection group. Required index might depend on the query (e.g., dataFechamento, lojaId). Check the Firestore console link potentially provided in the full error message in the browser console for creating the index. The full error object is:", error);
                 toast({
                    variant: "destructive",
                    title: "Índice do Banco de Dados Necessário",
                    description: description + " Verifique o console do navegador para um link para criar o índice (se fornecido pelo Firestore) ou crie manualmente. Tente aplicar os filtros novamente após a criação do índice.",
                    duration: 7000,
                });
            }
            if (error.code !== 'failed-precondition') { // Avoid double toast for index errors
                toast({
                    variant: "destructive",
                    title: "Erro ao Buscar Dados",
                    description: description,
                    duration: 3000,
                });
            }
        } finally {
            setDataLoading(false);
            console.log("Admin Dashboard: fetchAllClosings finished.");
        }
    };

    const fetchReceivables = async (storeFilter: string, statusFilter: ReceivableFilterStatus) => {
        console.log(`Admin Dashboard: Fetching receivables... Store: ${storeFilter}, Status: ${statusFilter}`);
        setReceivablesLoading(true);
        setReceivablesData([]);

        try {
            if (!db) {
                console.error("Admin Dashboard: Firestore database is not initialized for fetchReceivables.");
                throw new Error("Firestore database is not initialized.");
            }

            const receivablesRef = collection(db, 'contasReceber');
            let q = query(receivablesRef);
            let queryDescription = "Querying 'contasReceber' collection";

            if (storeFilter !== 'all') {
                q = query(q, where("lojaId", "==", storeFilter));
                queryDescription += ` for lojaId == "${storeFilter}"`;
            }

            switch (statusFilter) {
                case ReceivableFilterStatus.Pendente:
                    q = query(q, where("status", "==", "pendente"));
                    queryDescription += ` and status == "pendente"`;
                    break;
                case ReceivableFilterStatus.PagoPendenteBaixa:
                    q = query(q, where("status", "==", "pago"), where("dataBaixa", "==", null));
                    queryDescription += ` and status == "pago" and dataBaixa == null`;
                    break;
                case ReceivableFilterStatus.Baixado:
                    q = query(q, where("status", "==", "pago"), where("dataBaixa", "!=", null));
                    queryDescription += ` and status == "pago" and dataBaixa != null`;
                    break;
                case ReceivableFilterStatus.Todos:
                    queryDescription += ` (all statuses)`;
                    break;
                default:
                    console.warn(`Admin Dashboard: Unknown receivable status filter: ${statusFilter}. Fetching all.`);
                    queryDescription += ` (unknown status filter, fetching all)`;
            }

            q = query(q, orderBy("createdAt", "desc"));
            queryDescription += ` ordered by createdAt desc.`;

            console.log(`Admin Dashboard: Executing Firestore query: ${queryDescription}`);
            const querySnapshot = await getDocs(q);
            console.log(`Admin Dashboard: Found ${querySnapshot.size} receivable documents after query.`);

            const fetchedData: ReceivableData[] = [];
            querySnapshot.forEach((doc) => {
                 const data = doc.data();
                 if (data && data.nomeCliente && data.valorReceber !== undefined && data.dataDebito && data.lojaId && data.status && data.createdAt) {
                     fetchedData.push({
                        id: doc.id,
                        ...data,
                        dataBaixa: data.dataBaixa || null
                     } as ReceivableData);
                 } else {
                    console.warn("Admin Dashboard: Skipping receivable document due to missing/invalid data:", doc.id, data);
                 }
            });

            setReceivablesData(fetchedData);
            console.log("Admin Dashboard: Receivables fetched and processed successfully.");

        } catch (error: any) {
            console.error("Admin Dashboard: Error fetching receivables data:", error);
            let description = "Não foi possível carregar os dados de contas a receber.";
            if (error.code === 'permission-denied') {
                description = "Permissão negada para acessar os dados de contas a receber. Verifique as regras do Firestore.";
            } else if (error.code === 'failed-precondition' || error.message?.toLowerCase().includes("index")) {
                description = "Índice do Firestore para 'contasReceber' ausente ou sendo criado.";
                console.warn("Firestore index missing for 'contasReceber'. Required index might depend on the query. Check the Firestore console link potentially provided in the full error message in the browser console for creating the index. The full error object is:", error);
                 toast({
                    variant: "destructive",
                    title: "Índice do Banco de Dados Necessário",
                    description: description + " Verifique o console do navegador para um link para criar o índice (se fornecido pelo Firestore) ou crie manualmente.",
                    duration: 7000,
                });
                setReceivablesLoading(false);
                return;
            } else if (error.message === "Firestore database is not initialized.") {
                description = "Erro de inicialização do banco de dados. Tente recarregar a página.";
            }
            toast({ variant: "destructive", title: "Erro ao Buscar A Receber", description, duration: 3000 });
        } finally {
            setReceivablesLoading(false);
            console.log("Admin Dashboard: fetchReceivables finished.");
        }
    };


    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser && currentUser.uid === ADMIN_UID) {
                 console.log("Admin Dashboard: Admin user detected. Fetching initial data...");
                const today = new Date();
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 7);
                const initialStartDate = format(sevenDaysAgo, 'yyyy-MM-dd');
                const initialEndDate = format(today, 'yyyy-MM-dd');
                setStartDateInput(format(sevenDaysAgo, 'dd/MM/yyyy'));
                setEndDateInput(format(today, 'dd/MM/yyyy'));
                fetchAllClosings(initialStartDate, initialEndDate, 'all');
                fetchReceivables('all', ReceivableFilterStatus.PagoPendenteBaixa);
                setAuthLoading(false);
            } else if (currentUser) {
                console.warn("Admin Dashboard: Non-admin user detected, redirecting to home.");
                setAuthLoading(false);
                router.push('/');
            } else {
                 console.log("Admin Dashboard: No user detected, redirecting to login.");
                 setAuthLoading(false);
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleApplyClosingFilters = () => {
        console.log("Admin Dashboard: Apply Closing Filters button clicked.");
        const startDate = parseInputDate(startDateInput);
        const endDate = parseInputDate(endDateInput);

        if (startDateInput && !startDate) {
            toast({ variant: "destructive", title: "Data Inicial Inválida", description: "Por favor, use o formato DD/MM/AAAA.", duration: 3000 });
            return;
        }
         if (endDateInput && !endDate) {
            toast({ variant: "destructive", title: "Data Final Inválida", description: "Por favor, use o formato DD/MM/AAAA.", duration: 3000 });
            return;
        }
        if (startDate && endDate && endDate < startDate) {
             toast({ variant: "destructive", title: "Período Inválido", description: "A data final não pode ser anterior à data inicial.", duration: 3000 });
             return;
        }
        // If only one date is input, treat it as a single day filter
        // fetchAllClosings will handle if endDate is null or same as startDate
        fetchAllClosings(startDate, endDate || startDate, selectedStore);
    };

    React.useEffect(() => {
        if (!authLoading && user) {
          console.log(`Admin Dashboard: Receivable filter changed or user loaded. Fetching receivables with store: ${selectedStore}, status: ${selectedReceivableStatus}`);
          fetchReceivables(selectedStore, selectedReceivableStatus);
        } else {
          console.log(`Admin Dashboard: Receivable filter useEffect skipped. AuthLoading: ${authLoading}, User: ${!!user}`);
        }
    }, [selectedStore, selectedReceivableStatus, authLoading, user]);


    const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.slice(0, 8);

        let formattedValue = '';
        if (value.length > 4) {
            formattedValue = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
        } else if (value.length > 2) {
            formattedValue = `${value.slice(0, 2)}/${value.slice(2)}`;
        } else {
            formattedValue = value;
        }
        setter(formattedValue);
    };

     const handleDarBaixa = async (receivableId: string) => {
         console.log(`Admin Dashboard: Marking receivable ${receivableId} as cleared (baixa).`);
         try {
             const receivableRef = doc(db, "contasReceber", receivableId);
             const docSnap = await getDoc(receivableRef);
             if (docSnap.exists() && docSnap.data()?.status === 'pago' && docSnap.data()?.dataBaixa === null) {
                await updateDoc(receivableRef, {
                    dataBaixa: Timestamp.now()
                });
                toast({
                    title: "Sucesso!",
                    description: "Baixa na conta a receber realizada.",
                    duration: 3000,
                });
                fetchReceivables(selectedStore, selectedReceivableStatus);
             } else {
                 console.error("Admin Dashboard: Document not in correct state for 'Dar Baixa'. Doc exists:", docSnap.exists(), "Data:", docSnap.data());
                 throw new Error("Documento não está no estado correto para dar baixa (pago e não baixado).");
             }
         } catch (error: any) {
             console.error("Admin Dashboard: Error marking receivable as cleared:", error);
             toast({
                 variant: "destructive",
                 title: "Erro ao Dar Baixa",
                 description: `Não foi possível dar baixa na conta. Erro: ${error.message || 'Desconhecido'}`,
                 duration: 3000,
             });
              fetchReceivables(selectedStore, selectedReceivableStatus);
         }
     };

     const getReceivableBadgeVariant = (receivable: ReceivableData): "destructive" | "secondary" | "outline" | "default" => {
         if (receivable.status === 'pendente') return "destructive";
         if (receivable.status === 'pago' && receivable.dataBaixa === null) return "secondary";
         if (receivable.status === 'pago' && receivable.dataBaixa !== null) return "outline";
         return "default";
     };

     const getReceivableBadgeText = (receivable: ReceivableData): string => {
         if (receivable.status === 'pendente') return "Pendente";
         if (receivable.status === 'pago' && receivable.dataBaixa === null) return "Pago (Aguard. Baixa)";
         if (receivable.status === 'pago' && receivable.dataBaixa !== null) return "Baixado";
         return receivable.status;
     };


    if (authLoading) {
        return (
             <div className="flex flex-col min-h-screen">
                 <Navbar user={null} />
                 <main className="flex-grow container mx-auto px-4 md:px-8 py-8">
                     <Skeleton className="h-10 w-1/3 mb-8" />
                      <Skeleton className="h-40 w-full mb-8" />
                      <Skeleton className="h-40 w-full mb-8" />
                      <Skeleton className="h-64 w-full mb-8" />
                      <Skeleton className="h-64 w-full mb-8" />
                      <Skeleton className="h-64 w-full mb-8" />
                 </main>
                 <footer className="bg-muted/50 py-3 border-t border-border/60 mt-auto text-center text-xs text-muted-foreground w-full">
                      <Skeleton className="h-4 w-1/3 mx-auto mb-1" />
                      <Skeleton className="h-3 w-1/4 mx-auto" />
                 </footer>
             </div>
        );
    }

    return (
        <AdminAuthGuard adminUid={ADMIN_UID}>
            <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
                <Navbar user={user} />
                <main className="flex-grow container mx-auto px-4 md:px-8 py-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">{greeting}, {ADMIN_NAME}!</h1>
                    <p className="text-muted-foreground mb-8">Bem-vindo(a) ao painel de administrador.</p>

                     <Card className="mb-8 shadow-md border border-border/50">
                         <CardHeader>
                             <CardTitle className="text-xl flex items-center gap-2">
                                <Filter className="h-5 w-5"/>
                                Filtros de Fechamentos
                             </CardTitle>
                              <CardDescription>Selecione período e loja para visualizar os dados dos fechamentos.</CardDescription>
                         </CardHeader>
                         <CardContent className="flex flex-wrap items-end gap-4">
                             <div className="flex-grow space-y-1">
                                 <Label>Período Fechamentos</Label>
                                 <div className="flex flex-col sm:flex-row gap-2">
                                     <Input
                                         type="text" placeholder="DD/MM/AAAA" value={startDateInput}
                                         onChange={(e) => handleDateInputChange(e, setStartDateInput)}
                                         className="h-10 w-full sm:w-[140px]" maxLength={10} />
                                     <span className="text-muted-foreground self-center hidden sm:inline">até</span>
                                     <Input
                                         type="text" placeholder="DD/MM/AAAA" value={endDateInput}
                                         onChange={(e) => handleDateInputChange(e, setEndDateInput)}
                                         className="h-10 w-full sm:w-[140px]" maxLength={10} />
                                 </div>
                             </div>
                              <div className="space-y-1 w-full sm:w-auto min-w-[160px]">
                                <Label htmlFor="store-select">Loja</Label>
                                <Select value={selectedStore} onValueChange={setSelectedStore}>
                                  <SelectTrigger id="store-select" className="w-full h-10">
                                    <SelectValue placeholder="Selecione Loja" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Todas as Lojas</SelectItem>
                                    <SelectItem value="capao">Top Capão Bonito</SelectItem>
                                    <SelectItem value="guapiara">Top Guapiara</SelectItem>
                                    <SelectItem value="ribeirao">Top Ribeirão Branco</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                             <Button onClick={handleApplyClosingFilters} disabled={dataLoading} className="h-10">
                                {dataLoading ? 'Buscando Fechamentos...' : 'Aplicar Filtros'}
                            </Button>
                         </CardContent>
                     </Card>

                     <Card className="mb-8 shadow-md border border-border/50">
                         <CardHeader>
                             <CardTitle className="text-xl flex items-center gap-2">
                                 <BarChart className="h-5 w-5"/>
                                 Estatísticas Fechamentos ({dataLoading ? '...' : totalStats.count} {totalStats.count === 1 ? 'Fechamento' : 'Fechamentos'})
                             </CardTitle>
                             <CardDescription>Resumo financeiro para o período e loja(s) selecionados nos filtros acima.</CardDescription>
                         </CardHeader>
                         <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="p-4 bg-success/5 rounded-lg border border-success/20">
                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4 text-success" /> Total Entradas (Geral)</h3>
                                {dataLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <p className="text-2xl font-bold text-success">{formatCurrency(totalStats.totalEntradas)}</p>}
                                <p className="text-xs text-muted-foreground mt-1">(Inclui Padrão + Receb. Pend.)</p>
                            </div>
                            <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1"><CreditCard className="h-4 w-4 text-blue-500" /> Entradas (Cartão/Pix/Dep.)</h3>
                                {dataLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalStats.totalEntradasNaoCaixa)}</p>}
                            </div>
                            <div className="p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4 text-purple-500" /> Receb. Pendentes (Período)</h3>
                                {dataLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalStats.totalRecebimentosPendentes)}</p>}
                             </div>
                            <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingDown className="h-4 w-4 text-destructive" /> Total Saídas (Caixa)</h3>
                                {dataLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <p className="text-2xl font-bold text-destructive">{formatCurrency(totalStats.totalSaidasCaixa)}</p>}
                             </div>
                             <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 col-span-1 sm:col-span-2 lg:col-span-2">
                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1"><DollarSign className="h-4 w-4 text-primary" /> Saldo Final (Dinheiro Esperado)</h3>
                                 {dataLoading ? <Skeleton className="h-8 w-1/2 mt-1" /> : (
                                     <p className={`text-2xl font-bold ${totalStats.saldoFinalCaixa >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                         {formatCurrency(totalStats.saldoFinalCaixa)}
                                     </p>
                                 )}
                                 <p className="text-xs text-muted-foreground mt-1">(Entradas Gerais - Entradas Não Caixa - Saídas Caixa)</p>
                             </div>
                         </CardContent>
                          {selectedStore === 'all' && !dataLoading && Object.values(stats).some(s => s.count > 0) && (
                            <CardFooter className="pt-4 border-t border-border/40 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {Object.entries(stats)
                                    .filter(([, storeData]) => storeData.count > 0)
                                    .map(([storeId, storeData]) => (
                                     <div key={storeId} className="p-3 bg-muted/30 rounded-md border border-border/50">
                                        <h4 className="text-sm font-semibold text-foreground mb-1">{getStoreName(getEmailFromStoreId(storeId))} ({storeData.count})</h4>
                                        <div className="text-xs space-y-0.5">
                                            <p className="text-success">Entr. Geral: {formatCurrency(storeData.totalEntradas)}</p>
                                            <p className="text-blue-600">N/Caixa: {formatCurrency(storeData.totalEntradasNaoCaixa)}</p>
                                            <p className="text-purple-600">Receb.Pend: {formatCurrency(storeData.totalRecebimentosPendentes)}</p>
                                            <p className="text-destructive">S.Caixa: {formatCurrency(storeData.totalSaidasCaixa)}</p>
                                            <p className={`font-medium ${storeData.saldoFinalCaixa >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                                 Saldo C.: {formatCurrency(storeData.saldoFinalCaixa)}
                                            </p>
                                        </div>
                                     </div>
                                ))}
                            </CardFooter>
                          )}
                           {selectedStore === 'all' && dataLoading && (
                              <CardFooter className="pt-4 border-t border-border/40 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                 {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-md" />)}
                             </CardFooter>
                           )}
                     </Card>

                     <Card className="mb-8 shadow-md border border-border/50">
                         <CardHeader>
                            <div className="flex justify-between items-start gap-4">
                                 <div>
                                     <CardTitle className="text-xl flex items-center gap-2">
                                         <Landmark className="h-5 w-5 text-primary" />
                                         Contas a Receber
                                     </CardTitle>
                                      <CardDescription>
                                          Lista de contas a receber. Use o seletor abaixo para filtrar por status.
                                          <span className="font-medium text-foreground ml-1"> (Filtro de loja aplicado acima).</span>
                                      </CardDescription>
                                 </div>
                                 <div className="space-y-1 w-full sm:w-auto min-w-[180px] flex-shrink-0">
                                      <Label htmlFor="receivable-status-select" className="text-xs">Status A Receber</Label>
                                      <Select
                                            value={selectedReceivableStatus}
                                            onValueChange={(value) => setSelectedReceivableStatus(value as ReceivableFilterStatus)}>
                                        <SelectTrigger id="receivable-status-select" className="w-full h-9">
                                          <SelectValue placeholder="Selecione Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value={ReceivableFilterStatus.Pendente}>Pendentes (Não Pagos)</SelectItem>
                                          <SelectItem value={ReceivableFilterStatus.PagoPendenteBaixa}>Pagos (Aguard. Baixa)</SelectItem>
                                          <SelectItem value={ReceivableFilterStatus.Baixado}>Baixados (Finalizados)</SelectItem>
                                          <SelectItem value={ReceivableFilterStatus.Todos}>Todos</SelectItem>
                                        </SelectContent>
                                      </Select>
                                 </div>
                            </div>
                         </CardHeader>
                         <CardContent>
                             {receivablesLoading ? (
                                 <div className="space-y-4">
                                     {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
                                 </div>
                             ) : receivablesData.length > 0 ? (
                                <div className="overflow-x-auto">
                                 <Table>
                                     <TableHeader>
                                         <TableRow>
                                             <TableHead>Cliente</TableHead>
                                             <TableHead>Placa</TableHead>
                                             <TableHead className="text-right">Valor</TableHead>
                                             <TableHead>Data Débito</TableHead>
                                             <TableHead>Loja</TableHead>
                                             <TableHead>Status</TableHead>
                                             <TableHead>Data Pagamento</TableHead>
                                             <TableHead>Data Baixa</TableHead>
                                             <TableHead className="text-right">Ações</TableHead>
                                         </TableRow>
                                     </TableHeader>
                                     <TableBody>
                                         {receivablesData.map((receivable) => {
                                              let formattedDebitDate = 'Inválida';
                                              try {
                                                  const parsed = parse(receivable.dataDebito, 'yyyy-MM-dd', new Date());
                                                  if (isValid(parsed)) formattedDebitDate = format(parsed, 'dd/MM/yy');
                                              } catch (e) { console.error("Error parsing debit date:", e); }

                                               let formattedPaymentDate = '-';
                                               if (receivable.dataPagamento) {
                                                   try {
                                                       formattedPaymentDate = format(receivable.dataPagamento.toDate(), 'dd/MM/yy HH:mm');
                                                   } catch (e) { console.error("Error formatting payment date:", e); }
                                               }
                                               let formattedBaixaDate = '-';
                                                if (receivable.dataBaixa) {
                                                    try {
                                                        formattedBaixaDate = format(receivable.dataBaixa.toDate(), 'dd/MM/yy HH:mm');
                                                    } catch (e) { console.error("Error formatting baixa date:", e); }
                                                }

                                              return (
                                                  <TableRow key={receivable.id}>
                                                     <TableCell className="font-medium">{receivable.nomeCliente || 'N/A'}</TableCell>
                                                     <TableCell>{receivable.placa || 'N/A'}</TableCell>
                                                     <TableCell className="text-right">{formatCurrency(receivable.valorReceber)}</TableCell>
                                                     <TableCell>{formattedDebitDate}</TableCell>
                                                     <TableCell>{getStoreName(getEmailFromStoreId(receivable.lojaId))}</TableCell>
                                                     <TableCell>
                                                        <Badge variant={getReceivableBadgeVariant(receivable)} className="capitalize whitespace-nowrap">
                                                            {getReceivableBadgeText(receivable)}
                                                        </Badge>
                                                     </TableCell>
                                                      <TableCell className="text-xs text-muted-foreground">{formattedPaymentDate}</TableCell>
                                                      <TableCell className="text-xs text-muted-foreground">{formattedBaixaDate}</TableCell>
                                                     <TableCell className="text-right">
                                                          {receivable.status === 'pago' && receivable.dataBaixa === null && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                   <Button variant="outline" size="sm" className="text-xs h-7 px-2 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700">
                                                                        <CheckCircle className="h-3 w-3 mr-1"/> Dar Baixa
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                    <AlertDialogTitle>Confirmar Baixa?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Tem certeza que deseja dar baixa (confirmar recebimento financeiro) na conta de {receivable.nomeCliente || 'Cliente'} ({formatCurrency(receivable.valorReceber)})? Esta ação indica que o valor foi verificado.
                                                                    </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDarBaixa(receivable.id)} className="bg-success hover:bg-success/90">
                                                                        Confirmar Baixa
                                                                    </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                             </AlertDialog>
                                                          )}
                                                          {receivable.status === 'pendente' && (
                                                              <span className="text-xs text-muted-foreground italic">Aguardando Pagamento</span>
                                                          )}
                                                           {receivable.status === 'pago' && receivable.dataBaixa !== null && (
                                                               <span className="text-xs text-muted-foreground italic">Baixado</span>
                                                           )}
                                                     </TableCell>
                                                 </TableRow>
                                             );
                                         })}
                                     </TableBody>
                                 </Table>
                                 </div>
                             ) : (
                                 <p className="text-center text-muted-foreground py-6">
                                     Nenhuma conta a receber encontrada para os filtros selecionados (Loja: {getStoreName(getEmailFromStoreId(selectedStore)) || 'Todas'}, Status: {selectedReceivableStatus}).
                                 </p>
                             )}
                         </CardContent>
                     </Card>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <Card className="shadow-md border border-border/50">
                           <CardHeader>
                              <CardTitle>Entradas por Tipo (Fechamentos)</CardTitle>
                              <CardDescription>Distribuição das entradas (incluindo receb. pendentes) nos fechamentos do período.</CardDescription>
                           </CardHeader>
                            <CardContent className="aspect-video">
                                {dataLoading ? (
                                    <Skeleton className="w-full h-full" />
                                ) : entradasChartData.length > 0 ? (
                                    <ChartContainer config={entradaChartConfig} className="min-h-[200px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                              <ChartTooltip
                                                 cursor={false}
                                                 content={<ChartTooltipContent hideLabel hideIndicator formatter={(value, name) => (
                                                    <div className="flex items-center justify-between w-full min-w-[150px]">
                                                        <span className="text-muted-foreground mr-2">{name}:</span>
                                                         <span className="font-bold">{formatCurrency(value as number)}</span>
                                                    </div>
                                                 )} />}
                                               />
                                            <Pie data={entradasChartData} dataKey="total" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                                                {entradasChartData.map((entry, index) => (
                                                   <Cell key={`cell-entrada-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                             <Legend content={<ChartLegendContent />} />
                                            </PieChart>
                                       </ResponsiveContainer>
                                   </ChartContainer>
                                ) : (
                                     <p className="text-center text-muted-foreground py-10">Sem dados de entrada para exibir.</p>
                                )}
                            </CardContent>
                        </Card>
                         <Card className="shadow-md border border-border/50">
                            <CardHeader>
                                <CardTitle>Saídas por Tipo (Fechamentos)</CardTitle>
                                <CardDescription>Distribuição das saídas nos fechamentos do período (inclui Cartão/Pix).</CardDescription>
                            </CardHeader>
                             <CardContent className="aspect-video">
                                 {dataLoading ? (
                                    <Skeleton className="w-full h-full" />
                                 ) : saidasChartData.length > 0 ? (
                                     <ChartContainer config={saidaChartConfig} className="min-h-[200px] w-full">
                                         <ResponsiveContainer width="100%" height="100%">
                                           <PieChart>
                                                <ChartTooltip
                                                  cursor={false}
                                                  content={<ChartTooltipContent hideLabel hideIndicator formatter={(value, name) => (
                                                     <div className="flex items-center justify-between w-full min-w-[150px]">
                                                         <span className="text-muted-foreground mr-2">{name}:</span>
                                                          <span className="font-bold">{formatCurrency(value as number)}</span>
                                                     </div>
                                                  )}/>}
                                                 />
                                              <Pie data={saidasChartData} dataKey="total" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                                                 {saidasChartData.map((entry, index) => (
                                                    <Cell key={`cell-saida-${index}`} fill={entry.fill} />
                                                 ))}
                                              </Pie>
                                               <Legend content={<ChartLegendContent />} />
                                           </PieChart>
                                         </ResponsiveContainer>
                                     </ChartContainer>
                                 ) : (
                                     <p className="text-center text-muted-foreground py-10">Sem dados de saída para exibir.</p>
                                 )}
                             </CardContent>
                         </Card>
                     </div>

                     <Card className="shadow-md border border-border/50">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <ListChecks className="h-5 w-5"/>
                                Histórico de Fechamentos
                            </CardTitle>
                            <CardDescription>Lista de fechamentos encontrados para os filtros aplicados.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {dataLoading ? (
                                <div className="space-y-4">
                                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
                                </div>
                            ) : closingsData.length > 0 ? (
                                <ul className="space-y-3">
                                    {closingsData.map((closing) => {
                                         let closingDate: Date | null = null;
                                         let formattedClosingDate = 'Data Inválida';
                                         try {
                                            closingDate = parse(closing.dataFechamento, "yyyy-MM-dd", new Date());
                                             if (isValid(closingDate)) {
                                                formattedClosingDate = format(closingDate, "PPP", { locale: ptBR });
                                             }
                                          } catch (e) { console.error("Error parsing date for closing ID:", closing.id, closing.dataFechamento, e); }

                                        let displaySaidasCaixa = 0;
                                        let displayEntradasNaoCaixa = 0;
                                        let displayRecebimentosPendentes = 0;
                                         Object.entries(closing.saidasFixas || {}).forEach(([key, value]) => {
                                            if (saidaFixaIdToLabelMap[key]?.isCashReducing) displaySaidasCaixa += Number(value) || 0;
                                            else if (key === 'cartao' || key === 'pix' || key === 'deposito') displayEntradasNaoCaixa += Number(value) || 0;
                                         });
                                         (closing.saidasDinamicas || []).forEach(exit => displaySaidasCaixa += Number(exit.valor) || 0);
                                         (closing.recebimentos || []).forEach(receipt => displayRecebimentosPendentes += Number(receipt.valor) || 0);
                                         const totalEntradasDisplay = (Number(closing.calculatedTotals?.totalEntradas) || 0) + displayRecebimentosPendentes;
                                         const displaySaldoCaixa = totalEntradasDisplay - displayEntradasNaoCaixa - displaySaidasCaixa;

                                        return (
                                        <li key={closing.id} className="border border-border/40 bg-background p-4 rounded-lg flex flex-wrap justify-between items-center gap-3 hover:bg-muted/40 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <span className="font-semibold text-foreground block">
                                                     {formattedClosingDate}
                                                     <span className="text-sm text-muted-foreground ml-2">({getStoreName(closing.userEmail)})</span>
                                                     {closing.operatorName && <span className="text-xs text-muted-foreground block md:inline ml-1">(Op: {closing.operatorName})</span>}
                                                </span>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-1">
                                                    <span className="text-success">Entr: {formatCurrency(totalEntradasDisplay)}</span>
                                                    <span className="text-destructive">S.Caixa: {formatCurrency(displaySaidasCaixa)}</span>
                                                     <span className={`font-medium ${displaySaldoCaixa >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                                        Saldo C.: {formatCurrency(displaySaldoCaixa)}
                                                    </span>
                                                </div>
                                            </div>
                                             {closing.userId && closing.id && (
                                                 <Button variant="outline" size="sm" onClick={() => router.push(`/historico/${closing.dataFechamento}?adminView=true&docId=users/${closing.userId}/fechamentos/${closing.id}`)}>
                                                     Ver Detalhes
                                                 </Button>
                                             )}
                                        </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-center text-muted-foreground py-6">
                                    Nenhum fechamento encontrado para os filtros de data e loja selecionados.
                                </p>
                            )}
                        </CardContent>
                     </Card>
                </main>
                 <footer className="bg-muted/50 py-3 border-t border-border/60 mt-auto text-center text-xs text-muted-foreground">
                      <p>© {new Date().getFullYear()} Fechamento de Caixa App.</p>
                     <p className="mt-1 opacity-75">Desenvolvido por Bruno Gonçalves</p>
                 </footer>
            </div>
        </AdminAuthGuard>
    );
}