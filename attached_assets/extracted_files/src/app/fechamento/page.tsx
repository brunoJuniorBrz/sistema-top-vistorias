
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
    auth,
    db,
    collection,
    addDoc,
    Timestamp,
    query,
    where,
    getDocs,
    limit,
    doc,
    getLojaIdFromEmail,
    updateDoc,
    orderBy // Import orderBy here
} from '@/lib/firebase';
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
    Calendar as CalendarIcon,
    User as UserIcon,
    type LucideIcon,
    CircleDollarSign, // Icon for A Receber
    Wallet // Icon for Pending Payments
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format, parse, isValid, startOfDay } from 'date-fns'; // Added startOfDay
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Navbar from '@/components/navbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'; // Import AlertDialog


// User UIDs - Keep for specific logic like operator name
const CAPAO_UID = 'ijNp5AAiFvWrBFCVq7hQ9L05d5Q2';

// Define interface for Receivable data (used for fetching pending items)
interface ReceivableData {
    id: string; // Document ID
    nomeCliente: string;
    placa: string;
    valorReceber: number;
    dataDebito: string; // YYYY-MM-DD
    lojaId: string;
    userId: string; // User who recorded it
    status: 'pendente' | 'pago' | 'baixado'; // Expanded status
    createdAt: Timestamp;
    fechamentoId: string; // Link back to the closing doc
    dataPagamento: Timestamp | null; // Timestamp when paid
    dataBaixa: Timestamp | null; // Timestamp when cleared
}

interface Entrance {
  id: string;
  name: string;
  price: number;
  quantity: number | string;
  icon: LucideIcon;
}

interface FixedExit {
    id: string;
    name: string;
    amount: number | string; // Allow string for input display
    icon: LucideIcon;
}

interface VariableExit {
  id: number; // Internal ID for list management
  name: string;
  amount: number; // Store parsed number here
  amountInput: string; // Keep the input string for the field
}

// Interface for Accounts Receivable entries (for creating new ones)
interface ReceivableInput {
    id: number; // Internal ID for list management
    clientName: string;
    plate: string;
    amount: number; // Store parsed number here
    amountInput: string; // Keep the input string for the field
}

// Interface for Received Pending Payments
interface ReceivedPayment {
    id: number; // Internal ID for list management
    receivableId: string; // ID of the original receivable document
    clientName: string;
    amount: number; // Store parsed amount here
    amountInput: string; // Keep the input string for the field
}


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
]

// Helper function to reset the form state
const resetFormState = (
    setEntrances: React.Dispatch<React.SetStateAction<Entrance[]>>,
    setFixedExits: React.Dispatch<React.SetStateAction<FixedExit[]>>,
    setVariableExits: React.Dispatch<React.SetStateAction<VariableExit[]>>,
    setReceivablesInput: React.Dispatch<React.SetStateAction<ReceivableInput[]>>, // Renamed
    setReceivedPayments: React.Dispatch<React.SetStateAction<ReceivedPayment[]>>, // Added
    setNewExitName: React.Dispatch<React.SetStateAction<string>>,
    setNewExitAmount: React.Dispatch<React.SetStateAction<string>>,
    setNewReceivableClient: React.Dispatch<React.SetStateAction<string>>,
    setNewReceivablePlate: React.Dispatch<React.SetStateAction<string>>,
    setNewReceivableAmount: React.Dispatch<React.SetStateAction<string>>,
    setSelectedPendingReceivable: React.Dispatch<React.SetStateAction<string>>, // Added
    setNewReceivedPaymentAmount: React.Dispatch<React.SetStateAction<string>>, // Added
    setClosingDateInput: React.Dispatch<React.SetStateAction<string>>,
    setOperatorName: React.Dispatch<React.SetStateAction<string>>
) => {
    console.log("Resetting form state.");
    setEntrances(initialEntrancesData.map(e => ({ ...e, quantity: '' })));
    setFixedExits(initialFixedExitsData.map(e => ({ ...e, amount: '' })));
    setVariableExits([]);
    setReceivablesInput([]); // Reset receivable inputs
    setReceivedPayments([]); // Reset received payments
    setNewExitName('');
    setNewExitAmount('');
    setNewReceivableClient('');
    setNewReceivablePlate('');
    setNewReceivableAmount('');
    setSelectedPendingReceivable(''); // Reset dropdown
    setNewReceivedPaymentAmount(''); // Reset amount
    setClosingDateInput(format(new Date(), 'dd/MM/yyyy')); // Reset to today
    setOperatorName('');
};

// Helper to parse DD/MM/YYYY to YYYY-MM-DD format string, ensuring correct day
const parseInputDate = (dateString: string): string | null => {
    if (!dateString || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        console.error("parseInputDate: Invalid format", dateString);
        return null;
    }
    try {
        // Explicitly use startOfDay to avoid timezone issues affecting the date part
        const parsedDate = startOfDay(parse(dateString, 'dd/MM/yyyy', new Date()));
        if (isValid(parsedDate)) {
            const formatted = format(parsedDate, 'yyyy-MM-dd');
            console.log(`parseInputDate: Parsed ${dateString} to ${formatted}`);
            return formatted;
        }
        console.error("parseInputDate: Parsed date is invalid", dateString, parsedDate);
        return null;
    } catch (e) {
        console.error("parseInputDate: Error parsing date string:", dateString, e);
        return null;
    }
};

// Helper function to handle date input change with basic formatting/masking (DD/MM/YYYY)
const handleDateInputChangeHelper = (value: string): string => {
    let v = value.replace(/\D/g, ''); // Remove non-digits
    if (v.length > 8) v = v.slice(0, 8); // Max 8 digits

    let formattedValue = '';
    if (v.length > 4) {
        formattedValue = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
    } else if (v.length > 2) {
        formattedValue = `${v.slice(0, 2)}/${v.slice(2)}`;
    } else {
        formattedValue = v;
    }
    return formattedValue;
};

// Centralized parsing function for currency inputs (robustly handles commas and whole numbers)
const parseInput = (value: string | number | undefined | null): number => {
    if (typeof value === 'number') return isNaN(value) || !isFinite(value) ? 0 : value;
    if (value === '' || value === null || value === undefined) return 0;

    // Replace comma with dot, remove all non-numeric except the first dot
    const cleanedValue = String(value)
        .replace(',', '.')
        .replace(/[^\d.]/g, '');

    // Handle multiple dots if user enters them accidentally
    const parts = cleanedValue.split('.');
    let finalValueString = cleanedValue;
    if (parts.length > 2) {
        finalValueString = parts[0] + '.' + parts.slice(1).join('');
    }

    const parsed = parseFloat(finalValueString);
    return isNaN(parsed) ? 0 : parsed;
}

// Format number to BRL currency string for display
const formatCurrency = (value: number): string => {
    if (isNaN(value) || !isFinite(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Format raw input string (potentially with comma) for display in input fields
const formatInputValue = (value: string | number | undefined | null): string => {
     if (value === undefined || value === null) return '';
     // Format the number with comma for display, but keep the state as potentially raw string
     if (typeof value === 'number') {
         // Ensure it formats correctly even for integers
         return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
     }
     // Return the string as is, maybe sanitize slightly?
     return String(value).replace(/[^0-9,]/g, ''); // Allow only digits and comma
}


export default function CashierClosingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [closingDateInput, setClosingDateInput] = React.useState<string>(format(new Date(), 'dd/MM/yyyy'));
  const [operatorName, setOperatorName] = React.useState<string>('');
  const [entrances, setEntrances] = React.useState<Entrance[]>(initialEntrancesData.map(e => ({ ...e, quantity: '' })));
  const [fixedExits, setFixedExits] = React.useState<FixedExit[]>(initialFixedExitsData.map(e => ({ ...e, amount: '' })));
  const [variableExits, setVariableExits] = React.useState<VariableExit[]>([]);
  const [receivablesInput, setReceivablesInput] = React.useState<ReceivableInput[]>([]); // Renamed
  const [receivedPayments, setReceivedPayments] = React.useState<ReceivedPayment[]>([]); // State for received pending payments
  const [newExitName, setNewExitName] = React.useState('');
  const [newExitAmount, setNewExitAmount] = React.useState(''); // Raw input string
  const [newReceivableClient, setNewReceivableClient] = React.useState(''); // State for new receivable client name
  const [newReceivablePlate, setNewReceivablePlate] = React.useState(''); // State for new receivable plate
  const [newReceivableAmount, setNewReceivableAmount] = React.useState(''); // State for new receivable amount
  const [isCapaoUser, setIsCapaoUser] = React.useState(false);
  const [userLojaId, setUserLojaId] = React.useState<string | null>(null);
  const [pendingReceivables, setPendingReceivables] = React.useState<ReceivableData[]>([]); // State for fetched pending receivables
  const [selectedPendingReceivable, setSelectedPendingReceivable] = React.useState<string>(''); // Value is the receivable ID
  const [newReceivedPaymentAmount, setNewReceivedPaymentAmount] = React.useState(''); // State for amount received for a pending item


  // Function to fetch PENDING receivables for the current store
  const fetchPendingReceivables = async (storeId: string) => {
      console.log(`Fetching pending receivables for store: ${storeId}`);
      try {
          const receivablesRef = collection(db, 'contasReceber');
          const q = query(
              receivablesRef,
              where("lojaId", "==", storeId),
              where("status", "==", "pendente"), // Only fetch pending
              orderBy("nomeCliente", "asc") // Order by client name
          );
          const querySnapshot = await getDocs(q);
          const fetchedData: ReceivableData[] = [];
          querySnapshot.forEach((doc) => {
              fetchedData.push({ id: doc.id, ...doc.data() } as ReceivableData);
          });
          setPendingReceivables(fetchedData);
          console.log(`Found ${fetchedData.length} pending receivables for store ${storeId}.`);
      } catch (error) {
          console.error("Error fetching pending receivables:", error);
          toast({
              variant: "destructive",
              title: "Erro ao Buscar Pendências",
              description: "Não foi possível carregar as contas pendentes.",
              duration: 3000,
          });
      }
  };

  // Function to check if a closing exists for a *specific* date for the logged-in user
  const checkClosingExists = async (targetUserId: string, dateString: string): Promise<boolean> => {
      console.log(`CashierClosingPage: Checking if closing exists for date ${dateString} for userId: ${targetUserId}`);
      if (!targetUserId || !dateString) {
          console.error("CashierClosingPage: checkClosingExists called without targetUserId or dateString.");
          return true; // Assume exists to prevent accidental overwrite on error
      }
      try {
          // Path to the user's specific subcollection
          const userClosingsRef = collection(db, "users", targetUserId, "fechamentos");
          const q = query(userClosingsRef, where("dataFechamento", "==", dateString), limit(1));
          const querySnapshot = await getDocs(q);
          const exists = !querySnapshot.empty;
          console.log(`CashierClosingPage: Closing for ${dateString} exists: ${exists}`);
          return exists;
      } catch (error: any) {
          console.error("CashierClosingPage: Error checking closing existence:", error);
          return true; // Assume exists on error
      }
  };


  // Authentication and User Setup Effect
  React.useEffect(() => {
    console.log("Fechamento Page: Setting up auth listener.");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log(`Fechamento Page: Auth state changed. User UID: ${currentUser?.uid}, Email: ${currentUser?.email}`);
      if (currentUser) {
        setUser(currentUser);
        const lojaId = getLojaIdFromEmail(currentUser.email);
        setUserLojaId(lojaId);
        setIsCapaoUser(currentUser.uid === CAPAO_UID);

        if (!lojaId && currentUser.uid !== 'txxp9hdSthOmlDKGipwduZJNNak1') { // Added explicit check for Admin UID
            console.error(`Fechamento Page: User ${currentUser.email} not mapped to a lojaId and is not admin. Redirecting.`);
            toast({ variant: "destructive", title: "Erro de Acesso", description: "Conta não associada a uma loja válida.", duration: 3000 });
            auth.signOut().catch(err => console.error("Error signing out unmapped user:", err));
            router.push('/login');
        } else {
           setLoading(false);
           if(lojaId && lojaId !== 'admin') {
                fetchPendingReceivables(lojaId); // Fetch pending receivables for the user's store
           }
        }
      } else {
        console.log("Fechamento Page: No user, redirecting to login.");
        router.push('/login');
        setLoading(false);
      }
    });
    return () => {
        console.log("Fechamento Page: Unsubscribing auth listener.");
        unsubscribe();
    }
  }, [router, toast]);

  // --- Input Handlers ---
  const handleNumericInputChange = (setter: React.Dispatch<React.SetStateAction<any[]>>, index: number, field: string, value: string) => {
     const sanitizedValue = value.replace(/[^0-9,.]/g, '');
     const firstSeparator = sanitizedValue.search(/[,.]/);
     let finalValue = sanitizedValue;

     if (firstSeparator !== -1) {
         const integerPart = sanitizedValue.substring(0, firstSeparator);
         let decimalPart = sanitizedValue.substring(firstSeparator + 1).replace(/[,.]/g, '');
         if (decimalPart.length > 2) {
             decimalPart = decimalPart.slice(0, 2);
         }
         finalValue = `${integerPart},${decimalPart}`;
     }
      setter(prev => {
          const newState = [...prev];
          newState[index] = { ...newState[index], [field]: finalValue };
          return newState;
      });
      console.log(`handleNumericInputChange: index=${index}, field=${field}, rawValue=${value}, stateValue=${finalValue}`);
   };

  const handleEntranceChange = (index: number, value: string) => {
    const sanitizedValue = value.replace(/[^0-9]/g, '');
    console.log(`handleEntranceChange: index=${index}, value=${sanitizedValue}`);
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
      setNewExitAmount(sanitizedValue);
      console.log(`handleNewExitAmountChange: rawValue=${value}, stateValue=${sanitizedValue}`);
  };


  // Handlers for new Receivable fields
  const handleNewReceivableAmountChange = (value: string) => {
      let sanitizedValue = value.replace(/[^0-9,.]/g, '');
      const firstSeparator = sanitizedValue.search(/[,.]/);
      if (firstSeparator !== -1) {
          const integerPart = sanitizedValue.substring(0, firstSeparator);
          let decimalPart = sanitizedValue.substring(firstSeparator + 1).replace(/[,.]/g, '');
          if (decimalPart.length > 2) decimalPart = decimalPart.slice(0, 2);
          sanitizedValue = `${integerPart},${decimalPart}`;
      }
      setNewReceivableAmount(sanitizedValue);
      console.log(`handleNewReceivableAmountChange: value=${sanitizedValue}`);
  };


  // Handler for Received Payment Amount
  const handleNewReceivedPaymentAmountChange = (value: string) => {
        let sanitizedValue = value.replace(/[^0-9,.]/g, '');
        const firstSeparator = sanitizedValue.search(/[,.]/);
        if (firstSeparator !== -1) {
            const integerPart = sanitizedValue.substring(0, firstSeparator);
            let decimalPart = sanitizedValue.substring(firstSeparator + 1).replace(/[,.]/g, '');
            if (decimalPart.length > 2) decimalPart = decimalPart.slice(0, 2);
            sanitizedValue = `${integerPart},${decimalPart}`;
        }
        setNewReceivedPaymentAmount(sanitizedValue);
        console.log(`handleNewReceivedPaymentAmountChange: value=${sanitizedValue}`);
    };


  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = handleDateInputChangeHelper(e.target.value);
    console.log(`handleDateInputChange: value=${formatted}`);
    setClosingDateInput(formatted);
  };

  const handleAddVariableExit = () => {
     const name = newExitName.trim();
     const amountStr = newExitAmount;
     const amount = parseInput(amountStr);
    console.log(`handleAddVariableExit: name=${name}, amountStr=${amountStr}, parsedAmount=${amount}`);

    if (!name) {
        toast({ variant: "destructive", title: "Nome Inválido", description: "Por favor, insira um nome para a saída variável.", duration: 3000 });
        return;
    }
     if (newExitAmount === '' || isNaN(amount) || amount < 0) {
        toast({ variant: "destructive", title: "Valor Inválido", description: "Por favor, insira um valor numérico positivo para a saída variável.", duration: 3000 });
        return;
     }

      setVariableExits(prev => [
          ...prev,
          { id: Date.now(), name: name, amount: amount, amountInput: amountStr },
      ]);
      setNewExitName('');
      setNewExitAmount('');
      console.log("handleAddVariableExit: Variable exit added.");
  };

  const handleAddReceivable = () => {
    const clientName = newReceivableClient.trim();
    const plate = newReceivablePlate.trim().toUpperCase();
    const amountStr = newReceivableAmount;
    const amount = parseInput(amountStr);
    console.log(`handleAddReceivable: client=${clientName}, plate=${plate}, amountStr=${amountStr}, parsedAmount=${amount}`);

    if (!clientName) {
        toast({ variant: "destructive", title: "Nome Inválido", description: "Por favor, insira o nome do cliente.", duration: 3000 });
        return;
    }
    if (!plate) {
        toast({ variant: "destructive", title: "Placa Inválida", description: "Por favor, insira a placa do veículo.", duration: 3000 });
        return;
    }
    if (amountStr === '' || isNaN(amount) || amount <= 0) { // Receivables must be > 0
        toast({ variant: "destructive", title: "Valor Inválido", description: "Por favor, insira um valor positivo para 'A Receber'.", duration: 3000 });
        return;
    }

    setReceivablesInput(prev => [ // Use setReceivablesInput
        ...prev,
        { id: Date.now(), clientName, plate, amount, amountInput: amountStr },
    ]);
    setNewReceivableClient('');
    setNewReceivablePlate('');
    setNewReceivableAmount('');
    console.log("handleAddReceivable: Receivable added to input list.");
  };

    const handleAddReceivedPayment = () => {
        const receivableId = selectedPendingReceivable;
        const amountStr = newReceivedPaymentAmount;
        const amount = parseInput(amountStr);
        console.log(`handleAddReceivedPayment: receivableId=${receivableId}, amountStr=${amountStr}, parsedAmount=${amount}`);

        if (!receivableId) {
            toast({ variant: "destructive", title: "Seleção Inválida", description: "Selecione um cliente/vistoria pendente.", duration: 3000 });
            return;
        }

        const selectedReceivable = pendingReceivables.find(r => r.id === receivableId);
        if (!selectedReceivable) {
            toast({ variant: "destructive", title: "Erro Interno", description: "Não foi possível encontrar os dados da vistoria selecionada.", duration: 3000 });
            return;
        }

        if (amountStr === '' || isNaN(amount) || amount <= 0) {
            toast({ variant: "destructive", title: "Valor Inválido", description: "Insira o valor recebido.", duration: 3000 });
            return;
        }

        // Prevent adding the same receivable payment multiple times in one closing
         if (receivedPayments.some(p => p.receivableId === receivableId)) {
             toast({ variant: "destructive", title: "Pagamento Já Adicionado", description: "Este pagamento pendente já foi adicionado neste fechamento.", duration: 3000 });
             return;
         }

        setReceivedPayments(prev => [
            ...prev,
            {
                id: Date.now(),
                receivableId: receivableId,
                clientName: selectedReceivable.nomeCliente,
                amount: amount,
                amountInput: amountStr
            },
        ]);

        // Reset fields
        setSelectedPendingReceivable('');
        setNewReceivedPaymentAmount('');
        console.log("handleAddReceivedPayment: Received payment added.");
    };


  const handleRemoveVariableExit = (id: number) => {
    console.log(`handleRemoveVariableExit: Removing exit with id=${id}`);
    setVariableExits(variableExits.filter((exit) => exit.id !== id));
  };

  const handleRemoveReceivableInput = (id: number) => { // Renamed
    console.log(`handleRemoveReceivableInput: Removing receivable input with id=${id}`);
    setReceivablesInput(receivablesInput.filter((item) => item.id !== id)); // Use receivablesInput
  };

  const handleRemoveReceivedPayment = (id: number) => {
      console.log(`handleRemoveReceivedPayment: Removing received payment with id=${id}`);
      setReceivedPayments(receivedPayments.filter((item) => item.id !== id));
  };

  // --- Calculations ---
  const totalEntrances = React.useMemo(() => entrances.reduce((sum, entrance) => sum + entrance.price * parseInput(entrance.quantity), 0), [entrances]);
  const totalFixedExits = React.useMemo(() => fixedExits.reduce((sum, exit) => sum + parseInput(exit.amount), 0), [fixedExits]);
  const totalVariableExits = React.useMemo(() => variableExits.reduce((sum, exit) => sum + exit.amount, 0), [variableExits]);
  const totalReceivablesInput = React.useMemo(() => receivablesInput.reduce((sum, item) => sum + item.amount, 0), [receivablesInput]); // Sum of NEW receivables
  const totalReceivedPayments = React.useMemo(() => receivedPayments.reduce((sum, item) => sum + item.amount, 0), [receivedPayments]); // Sum of received payments

  // Total Exits now includes fixed, variable, and NEW receivables created in this closing
  const totalExits = totalFixedExits + totalVariableExits + totalReceivablesInput;
  // Final Result considers all standard entrances + received payments - total exits (which includes new receivables)
  const finalResult = totalEntrances + totalReceivedPayments - totalExits;


  // --- Save Handler ---
  const handleSaveCashier = async () => {
      console.log("handleSaveCashier: Initiating save process.");
      if (!user) {
          console.error("handleSaveCashier: User not authenticated.");
          toast({ variant: "destructive", title: "Erro", description: "Usuário não autenticado.", duration: 3000 });
          return;
      }
       if (!userLojaId || userLojaId === 'admin') { // Ensure not admin
           console.error("handleSaveCashier: User lojaId not found or invalid.");
           toast({ variant: "destructive", title: "Erro", description: "ID da loja do usuário inválido ou não encontrado.", duration: 3000 });
           return;
       }

      const closingDateString = parseInputDate(closingDateInput);
      if (!closingDateString) {
          console.error("handleSaveCashier: Invalid date format selected.");
          toast({ variant: "destructive", title: "Data Inválida", description: "Formato da data de fechamento inválido (DD/MM/AAAA).", duration: 3000 });
          return;
      }

       if (isCapaoUser && !operatorName.trim()) {
            console.warn("handleSaveCashier: Operator name required for Capao user.");
            toast({ variant: "destructive", title: "Nome do Operador Necessário", description: "Por favor, insira o nome de quem está fechando o caixa (Top Capão).", duration: 3000 });
            return;
       }

      setIsSaving(true);
      console.log("handleSaveCashier: Checking if closing already exists for the selected date...");

      // Check if closing already exists *before* attempting to save
      const closingAlreadyExists = await checkClosingExists(user.uid, closingDateString);
      if (closingAlreadyExists) {
          let formattedDate = closingDateString;
          try {
              const parsedForToast = parse(closingDateInput, 'dd/MM/yyyy', new Date());
              if (isValid(parsedForToast)) {
                  formattedDate = format(parsedForToast, 'PPP', { locale: ptBR });
              } else {
                  formattedDate = closingDateInput;
              }
          } catch (e) {
              formattedDate = closingDateInput;
          }

          console.warn(`handleSaveCashier: Closing already exists for ${formattedDate}. Aborting save.`);
          toast({
              variant: "destructive",
              title: "Fechamento Já Existe",
              description: `Já existe um fechamento para ${formattedDate}. Para editar, consulte na tela inicial.`,
              duration: 3000,
          });
          setIsSaving(false);
          return; // Stop execution if closing already exists
      }


      console.log("handleSaveCashier: Proceeding with saving new closing...");
      try {
          const closingData = {
              lojaId: userLojaId,
              userId: user.uid,
              userEmail: user.email,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
              dataFechamento: closingDateString,
              entradas: entrances.reduce((acc, cur) => {
                  acc[cur.id] = parseInput(cur.quantity);
                  return acc;
              }, {} as Record<string, number>),
              saidasFixas: fixedExits.reduce((acc, cur) => {
                  acc[cur.id] = parseInput(cur.amount);
                  return acc;
              }, {} as Record<string, number>),
              saidasDinamicas: variableExits.map(exit => ({
                  nome: exit.name,
                  valor: exit.amount
              })).filter(exit => exit.valor > 0 || exit.nome),
               recebimentos: receivedPayments.map(p => ({ // Add received payments to closing doc
                   nomeCliente: p.clientName,
                   valor: p.amount,
                   receivableId: p.receivableId // Store the ID of the original receivable
               })),
              calculatedTotals: {
                  totalEntradas: totalEntrances, // Store base entrances
                  totalSaidasFixas: totalFixedExits,
                  totalSaidasDinamicas: totalVariableExits,
                  totalSaidas: totalExits, // Includes new receivables
                  saldoFinal: finalResult, // Final cash balance
                  // Note: totalReceivedPayments is not explicitly stored here but derived
              },
               ...(isCapaoUser && operatorName.trim() && { operatorName: operatorName.trim() })
          };

          console.log("handleSaveCashier: Saving closing data to users/" + user.uid + "/fechamentos:", closingData);
          // Reference the user's specific subcollection
          const userClosingsRef = collection(db, "users", user.uid, "fechamentos");
          const closingDocRef = await addDoc(userClosingsRef, closingData);
          console.log("handleSaveCashier: Closing document written with ID: ", closingDocRef.id);


          // 2. Save NEW receivable entries to 'contasReceber' collection
          if (receivablesInput.length > 0) {
              const receivablesPromises = receivablesInput.map(receivable => {
                  const receivableData = {
                      nomeCliente: receivable.clientName,
                      placa: receivable.plate,
                      valorReceber: receivable.amount,
                      dataDebito: closingDateString,
                      lojaId: userLojaId,
                      userId: user.uid,
                      status: 'pendente', // New receivables are always pending initially
                      createdAt: Timestamp.now(),
                      fechamentoId: closingDocRef.id,
                      dataPagamento: null,
                      dataBaixa: null // Initially null
                  };
                  console.log("handleSaveCashier: Saving NEW receivable data:", receivableData);
                  const contasReceberRef = collection(db, "contasReceber");
                  return addDoc(contasReceberRef, receivableData);
              });
              await Promise.all(receivablesPromises);
              console.log("handleSaveCashier: All NEW receivables saved successfully.");
          } else {
              console.log("handleSaveCashier: No NEW receivables to save.");
          }

          // 3. Update status of RECEIVED pending receivables in 'contasReceber'
          if (receivedPayments.length > 0) {
              const updatePromises = receivedPayments.map(payment => {
                  const receivableRef = doc(db, "contasReceber", payment.receivableId);
                   console.log(`handleSaveCashier: Updating receivable ${payment.receivableId} status to 'pago' and setting dataPagamento.`);
                  return updateDoc(receivableRef, {
                      status: 'pago', // Mark as paid (awaiting clearance)
                      dataPagamento: Timestamp.now() // Record payment date
                  });
              });
              await Promise.all(updatePromises);
              console.log("handleSaveCashier: All received pending receivables updated successfully.");
          } else {
               console.log("handleSaveCashier: No received pending payments to update.");
          }


          // Success message and form reset
          toast({
              title: "Sucesso!",
              description: "Fechamento de caixa salvo com sucesso.",
              duration: 3000,
          });

          resetFormState(
              setEntrances, setFixedExits, setVariableExits,
              setReceivablesInput, setReceivedPayments, // Updated/Added
              setNewExitName, setNewExitAmount,
              setNewReceivableClient, setNewReceivablePlate, setNewReceivableAmount,
              setSelectedPendingReceivable, setNewReceivedPaymentAmount, // Added
              setClosingDateInput, setOperatorName
          );

          console.log("handleSaveCashier: Redirecting to home page.");
          router.push('/'); // Redirect to home after successful save

      } catch (error: any) {
          console.error("handleSaveCashier: Error saving cashier closing or receivables: ", error);
          toast({
              variant: "destructive",
              title: "Erro ao Salvar",
              description: `Não foi possível salvar o fechamento. Verifique os dados e sua conexão. Erro: ${error.message || 'Desconhecido'}`,
              duration: 5000,
          });
      } finally {
          setIsSaving(false);
          console.log("handleSaveCashier: Save process finished.");
      }
  };

  // --- Render Logic ---
  if (loading) {
    console.log("Fechamento Page: Rendering Skeleton (loading).");
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
         <Navbar user={null} />
         <main className="flex-grow container mx-auto px-4 md:px-8 py-8 w-full">
            <div className="w-full max-w-5xl space-y-8">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center mb-8">
                    <Skeleton className="h-10 w-2/5" />
                    <Skeleton className="h-11 w-40 rounded-md" />
                </div>
                 {/* Date/Operator Skeleton */}
                <Skeleton className="h-32 w-full rounded-xl" />
                {/* Cards Skeleton */}
                <Skeleton className="h-80 w-full rounded-xl" />
                <Skeleton className="h-[500px] w-full rounded-xl" />
                <Skeleton className="h-60 w-full rounded-xl" />
                {/* Footer Skeleton */}
                <footer className="flex justify-end items-center mt-10 pb-4">
                    <Skeleton className="h-11 w-48 rounded-md" />
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
     console.log("Fechamento Page: Rendering null (user not authenticated).");
    return null;
  }

  console.log("Fechamento Page: Rendering form.");
  return (
     <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
         <Navbar user={user} />
         <main className="flex-grow container mx-auto px-4 md:px-8 py-8 w-full">
            <div className="w-full max-w-5xl space-y-8">
                 {/* Header */}
                 <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
                     <h1 className="text-3xl font-bold text-foreground tracking-tight">Novo Fechamento de Caixa</h1>
                      <Button variant="outline" onClick={() => router.push('/')} disabled={isSaving} className="gap-2 h-11 shadow-sm hover:shadow-md transition-shadow rounded-lg" size="lg">
                           <ArrowLeft className="h-4 w-4" />
                           Voltar ao Painel
                      </Button>
                 </header>

                 {/* Date and Operator Input Card */}
                  <Card className="shadow-md border border-border/50 overflow-hidden rounded-xl">
                     <CardHeader className="bg-muted/20 border-b border-border/30">
                         <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-3">
                             Informações do Fechamento
                         </CardTitle>
                     </CardHeader>
                     <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Closing Date Input */}
                         <div className="space-y-2">
                             <Label htmlFor="closing-date" className="text-lg font-semibold flex items-center gap-2.5 text-foreground/90">
                                 <CalendarIcon className="h-5 w-5 text-primary" />
                                 Data do Fechamento
                             </Label>
                             <Input
                                 id="closing-date"
                                 type="text"
                                 placeholder="DD/MM/AAAA"
                                 value={closingDateInput}
                                 onChange={handleDateInputChange}
                                 className="h-10 text-base bg-background"
                                 maxLength={10}
                                 disabled={isSaving}
                                 autoComplete="off"
                             />
                             <p className="text-xs text-muted-foreground">Use o formato Dia/Mês/Ano.</p>
                         </div>
                          {/* Operator Name Input (Conditional) */}
                         {isCapaoUser && (
                             <div className="space-y-2">
                                 <Label htmlFor="operator-name" className="text-lg font-semibold flex items-center gap-2.5 text-foreground/90">
                                    <UserIcon className="h-5 w-5 text-primary" />
                                     Nome do Operador (Top Capão)
                                 </Label>
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
                         )}
                     </CardContent>
                  </Card>

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
                     <CardContent className="p-6">
                         {/* Standard Entrances */}
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8 mb-10">
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
                                          type="text"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          value={entrance.quantity}
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
                         </div>

                          {/* Received Pending Payments Section */}
                          <div className="space-y-6 pt-8 border-t border-border/50">
                              <h3 className="text-xl font-medium text-success/90 border-b border-success/20 pb-2 mb-6 flex items-center gap-2">
                                  <Wallet className="h-5 w-5 text-success"/>
                                  Adicionar Pagamento Pendente Recebido
                              </h3>
                              {pendingReceivables.length > 0 ? (
                                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end p-4 bg-muted/30 rounded-lg border border-border/50">
                                  <div className="flex-grow space-y-1 w-full">
                                      <Label htmlFor="pending-receivable-select" className="text-sm font-medium">Cliente/Vistoria Pendente</Label>
                                      <Select value={selectedPendingReceivable} onValueChange={setSelectedPendingReceivable} disabled={isSaving}>
                                          <SelectTrigger id="pending-receivable-select" className="h-10 bg-background text-base">
                                              <SelectValue placeholder="Selecione um cliente/vistoria" />
                                          </SelectTrigger>
                                          <SelectContent>
                                              {pendingReceivables.map((item) => (
                                                  <SelectItem key={item.id} value={item.id}>
                                                      {item.nomeCliente} ({item.placa}) - {formatCurrency(item.valorReceber)}
                                                  </SelectItem>
                                              ))}
                                          </SelectContent>
                                      </Select>
                                  </div>
                                  <div className="w-full md:w-40 space-y-1">
                                      <Label htmlFor="new-received-payment-amount" className="text-sm font-medium">Valor Recebido</Label>
                                      <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
                                          <Input
                                              id="new-received-payment-amount"
                                              type="text"
                                              inputMode="decimal"
                                              value={formatInputValue(newReceivedPaymentAmount)}
                                              onChange={(e) => handleNewReceivedPaymentAmountChange(e.target.value)}
                                              placeholder="0,00"
                                              disabled={isSaving}
                                              className="h-10 pl-9 pr-3 text-right bg-background text-base"
                                              autoComplete="off"
                                          />
                                      </div>
                                  </div>
                                  <Button onClick={handleAddReceivedPayment} disabled={isSaving} className="w-full md:w-auto h-10 mt-2 md:mt-0" size="default">
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Adicionar Pagamento
                                  </Button>
                                </div>
                              ) : (
                                 <p className="text-sm text-muted-foreground text-center italic py-4">Nenhuma vistoria pendente encontrada para esta loja.</p>
                              )}

                               {/* Received Payments List */}
                               {receivedPayments.length > 0 && (
                                   <div className="space-y-3 mt-6">
                                       <h4 className="text-base font-medium text-muted-foreground">Pagamentos Pendentes Recebidos (Neste Fechamento):</h4>
                                       <ul className="space-y-2">
                                           {receivedPayments.map((item) => (
                                               <li key={item.id} className="flex justify-between items-center p-3 bg-muted/40 rounded-md border border-border/40 text-base">
                                                   <span className="text-foreground flex-1 mr-4 break-words">{item.clientName}</span>
                                                   <div className="flex items-center gap-3">
                                                       <span className="font-medium text-success">{formatCurrency(item.amount)}</span>
                                                       <Button
                                                           variant="ghost"
                                                           size="icon"
                                                           className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                                           onClick={() => handleRemoveReceivedPayment(item.id)}
                                                           disabled={isSaving}
                                                           aria-label={`Remover pagamento de ${item.clientName}`}
                                                       >
                                                           <Trash2 className="h-4 w-4" />
                                                           <span className="sr-only">Remover</span>
                                                       </Button>
                                                   </div>
                                               </li>
                                           ))}
                                       </ul>
                                       <p className="text-lg pt-4 font-semibold text-right text-success border-t border-border/30 mt-6">
                                           Total Pagamentos Pendentes Recebidos: {formatCurrency(totalReceivedPayments)}
                                       </p>
                                   </div>
                               )}
                          </div>
                     </CardContent>
                      <CardFooter className="bg-success/10 px-6 py-4 mt-0 border-t border-success/20">
                          <p className="w-full text-right text-xl font-bold text-success">
                            Total Entradas (Padrão + Receb. Pend.): {formatCurrency(totalEntrances + totalReceivedPayments)}
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
                             Saídas e A Receber
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
                                                 type="text"
                                                 inputMode="decimal"
                                                 value={formatInputValue(exit.amount)}
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
                                             type="text"
                                             inputMode="decimal"
                                             value={formatInputValue(newExitAmount)}
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

                         {/* Accounts Receivable Section (NEW Receivables for THIS closing) */}
                         <div className="space-y-6 pt-8 border-t border-border/50">
                             <h3 className="text-xl font-medium text-primary/90 border-b border-primary/20 pb-2 mb-6 flex items-center gap-2">
                               <CircleDollarSign className="h-5 w-5 text-primary"/>
                               Adicionar Nova Conta A Receber (Venda Fiado)
                             </h3>
                             {/* Add Receivable Form */}
                             <div className="flex flex-col md:flex-row gap-4 items-start md:items-end p-4 bg-muted/30 rounded-lg border border-border/50">
                                 <div className="flex-grow space-y-1 w-full">
                                     <Label htmlFor="new-receivable-client" className="text-sm font-medium">Nome do Cliente</Label>
                                     <Input
                                         id="new-receivable-client"
                                         value={newReceivableClient}
                                         onChange={(e) => setNewReceivableClient(e.target.value)}
                                         placeholder="Nome Completo"
                                         disabled={isSaving}
                                         className="h-10 bg-background text-base"
                                     />
                                 </div>
                                 <div className="w-full md:w-auto space-y-1">
                                     <Label htmlFor="new-receivable-plate" className="text-sm font-medium">Placa</Label>
                                     <Input
                                         id="new-receivable-plate"
                                         value={newReceivablePlate}
                                         onChange={(e) => setNewReceivablePlate(e.target.value)}
                                         placeholder="AAA-0000"
                                         disabled={isSaving}
                                         className="h-10 bg-background text-base uppercase" // Uppercase for plate
                                         maxLength={8} // Limit plate length
                                     />
                                 </div>
                                 <div className="w-full md:w-40 space-y-1">
                                     <Label htmlFor="new-receivable-amount" className="text-sm font-medium">Valor a Receber</Label>
                                     <div className="relative">
                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
                                         <Input
                                             id="new-receivable-amount"
                                             type="text" // Use text for formatting/masking
                                             inputMode="decimal" // Hint for mobile keyboards
                                             value={formatInputValue(newReceivableAmount)} // Display formatted/raw value
                                             onChange={(e) => handleNewReceivableAmountChange(e.target.value)}
                                             placeholder="0,00"
                                             disabled={isSaving}
                                             className="h-10 pl-9 pr-3 text-right bg-background text-base"
                                             autoComplete="off"
                                         />
                                     </div>
                                 </div>
                                 <Button onClick={handleAddReceivable} disabled={isSaving} className="w-full md:w-auto h-10 mt-2 md:mt-0" size="default">
                                     <PlusCircle className="mr-2 h-4 w-4" />
                                     Adicionar A Receber
                                 </Button>
                             </div>

                             {/* Receivables Input List */}
                             {receivablesInput.length > 0 ? (
                                 <div className="space-y-3 mt-6">
                                     <h4 className="text-base font-medium text-muted-foreground">Contas a Receber Criadas Neste Fechamento:</h4>
                                     <ul className="space-y-2">
                                         {receivablesInput.map((item) => (
                                             <li key={item.id} className="flex justify-between items-center p-3 bg-muted/40 rounded-md border border-border/40 text-base">
                                                 <div className="flex-1 mr-4 break-words">
                                                   <span className="font-semibold text-foreground">{item.clientName}</span>
                                                   <span className="text-xs text-muted-foreground block">Placa: {item.plate}</span>
                                                 </div>
                                                 <div className="flex items-center gap-3">
                                                     <span className="font-medium text-primary">{formatCurrency(item.amount)}</span>
                                                     <Button
                                                         variant="ghost"
                                                         size="icon"
                                                         className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                                         onClick={() => handleRemoveReceivableInput(item.id)} // Use renamed handler
                                                         disabled={isSaving}
                                                         aria-label={`Remover ${item.clientName}`}
                                                     >
                                                         <Trash2 className="h-4 w-4" />
                                                         <span className="sr-only">Remover</span>
                                                     </Button>
                                                 </div>
                                             </li>
                                         ))}
                                     </ul>
                                     <p className="text-lg pt-4 font-semibold text-right text-primary border-t border-border/30 mt-6">
                                         Total A Receber (Adicionado Agora): {formatCurrency(totalReceivablesInput)}
                                     </p>
                                 </div>
                             ) : (
                                 <p className="text-sm text-muted-foreground text-center mt-8 italic">Nenhuma conta a receber criada para este fechamento.</p>
                             )}
                         </div>


                     </CardContent>
                      <CardFooter className="bg-destructive/10 px-6 py-4 mt-0 border-t border-destructive/20">
                           <p className="w-full text-right text-xl font-bold text-destructive">
                               Total Saídas (Fixas + Variáveis + Novas A Receber): {formatCurrency(totalExits)}
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
                             <span className="text-muted-foreground">Total Entradas Padrão:</span>
                             <span className="font-semibold text-success">{formatCurrency(totalEntrances)}</span>
                         </div>
                         <Separator className="my-0 border-border/15"/>
                          <div className="flex justify-between items-center py-2.5">
                             <span className="text-muted-foreground">Total Receb. Pendentes:</span>
                             <span className="font-semibold text-success">{formatCurrency(totalReceivedPayments)}</span>
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
                          <Separator className="my-0 border-border/15"/>
                          <div className="flex justify-between items-center py-2.5">
                             <span className="text-muted-foreground">Total Novas A Receber:</span>
                             <span className="font-semibold text-primary">{formatCurrency(totalReceivablesInput)}</span>
                          </div>
                         <Separator className="my-0 border-border/15"/>
                         <div className="flex justify-between items-center py-2.5 font-medium text-destructive">
                             <span>Total Geral Saídas (inclui Novas A Receber):</span>
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
                       <p className="text-xs text-muted-foreground mt-2 text-center">(Entradas Padrão + Receb. Pendentes - Total Saídas)</p>
                     </CardContent>
                 </Card>

                 {/* Action Buttons */}
                 <footer className="flex justify-end items-center mt-10 pb-4">
                     <Button
                         onClick={handleSaveCashier}
                         disabled={isSaving || loading}
                         className="gap-2 px-8 h-11 text-base shadow-md hover:shadow-lg transition-shadow rounded-lg"
                         size="lg"
                     >
                         <Save className="h-5 w-5" />
                         {isSaving ? 'Salvando...' : 'Salvar Fechamento'}
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

    