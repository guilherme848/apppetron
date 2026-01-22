import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WelcomeHeaderProps {
  greeting: string;
  userName: string;
  contextualMessage: string;
  isUserBirthdayToday?: boolean;
}

export function WelcomeHeader({ 
  greeting, 
  userName, 
  contextualMessage,
  isUserBirthdayToday 
}: WelcomeHeaderProps) {
  const today = new Date();
  const formattedDate = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  // Capitalize first letter
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <header className="space-y-1">
      <div className="flex items-baseline gap-2">
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
          {isUserBirthdayToday ? `Feliz aniversário, ${userName}` : `${greeting}, ${userName}`}
        </h1>
        {isUserBirthdayToday && (
          <span className="text-accent text-lg">🎂</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{capitalizedDate}</p>
      <p className="text-sm text-muted-foreground/80 italic">{contextualMessage}</p>
    </header>
  );
}
