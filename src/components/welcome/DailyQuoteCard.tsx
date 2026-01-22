import { Quote } from 'lucide-react';
import { getDailyQuote } from '@/data/dailyQuotes';

export function DailyQuoteCard() {
  const quote = getDailyQuote();

  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
      {/* Decorative quote icon */}
      <Quote className="absolute -top-2 -left-2 h-16 w-16 text-primary/10 rotate-180" />
      
      <div className="relative z-10 space-y-3">
        <p className="text-sm md:text-base text-foreground/90 italic leading-relaxed">
          "{quote.text}"
        </p>
        <p className="text-xs text-muted-foreground font-medium">
          — {quote.author}
        </p>
      </div>
    </div>
  );
}
