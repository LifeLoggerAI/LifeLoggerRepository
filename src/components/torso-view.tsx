
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { Flame, Activity, Repeat, HeartPulse, Scan, CheckCircle2, Circle, Clock, Mic } from "lucide-react";
import type { Goal, Task, VoiceEvent } from "@/lib/types";
import { format } from 'date-fns';
import { NoteForm } from "./note-form";
import { NoteList } from "./note-list";
import { ScrollArea } from "./ui/scroll-area";

interface TorsoViewProps {
    goals: Goal[];
    tasks: Task[];
    voiceEvents: VoiceEvent[];
}

export function TorsoView({ goals, tasks, voiceEvents }: TorsoViewProps) {

    const innerDriveContent = (
        <div className="w-full text-left space-y-6 h-full overflow-y-auto px-1">
            <div>
                <h3 className="font-semibold text-lg mb-2">Your Primary Goal</h3>
                {goals.length > 0 ? (
                    goals.map(goal => (
                        <div key={goal.id} className="text-foreground/90 p-4 bg-muted rounded-lg border">
                            <p>{goal.title}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-muted-foreground text-sm p-4 bg-muted rounded-lg border">You haven&apos;t set a primary goal during onboarding yet.</p>
                )}
            </div>
            <div>
                <h3 className="font-semibold text-lg mb-2">Your Next Steps</h3>
                {tasks.length > 0 ? (
                    <ul className="space-y-3">
                        {tasks.map(task => (
                            <li key={task.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg border">
                                {task.status === 'complete' ? 
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" /> : 
                                    <Circle className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                                }
                                <div className="flex-1">
                                    <p className="text-foreground/90">{task.title}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                        <Clock className="h-3 w-3" />
                                        Due: {format(new Date(task.dueDate), "PPP")}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                     <p className="text-muted-foreground text-sm p-4 bg-muted rounded-lg border">You haven&apos;t set any next steps during onboarding yet.</p>
                )}
            </div>
        </div>
    );

    const voiceEventContent = (
        <div className="flex flex-col gap-4 h-full">
            <NoteForm />
            <ScrollArea className="h-[40vh] mt-4">
                <NoteList items={voiceEvents} />
            </ScrollArea>
        </div>
    );

    const panels = [
        {
            title: 'Inner Drive',
            icon: <Flame className="h-6 w-6 text-primary" />,
            description: "Motivation, goals, and your core values.",
            content: innerDriveContent
        },
        {
            title: 'Voice Notes',
            icon: <Mic className="h-6 w-6 text-primary" />,
            description: "Log and review your voice notes and memories.",
            content: voiceEventContent
        },
        {
            title: 'Rhythm Map',
            icon: <Activity className="h-6 w-6 text-primary" />,
            description: "Sleep cycles, energy levels, and daily rhythms.",
            content: <p className="text-center text-muted-foreground mt-8">Rhythm Map coming soon.</p>
        },
        {
            title: 'Habit Engine',
            icon: <Repeat className="h-6 w-6 text-primary" />,
            description: "Timeline of your recurring habits and loops.",
            content: <p className="text-center text-muted-foreground mt-8">Habit Engine coming soon.</p>
        },
        {
            title: 'Health Echo',
            icon: <HeartPulse className="h-6 w-6 text-primary" />,
            description: "Strain, recovery, and physical wellness signals.",
            content: <p className="text-center text-muted-foreground mt-8">Health Echo coming soon.</p>
        },
        {
            title: 'Body Memory',
            icon: <Scan className="h-6 w-6 text-primary" />,
            description: "Somatic traces and physical memory insights.",
            content: <p className="text-center text-muted-foreground mt-8">Body Memory insights coming soon.</p>
        }
    ];

    return (
        <Carousel className="w-full">
            <CarouselContent>
                {panels.map((panel, index) => (
                     <CarouselItem key={index}>
                        <div className="p-1">
                            <Card className="border-none shadow-none bg-transparent">
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        {panel.icon}
                                        <div>
                                            <CardTitle>{panel.title}</CardTitle>
                                            <CardDescription>{panel.description}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="h-[65vh] flex items-center justify-center p-4">
                                    {panel.content}
                                </CardContent>
                            </Card>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>
    );
}
