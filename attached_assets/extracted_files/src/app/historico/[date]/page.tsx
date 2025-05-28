
'use client';

import * as React from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db, doc, getDoc, Timestamp, getLojaIdFromEmail, collection, query, where, limit, getDocs } from '@/lib/firebase'; // Import necessary functions and helper
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, TrendingUp, TrendingDown, Pencil, DollarSign, Download } from 'lucide-react'; // Added DollarSign and Download
import { useToast } from "@/hooks/use-toast";
import { format, parse, isValid, subDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Navbar from '@/components/navbar';
import jsPDF from 'jspdf';

interface ClosingData {
    id: string;
    dataFechamento: string; // YYYY-MM-DD
    lojaId: string;
    userId: string;
    calculatedTotals: {
        saldoFinal: number;
        totalEntradas: number;
        totalSaidas: number;
        totalSaidasFixas: number;
        totalSaidasDinamicas: number;
    };
    entradas: Record<string, number>;
    saidasFixas: Record<string, number>;
    saidasDinamicas: { nome: string; valor: number }[];
    recebimentos?: { nomeCliente: string; valor: number; receivableId: string }[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
    userEmail?: string;
    operatorName?: string;
}

// Helper function to format currency
const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const ADMIN_UID = "txxp9hdSthOmlDKGipwduZJNNak1";

const getStoreName = (email: string | null | undefined): string => {
    if (!email) return 'Desconhecida';
    if (email === 'topcapaobonito@hotmail.com') return 'Top Capão Bonito';
    if (email === 'topguapiara@hotmail.com') return 'Top Guapiara';
    if (email === 'topribeiraobranco@hotmail.com') return 'Top Ribeirão Branco';
    if (email === 'adm@topvistorias.com') return 'Administrador';
    return email;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const entradaIdToLabelMap: Record<string, string> = {
    carro: "Carro",
    caminhonete: "Caminhonete",
    caminhao: "Caminhão",
    moto: "Moto",
    cautelar: "Cautelar",
    revistoriaDetran: "Revistoria DETRAN",
    pesquisaProcedencia: "Pesquisa de Procedência",
    recebimentoPendente: "Recebimento Pendente",
};

const saidaIdToLabelMap: Record<string, string> = {
    cartao: "Cartão",
    pix: "Pix",
    deposito: "Depósito",
    almoco: "Almoço",
    retiradaSimone: "Retirada Simone",
    vale: "Vale",
    // aReceber is handled differently (not a direct "exit" type for display here)
};

const generatePdf = (
    closingData: ClosingData,
    formattedTitleDate: string,
    storeName: string
) => {
    const doc = new jsPDF();
    let yPos = 20; 
    const lineMargin = 20;
    const contentWidth = doc.internal.pageSize.getWidth() - lineMargin * 2;

    doc.setFontSize(18);
    doc.text("FECHAMENTO DE CAIXA", doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.setLineWidth(0.5);
    doc.line(lineMargin, yPos, lineMargin + contentWidth, yPos); 
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Data: ${formattedTitleDate}`, lineMargin, yPos);
    yPos += 7;
    doc.text(`Loja: ${storeName}`, lineMargin, yPos);
    yPos += 7;
    if (closingData.operatorName) {
        doc.text(`Operador: ${closingData.operatorName}`, lineMargin, yPos);
        yPos += 7;
    }
    doc.line(lineMargin, yPos, lineMargin + contentWidth, yPos);
    yPos += 10;

    // ENTRADAS
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("ENTRADAS", lineMargin, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 7;
    doc.setFontSize(10);
    let totalEntradasCalculated = 0;

    Object.entries(closingData.entradas)
        .filter(([, quantity]) => quantity > 0)
        .forEach(([key, quantity]) => {
            doc.text(`${entradaIdToLabelMap[key] || capitalize(key.replace(/([A-Z])/g, ' $1'))}: ${quantity}`, lineMargin + 5, yPos);
            yPos += 5;
        });
    
    totalEntradasCalculated = closingData.calculatedTotals.totalEntradas; // This already includes received payments if logic is correct

    if (closingData.recebimentos && closingData.recebimentos.length > 0) {
        yPos += 2; // Little space
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("Recebimentos Pendentes (Pagos Agora):", lineMargin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 6;
        doc.setFontSize(10);
        closingData.recebimentos.forEach(rec => {
             doc.text(`${rec.nomeCliente}: ${formatCurrency(rec.valor)}`, lineMargin + 10, yPos);
             yPos += 5;
        });
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Entradas (Geral): ${formatCurrency(totalEntradasCalculated)}`, lineMargin, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    doc.line(lineMargin, yPos, lineMargin + contentWidth, yPos);
    yPos += 10;

    // SAÍDAS
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("SAÍDAS", lineMargin, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 7;

    // Saídas Fixas
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Saídas Fixas:", lineMargin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 6;
    doc.setFontSize(10);
    let fixedExitsExist = false;
    Object.entries(closingData.saidasFixas)
        .filter(([, amount]) => amount > 0)
        .forEach(([key, amount]) => {
            fixedExitsExist = true;
            doc.text(`${saidaIdToLabelMap[key] || capitalize(key.replace(/([A-Z])/g, ' $1'))}: ${formatCurrency(amount)}`, lineMargin + 10, yPos);
            yPos += 5;
        });
    if (!fixedExitsExist) {
        doc.text("Nenhuma saída fixa registrada.", lineMargin + 10, yPos);
        yPos += 5;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Subtotal Saídas Fixas: ${formatCurrency(closingData.calculatedTotals.totalSaidasFixas)}`, lineMargin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 7;

    // Saídas Dinâmicas
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Saídas Variáveis:", lineMargin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 6;
    doc.setFontSize(10);
    if (closingData.saidasDinamicas && closingData.saidasDinamicas.length > 0) {
        closingData.saidasDinamicas.forEach((exit) => {
            doc.text(`${exit.nome}: ${formatCurrency(exit.valor)}`, lineMargin + 10, yPos);
            yPos += 5;
        });
    } else {
        doc.text("Nenhuma saída variável registrada.", lineMargin + 10, yPos);
        yPos += 5;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Subtotal Saídas Variáveis: ${formatCurrency(closingData.calculatedTotals.totalSaidasDinamicas)}`, lineMargin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 7;
    
    // Total Saídas (Accounting sense, includes "A Receber" if it was part of totalSaidas in Firestore)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Saídas (Contábil): ${formatCurrency(closingData.calculatedTotals.totalSaidas)}`, lineMargin, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    doc.line(lineMargin, yPos, lineMargin + contentWidth, yPos);
    yPos += 10;

    // RESULTADO FINAL
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("RESULTADO FINAL (CAIXA)", doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`Saldo Final (Dinheiro Esperado):`, lineMargin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatCurrency(closingData.calculatedTotals.saldoFinal)}`, lineMargin + contentWidth, yPos, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    doc.line(lineMargin, yPos, lineMargin + contentWidth, yPos);
    yPos += 10;

    doc.setFontSize(8);
    doc.setTextColor(100); 
    doc.text(`Criado em: ${closingData.createdAt ? format(closingData.createdAt.toDate(), 'Pp', { locale: ptBR }) : 'N/A'}`, lineMargin, yPos);
    yPos += 5;
    doc.text(`Última Atualização: ${closingData.updatedAt ? format(closingData.updatedAt.toDate(), 'Pp', { locale: ptBR }) : 'N/A'}`, lineMargin, yPos);

    doc.save(`fechamento_caixa_${closingData.dataFechamento.replace(/-/g, '_')}.pdf`);
};


export default function HistoryDatePage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const dateParam = params.date as string; 
    const adminView = searchParams.get('adminView') === 'true';
    const fullDocPath = searchParams.get('docId');
    const { toast } = useToast();
    const [user, setUser] = React.useState<User | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [closingData, setClosingData] = React.useState<ClosingData | null>(null);
    const [parsedDate, setParsedDate] = React.useState<Date | null>(null);
    const [currentDate, setCurrentDate] = React.useState<Date | null>(null);
    const [isAdmin, setIsAdmin] = React.useState(false);

    React.useEffect(() => {
        console.log("History Page: Setting current date.");
        setCurrentDate(new Date());
    }, []);

    React.useEffect(() => {
        console.log("History Page: Setting up auth listener.");
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.log(`History Page: Auth state changed. User UID: ${currentUser?.uid}`);
            setUser(currentUser);
            const isAdminUser = currentUser?.uid === ADMIN_UID;
            setIsAdmin(isAdminUser);

            if (currentUser) {
                console.log(`History Page: User authenticated (UID: ${currentUser.uid}), IsAdmin: ${isAdminUser}`);
                try {
                    const dateObject = parse(dateParam, 'yyyy-MM-dd', new Date());
                    if (!isValid(dateObject)) {
                        throw new Error("Formato da data na URL é inválido.");
                    }
                    setParsedDate(dateObject);
                    console.log("History Page: Date parameter valid:", dateObject);

                    if (adminView && fullDocPath) {
                        console.log("History Page: Admin view for docPath:", fullDocPath);
                        fetchAdminClosingData(fullDocPath);
                    } else if (!adminView && currentUser.uid) {
                        console.log(`History Page: User view, fetching by date: ${dateParam} for user: ${currentUser.uid}`);
                        fetchUserClosingData(dateParam, currentUser.uid);
                    } else {
                        console.error("History Page: Invalid state for fetching data.", { adminView, fullDocPath, userId: currentUser.uid });
                        toast({ variant: "destructive", title: "Erro", description: "Não foi possível determinar como buscar os dados.", duration: 3000 });
                        router.replace(isAdminUser ? '/admin' : '/');
                    }
                } catch (e: any) {
                    console.error("History Page: Error processing route parameters:", e);
                    toast({ variant: "destructive", title: "Erro na Rota", description: e.message || "Não foi possível processar a data fornecida.", duration: 3000 });
                    router.replace(isAdminUser ? '/admin' : '/');
                }
            } else {
                console.log("History Page: No user, redirecting to login.");
                router.replace('/login');
            }
        });
        return () => {
            console.log("History Page: Unsubscribing auth listener.");
            unsubscribe();
        }
    }, [router, dateParam, adminView, fullDocPath, toast]);

    const fetchUserClosingData = async (dateString: string, userId: string) => {
        console.log(`History Page (User): Fetching data for date: ${dateString}, userId: ${userId}`);
        setLoading(true);
        setClosingData(null);
        try {
            const userClosingsRef = collection(db, "users", userId, "fechamentos");
            const q = query(userClosingsRef, where("dataFechamento", "==", dateString), limit(1));
            console.log(`History Page (User): Querying path: users/${userId}/fechamentos, date: ${dateString}`);
            const querySnapshot = await getDocs(q);
            console.log(`History Page (User): Query executed. Found documents: ${querySnapshot.size}`);

            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                const fetchedData = { id: docSnap.id, ...docSnap.data() } as ClosingData;
                if (fetchedData.userId !== userId) {
                    console.error(`History Page (User): Fetched document userId (${fetchedData.userId}) mismatch with query userId (${userId})!`);
                    throw new Error("Inconsistência nos dados do usuário.");
                }
                console.log("History Page (User): Document found and validated:", fetchedData.id);
                setClosingData(fetchedData);
            } else {
                console.log("History Page (User): No closing data found for this date.");
            }
        } catch (error: any) {
            console.error("History Page (User): Error fetching closing data:", error);
            let description = `Não foi possível carregar os dados do fechamento. Verifique a conexão.`;
            if (error.code === 'permission-denied') {
                 description = "Permissão negada. Verifique as regras de segurança do Firestore.";
            } else if (error.message === "Inconsistência nos dados do usuário.") {
                 description = error.message;
            }
            toast({
                variant: "destructive",
                title: "Erro ao Buscar Dados",
                description: description,
                duration: 5000,
            });
        } finally {
            console.log("History Page (User): Finished fetching data.");
            setLoading(false);
        }
    };

    const fetchAdminClosingData = async (documentPath: string) => {
        console.log(`History Page (Admin): Fetching data for docPath: ${documentPath}`);
        setLoading(true);
        setClosingData(null);
        try {
            const pathParts = documentPath.split('/');
            if (pathParts.length !== 4 || pathParts[0] !== 'users' || pathParts[2] !== 'fechamentos') {
                throw new Error("Formato do caminho do documento inválido para admin.");
            }
            const targetDocRef = doc(db, documentPath);
            const docSnap = await getDoc(targetDocRef);
            if (docSnap.exists()) {
                const fetchedData = { id: docSnap.id, ...docSnap.data() } as ClosingData;
                console.log("History Page (Admin): Document found via specific path:", fetchedData.id);
                setClosingData(fetchedData);
            } else {
                console.log("History Page (Admin): Document not found at path:", documentPath);
                toast({ variant: "destructive", title: "Erro", description: "Fechamento não encontrado." });
                router.replace('/admin');
            }
        } catch (error: any) {
             console.error("History Page (Admin): Error fetching closing data:", error);
             toast({ variant: "destructive", title: "Erro ao Buscar Dados (Admin)", description: `Erro: ${error.message || 'Desconhecido'}` });
             router.replace('/admin');
        } finally {
             console.log("History Page (Admin): Finished fetching data.");
             setLoading(false);
        }
    };

    const isEditable = React.useMemo(() => {
        if (adminView || !closingData || !currentDate || !user || closingData.userId !== user.uid) {
            return false;
        }
        try {
            const closingDate = parse(closingData.dataFechamento, 'yyyy-MM-dd', new Date());
            if (!isValid(closingDate)) {
                 console.error("History Page: Cannot determine editability: Invalid closing date parsed.");
                 return false;
            }
            const sevenDaysAgo = subDays(currentDate, 7);
            const canEdit = isAfter(closingDate, sevenDaysAgo);
            console.log(`History Page: Editability check - ClosingDate: ${closingDate}, 7daysAgo: ${sevenDaysAgo}, canEdit: ${canEdit}`);
            return canEdit;
        } catch(e) {
             console.error("History Page: Error calculating editability:", e);
            return false;
        }
    }, [closingData, currentDate, user, adminView]);

    if (loading || !currentDate) {
        console.log(`History Page: Rendering Skeleton (loading: ${loading}, currentDate: ${!!currentDate}).`);
        return (
            <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
                <Navbar user={user} />
                <main className="flex-grow container mx-auto px-4 md:px-8 py-8">
                    <div className="w-full max-w-4xl mx-auto space-y-8">
                        <div className="flex justify-between items-center mb-6">
                             <Skeleton className="h-10 w-1/2 rounded-lg" />
                             <Skeleton className="h-9 w-24 rounded-md" />
                        </div>
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-72 w-full rounded-xl" />
                        <Skeleton className="h-60 w-full rounded-xl" />
                        <div className="flex justify-center gap-4 mt-4">
                           <Skeleton className="h-4 w-1/4 rounded" />
                           <Skeleton className="h-4 w-1/4 rounded" />
                         </div>
                    </div>
                </main>
                 <footer className="bg-muted/50 py-3 border-t border-border/60 mt-auto text-center text-xs text-muted-foreground w-full">
                    <p>© {new Date().getFullYear()} Fechamento de Caixa App.</p>
                    <p className="mt-1 opacity-75">Desenvolvido por Bruno Gonçalves</p>
                 </footer>
            </div>
        );
    }

     if (!parsedDate) {
           console.log("History Page: Rendering Invalid Date message because parsedDate is null/invalid.");
          return (
             <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
                 <Navbar user={user} />
                 <main className="flex-grow container mx-auto px-4 md:px-8 py-8 flex items-center justify-center">
                     <div className="text-center space-y-6 p-8 bg-card rounded-lg shadow-lg border border-border/50">
                          <h1 className="text-3xl font-bold text-destructive tracking-tight">Data Inválida</h1>
                          <p className="text-muted-foreground">A data fornecida na URL não é válida ou não pôde ser processada.</p>
                          <Button onClick={() => router.push(isAdmin ? '/admin' : '/')} variant="outline" className="gap-2">
                              <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
                          </Button>
                      </div>
                  </main>
                   <footer className="bg-muted/50 py-3 border-t border-border/60 mt-auto text-center text-xs text-muted-foreground">
                       <p>© {new Date().getFullYear()} Fechamento de Caixa App.</p>
                       <p className="mt-1 opacity-75">Desenvolvido por Bruno Gonçalves</p>
                   </footer>
              </div>
          );
     }

    const formattedTitleDate = format(parsedDate, 'PPP', { locale: ptBR });
    const storeName = getStoreName(closingData?.userEmail);
    console.log(`History Page: Rendering History Details for date: ${formattedTitleDate}, Store: ${storeName}, Editability: ${isEditable}, isAdmin: ${isAdmin}, adminView: ${adminView}`);

    return (
        <TooltipProvider>
            <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
                <Navbar user={user} />
                <main className="flex-grow container mx-auto px-4 md:px-8 py-8">
                    <div className="w-full max-w-4xl mx-auto space-y-8">
                        <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                            <h1 className="text-3xl font-bold text-foreground tracking-tight">
                                Detalhes - {formattedTitleDate}
                                {closingData?.userEmail && <span className="text-base font-normal text-muted-foreground ml-2">({storeName})</span>}
                                {closingData?.operatorName && <span className="text-sm font-normal text-muted-foreground ml-1 block md:inline">(Operador: {closingData.operatorName})</span>}
                            </h1>
                            <Button onClick={() => router.push(isAdmin ? '/admin' : '/')} variant="outline" size="sm" className="gap-1.5 shadow-sm hover:shadow-md transition-shadow rounded-lg">
                                <ArrowLeft className="h-4 w-4" /> Voltar
                            </Button>
                        </header>

                        {closingData ? (
                            <>
                                {/* Entradas Resumo Card */}
                                <Card className="shadow-lg border border-success/30 overflow-hidden bg-white rounded-xl">
                                    <CardHeader className="bg-success/5 border-b border-success/10">
                                        <CardTitle className="text-xl font-semibold text-success flex items-center gap-3">
                                            <div className="bg-success/10 p-2 rounded-lg">
                                                <TrendingUp className="h-5 w-5 text-success" />
                                            </div>
                                            Resumo Entradas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 text-base">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                                            {Object.entries(closingData.entradas)
                                                .filter(([, quantity]) => quantity > 0)
                                                .map(([key, quantity]) => (
                                                <div key={key} className="bg-muted/20 p-3 rounded-lg border border-border/30">
                                                    <p className="font-medium text-foreground/90">{entradaIdToLabelMap[key] || capitalize(key.replace(/([A-Z])/g, ' $1'))}</p>
                                                    <p className="text-muted-foreground text-sm">Qtde: <span className="font-semibold text-success text-base">{quantity}</span></p>
                                                </div>
                                            ))}
                                        </div>
                                        {closingData.recebimentos && closingData.recebimentos.length > 0 && (
                                            <div className="mt-6 pt-4 border-t border-border/30">
                                                <h4 className="text-base font-medium mb-2 text-success/90">Recebimentos Pendentes (Pagos Neste Dia):</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                                    {closingData.recebimentos.map((rec, idx) => (
                                                        <div key={idx} className="bg-muted/20 p-3 rounded-lg border border-border/30 text-sm">
                                                            <p className="font-medium text-foreground/90">{rec.nomeCliente}</p>
                                                            <p className="text-muted-foreground">Valor: <span className="font-semibold text-success">{formatCurrency(rec.valor)}</span></p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {Object.values(closingData.entradas).every(qty => qty === 0) && (!closingData.recebimentos || closingData.recebimentos.length === 0) && (
                                            <p className="col-span-full text-center text-muted-foreground italic py-4">Nenhuma entrada registrada neste fechamento.</p>
                                        )}
                                    </CardContent>
                                    <CardFooter className="bg-success/10 px-6 py-3 mt-0 border-t border-success/20">
                                        <p className="w-full text-right text-lg font-bold text-success">
                                            Total Entradas (Geral): {formatCurrency(closingData.calculatedTotals.totalEntradas)}
                                        </p>
                                    </CardFooter>
                                </Card>

                                {/* Saídas Resumo Card */}
                                <Card className="shadow-lg border border-destructive/30 overflow-hidden bg-white rounded-xl">
                                    <CardHeader className="bg-destructive/5 border-b border-destructive/10">
                                         <CardTitle className="text-xl font-semibold text-destructive flex items-center gap-3">
                                             <div className="bg-destructive/10 p-2 rounded-lg">
                                                <TrendingDown className="h-5 w-5 text-destructive" />
                                             </div>
                                            Resumo Saídas
                                         </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6">
                                        <div>
                                            <h3 className="text-lg font-medium mb-4 text-destructive/90 border-b border-destructive/20 pb-1.5">Saídas Fixas</h3>
                                            {Object.entries(closingData.saidasFixas).some(([, amount]) => amount > 0) ? (
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-4 text-base">
                                                    {Object.entries(closingData.saidasFixas)
                                                        .filter(([, amount]) => amount > 0)
                                                        .map(([key, amount]) => (
                                                        <div key={key} className="bg-muted/20 p-3 rounded-lg border border-border/30">
                                                            <p className="font-medium text-foreground/90">{saidaIdToLabelMap[key] || capitalize(key.replace(/([A-Z])/g, ' $1'))}</p>
                                                            <p className="text-muted-foreground text-sm">Valor: <span className="font-semibold text-destructive text-base">{formatCurrency(amount)}</span></p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                 <p className="text-center text-muted-foreground italic py-4">Nenhuma saída fixa registrada.</p>
                                            )}
                                             <p className="text-base pt-4 font-semibold text-right text-destructive/90 border-t border-border/30 mt-4">
                                                 Subtotal Saídas Fixas: {formatCurrency(closingData.calculatedTotals.totalSaidasFixas)}
                                             </p>
                                        </div>

                                        <div className="pt-6 border-t border-border/40">
                                             <h3 className="text-lg font-medium mb-4 text-destructive/90 border-b border-destructive/20 pb-1.5">Saídas Variáveis</h3>
                                             {closingData.saidasDinamicas && closingData.saidasDinamicas.length > 0 ? (
                                                 <ul className="space-y-2">
                                                     {closingData.saidasDinamicas.map((exit, index) => (
                                                         <li key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border/30 text-base">
                                                             <span className="text-foreground flex-1 mr-2 break-words">{exit.nome}</span>
                                                             <span className="font-medium text-destructive whitespace-nowrap">{formatCurrency(exit.valor)}</span>
                                                         </li>
                                                     ))}
                                                 </ul>
                                             ) : (
                                                 <p className="text-center text-muted-foreground italic py-4">Nenhuma saída variável registrada.</p>
                                             )}
                                              <p className="text-base pt-4 font-semibold text-right text-destructive/90 border-t border-border/30 mt-4">
                                                  Subtotal Saídas Variáveis: {formatCurrency(closingData.calculatedTotals.totalSaidasDinamicas)}
                                              </p>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-destructive/10 px-6 py-3 mt-0 border-t border-destructive/20">
                                        <p className="w-full text-right text-lg font-bold text-destructive">
                                            Total Saídas (Contábil): {formatCurrency(closingData.calculatedTotals.totalSaidas)}
                                        </p>
                                    </CardFooter>
                                </Card>

                                <Card className="bg-card shadow-lg border border-border/40 rounded-xl">
                                    <CardHeader className="border-b border-border/20 pb-4">
                                        <CardTitle className="text-xl font-bold text-center text-foreground">Resultado Final (Dinheiro em Caixa)</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-lg px-6 pt-6 pb-6">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Total Entradas (Geral):</span>
                                            <span className="font-semibold text-success">{formatCurrency(closingData.calculatedTotals.totalEntradas)}</span>
                                        </div>
                                        <Separator className="my-1 border-border/15"/>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Total Saídas (Contábil):</span>
                                            <span className="font-semibold text-destructive">{formatCurrency(closingData.calculatedTotals.totalSaidas)}</span>
                                        </div>
                                        <Separator className="my-3 border-primary/20 border-dashed"/>
                                        <div className="flex justify-between items-center text-xl font-bold pt-1">
                                            <span>Saldo Final (Dinheiro Esperado):</span>
                                            <span className={cn(
                                                "px-3 py-1 rounded-md font-bold tracking-wide",
                                                closingData.calculatedTotals.saldoFinal >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                                            )}>
                                                {formatCurrency(closingData.calculatedTotals.saldoFinal)}
                                            </span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex justify-end items-center gap-3 pt-4 border-t border-border/20">
                                         <Button
                                            variant="outline"
                                            size="default"
                                            className="gap-2 shadow-sm hover:shadow-md transition-all rounded-lg h-10"
                                            onClick={() => generatePdf(closingData, formattedTitleDate, storeName)}
                                            disabled={loading}
                                            aria-label="Gerar PDF do fechamento"
                                        >
                                            <Download className="h-4 w-4"/> Gerar PDF
                                        </Button>
                                        {!isAdmin && user && closingData.userId === user.uid && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                     <span className={!isEditable ? 'cursor-not-allowed' : ''}>
                                                         <Link
                                                            href={`/fechamento/${closingData.id}`}
                                                            passHref
                                                            aria-disabled={!isEditable}
                                                            tabIndex={isEditable ? undefined : -1}
                                                            onClick={(e) => !isEditable && e.preventDefault()}
                                                            className={cn(!isEditable ? 'pointer-events-none' : '', 'inline-block')}
                                                        >
                                                             <Button
                                                                variant="default"
                                                                size="default"
                                                                className="gap-2 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-all rounded-lg h-10"
                                                                disabled={!isEditable}
                                                                aria-label={isEditable ? `Editar fechamento` : `Edição não permitida (mais de 7 dias)`}
                                                             >
                                                                 <Pencil className="h-4 w-4"/> Editar Fechamento
                                                             </Button>
                                                         </Link>
                                                     </span>
                                                </TooltipTrigger>
                                                 {!isEditable && (
                                                    <TooltipContent>
                                                        <p>Edição permitida apenas nos últimos 7 dias.</p>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        )}
                                    </CardFooter>
                                </Card>

                                <div className="text-xs text-muted-foreground text-center mt-4 space-x-4">
                                   <span>Criado: {closingData.createdAt ? format(closingData.createdAt.toDate(), 'Pp', { locale: ptBR }) : 'N/A'}</span>
                                   <span>Última Atualização: {closingData.updatedAt ? format(closingData.updatedAt.toDate(), 'Pp', { locale: ptBR }) : 'N/A'}</span>
                                 </div>

                            </>
                        ) : (
                            <Card className="shadow-md border border-border/50 bg-white rounded-xl">
                                 <CardContent className="p-10 text-center">
                                     <p className="text-lg text-muted-foreground">
                                         Nenhum fechamento de caixa registrado para {formattedTitleDate}.
                                     </p>
                                 </CardContent>
                             </Card>
                        )}
                    </div>
                </main>
                 <footer className="bg-muted/50 py-3 border-t border-border/60 mt-auto text-center text-xs text-muted-foreground">
                    <p>© {new Date().getFullYear()} Fechamento de Caixa App.</p>
                    <p className="mt-1 opacity-75">Desenvolvido por Bruno Gonçalves</p>
                 </footer>
            </div>
        </TooltipProvider>
    );
}
