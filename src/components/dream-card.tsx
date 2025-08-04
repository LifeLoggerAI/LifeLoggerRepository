
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Dream } from "@/lib/types";
import { BrainCircuit, Milestone, Tag } from "lucide-react";
import { Progress } from "./ui/progress";
import { SentimentIcon } from "./sentiment-icon";

export function DreamCard({ dream }: { dream: Dream }) {
    const date = new Date(dream.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const getProgressColor = (value: number) => {
        if (value < -0.33) return "bg-chart-5"; // Red
        if (value < 0.33) return "bg-chart-4"; // Orange/Yellow
        return "bg-chart-2"; // Green
    };
  
    const sentiment = dream.sentimentScore > 0.1 ? 'positive' : dream.sentimentScore < -0.1 ? 'negative' : 'neutral';
    const sentimentScoreNormalized = (dream.sentimentScore + 1) * 50;


    return (
        <div className="animate-fadeIn">
            <Card className="shadow-lg border-border/60 hover:border-accent/80 transition-all duration-300 bg-card">
                <CardHeader className="flex flex-row items-start justify-between pb-2 gap-4">
                     <div>
                        <CardTitle className="text-lg font-headline line-clamp-2">{dream.text}</CardTitle>
                        <p className="text-sm text-muted-foreground pt-1">{date}</p>
                    </div>
                     <SentimentIcon sentiment={sentiment} />
                </CardHeader>
                <CardContent>
                    <p className="text-foreground/80 whitespace-pre-wrap">{dream.text}</p>
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-4 pt-4">
                     <div className="w-full">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-32 shrink-0 flex items-center gap-2"><SentimentIcon sentiment={sentiment} /> Sentiment</div>
                            <Progress value={sentimentScoreNormalized} className="w-full" indicatorClassName={getProgressColor(dream.sentimentScore)} />
                            <span className="text-muted-foreground text-xs w-10 text-right">{dream.sentimentScore.toFixed(2)}</span>
                        </div>
                    </div>
                     {dream.emotions && dream.emotions.length > 0 && (
                        <div className="flex flex-col gap-2 pt-4 border-t w-full mt-2">
                             <div className="flex items-center gap-2">
                                <BrainCircuit className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <h4 className="text-sm font-medium">Emotions</h4>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {dream.emotions.map(emotion => (
                                    <Badge key={emotion} variant="secondary">{emotion}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                     {dream.themes && dream.themes.length > 0 && (
                        <div className="flex flex-col gap-2 pt-4 border-t w-full mt-2">
                            <div className="flex items-center gap-2">
                                <Milestone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <h4 className="text-sm font-medium">Themes</h4>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {dream.themes.map(theme => (
                                    <Badge key={theme} variant="secondary">{theme}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                    {dream.symbols && dream.symbols.length > 0 && (
                        <div className="flex flex-col gap-2 pt-4 border-t w-full mt-2">
                            <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <h4 className="text-sm font-medium">Symbols</h4>
                            </div>
                           <div className="flex flex-wrap gap-1">
                                {dream.symbols.map(symbol => (
                                    <Badge key={symbol} variant="outline">{symbol}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
