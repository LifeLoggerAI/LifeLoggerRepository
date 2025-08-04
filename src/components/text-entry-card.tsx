
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SentimentIcon } from "@/components/sentiment-icon";
import type { InnerVoiceReflection, Sentiment } from "@/lib/types";

export function TextEntryCard({ entry }: { entry: InnerVoiceReflection }) {
  const date = new Date(entry.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const sentiment: Sentiment = entry.sentimentScore > 0.1 ? 'positive' : entry.sentimentScore < -0.1 ? 'negative' : 'neutral';

  return (
    <div className="animate-fadeIn">
      <Card className="shadow-lg border-border/60 hover:border-accent/80 transition-all duration-300 bg-card">
        <CardHeader className="flex flex-row items-start justify-between pb-2 gap-4">
          <div>
            <CardTitle className="text-base font-normal text-foreground/80 whitespace-pre-wrap">{entry.text}</CardTitle>
            <p className="text-sm text-muted-foreground pt-2">{date}</p>
          </div>
          <SentimentIcon sentiment={sentiment} />
        </CardHeader>
      </Card>
    </div>
  );
}
