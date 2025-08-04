
'use client';

import { useEffect, useState } from 'react';
import type { DashboardData } from '@/lib/types';
import { getDashboardDataAction } from '@/app/actions';
import { useAuth } from './auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Bar, BarChart, Area, AreaChart, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { BrainCircuit, Users, TrendingUp, AlertCircle, Sparkles, Mic } from 'lucide-react';

export function DashboardView() {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            const fetchData = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const result = await getDashboardDataAction(user.uid);
                    if (result.error) {
                        setError(result.error);
                    } else {
                        setData(result.data);
                    }
                } catch {
                    setError('An unexpected error occurred.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [user]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                 <Skeleton className="h-72" />
                 <Skeleton className="h-72" />
            </div>
        )
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Dashboard</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    if (!data || (data.sentimentOverTime.length === 0 && data.emotionBreakdown.length === 0)) {
        return (
            <div className="text-center text-muted-foreground py-16 px-4 bg-card border rounded-lg animate-fadeIn">
                <Sparkles className="mx-auto h-12 w-12 text-primary/50" />
                <h3 className="mt-4 text-lg font-medium text-foreground">Not Enough Data Yet</h3>
                <p className="mt-1 text-sm">Log some voice notes, dreams, or reflections to see your Cognitive Mirror come to life.</p>
            </div>
        )
    }
    
    const chartConfig = {
        sentiment: { label: 'Sentiment', color: 'hsl(var(--chart-2))' },
        ...data.emotionBreakdown.reduce((acc, curr, index) => {
            acc[curr.name] = { label: curr.name, color: `hsl(var(--chart-${(index % 5) + 1}))`};
            return acc;
        }, {} as Record<string, { label: string; color: string }>)
    };


    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Memories</CardTitle>
                        <Mic className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.totalMemories}</div>
                        <p className="text-xs text-muted-foreground">Voice events logged</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dreams Analyzed</CardTitle>
                        <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.totalDreams}</div>
                        <p className="text-xs text-muted-foreground">Dream journal entries</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">People Mentioned</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.totalPeople}</div>
                        <p className="text-xs text-muted-foreground">In your social constellation</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp/>Sentiment Over Time</CardTitle>
                    <CardDescription>Your emotional valence over the last 30 days. (1 = very positive, -1 = very negative)</CardDescription>
                </CardHeader>
                 <CardContent>
                    <ChartContainer config={chartConfig} className="h-64 w-full">
                        <AreaChart data={data.sentimentOverTime} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-sentiment)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-sentiment)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                            <YAxis domain={[-1, 1]} tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                            <Area type="monotone" dataKey="sentiment" stroke="var(--color-sentiment)" fillOpacity={1} fill="url(#colorSentiment)" />
                        </AreaChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BrainCircuit/>Emotion Breakdown</CardTitle>
                    <CardDescription>The most frequent emotions detected in your entries over the last 30 days.</CardDescription>
                </CardHeader>
                 <CardContent>
                     <ChartContainer config={chartConfig} className="h-64 w-full">
                        <BarChart data={data.emotionBreakdown} accessibilityLayer>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                            <Bar dataKey="count" radius={4}>
                                {data.emotionBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    )
}
