'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, type User } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

interface NavbarProps {
  user: User | null;
}

export function Navbar({ user }: NavbarProps) {
  const { toast } = useToast();
  const router = useRouter();
  const auth = getAuth(); // Initialize auth

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Logout Realizado',
        description: 'Você foi desconectado com sucesso.',
      });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        variant: 'destructive',
        title: 'Falha no Logout',
        description: 'Não foi possível desconectar. Tente novamente.',
      });
    }
  };

  // Function to get the store name based on email
  const getStoreName = (email: string | null | undefined): string => {
      if (!email) return 'Loja'; // Default name
      if (email === 'topcapaobonito@hotmail.com') return 'Top Capão Bonito';
      if (email === 'topguapiara@hotmail.com') return 'Top Guapiara';
      if (email === 'topribeiraobranco@hotmail.com') return 'Top Ribeirão Branco';
      return email; // Fallback to email if no match
  };

  const storeName = getStoreName(user?.email);

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/60 ">
      <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-top.png"
              alt="Logo Top Vistorias"
              width={100}
              height={50}
              priority
              className="object-contain"
            />
          </Link>
        </div>

        {/* Store Name and Logout */}
        <div className="flex items-center gap-3 text-sm text-foreground">
          {user ? (
            <>
              <span className="text-foreground font-medium hidden sm:inline">{storeName}</span>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-[#f7901e]"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button className="bg-[#f7901e] text-[#044466] hover:bg-[#ffa340] font-bold">Entrar</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
