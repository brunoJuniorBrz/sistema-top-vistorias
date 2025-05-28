
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, db, collection, query, where, orderBy, limit, getDocs, Timestamp, doc, getLojaIdFromEmail } from '@/lib/firebase'; // Added Firestore imports, doc, and getLojaIdFromEmail
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parse, subDays, isAfter, isValid } from 'date-fns'; // Import parse
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, PlusCircle, Pencil, Search, X } from 'lucide-react'; // Added X icon
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Navbar from '@/components/navbar';
import { cn } from '@/lib/utils'; // Import cn utility

// Define interface for closing data fetched from Firestore
interface ClosingData {
    id: string; // Document ID
    dataFechamento: string; // Keep as string from Firestore (YYYY-MM-DD)
    lojaId: string; // Should always be present now
    userId: string;
    calculatedTotals: {
      saldoFinal: number;
      totalEntradas: number;
      totalSaidas: number;
    };
    operatorName?: string; // Optional operator name
}

// Define ADMIN_UID if not already globally available
const ADMIN_UID = "txxp9hdSthOmlDKGipwduZJNNak1";

const formatCurrency = (value: number): string => {
  if (isNaN(value) || !isFinite(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [closingsLoading, setClosingsLoading] = React.useState(true);
  const [displayedClosings, setDisplayedClosings] = React.useState<ClosingData[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [currentDate, setCurrentDate] = React.useState<Date | null>(null);
  const [searchActive, setSearchActive] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false); // State for Popover

  // Set current date on mount
  React.useEffect(() => {
      setCurrentDate(new Date());
  }, []);

  // Function to fetch closings for the logged-in user
  const fetchClosings = async (targetUserId: string, dateString?: string) => {
      console.log(`HomePage: Fetching closings for userId: ${targetUserId}, date: ${dateString ?? 'recent (limit 4)'}`);
      setClosingsLoading(true);
      setDisplayedClosings([]); // Clear previous results

      try {
          // Reference the subcollection under the specific user
          const userClosingsRef = collection(db, "users", targetUserId, "fechamentos");
          let q;

          if (dateString) {
              // Query for a specific date within the user's subcollection
              console.log(`HomePage: Querying for specific date: ${dateString}`);
              q = query(userClosingsRef, where("dataFechamento", "==", dateString), orderBy("dataFechamento", "desc"));
          } else {
              // Query for the 4 most recent dates within the user's subcollection
              console.log("HomePage: Querying for recent closings (limit 4)");
              q = query(userClosingsRef, orderBy("dataFechamento", "desc"), limit(4));
          }

          const querySnapshot = await getDocs(q);
          console.log(`HomePage: Found ${querySnapshot.size} closing(s) for query.`);

          const closings: ClosingData[] = [];
          querySnapshot.forEach((docSnap) => {
              // Validate data structure minimally before pushing
              const data = docSnap.data();
               if (data && data.dataFechamento && data.userId && data.calculatedTotals) {
                   closings.push({ id: docSnap.id, ...data } as ClosingData);
               } else {
                   console.warn(`HomePage: Skipping document ${docSnap.id} due to missing essential fields.`);
               }
          });

          // No need to sort if querying by date desc already
          setDisplayedClosings(closings);

          if (dateString && closings.length === 0) {
               let friendlyDate = dateString;
               try {
                 friendlyDate = format(parse(dateString, 'yyyy-MM-dd', new Date()), 'PPP', { locale: ptBR });
               } catch (e) { console.error("Error parsing date for toast:", dateString, e); }
               console.log(`HomePage: No closings found for date: ${friendlyDate}`);
               toast({
                  title: "Nenhum Fechamento Encontrado",
                  description: `Nenhum fechamento encontrado para ${friendlyDate}.`,
                  duration: 3000,
               });
          }

      } catch (error: any) {
          console.error("HomePage: Error fetching closings:", {
              code: error.code,
              message: error.message,
              userId: targetUserId,
              dateString: dateString
          });
          let description = `Não foi possível buscar os fechamentos. Verifique sua conexão e tente novamente.`;
          if (error.code === 'permission-denied') {
              description = "Permissão negada para acessar os dados. Verifique as regras de segurança ou se está logado corretamente.";
          } else if (error.code === 'unauthenticated') {
               description = "Usuário não autenticado. Faça login novamente.";
               // Optionally redirect to login here
               // router.push('/login');
          }
          toast({
              variant: "destructive",
              title: "Erro ao Carregar Fechamentos",
              description: description,
              duration: 5000,
          });
      } finally {
          setClosingsLoading(false);
          console.log("HomePage: Finished fetching closings.");
      }
  };

  // Auth state listener and initial data fetching/redirection effect
  React.useEffect(() => {
    console.log("HomePage: Setting up auth listener.");
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (!isMounted) return;

        console.log(`HomePage: Auth state changed. User UID: ${currentUser?.uid}`);
        setUser(currentUser); // Set user state

        if (currentUser) {
            // Redirect Admin user immediately
            if (currentUser.uid === ADMIN_UID) {
                console.log("HomePage: Admin user detected, redirecting to /admin...");
                router.replace('/admin'); // Use replace to avoid back button issues
                setAuthLoading(false); // Stop loading as redirect is happening
                return; // Prevent further processing for admin
            }

            // For regular users, check lojaId and fetch data
            const lojaId = getLojaIdFromEmail(currentUser.email);
            if (lojaId) {
                console.log(`HomePage: Regular user authenticated (UID: ${currentUser.uid}, Loja: ${lojaId}). Fetching recent closings...`);
                fetchClosings(currentUser.uid); // Fetch initial data
                setAuthLoading(false); // Stop auth loading once user type is confirmed
            } else {
                // Handle logged-in user not mapped to a store AND not admin
                console.error(`HomePage: User ${currentUser.email} (UID: ${currentUser.uid}) logged in but not mapped to a store and is not admin. Logging out...`);
                toast({ variant: "destructive", title: "Erro de Acesso", description: "Conta não associada a uma loja válida.", duration: 5000 });
                signOut(auth).catch(err => console.error("Error signing out unmapped user:", err));
                setAuthLoading(false); // Stop loading as user is invalid
            }
        } else {
            // No user logged in
            console.log("HomePage: No user session found. Redirecting to /login...");
            setAuthLoading(false); // Stop auth loading
            // Clear user-specific state
            setDisplayedClosings([]);
            setSearchActive(false);
            setSelectedDate(undefined);
            router.replace('/login'); // Use replace to prevent back button issues
        }
    });

    return () => {
        console.log("HomePage: Unsubscribing auth listener.");
        isMounted = false;
        unsubscribe();
    }
  }, [router, toast]); // Dependencies

  // Function to handle date selection from calendar
  const handleDateSelect = (date: Date | undefined) => {
      console.log("HomePage: Date selected:", date);
      setSelectedDate(date);
      setPopoverOpen(false); // Close popover on selection
      const currentUser = auth.currentUser; // Get current user again inside handler

      if (date && isValid(date) && currentUser) {
          const formattedDate = format(date, 'yyyy-MM-dd');
          console.log(`HomePage: Fetching closings for selected date: ${formattedDate}`);
          setSearchActive(true);
          fetchClosings(currentUser.uid, formattedDate);
      } else if (!date && currentUser) {
          // Handle case where date is explicitly cleared (reset to recent)
           console.log("HomePage: Date cleared, fetching recent closings.");
           setSearchActive(false);
           fetchClosings(currentUser.uid);
      } else if (!currentUser) {
           console.warn("HomePage: Cannot fetch by date, user is not logged in.");
           // Optionally show a toast or redirect
      }
  };

  // Handle reset search
  const handleResetSearch = () => {
      console.log("HomePage: Resetting search.");
      setSelectedDate(undefined);
      setSearchActive(false);
      setPopoverOpen(false); // Ensure popover is closed
      const currentUser = auth.currentUser;
      if (currentUser) {
          fetchClosings(currentUser.uid); // Fetch recent closings
          toast({
              title: "Consulta Limpa",
              description: "Exibindo os últimos fechamentos.",
              duration: 3000,
          });
      } else {
           console.warn("HomePage: Cannot reset search, user not logged in.");
      }
  };

  // Navigate to the new closing page
  const handleGoToNewClosing = () => {
       if (!user) {
           toast({ variant: "destructive", title: "Erro", description: "Faça login para criar um fechamento.", duration: 3000 });
           router.push('/login');
           return;
       }
       console.log("HomePage: 'Novo Fechamento' button clicked. Navigating to /fechamento.");
       router.push('/fechamento');
   };


  // --- Render Logic ---

  if (authLoading || !currentDate) {
    console.log(`HomePage: Rendering Skeleton (authLoading: ${authLoading}, currentDate: ${!!currentDate}).`);
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
         <Navbar user={null} />
         <main className="flex-grow container mx-auto px-4 md:px-8 py-8 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-1 space-y-6">
                     <Skeleton className="h-40 w-full rounded-xl shadow-md" /> {/* Actions Card Skeleton */}
                 </div>
                 <div className="md:col-span-2">
                     <Skeleton className="h-16 w-3/4 mb-4 rounded-lg" /> {/* Title Skeleton */}
                     <Skeleton className="h-8 w-full mb-6 rounded" /> {/* Description Skeleton */}
                     <div className="space-y-4">
                         <Skeleton className="h-20 w-full rounded-xl shadow-sm" /> {/* Closing Item Skeleton */}
                         <Skeleton className="h-20 w-full rounded-xl shadow-sm" />
                         <Skeleton className="h-20 w-full rounded-xl shadow-sm" />
                         <Skeleton className="h-20 w-full rounded-xl shadow-sm" />
                     </div>
                 </div>
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

  // User is authenticated, but not admin, render the dashboard
  console.log("HomePage: Rendering main dashboard content for regular user.");

  const closingsCardTitle = searchActive
     ? selectedDate
         ? `Fechamento de ${format(selectedDate, 'PPP', { locale: ptBR })}`
         : 'Resultado da Consulta' // Should ideally not happen if date is required for search
     : 'Últimos Fechamentos';
  const closingsCardDescription = searchActive
     ? `Exibindo fechamento para a data selecionada.`
     : 'Resumo dos 4 fechamentos mais recentes.';

  return (
    <TooltipProvider>
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
          <Navbar user={user}/>
            <main className="flex-grow container mx-auto px-4 md:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                     {/* Left Column: Actions */}
                     <div className="md:col-span-1 space-y-6 sticky top-[calc(var(--navbar-height,64px)+1.5rem)]"> {/* Make left column sticky */}
                        <Card className="shadow-lg border border-border/50 bg-white overflow-hidden rounded-xl">
                             <CardHeader className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10">
                                <div className="relative z-10">
                                    <CardTitle className="text-xl font-bold text-foreground">Bem-vindo(a)!</CardTitle>
                                    <CardDescription className="text-muted-foreground mt-1">Ações rápidas e consulta de histórico.</CardDescription>
                                </div>
                             </CardHeader>
                            <CardContent className="flex flex-col gap-4 p-6">
                                <Button
                                    size="lg"
                                    onClick={handleGoToNewClosing}
                                    className="w-full justify-start gap-3 shadow-sm hover:shadow-md border border-border/30 transition-all duration-150 hover:bg-primary/90 hover:text-primary-foreground rounded-lg text-base h-11"
                                    aria-label="Iniciar novo fechamento de caixa"
                                >
                                    <PlusCircle className="h-5 w-5" />
                                    Novo Fechamento de Caixa
                                </Button>
                                {/* Date Picker */}
                                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            size="lg"
                                            className={cn(
                                              "w-full justify-start text-left font-normal gap-3 transition-all duration-150 rounded-lg h-11 text-base",
                                              !selectedDate && "text-muted-foreground", // Style placeholder text
                                              "bg-secondary/80 hover:bg-secondary hover:shadow-md shadow-sm border-black/10 text-black"
                                            )}
                                        >
                                            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                            {selectedDate ? (
                                                format(selectedDate, "PPP", { locale: ptBR })
                                            ) : (
                                                <span>Consultar por Data</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={handleDateSelect}
                                            initialFocus
                                            locale={ptBR}
                                            disabled={(date) => date > new Date() || date < new Date("2024-01-01")} // Example range
                                        />
                                    </PopoverContent>
                                </Popover>
                                {searchActive && (
                                     <Button
                                         variant="ghost"
                                         size="sm"
                                         onClick={handleResetSearch}
                                         className="w-full text-muted-foreground hover:text-foreground transition-colors rounded-lg flex items-center justify-center gap-2"
                                     >
                                         <X className="h-4 w-4" /> Limpar Consulta
                                     </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Displayed Closings */}
                    <div className="md:col-span-2">
                        <Card className="shadow-lg border border-border/50 bg-white overflow-hidden rounded-xl">
                             <CardHeader className="relative p-6 bg-gradient-to-br from-muted/10 to-background">
                                <div className="relative z-10">
                                    <CardTitle className="text-xl font-bold text-foreground">
                                       {closingsCardTitle}
                                    </CardTitle>
                                    <CardDescription className="text-muted-foreground mt-1">
                                      {closingsCardDescription}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                {closingsLoading ? (
                                    <div className="space-y-4">
                                        {[...Array(searchActive ? 1 : 4)].map((_, i) =>
                                             <Skeleton key={i} className="h-20 w-full rounded-xl shadow-sm" />
                                         )}
                                    </div>
                                ) : displayedClosings.length > 0 ? (
                                    <ul className="space-y-4">
                                        {displayedClosings.map((closing) => {
                                            let closingDateObj: Date | null = null;
                                            let isEditable = false;
                                            let formattedDateStr = 'Data Inválida';
                                            try {
                                                closingDateObj = parse(closing.dataFechamento, 'yyyy-MM-dd', new Date());
                                                if (isValid(closingDateObj)) {
                                                    formattedDateStr = format(closingDateObj, "PPP", { locale: ptBR });
                                                    if (currentDate) {
                                                        const sevenDaysAgo = subDays(currentDate, 7);
                                                        isEditable = isAfter(closingDateObj, sevenDaysAgo);
                                                    }
                                                }
                                            } catch (e) {
                                                console.error("HomePage: Error parsing closing date for display/edit check:", closing.dataFechamento, e);
                                            }

                                            return (
                                                <li key={closing.id} className="border border-border/40 bg-background p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-muted/40 hover:shadow-md transition-all duration-150">
                                                    <div className="flex-1 min-w-0">
                                                         <Link href={`/historico/${closing.dataFechamento}`} passHref>
                                                             <span className="font-semibold text-lg text-foreground truncate cursor-pointer hover:underline hover:text-primary block">
                                                                 {formattedDateStr}
                                                             </span>
                                                         </Link>
                                                         {closing.operatorName && (
                                                            <span className="text-xs text-muted-foreground block mt-0.5">(Op: {closing.operatorName})</span>
                                                         )}
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-2">
                                                            <span className="text-success flex items-center gap-1">
                                                                <TrendingUp className="h-4 w-4"/> Entr: {formatCurrency(closing.calculatedTotals.totalEntradas)}
                                                            </span>
                                                            <span className="text-destructive flex items-center gap-1">
                                                               <TrendingDown className="h-4 w-4"/> Saíd: {formatCurrency(closing.calculatedTotals.totalSaidas)}
                                                            </span>
                                                            <span className={`font-medium flex items-center gap-1 ${closing.calculatedTotals.saldoFinal >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                                               <DollarSign className="h-4 w-4"/> Saldo: {formatCurrency(closing.calculatedTotals.saldoFinal)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* Edit Button */}
                                                    <div className="flex items-center gap-2 flex-shrink-0 mt-3 sm:mt-0">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className={!isEditable ? 'cursor-not-allowed' : ''}>
                                                                    <Link
                                                                        href={`/fechamento/${closing.id}`}
                                                                        passHref
                                                                        aria-disabled={!isEditable}
                                                                        tabIndex={isEditable ? undefined : -1}
                                                                        onClick={(e) => !isEditable && e.preventDefault()}
                                                                        className={cn(!isEditable ? 'pointer-events-none' : '', 'inline-block')}
                                                                    >
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-9 px-3 text-primary hover:bg-primary/10 hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all rounded-lg flex items-center gap-1.5"
                                                                            disabled={!isEditable}
                                                                            aria-label={isEditable ? `Editar fechamento de ${formattedDateStr}` : `Edição não permitida (mais de 7 dias)`}
                                                                        >
                                                                            <Pencil className="h-4 w-4"/> Editar
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
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-center text-muted-foreground py-10 text-lg italic">
                                        {searchActive ? 'Nenhum fechamento encontrado para esta data.' : 'Nenhum fechamento registrado ainda.'}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
          {/* Footer */}
           <footer className="bg-muted/50 py-3 border-t border-border/60 mt-auto text-center text-xs text-muted-foreground">
                <p>© {new Date().getFullYear()} Fechamento de Caixa App.</p>
                <p className="mt-1 opacity-75">Desenvolvido por Bruno Gonçalves</p>
            </footer>
        </div>
    </TooltipProvider>
  );
}

// Add missing icons to import
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
