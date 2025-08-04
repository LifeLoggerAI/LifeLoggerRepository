
'use client';

import type { PersonaProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { TrendingUp, UserCheck, ShieldAlert, Zap, Droplets, Lightbulb, Users, ShieldCheck as ResilienceIcon } from 'lucide-react';

interface PersonaViewProps {
    profile?: PersonaProfile;
}

export function PersonaView({ profile }: PersonaViewProps) {
    if (profile === undefined) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-24" />
                <Skeleton className="h-48" />
                <Skeleton className="h-32" />
            </div>
        );
    }
    
    if (!profile || Object.keys(profile).length === 0) {
        return (
            <div className="text-center text-muted-foreground py-16 px-4 bg-card border rounded-lg">
                <Users className="mx-auto h-12 w-12 text-primary/50" />
                <h3 className="mt-4 text-lg font-medium text-foreground">Persona Profile Not Available</h3>
                <p className="mt-1 text-sm">As you use Life Logger, your persona profile will be generated here.</p>
            </div>
        );
    }

    const { traits, traitChanges, dominantPersona, moodAlignmentScore, conflictEvents, highProductivityWhen, emotionalDrainWhen } = profile;

    const traitIcons: Record<string, React.ReactNode> = {
        openness: <Lightbulb className="h-4 w-4" />,
        resilience: <ResilienceIcon className="h-4 w-4" />,
        socialTrust: <Users className="h-4 w-4" />,
        shadowDominance: <ShieldAlert className="h-4 w-4" />
    };

    return (
        <div className="space-y-6 text-left">
            {dominantPersona && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserCheck /> Dominant Persona</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="secondary" className="text-lg px-4 py-1">{dominantPersona}</Badge>
                         {moodAlignmentScore !== undefined && (
                            <div className="mt-4">
                                <label className="text-sm font-medium text-muted-foreground">Mood Alignment Score</label>
                                <p className="text-2xl font-bold">{moodAlignmentScore.toFixed(2)}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {traits && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Zap /> Personality Traits</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Object.entries(traits).map(([trait, value]) => (
                            <div key={trait}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium capitalize flex items-center gap-2">{traitIcons[trait] || <Zap />} {trait}</span>
                                    <span className="text-sm text-muted-foreground">{(value * 100).toFixed(0)}%</span>
                                </div>
                                <Progress value={value * 100} />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
            
            {traitChanges && traitChanges.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp /> Recent Trait Changes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                           {traitChanges.map((change, index) => (
                               <li key={index} className="text-sm">
                                   <span className="font-semibold capitalize">{change.trait}</span> changed from {change.from} to {change.to} on {new Date(change.date).toLocaleDateString()}.
                               </li>
                           ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <div className="grid md:grid-cols-2 gap-4">
                {highProductivityWhen && (
                    <Card>
                         <CardHeader>
                             <CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-5 w-5 text-green-500"/> Peak Productivity</CardTitle>
                         </CardHeader>
                         <CardContent className="flex flex-wrap gap-2">
                             {highProductivityWhen.map(item => <Badge key={item} variant="outline">{item}</Badge>)}
                         </CardContent>
                    </Card>
                )}
                 {emotionalDrainWhen && (
                    <Card>
                         <CardHeader>
                             <CardTitle className="flex items-center gap-2 text-base"><Droplets className="h-5 w-5 text-blue-500"/> Emotional Drain</CardTitle>
                         </CardHeader>
                         <CardContent className="flex flex-wrap gap-2">
                            {emotionalDrainWhen.map(item => <Badge key={item} variant="outline">{item}</Badge>)}
                         </CardContent>
                    </Card>
                )}
                 {conflictEvents && (
                    <Card className="md:col-span-2">
                         <CardHeader>
                             <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-5 w-5 text-red-500"/> Conflict Triggers</CardTitle>
                         </CardHeader>
                         <CardContent className="flex flex-wrap gap-2">
                            {conflictEvents.map(item => <Badge key={item} variant="destructive">{item}</Badge>)}
                         </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
