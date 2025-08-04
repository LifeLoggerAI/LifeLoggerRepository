'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { summarizeWeekAction } from '@/app/actions';
import { useAuth } from './auth-provider';
import { Loader2, Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';

export function SummarizationTool() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSummarize = async () => {
        if (!user) return;
        setIsLoading(true);
        setSummary(null);
        setAudioDataUri(null);

        try {
            const result = await summarizeWeekAction(user.uid);
            if (result.error) {
                 toast({
                    variant: "destructive",
                    title: "Summarization Failed",
                    description: result.error,
                });
            } else if (result.summary) {
                setSummary(result.summary);
                setAudioDataUri(result.audioDataUri);
                setIsDialogOpen(true);
            }
        } catch (error) {
             toast({
                variant: "destructive",
                title: "An unexpected error occurred.",
                description: (error as Error).message,
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
       <>
         <Card className="w-full shadow-lg border-border/60">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Weekly Insights</CardTitle>
                <CardDescription>Generate an AI-powered summary of your last seven days of voice notes.</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
                 <Button onClick={handleSummarize} disabled={isLoading || !user}>
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Summarize My Week
                </Button>
            </CardFooter>
        </Card>

        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                    <Sparkles className="text-primary"/> Your Weekly Summary
                </AlertDialogTitle>
                <AlertDialogDescription className="whitespace-pre-wrap pt-4 text-foreground/80">
                    {summary}
                </AlertDialogDescription>
                 {audioDataUri && (
                    <div className="pt-4">
                        <audio controls className="w-full">
                            <source src={audioDataUri} type="audio/wav" />
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogAction>Close</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
       </>
    );
}
