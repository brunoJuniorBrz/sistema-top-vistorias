
'use client';

import * as React from 'react';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getFunctions, httpsCallable, FunctionsError } from "firebase/functions";
import { useRouter } from 'next/navigation';
import { auth, db, getLojaIdFromEmail } from '@/lib/firebase'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';

const loginSchema = z.object({
  email: z.string().email({ message: 'Endereço de email inválido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Define UIDs as constants for better maintainability
const ADMIN_UID = "txxp9hdSthOmlDKGipwduZJNNak1";
const TIAGO_UID = "4hxWqJzunVUrkAou4E3pSUeJtxO2"; // Ribeirão Branco
const CLAYTON_UID = "vWlAkGFdvagZ5Gv25ThAXHxXqqz1"; // Guapiara
const CAPAO_UID = "ijNp5AAiFvWrBFCVq7hQ9L05d5Q2"; // Capão Bonito

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [user, setUser] = React.useState<User | null>(null);
  const [greeting, setGreeting] = React.useState<string>('');

  // Helper to get greeting based on time
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Set greeting on mount
  React.useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  // Function to determine the appropriate redirect path and display message
  const onLoginSuccess = async (loggedInUser: User) => {
    setIsLoading(true);
    console.log(`LoginPage: onLoginSuccess called for user ${loggedInUser.uid}`);
    if (!loggedInUser) {
        setIsLoading(false);
        return;
    }

    // Always attempt to set lojaId if not admin, but proceed with redirect even if it fails
    if (loggedInUser.uid !== ADMIN_UID) {
        const targetLojaId = getLojaIdFromEmail(loggedInUser.email);
        if (targetLojaId && targetLojaId !== 'admin') { // Ensure not trying to set 'admin' as lojaId claim
            console.log(`LoginPage: Attempting to set lojaId claim '${targetLojaId}' for user ${loggedInUser.uid}`);
            try {
                const functions = getFunctions(auth.app); // Ensure app is passed if not default
                const setLojaIdClaim = httpsCallable(functions, 'setLojaId');
                await setLojaIdClaim({ lojaId: targetLojaId });
                await loggedInUser.getIdToken(true); // Force refresh token to get new claim
                console.log(`LoginPage: lojaId claim '${targetLojaId}' set successfully for ${loggedInUser.email}.`);
            } catch (error: any) {
                 console.error(`LoginPage: Failed to set lojaId claim for ${loggedInUser.email}.`, {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                });
                // Log more specific details for FunctionsError
                if (error instanceof FunctionsError) {
                    console.error("Firebase Functions Error Details:", {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                    });
                }
                // Do not block login if claim setting fails, but log it. User might have existing valid claims.
                // toast({
                //   variant: "destructive",
                //   title: "Aviso: Erro de Configuração",
                //   description: "Não foi possível definir a permissão da loja. Algumas funcionalidades podem não estar disponíveis.",
                //   duration: 5000,
                // });
            }
        } else if (!targetLojaId) {
            console.warn(`LoginPage: User ${loggedInUser.email} has no mapped lojaId. Claim not set.`);
        }
    }

    // Determine redirect path and greeting
    let redirectPath = '/';
    let toastTitle = greeting;
    let toastDescription = "Login realizado com sucesso!";

    if (loggedInUser.uid === ADMIN_UID) {
        console.log("LoginPage: Admin user logged in. Redirecting to /admin.");
        redirectPath = '/admin';
        toastTitle = `${greeting}, Simone!`;
        toastDescription = "Login de administrador realizado com sucesso!";
    } else {
        let userName = '';
        if (loggedInUser.uid === TIAGO_UID) userName = 'Tiago';
        else if (loggedInUser.uid === CLAYTON_UID) userName = 'Clayton';
        else if (loggedInUser.uid === CAPAO_UID) { // Capão Bonito
            // Try to get operator name from a potential claim if set during a previous session or by admin
            const idTokenResult = await loggedInUser.getIdTokenResult();
            userName = idTokenResult.claims.operatorName || 'Top Capão';
        }


        if (userName) toastTitle += `, ${userName}!`;
        console.log(`LoginPage: User (${loggedInUser.email}) logged in. Redirecting to ${redirectPath}`);
    }

    router.push(redirectPath);
    toast({
        title: toastTitle,
        description: toastDescription,
        duration: 3000,
    });
    // setIsLoading(false); // Moved to finally block in onAuthStateChanged and onSubmit
  };


  // Auth state listener
  React.useEffect(() => {
    console.log("LoginPage: Setting up auth listener.");
    let isMounted = true; 

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!isMounted) return; 

        console.log(`LoginPage: Auth state changed. Current user UID: ${currentUser?.uid}`);
        setUser(currentUser);

        if (currentUser) {
            console.log("LoginPage: User is already logged in. Determining redirect...");
            await onLoginSuccess(currentUser);
        } else {
            console.log("LoginPage: No user logged in.");
        }
        if (isMounted) setAuthLoading(false);
    });

    return () => {
        console.log("LoginPage: Unsubscribing auth listener.");
        isMounted = false;
        unsubscribe();
    }
  }, [router]); 

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    console.log("LoginPage: Attempting login for email:", data.email);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const loggedInUser = userCredential.user;
      console.log(`LoginPage: Login successful via form for user: ${loggedInUser.uid}`);
      await onLoginSuccess(loggedInUser);

    } catch (error: any) {
      console.error('LoginPage: Login failed:', {
          code: error.code,
          message: error.message,
          email: data.email 
      });

      let errorMessage = "Ocorreu um erro inesperado. Tente novamente.";
      let errorTitle = "Falha no Login";

      switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found': 
          case 'auth/wrong-password':
              errorMessage = "Email ou senha inválidos.";
              break;
          case 'auth/invalid-email':
              errorMessage = "Formato de email inválido.";
              break;
          case 'auth/user-disabled':
              errorMessage = "Este usuário foi desabilitado.";
              errorTitle = "Usuário Desabilitado";
              break;
          case 'auth/too-many-requests':
              errorMessage = "Muitas tentativas de login falharam. Tente novamente mais tarde.";
              errorTitle = "Acesso Bloqueado Temporariamente";
              break;
          case 'auth/network-request-failed':
              errorMessage = "Erro de rede. Verifique sua conexão com a internet.";
              errorTitle = "Erro de Conexão";
              break;
          case 'auth/operation-not-allowed':
              errorMessage = "Login com Email/Senha não está habilitado neste projeto Firebase.";
              errorTitle = "Método de Login Desabilitado";
              break;
          case 'auth/invalid-api-key':
               errorMessage = "Chave de API do Firebase inválida. Verifique a configuração.";
               errorTitle = "Erro de Configuração";
               break;
           default:
               errorMessage = `Ocorreu um erro (${error.code || 'desconhecido'}). Tente novamente ou contate o suporte.`;
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
        duration: 5000,
      });
    } finally {
        setIsLoading(false); 
    }
  };


  if (authLoading) {
    console.log("LoginPage: Rendering Skeleton (authLoading).");
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/30">
        <Card className="w-full max-w-sm shadow-xl border border-border/40">
          <CardHeader>
            <Skeleton className="h-24 w-3/4 mx-auto mb-4 rounded-md" />
            <Skeleton className="h-6 w-1/3 mx-auto mb-2 rounded" /> 
            <Skeleton className="h-4 w-4/5 mx-auto rounded" /> 
          </CardHeader>
          <CardContent className="grid gap-4 p-6">
            <Skeleton className="h-10 w-full rounded-md" /> 
            <Skeleton className="h-10 w-full rounded-md" /> 
          </CardContent>
          <CardFooter className="p-6">
            <Skeleton className="h-10 w-full rounded-md" /> 
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!authLoading && user) {
    console.log("LoginPage: Rendering minimal loading (user exists, redirect happening).");
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/30">
             <p>Redirecionando...</p>
        </div>
    );
  }

  console.log("LoginPage: Rendering Login Form.");
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#044466' }}>
      <Card className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-200">
          <CardHeader className="p-0 mb-6 text-center">
              <div className="flex justify-center mb-4">
                  <div className="relative w-[180px] h-[90px] sm:w-[200px] sm:h-[100px]">
                      <Image
                          src="/logo-top.png" 
                          alt="Logo Top Vistorias"
                          fill
                          priority
                          sizes="(max-width: 640px) 180px, 200px"
                          style={{ objectFit: "contain" }}
                          data-ai-hint="company logo"
                      />
                  </div>
              </div>
              <h1 className="text-2xl sm:text-3xl text-[#044466] font-bold tracking-tight">
                  TOP VISTORIAS
              </h1>
              <p className="text-sm text-gray-500 mt-1">Acesso ao Sistema de Caixa</p>
          </CardHeader>
          <CardContent className="p-0">
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                              <FormItem>
                                  <FormControl>
                                      <Input
                                          id="email"
                                          type="email"
                                          placeholder="Email"
                                          required
                                          disabled={isLoading}
                                          className="h-11 pl-3 pr-3 w-full border border-gray-300 rounded-md focus:ring-[#f7901e] focus:border-[#f7901e] transition duration-150 ease-in-out text-base"
                                          {...field}
                                      />
                                  </FormControl>
                                  <FormMessage className="text-red-500 text-xs pt-1" />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                              <FormItem>
                                  <FormControl>
                                      <Input
                                          id="password"
                                          type="password"
                                          placeholder="Senha"
                                          required
                                          disabled={isLoading}
                                          className="h-11 pl-3 pr-3 w-full border border-gray-300 rounded-md focus:ring-[#f7901e] focus:border-[#f7901e] transition duration-150 ease-in-out text-base"
                                          {...field}
                                      />
                                  </FormControl>
                                  <FormMessage className="text-red-500 text-xs pt-1" />
                              </FormItem>
                          )}
                      />
                      <Button
                         type="submit"
                         className="w-full bg-[#f7901e] text-white h-11 hover:bg-[#e6801e] font-bold rounded-md transition duration-150 ease-in-out text-base shadow-md hover:shadow-lg"
                         disabled={isLoading}
                      >
                          {isLoading ? (
                              <div className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Entrando...
                              </div>
                          ) : (
                            'Entrar'
                          )}
                      </Button>
                  </form>
              </Form>
          </CardContent>
      </Card>
    </div>
  );
}
