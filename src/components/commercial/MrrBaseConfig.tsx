import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Receipt, DollarSign } from 'lucide-react';

interface MrrBaseConfigProps {
  ticketMedio: number;
  clientesAtuais: number;
  onTicketMedioChange: (v: number) => void;
  onClientesAtuaisChange: (v: number) => void;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

export default function MrrBaseConfig({ ticketMedio, clientesAtuais, onTicketMedioChange, onClientesAtuaisChange }: MrrBaseConfigProps) {
  const mrrAtual = ticketMedio * clientesAtuais;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">R$</span>
            <Input
              type="number"
              value={ticketMedio}
              onChange={e => onTicketMedioChange(Number(e.target.value) || 0)}
              className="h-9 text-lg font-bold"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Atuais</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            value={clientesAtuais}
            onChange={e => onClientesAtuaisChange(Number(e.target.value) || 0)}
            className="h-9 text-lg font-bold"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">MRR Atual</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fmt(mrrAtual)}</div>
          <p className="text-xs text-muted-foreground mt-1">Clientes × Ticket Médio</p>
        </CardContent>
      </Card>
    </div>
  );
}
