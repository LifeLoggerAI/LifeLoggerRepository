
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { auth } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>Google</title>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.34 1.97-4.51 1.97-3.67 0-6.55-3.04-6.55-6.8s2.88-6.8 6.55-6.8c1.98 0 3.33.83 4.1 1.59l2.42-2.42C17.82.7 15.36 0 12.48 0 5.88 0 .02 5.88.02 12.9s5.86 12.9 12.46 12.9c3.1 0 5.4-1.02 7.15-2.79 1.78-1.8 2.5-4.28 2.5-6.88 0-.8-.08-1.55-.2-2.23H12.48z" />
    </svg>
);


export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { toast } = useToast();

  const isSubmitting = isEmailSubmitting || isGoogleSubmitting;

  useEffect(() => {
    // If auth is done loading and we have a user, redirect them away from login.
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleAuthAction = async (action: 'signIn' | 'signUp') => {
    if (!email || !password) {
        toast({
            variant: "destructive",
            title: "Missing Fields",
            description: "Please enter both email and password.",
        });
        return;
    }
    setIsEmailSubmitting(true);
    try {
      if (action === 'signUp') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      toast({
        title: 'Success!',
        description: `You have successfully ${action === 'signIn' ? 'signed in' : 'signed up'}.`,
      });
      router.push('/');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: errorMessage,
      });
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        toast({
            title: 'Success!',
            description: `You have successfully signed in with Google.`,
        });
        router.push('/');
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        toast({
            variant: "destructive",
            title: "Google Sign-In Failed",
            description: errorMessage,
        });
    } finally {
        setIsGoogleSubmitting(false);
    }
  }

  // The AuthProvider shows a global loader. We will just return null here if
  // a user is logged in to prevent a flash of the login form during redirect.
  if (loading || user) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 login-background">
      <Card className="w-full max-w-sm bg-card/80 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary/20 p-3 rounded-full mb-4 border border-primary/30">
                <Sparkles className="h-8 w-8 text-primary" />
            </div>
          <CardTitle className="text-2xl font-headline">Welcome to Life Logger</CardTitle>
          <CardDescription>Your personal AI for symbolic self-reflection.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full"
            >
              {isGoogleSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-4 w-4 fill-current" />
              )}
              Sign in with Google
            </Button>
            
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card/80 px-2 text-muted-foreground">
                    Or continue with email
                    </span>
                </div>
            </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="flex w-full gap-2">
            <Button
              onClick={() => handleAuthAction('signIn')}
              className="w-full"
              disabled={isSubmitting}
            >
              {isEmailSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign In
            </Button>
            <Button
              onClick={() => handleAuthAction('signUp')}
              className="w-full"
              variant="secondary"
              disabled={isSubmitting}
            >
              {isEmailSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign Up
            </Button>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
