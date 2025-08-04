
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { processOnboardingVoiceAction } from '@/app/actions';
import { Loader2, Mic, BotMessageSquare, CheckCircle2, Square, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { doc, writeBatch, updateDoc, collection } from 'firebase/firestore';
import type { OnboardIntake, Goal, Task, CalendarEvent, HabitWatch } from '@/lib/types';

const prompts = [
    "To begin, tell me a dream or a goal you care about right now.",
    "That's a powerful goal. What's one small, concrete step you could take toward it this week?",
    "Perfect. When would be a good time for me to gently nudge you about that step?",
    "Got it. Lastly, is there anything specific I should watch out for on this journey? Any habits or obstacles?",
    "Thank you for sharing. I'm ready to begin this journey with you."
];

type RecordingState = 'idle' | 'recording' | 'processing' | 'done';
type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied';

export default function VoiceOnboardingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [promptIndex, setPromptIndex] = useState(0);
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [permissionState, setPermissionState] = useState<PermissionState>('idle');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const requestMicPermission = async () => {
        if (typeof window === 'undefined' || !navigator.mediaDevices) {
            toast({ variant: 'destructive', title: 'Unsupported Browser' });
            setPermissionState('denied');
            return;
        }
        setPermissionState('requesting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                if (!user) return;
                setRecordingState('processing');
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const audioDataUri = reader.result as string;
                    
                    // Call server action for AI processing ONLY
                    const result = await processOnboardingVoiceAction({ audioDataUri });

                    if (result.error || !result.transcript) {
                        toast({ variant: 'destructive', title: 'Onboarding Failed', description: result.error || "Could not process your reflection." });
                        setRecordingState('idle');
                        return;
                    }

                    // Perform database writes on the CLIENT
                    try {
                        const { transcript, analysis } = result;
                        const timestamp = Date.now();
                        const batch = writeBatch(db);

                        const intakeId = doc(collection(db, "onboardIntake")).id;
                        const intakeDoc: OnboardIntake = {
                            id: intakeId,
                            uid: user.uid,
                            fullTranscript: transcript,
                            createdAt: timestamp
                        };
                        batch.set(doc(db, "onboardIntake", intakeId), intakeDoc);

                        if (analysis) {
                            if (analysis.goal) {
                                const goalId = doc(collection(db, "goals")).id;
                                const goal: Goal = { id: goalId, uid: user.uid, title: analysis.goal, createdAt: timestamp };
                                batch.set(doc(db, "goals", goalId), goal);
                            }
                            if (analysis.task && analysis.reminderDate) {
                                const taskId = doc(collection(db, "tasks")).id;
                                const task: Task = { id: taskId, uid: user.uid, title: analysis.task, dueDate: new Date(analysis.reminderDate).getTime(), status: 'pending' };
                                batch.set(doc(db, "tasks", taskId), task);
                                
                                const eventId = doc(collection(db, "calendarEvents")).id;
                                const calendarEvent: CalendarEvent = { id: eventId, uid: user.uid, title: analysis.task, startTime: new Date(analysis.reminderDate).getTime(), contextSource: 'onboarding' };
                                batch.set(doc(db, "calendarEvents", eventId), calendarEvent);
                            }
                            if (analysis.habitToTrack) {
                                const habitId = doc(collection(db, "habitWatch")).id;
                                const habitWatch: HabitWatch = { id: habitId, uid: user.uid, name: analysis.habitToTrack, frequency: "daily", context: "userOnboard" };
                                batch.set(doc(db, "habitWatch", habitId), habitWatch);
                            }
                        }
                        
                        // All setup docs are in the batch, now commit.
                        await batch.commit();
                        
                        // Final step: mark user as onboarded
                        const userRef = doc(db, "users", user.uid);
                        await updateDoc(userRef, { onboardingComplete: true });

                        setRecordingState('done');
                        toast({ title: "Welcome to Life Logger!", description: "Your journey begins now." });
                        setTimeout(() => router.push('/'), 2000);

                    } catch (dbError) {
                        toast({ variant: 'destructive', title: 'Database Error', description: "Could not save your onboarding data. Please try again." });
                        console.error("Onboarding DB Error:", dbError);
                        setRecordingState('idle');
                    }
                };
                audioChunksRef.current = [];
            };
            setPermissionState('granted');
        } catch (err) {
            console.error("Mic access error:", err);
            toast({ variant: 'destructive', title: 'Microphone Access Denied', description: 'Please enable microphone access in your browser settings to continue.' });
            setPermissionState('denied');
        }
    };

    const handleRecordClick = () => {
        if (recordingState === 'idle' && mediaRecorderRef.current) {
            mediaRecorderRef.current.start();
            setRecordingState('recording');
            
            const advancePrompts = () => {
                setPromptIndex(prev => {
                    if (prev < prompts.length - 2) {
                        setTimeout(advancePrompts, 15000); // ~15 seconds per prompt
                        return prev + 1;
                    }
                    // After the last question, wait a bit then stop recording
                    setTimeout(() => {
                        if (mediaRecorderRef.current?.state === 'recording') {
                            mediaRecorderRef.current.stop();
                        }
                    }, 15000);
                    return prev + 1;
                });
            };
            setTimeout(advancePrompts, 15000); // Start advancing after 15s

        } else if (recordingState === 'recording' && mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
    };
    
    // The AuthProvider shows a global loader. We will just return null here to prevent
    // rendering the page with a null user object before the redirect happens.
    if (loading || !user) {
        return null;
    }
    
    if (permissionState !== 'granted') {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
                <Card className="w-full max-w-lg animate-fadeIn text-center">
                    <CardHeader>
                        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle className="font-headline text-3xl mt-4">Microphone Permission</CardTitle>
                        <CardDescription>To capture your voice, Life Logger needs access to your microphone. Your recordings are processed securely.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={requestMicPermission} disabled={permissionState === 'requesting'}>
                            {permissionState === 'requesting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                            Grant Microphone Access
                        </Button>
                    </CardFooter>
                </Card>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
            <Card className="w-full max-w-2xl animate-fadeIn text-center">
                <CardHeader>
                    <BotMessageSquare className="mx-auto h-12 w-12 text-primary animate-pulse"/>
                    <CardTitle className="font-headline text-3xl mt-4">First Reflection</CardTitle>
                    <CardDescription>Let&apos;s begin by seeding your inner voice. I&apos;ll ask a few questions. Please respond in one continuous recording.</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[10rem] flex items-center justify-center p-6">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={promptIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="text-xl text-foreground"
                        >
                           {prompts[promptIndex]}
                        </motion.p>
                    </AnimatePresence>
                </CardContent>
                <CardFooter className="flex flex-col items-center justify-center gap-4">
                     <Button
                        onClick={handleRecordClick}
                        disabled={recordingState !== 'idle' && recordingState !== 'recording'}
                        size="lg"
                        className="w-48"
                    >
                        {recordingState === 'recording' ? (
                            <>
                                <Square className="mr-2 h-4 w-4 fill-current text-red-500" />Listening...
                            </>
                        ) : (
                             <>
                                <Mic className="mr-2 h-4 w-4" /> Start Reflection
                             </>
                        )}
                    </Button>
                    
                     <div className="h-10">
                        {recordingState === 'processing' && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="animate-spin" /> Analyzing your reflection...</p>}
                        {recordingState === 'done' && <p className="text-sm text-primary flex items-center gap-2"><CheckCircle2/> Welcome! Redirecting...</p>}
                    </div>

                </CardFooter>
            </Card>
        </main>
    );
}
