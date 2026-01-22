import { ArrowRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NextStepItem } from '@/hooks/useWelcomeData';

interface NextStepCardProps {
  item: NextStepItem | null;
  isUserBirthdayToday: boolean;
  userName: string;
}

export function NextStepCard({ item, isUserBirthdayToday, userName }: NextStepCardProps) {
  const navigate = useNavigate();

  // Birthday experience replaces the card
  if (isUserBirthdayToday) {
    return (
      <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-foreground">
            Seu dia especial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Hoje a Petron celebra você, {userName}. Que este novo ciclo traga clareza, 
            decisões firmes e tranquilidade no caminho.
          </p>
          <div className="pt-2">
            <Button 
              variant="outline" 
              className="border-accent/50 text-accent hover:bg-accent/10"
              onClick={() => navigate('/profile')}
            >
              Ver meu perfil
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No pending items
  if (!item) {
    return (
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-foreground">
            Seu próximo passo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Nenhuma pendência urgente no momento. Continue avançando no seu ritmo.
          </p>
          <div className="pt-2">
            <Button 
              onClick={() => navigate('/content/production')}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Ver produção de conteúdo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-foreground">
          Seu próximo passo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium text-foreground">{item.title}</h3>
          <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button 
            onClick={() => navigate(item.actionPath)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {item.actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {item.detailsPath && (
            <Button 
              variant="outline"
              onClick={() => navigate(item.detailsPath!)}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver detalhes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
