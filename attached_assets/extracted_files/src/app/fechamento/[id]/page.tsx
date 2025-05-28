
'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
    auth,
    db,
    doc, // Use doc directly
    getDoc,
    updateDoc,
    Timestamp,
    getLojaIdFromEmail // Import helper
} from '@/lib/firebase'; // Import only necessary functions
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Trash2,
    Save,
    ArrowLeft,
    PlusCircle,
    Car,
    Truck,
    Bike,
    FileSearch,
    ClipboardPen,
    Building,
    CreditCard,
    QrCode,
    Banknote,
    Utensils,
    UserMinus,
    Receipt,
    TrendingUp,
    TrendingDown,
    User as UserIcon, // For operator name
    Download, // For PDF generation
    MessageSquare, // For WhatsApp
    type LucideIcon
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format, parse, isValid } from 'date-fns'; // Import parse for date parsing
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Navbar from '@/components/navbar';
import jsPDF from 'jspdf';

// User UIDs - Keep for specific logic like operator name
const CAPAO_UID = 'ijNp5AAiFvWrBFCVq7hQ9L05d5Q2';


// Interfaces (ensure consistency)
interface Entrance {
    id: string;
    name: string;
    price: number;
    quantity: number | string; // Keep as string for input
    icon: LucideIcon;
}

interface FixedExit {
    id: string;
    name: string;
    amount: number | string; // Keep as string for input
    icon: LucideIcon;
}

interface VariableExit {
    id: number; // Internal ID for list management
    name: string;
    amount: number; // Store parsed number here
    amountInput: string; // Keep the input string for the field
}

// Interface for the closing data to be used in PDF generation
interface ClosingDataForPdf {
    dataFechamento: string; // YYYY-MM-DD
    lojaId?: string;
    operatorName?: string;
    userEmail?: string;
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
    recebimentos?: { nomeCliente: string; valor: number; receivableId: string }[]; // From main closing doc
    createdAt: Timestamp;
    updatedAt: Timestamp;
}


// Initial state structures (consistency check)
const initialEntrancesData: Omit<Entrance, 'quantity'>[] = [
    { id: 'carro', name: 'Carro', price: 120, icon: Car },
    { id: 'caminhonete', name: 'Caminhonete', price: 140, icon: Truck },
    { id: 'caminhao', name: 'Caminhão', price: 180, icon: Truck },
    { id: 'moto', name: 'Moto', price: 100, icon: Bike },
    { id: 'cautelar', name: 'Cautelar', price: 220, icon: ClipboardPen },
    { id: 'revistoriaDetran', name: 'Revistoria DETRAN', price: 200, icon: Building },
    { id: 'pesquisaProcedencia', name: 'Pesquisa de Procedência', price: 60, icon: FileSearch },
];

const initialFixedExitsData: Omit<FixedExit, 'amount'>[] = [
    { id: 'cartao', name: 'Cartão', icon: CreditCard },
    { id: 'pix', name: 'Pix', icon: QrCode },
    { id: 'deposito', name: 'Depósito', icon: Banknote },
    { id: 'almoco', name: 'Almoço', icon: Utensils },
    { id: 'retiradaSimone', name: 'Retirada Simone', icon: UserMinus },
    { id: 'vale', name: 'Vale', icon: Receipt },
];

// --- Helper Functions (Ensure consistency with fechamento/page.tsx) ---

// Centralized parsing function for currency inputs
const parseInput = (value: string | number | undefined | null): number => {
    if (typeof value === 'number') return isNaN(value) || !isFinite(value) ? 0 : value;
    if (value === '' || value === null || value === undefined) return 0;

    const cleanedValue = String(value)
        .replace(',', '.')
        .replace(/[^\d.]/g, '');

    const parts = cleanedValue.split('.');
    let finalValueString = cleanedValue;
    if (parts.length > 2) {
        finalValueString = parts[0] + '.' + parts.slice(1).join('');
    }

    const parsed = parseFloat(finalValueString);
    return isNaN(parsed) ? 0 : parsed;
}

// Format number to BRL currency string for display
const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Format raw input string for display in input fields
const formatInputValue = (value: string | number | undefined | null): string => {
     if (value === undefined || value === null) return '';
     if (typeof value === 'number') {
         return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
     }
      // Return sanitized string for input
     return String(value).replace(/[^0-9,]/g, ''); // Allow digits and comma
}

// Helper to get store name based on email (simplified for PDF)
const getStoreNameForPdf = (email: string | null | undefined): string => {
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
};


// PDF Generation Function (adapted from historico/[date]/page.tsx)
const generatePdf = (
    closingData: ClosingDataForPdf,
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

    Object.entries(closingData.entradas)
        .filter(([, quantity]) => quantity > 0)
        .forEach(([key, quantity]) => {
            doc.text(`${entradaIdToLabelMap[key] || capitalize(key.replace(/([A-Z])/g, ' $1'))}: ${quantity}`, lineMargin + 5, yPos);
            yPos += 5;
        });

    if (closingData.recebimentos && closingData.recebimentos.length > 0) {
        yPos += 2; // Little space
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("Recebimentos Pendentes (Pagos Neste Caixa):", lineMargin + 5, yPos);
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
    doc.text(`Total Entradas (Geral): ${formatCurrency(closingData.calculatedTotals.totalEntradas)}`, lineMargin, yPos);
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

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Saídas (Contábil): ${formatCurrency(closingData.calculatedTotals.totalSaidas)}`, lineMargin, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    doc.line(lineMargin, yPos, lineMargin + contentWidth, yPos);
    yPos += 10;

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
    doc.text(`Gerado em: ${format(new Date(), 'Pp', { locale: ptBR })}`, lineMargin, yPos);
    yPos += 5;
    doc.text(`Última Atualização do Caixa: ${closingData.updatedAt ? format(closingData.updatedAt.toDate(), 'Pp', { locale: ptBR }) : 'N/A'}`, lineMargin, yPos);

    return doc; // Return the jsPDF document instance
};


export default function EditCashierClosingPage() {
    const router = useRouter();
    const params = useParams();
    const closingId = params.id as string; // Document ID from route
    const { toast } = useToast();
    const [user, setUser] = React.useState<User | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [entrances, setEntrances] = React.useState<Entrance[]>([]);
    const [fixedExits, setFixedExits] = React.useState<FixedExit[]>([]);
    const [variableExits, setVariableExits] = React.useState<VariableExit[]>([]);
    const [newExitName, setNewExitName] = React.useState('');
    const [newExitAmount, setNewExitAmount] = React.useState(''); // Raw input string
    const [closingDate, setClosingDate] = React.useState<Date | null>(null);
    const [originalClosingDateString, setOriginalClosingDateString] = React.useState<string>(''); // Store the original YYYY-MM-DD date
    const [operatorName, setOperatorName] = React.useState<string>(''); // State for operator name
    const [isCapaoUser, setIsCapaoUser] = React.useState(false); // State to check if user is from Capão
    const [fetchedClosingData, setFetchedClosingData] = React.useState<ClosingDataForPdf | null>(null); // Store fetched data for PDF

    // Authentication Check and Initial Data Fetch
    React.useEffect(() => {
        console.log("Edit Page: Setting up auth listener.");
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
             console.log(`Edit Page: Auth state changed. User UID: ${currentUser?.uid}`);
            if (currentUser) {
                setUser(currentUser);
                setIsCapaoUser(currentUser.uid === CAPAO_UID);

                if (closingId) {
                    console.log("Edit Page: closingId found:", closingId);
                    fetchClosingData(closingId, currentUser.uid); // Pass UID for correct path
                } else {
                    console.error("Edit Page: No closingId found in params.");
                    toast({ variant: "destructive", title: "Erro", description: "ID do fechamento inválido.", duration: 3000 });
                    router.push('/'); // Redirect if ID is missing
                    setLoading(false);
                }
            } else {
                console.log("Edit Page: No user, redirecting to login.");
                router.push('/login');
                setLoading(false); // Ensure loading stops
            }
        });
        return () => {
            console.log("Edit Page: Unsubscribing auth listener.");
            unsubscribe();
        }
    }, [router, closingId, toast]); // Dependencies

    // Fetch Existing Data
    const fetchClosingData = async (id: string, userId: string) => {
        console.log(`Edit Page: Fetching data for closingId: ${id}, userId: ${userId}`);
        setLoading(true);
        try {
            // Reference the document within the *specific user's* subcollection
            const docRef = doc(db, "users", userId, "fechamentos", id);
            console.log("Edit Page: Document reference path:", docRef.path);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as ClosingDataForPdf; // Cast to ensure type for PDF
                setFetchedClosingData(data); // Store fetched data
                console.log("Edit Page: Document data retrieved:", data);

                // Primary Validation: Ensure the document belongs to the logged-in user
                 if (data.userId !== userId) {
                    console.error(`Edit Page: Document UserID (${data.userId}) does not match logged-in UserID (${userId}). Access denied.`);
                    toast({ variant: "destructive", title: "Erro de Acesso", description: "Você não tem permissão para editar este fechamento.", duration: 5000 });
                    router.push('/');
                    setLoading(false);
                    return;
                }
                 console.log("Edit Page: User ID consistency check passed.");

                 // Store the original date string (YYYY-MM-DD)
                 setOriginalClosingDateString(data.dataFechamento);

                // Safely parse the date for display
                try {
                    // Parse YYYY-MM-DD string into a Date object for display
                    const dateObject = parse(data.dataFechamento, 'yyyy-MM-dd', new Date());
                     if (isValid(dateObject)) {
                        setClosingDate(dateObject);
                        console.log("Edit Page: Closing date parsed successfully for display:", dateObject);
                    } else {
                        console.error("Edit Page: Parsed date is invalid:", data.dataFechamento);
                        // Handle invalid date display, maybe show the raw string or an error message
                        setClosingDate(null);
                    }
                } catch (e) {
                    console.error("Edit Page: Error parsing date string:", data.dataFechamento, e);
                     setClosingDate(null); // Handle error case
                }

                // Populate Operator Name if exists
                setOperatorName(data.operatorName || ''); // Set to empty string if undefined/null

                // Populate Entrances
                const loadedEntrances = initialEntrancesData.map(initEntrance => ({
                    ...initEntrance,
                    quantity: (data.entradas?.[initEntrance.id] ?? 0).toString() // Default to '0' if missing
                }));
                setEntrances(loadedEntrances);
                console.log("Edit Page: Entrances populated.");

                // Populate Fixed Exits
                const loadedFixedExits = initialFixedExitsData.map(initExit => ({
                    ...initExit,
                    // Format saved numeric value back to display string (with comma if needed)
                    amount: formatInputValue(data.saidasFixas?.[initExit.id] ?? '') // Default to '' if missing
                }));
                setFixedExits(loadedFixedExits);
                console.log("Edit Page: Fixed Exits populated.");


                // Populate Variable Exits
                const loadedVariableExits = (data.saidasDinamicas ?? []).map((exit: any, index: number) => ({
                    id: Date.now() + index, // Generate a unique ID for list management
                    name: exit.nome || 'Nome Inválido', // Handle missing name
                    amount: typeof exit.valor === 'number' ? exit.valor : 0, // Handle non-numeric value
                    amountInput: formatInputValue(exit.valor ?? '') // Format for display, default to ''
                }));
                setVariableExits(loadedVariableExits);
                console.log("Edit Page: Variable Exits populated.");
                console.log("Edit Page: Form state populated successfully.");

            } else {
                console.error("Edit Page: Document does not exist for path:", docRef.path);
                toast({ variant: "destructive", title: "Erro", description: "Fechamento não encontrado.", duration: 3000 });
                router.push('/'); // Redirect if not found
            }
        } catch (error: any) {
            console.error("Edit Page: Error fetching document:", error);
            toast({ variant: "destructive", title: "Erro ao Carregar", description: `Não foi possível carregar os dados. Verifique sua conexão e tente novamente. Erro: ${error.message || 'Desconhecido'}`, duration: 5000 });
            router.push('/'); // Redirect on fetch error
        } finally {
            console.log("Edit Page: Finished fetching data.");
            setLoading(false);
        }
    };

    // --- Input Handlers (Robust versions) ---
    const handleNumericInputChange = (setter: React.Dispatch<React.SetStateAction<any[]>>, index: number, field: string, value: string) => {
         const sanitizedValue = value.replace(/[^0-9,.]/g, '');
         const firstSeparator = sanitizedValue.search(/[,.]/);
         let finalValue = sanitizedValue; // Keep sanitized value for state

         if (firstSeparator !== -1) {
             const integerPart = sanitizedValue.substring(0, firstSeparator);
             let decimalPart = sanitizedValue.substring(firstSeparator + 1).replace(/[,.]/g, '');
             if (decimalPart.length > 2) {
                 decimalPart = decimalPart.slice(0, 2);
             }
             // Standardize to comma for internal consistency if needed, but store sanitized string
             finalValue = `${integerPart},${decimalPart}`;
         }
          setter(prev => {
              const newState = [...prev];
              newState[index] = { ...newState[index], [field]: finalValue }; // Update state with sanitized/formatted string
              return newState;
          });
          console.log(`handleNumericInputChange: index=${index}, field=${field}, rawValue=${value}, stateValue=${finalValue}`);
    };

    const handleEntranceChange = (index: number, value: string) => {
        const sanitizedValue = value.replace(/[^0-9]/g, ''); // Only digits for quantity
        setEntrances(prev => {
             const newState = [...prev];
             newState[index] = { ...newState[index], quantity: sanitizedValue };
             return newState;
         });
    };

    const handleFixedExitChange = (index: number, value: string) => {
        handleNumericInputChange(setFixedExits, index, 'amount', value);
    };

    const handleNewExitAmountChange = (value: string) => {
         let sanitizedValue = value.replace(/[^0-9,.]/g, '');
         const firstSeparator = sanitizedValue.search(/[,.]/);
         if (firstSeparator !== -1) {
             const integerPart = sanitizedValue.substring(0, firstSeparator);
             let decimalPart = sanitizedValue.substring(firstSeparator + 1).replace(/[,.]/g, '');
             if (decimalPart.length > 2) decimalPart = decimalPart.slice(0, 2);
             sanitizedValue = `${integerPart},${decimalPart}`;
         }
        setNewExitAmount(sanitizedValue); // Keep sanitized string
        console.log(`Edit Page - handleNewExitAmountChange: rawValue=${value}, stateValue=${sanitizedValue}`);
    };


    const handleAddVariableExit = () => {
        const name = newExitName.trim();
        const amountStr = newExitAmount; // Use the raw input string from state
        const amount = parseInput(amountStr); // Parse the raw string
        console.log(`handleAddVariableExit: name=${name}, amountStr=${amountStr}, parsedAmount=${amount}`);

        if (!name) {
            toast({ variant: "destructive", title: "Nome Inválido", description: "Por favor, insira um nome para a saída variável.", duration: 3000 });
            return;
        }
        // Allow zero amount exits? If not, use amount <= 0
        if (newExitAmount === '' || isNaN(amount) || amount < 0) {
            toast({ variant: "destructive", title: "Valor Inválido", description: "Por favor, insira um valor numérico não negativo.", duration: 3000 });
            return;
        }

        setVariableExits(prev => [
            ...prev,
             // Store parsed amount AND the input string
            { id: Date.now(), name: name, amount: amount, amountInput: amountStr },
        ]);
        setNewExitName('');
        setNewExitAmount('');
        console.log("handleAddVariableExit: Variable exit added.");
    };

    const handleRemoveVariableExit = (id: number) => {
         console.log(`handleRemoveVariableExit: Removing exit with id=${id}`);
        setVariableExits(variableExits.filter((exit) => exit.id !== id));
    };

    // --- Calculations (Ensure consistency) ---
    const totalEntrances = React.useMemo(() => entrances.reduce((sum, entrance) => sum + entrance.price * parseInput(entrance.quantity), 0), [entrances]);
    const totalFixedExits = React.useMemo(() => fixedExits.reduce((sum, exit) => sum + parseInput(exit.amount), 0), [fixedExits]);
    const totalVariableExits = React.useMemo(() => variableExits.reduce((sum, exit) => sum + exit.amount, 0), [variableExits]); // Use parsed amount
    // NOTE: Edit page does NOT handle receivables. They are managed separately.
    const totalExits = totalFixedExits + totalVariableExits;
    const finalResult = totalEntrances - totalExits;


    // --- Update Handler ---
    const handleUpdateCashier = async () => {
        console.log("handleUpdateCashier: Initiating update.");
        if (!user || !closingId) {
            console.error("handleUpdateCashier: Cannot update. User not authenticated or closingId missing.");
            toast({ variant: "destructive", title: "Erro de Autenticação", description: "Usuário não está logado ou ID do fechamento inválido.", duration: 3000 });
            return;
        }
         // Additional check for Capao user and operator name
         if (isCapaoUser && !operatorName.trim()) {
             toast({ variant: "destructive", title: "Nome do Operador Necessário", description: "Por favor, insira o nome de quem está fechando o caixa (Top Capão).", duration: 3000 });
             return;
         }

        console.log("handleUpdateCashier: Starting update process for user:", user.uid, "closing:", closingId);
        setIsSaving(true);
        try {
            // Reference the document within the user's subcollection
            const closingRef = doc(db, "users", user.uid, "fechamentos", closingId);
            console.log("handleUpdateCashier: Update document reference path:", closingRef.path);

            // Fetch the existing document again to ensure we have the latest base data and prevent overwriting essential fields
            const docSnap = await getDoc(closingRef);
            if (!docSnap.exists()) {
                 console.error("handleUpdateCashier: Document to update not found at path:", closingRef.path);
                 toast({ variant: "destructive", title: "Erro", description: "Fechamento não encontrado para atualização. Ele pode ter sido excluído.", duration: 3000 });
                 setIsSaving(false);
                 router.push('/'); // Redirect if doc is gone
                 return;
            }
            const existingData = docSnap.data();

            // Double-check user ID consistency
             if (existingData.userId !== user.uid) {
                 console.error("handleUpdateCashier: User ID mismatch detected before update. Aborting.");
                 toast({ variant: "destructive", title: "Erro de Permissão", description: "Inconsistência de usuário detectada.", duration: 3000 });
                 setIsSaving(false);
                 return;
             }

            // Prepare the data for update, ensuring correct parsing and structure
            const updatedData = {
                 updatedAt: Timestamp.now(), // Update the timestamp
                 entradas: entrances.reduce((acc, cur) => {
                     acc[cur.id] = parseInput(cur.quantity); // Ensure quantity is stored as number
                     return acc;
                 }, {} as Record<string, number>),
                 saidasFixas: fixedExits.reduce((acc, cur) => {
                     acc[cur.id] = parseInput(cur.amount); // Ensure amount is stored as number
                     return acc;
                 }, {} as Record<string, number>),
                 saidasDinamicas: variableExits.map(exit => ({
                     nome: exit.name,
                     valor: exit.amount // Use parsed amount
                 })).filter(exit => exit.valor > 0 || exit.nome), // Filter out empty/zero exits if desired
                 calculatedTotals: {
                     totalEntradas: totalEntrances,
                     totalSaidasFixas: totalFixedExits,
                     totalSaidasDinamicas: totalVariableExits,
                     totalSaidas: totalExits, // Recalculated total (excl. receivables)
                     saldoFinal: finalResult, // Recalculated final balance
                 },
                 // Preserve essential fields from the original document
                 lojaId: existingData.lojaId, // Keep original lojaId
                 userId: existingData.userId, // Keep original userId
                 userEmail: existingData.userEmail, // Keep original userEmail
                 dataFechamento: originalClosingDateString, // *** Keep original YYYY-MM-DD closing date ***
                 createdAt: existingData.createdAt, // Keep original creation timestamp
                 // Update operator name if Capao user, otherwise keep original (or explicitly set to null/remove)
                 operatorName: isCapaoUser ? operatorName.trim() || null : existingData.operatorName || null,
                 // Preserve recebimentos if they exist on the original document
                 recebimentos: existingData.recebimentos || []
            };

            // Clean up operatorName if it's null
            if (updatedData.operatorName === null) {
                 delete (updatedData as any).operatorName;
            }


            console.log("handleUpdateCashier: Data prepared for update:", updatedData);

            await updateDoc(closingRef, updatedData);
            console.log("handleUpdateCashier: Document updated successfully.");

             // Update fetchedClosingData state for PDF generation after successful save
             setFetchedClosingData(prev => prev ? { ...prev, ...updatedData } as ClosingDataForPdf : updatedData as ClosingDataForPdf);


            toast({
                title: "Sucesso!",
                description: "Fechamento de caixa atualizado com sucesso.",
                duration: 3000,
            });

             console.log("handleUpdateCashier: Redirecting to home page.");
             router.push('/'); // Redirecting to home page after update

        } catch (error: any) {
            console.error("handleUpdateCashier: Error updating cashier closing: ", error);
            toast({
                variant: "destructive",
                title: "Erro ao Atualizar",
                description: `Não foi possível atualizar o fechamento. Verifique os valores e sua conexão. Erro: ${error.message || 'Desconhecido'}`,
                duration: 5000,
            });
        } finally {
             console.log("handleUpdateCashier: Finished update process.");
            setIsSaving(false);
        }
    };

    // Function to handle sending PDF to WhatsApp
    const handleSendPdfToWhatsApp = () => {
        if (!fetchedClosingData || !closingDate) {
            toast({ variant: "destructive", title: "Erro", description: "Dados do fechamento não carregados para gerar PDF.", duration: 3000 });
            return;
        }

        const formattedPdfTitleDate = format(closingDate, 'PPP', { locale: ptBR });
        const storeName = getStoreNameForPdf(fetchedClosingData.userEmail);
        const pdfDoc = generatePdf(fetchedClosingData, formattedPdfTitleDate, storeName);

        try {
            const pdfDataUri = pdfDoc.output('datauristring'); // Get PDF as data URI

            // Construct WhatsApp message (simplified: prompts user to attach)
            // For direct sending, it's more complex and often requires backend/third-party services
            const closingDateForMsg = format(closingDate, 'dd/MM/yyyy');
            const message = encodeURIComponent(`Olá! Segue o fechamento de caixa da ${storeName} do dia ${closingDateForMsg}. Por favor, anexe o PDF gerado.`);

            // Open WhatsApp (web or app if available)
            // Note: Phone number can be pre-filled if known e.g., `https://wa.me/55119XXXXXXXX?text=${message}`
            window.open(`https://wa.me/?text=${message}`, '_blank');

            toast({
                title: "PDF Gerado e WhatsApp Aberto",
                description: "O PDF foi gerado. Anexe-o à conversa do WhatsApp. Se o PDF não baixou automaticamente, clique em 'Gerar PDF'.",
                duration: 5000,
            });
        } catch (error) {
            console.error("Error preparing PDF for WhatsApp:", error);
            toast({ variant: "destructive", title: "Erro ao Preparar PDF", description: "Não foi possível preparar o PDF para envio.", duration: 3000 });
        }
    };


    // --- Render Logic ---
    if (loading) {
         console.log("Edit Page: Rendering Skeleton (loading).");
        return (
             <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
                 <Navbar user={user} />
                 <main className="flex-grow container mx-auto px-4 md:px-8 py-8 w-full">
                     <div className="w-full max-w-5xl space-y-8">
                         {/* Header Skeleton */}
                         <div className="flex justify-between items-center mb-8">
                              <Skeleton className="h-10 w-2/5 rounded-lg" />
                              <Skeleton className="h-11 w-40 rounded-md" />
                         </div>
                          {/* Operator Skeleton (Conditional) */}
                           {isCapaoUser && <Skeleton className="h-24 w-full rounded-xl" />}
                          {/* Cards Skeleton */}
                         <Skeleton className="h-80 w-full rounded-xl" />
                         <Skeleton className="h-[500px] w-full rounded-xl" />
                         {/* Note: Removed receivables card skeleton as it's not part of edit */}
                         <Skeleton className="h-60 w-full rounded-xl" />
                         {/* Footer Skeleton */}
                         <footer className="flex justify-end items-center mt-10 pb-4 gap-4">
                             <Skeleton className="h-11 w-48 rounded-md" />
                             <Skeleton className="h-11 w-56 rounded-md" />
                         </footer>
                     </div>
                </main>
                 {/* Footer Skeleton */}
                 <footer className="bg-muted/50 py-3 border-t border-border/60 mt-auto text-center text-xs text-muted-foreground w-full">
                      <Skeleton className="h-4 w-1/3 mx-auto mb-1 rounded" />
                      <Skeleton className="h-3 w-1/4 mx-auto rounded" />
                 </footer>
             </div>
        );
    }

    if (!user) {
        console.log("Edit Page: Rendering null (user not authenticated).");
        return null; // Handled by auth effect redirection
    }

    // Format date for display, handle potential invalid date from fetch
    let formattedTitleDate = 'Data Inválida';
    if (closingDate && isValid(closingDate)) {
       try {
            formattedTitleDate = format(closingDate, 'PPP', { locale: ptBR });
       } catch (e) {
           console.error("Edit Page: Error formatting date object:", closingDate, e);
           // Fallback to raw string if formatting fails but date was parsed
            formattedTitleDate = originalClosingDateString;
       }
    } else if (originalClosingDateString) {
        // Fallback if date parsing failed
        formattedTitleDate = `Data Original: ${originalClosingDateString}`;
    }

    console.log("Edit Page: Rendering Edit Form. Title Date:", formattedTitleDate);

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
             <Navbar user={user} />
             <main className="flex-grow container mx-auto px-4 md:px-8 py-8 w-full">
                 <div className="w-full max-w-5xl space-y-8">
                    {/* Header */}
                    <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">
                            Editar Fechamento - {formattedTitleDate}
                        </h1>
                        <Button variant="outline" onClick={() => router.back()} disabled={isSaving} className="gap-2 h-11 shadow-sm hover:shadow-md transition-shadow rounded-lg" size="lg">
                             <ArrowLeft className="h-4 w-4" />
                             Voltar
                        </Button>
                    </header>

                     {/* Operator Name Input (Conditional) */}
                      {isCapaoUser && (
                         <Card className="shadow-md border border-border/50 overflow-hidden rounded-xl">
                             <CardHeader className="bg-muted/20 border-b border-border/30">
                                 <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                                     <UserIcon className="h-5 w-5 text-primary" />
                                     Operador (Top Capão)
                                 </CardTitle>
                             </CardHeader>
                             <CardContent className="p-6">
                                 <div className="space-y-2">
                                     <Label htmlFor="operator-name" className="text-base font-medium">Nome</Label>
                                     <Input
                                         id="operator-name"
                                         type="text"
                                         placeholder="Nome de quem fechou"
                                         value={operatorName}
                                         onChange={(e) => setOperatorName(e.target.value)}
                                         className="h-10 text-base bg-background"
                                         disabled={isSaving}
                                         autoComplete="off"
                                     />
                                     <p className="text-xs text-muted-foreground">Obrigatório para a loja Top Capão Bonito.</p>
                                 </div>
                             </CardContent>
                         </Card>
                      )}


                    {/* Entradas Card */}
                     <Card className="shadow-md border border-success/20 overflow-hidden rounded-xl">
                       <CardHeader className="bg-success/5 border-b border-success/10">
                         <CardTitle className="text-2xl font-semibold text-success flex items-center gap-3">
                           <div className="bg-success/10 p-2 rounded-lg">
                             <TrendingUp className="h-6 w-6 text-success" />
                           </div>
                           Entradas
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
                         {entrances.map((entrance, index) => {
                             const Icon = entrance.icon;
                             return (
                                 <div key={entrance.id} className="space-y-3 bg-muted/20 p-4 rounded-lg border border-border/30 transition-shadow hover:shadow-sm">
                                    <Label htmlFor={`entrance-${entrance.id}`} className="text-lg font-semibold flex items-center gap-2.5 text-foreground/90">
                                        <Icon className="h-5 w-5 text-success" />
                                        <span>{entrance.name}</span>
                                    </Label>
                                    <Input
                                      id={`entrance-${entrance.id}`}
                                      type="text" // Keep as text for inputMode hint
                                      inputMode="numeric" // Hint for mobile keyboards
                                      pattern="[0-9]*" // Basic pattern for digits
                                      value={entrance.quantity} // Display string value
                                      onChange={(e) => handleEntranceChange(index, e.target.value)}
                                      placeholder="Qtde"
                                      className="w-full text-center h-10 text-base bg-background"
                                      autoComplete="off"
                                      disabled={isSaving}
                                    />
                                    <p className="text-sm text-muted-foreground text-right pt-1 font-medium">
                                        Valor Unitário: {formatCurrency(entrance.price)}
                                    </p>
                                    <Separator className="my-2 border-border/20" />
                                    <p className="text-base font-semibold text-success text-right">
                                        Subtotal: {formatCurrency(entrance.price * parseInput(entrance.quantity))}
                                    </p>
                                 </div>
                             );
                         })}
                       </CardContent>
                        <CardFooter className="bg-success/10 px-6 py-4 mt-0 border-t border-success/20">
                            <p className="w-full text-right text-xl font-bold text-success">
                              Total Entradas: {formatCurrency(totalEntrances)}
                            </p>
                        </CardFooter>
                     </Card>

                     {/* Saídas Card */}
                     <Card className="shadow-md border border-destructive/20 overflow-hidden rounded-xl">
                       <CardHeader className="bg-destructive/5 border-b border-destructive/10">
                         <CardTitle className="text-2xl font-semibold text-destructive flex items-center gap-3">
                             <div className="bg-destructive/10 p-2 rounded-lg">
                               <TrendingDown className="h-6 w-6 text-destructive" />
                             </div>
                             Saídas
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="p-6 space-y-10">
                         {/* Fixed Exits */}
                         <div>
                           <h3 className="text-xl font-medium mb-6 text-destructive/90 border-b border-destructive/20 pb-2">Saídas Fixas</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
                                 {fixedExits.map((exit, index) => {
                                     const Icon = exit.icon;
                                     return (
                                       <div key={exit.id} className="space-y-3 bg-muted/20 p-4 rounded-lg border border-border/30 transition-shadow hover:shadow-sm">
                                         <Label htmlFor={`fixed-exit-${exit.id}`} className="text-lg font-semibold flex items-center gap-2.5 text-foreground/90">
                                            <Icon className="h-5 w-5 text-destructive" />
                                            {exit.name}
                                         </Label>
                                         <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
                                            <Input
                                               id={`fixed-exit-${exit.id}`}
                                               type="text" // Use text for formatting/masking
                                               inputMode="decimal" // Hint for mobile keyboards
                                               value={formatInputValue(exit.amount)} // Display formatted/raw value
                                               onChange={(e) => handleFixedExitChange(index, e.target.value)}
                                               placeholder="0,00"
                                               className="w-full pl-9 pr-3 text-right h-10 text-base bg-background"
                                               autoComplete="off"
                                               disabled={isSaving}
                                            />
                                         </div>
                                         <Separator className="my-2 border-border/20" />
                                         <p className="text-base font-semibold text-destructive text-right">
                                             Valor: {formatCurrency(parseInput(exit.amount))}
                                         </p>
                                       </div>
                                     );
                                 })}
                             </div>
                              <p className="text-lg pt-6 font-semibold text-right text-destructive border-t border-border/30 mt-8">
                                 Total Saídas Fixas: {formatCurrency(totalFixedExits)}
                              </p>
                         </div>

                         {/* Variable Exits */}
                         <div className="space-y-6 pt-8 border-t border-border/50">
                           <h3 className="text-xl font-medium text-destructive/90 border-b border-destructive/20 pb-2 mb-6">Saídas Variáveis</h3>
                           {/* Add Variable Exit Form */}
                           <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end p-4 bg-muted/30 rounded-lg border border-border/50">
                             <div className="flex-grow space-y-1 w-full sm:w-auto">
                               <Label htmlFor="new-exit-name" className="text-sm font-medium">Nome da Saída</Label>
                               <Input
                                 id="new-exit-name"
                                 value={newExitName}
                                 onChange={(e) => setNewExitName(e.target.value)}
                                 placeholder="Ex: Café da Tarde"
                                 disabled={isSaving}
                                 className="h-10 bg-background text-base"
                               />
                             </div>
                             <div className="w-full sm:w-40 space-y-1">
                                 <Label htmlFor="new-exit-amount" className="text-sm font-medium">Valor</Label>
                                 <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
                                    <Input
                                        id="new-exit-amount"
                                        type="text" // Use text for formatting/masking
                                        inputMode="decimal" // Hint for mobile keyboards
                                        value={formatInputValue(newExitAmount)} // Display formatted/raw value
                                        onChange={(e) => handleNewExitAmountChange(e.target.value)}
                                        placeholder="0,00"
                                        disabled={isSaving}
                                        className="h-10 pl-9 pr-3 text-right bg-background text-base"
                                        autoComplete="off"
                                    />
                                 </div>
                             </div>
                             <Button onClick={handleAddVariableExit} disabled={isSaving} className="w-full sm:w-auto h-10 mt-2 sm:mt-0" size="default">
                               <PlusCircle className="mr-2 h-4 w-4" />
                               Adicionar Saída
                             </Button>
                           </div>

                           {/* Variable Exits List */}
                           {variableExits.length > 0 ? (
                             <div className="space-y-3 mt-6">
                               <h4 className="text-base font-medium text-muted-foreground">Lista de Saídas Variáveis:</h4>
                               <ul className="space-y-2">
                                   {variableExits.map((exit) => (
                                     <li key={exit.id} className="flex justify-between items-center p-3 bg-muted/40 rounded-md border border-border/40 text-base">
                                       <span className="text-foreground flex-1 mr-4 break-words">{exit.name}</span>
                                       <div className="flex items-center gap-3">
                                          <span className="font-medium text-destructive">{formatCurrency(exit.amount)}</span>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                            onClick={() => handleRemoveVariableExit(exit.id)}
                                            disabled={isSaving}
                                            aria-label={`Remover ${exit.name}`}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Remover</span>
                                          </Button>
                                        </div>
                                     </li>
                                   ))}
                                </ul>
                                <p className="text-lg pt-4 font-semibold text-right text-destructive border-t border-border/30 mt-6">
                                    Total Saídas Variáveis: {formatCurrency(totalVariableExits)}
                                 </p>
                             </div>
                           ) : (
                                <p className="text-sm text-muted-foreground text-center mt-8 italic">Nenhuma saída variável adicionada ainda.</p>
                           )}
                         </div>
                       </CardContent>
                        <CardFooter className="bg-destructive/10 px-6 py-4 mt-0 border-t border-destructive/20">
                             <p className="w-full text-right text-xl font-bold text-destructive">
                                 Total Saídas: {formatCurrency(totalExits)}
                             </p>
                        </CardFooter>
                     </Card>

                     {/* Resumo Final Card */}
                     <Card className="bg-card shadow-lg border border-border/40 rounded-xl">
                       <CardHeader className="border-b border-border/20 pb-4">
                         <CardTitle className="text-2xl font-bold text-center text-foreground">Resumo Final</CardTitle>
                       </CardHeader>
                       <CardContent className="space-y-5 text-lg px-6 pt-6 pb-6">
                         <div className="flex justify-between items-center py-2.5">
                           <span className="text-muted-foreground">Total Entradas:</span>
                           <span className="font-semibold text-success">{formatCurrency(totalEntrances)}</span>
                         </div>
                         <Separator className="my-0 border-border/15"/>
                         <div className="flex justify-between items-center py-2.5">
                           <span className="text-muted-foreground">Total Saídas Fixas:</span>
                            <span className="font-semibold text-destructive">{formatCurrency(totalFixedExits)}</span>
                          </div>
                          <Separator className="my-0 border-border/15"/>
                          <div className="flex justify-between items-center py-2.5">
                            <span className="text-muted-foreground">Total Saídas Variáveis:</span>
                            <span className="font-semibold text-destructive">{formatCurrency(totalVariableExits)}</span>
                          </div>
                         {/* Removed Receivables from final summary as they are not edited here */}
                         <Separator className="my-0 border-border/15"/>
                         <div className="flex justify-between items-center py-2.5 font-medium text-destructive">
                           <span>Total Geral Saídas:</span>
                           <span className="font-semibold">{formatCurrency(totalExits)}</span>
                         </div>
                         <Separator className="my-4 border-primary/20 border-dashed"/>
                         <div className="flex justify-between items-center text-xl font-bold pt-2">
                           <span>Resultado Final (Caixa):</span>
                           <span className={cn(
                               "px-3 py-1.5 rounded-md text-lg font-bold tracking-wider",
                               finalResult >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                           )}>
                              {formatCurrency(finalResult)}
                           </span>
                         </div>
                       </CardContent>
                     </Card>

                    {/* Action Buttons */}
                    <footer className="flex flex-col sm:flex-row justify-end items-center mt-10 pb-4 gap-4">
                         <Button
                            variant="outline"
                            onClick={handleSendPdfToWhatsApp}
                            disabled={isSaving || loading || !fetchedClosingData}
                            className="gap-2 px-6 h-11 text-base shadow-sm hover:shadow-md transition-shadow rounded-lg border-green-600 text-green-700 hover:bg-green-50 w-full sm:w-auto"
                            size="lg"
                        >
                            <MessageSquare className="h-5 w-5"/>
                            Enviar PDF (WhatsApp)
                        </Button>
                        <Button
                            onClick={handleUpdateCashier}
                            disabled={isSaving || loading}
                            className="gap-2 px-8 h-11 text-base shadow-md hover:shadow-lg transition-shadow rounded-lg w-full sm:w-auto"
                            size="lg"
                        >
                            <Save className="h-5 w-5" />
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </footer>
                 </div>
             </main>
             {/* Footer */}
             <footer className="bg-muted/50 py-3 border-t border-border/60 mt-auto text-center text-xs text-muted-foreground w-full">
                 <p>© {new Date().getFullYear()} Fechamento de Caixa App.</p>
                 <p className="mt-1 opacity-75">Desenvolvido por Bruno Gonçalves</p>
             </footer>
        </div>
    );
}


    