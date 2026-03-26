import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCrmData } from '@/hooks/useCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useCreateOnboardingMeeting } from '@/hooks/useOnboardingMeeting';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface CreateOnboardingMeetingDialogProps {
  trigger?: React.ReactNode;
}

export function CreateOnboardingMeetingDialog({ trigger }: CreateOnboardingMeetingDialogProps) {
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading } = useCrmData();
  const { members, loading: membersLoading } = useTeamMembers();
  const { member } = useAuth();
  const createMeeting = useCreateOnboardingMeeting();
  
  const [open, setOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter only active clients
  const activeClients = useMemo(() => 
    accounts.filter(a => a.status === 'active'),
    [accounts]
  );

  // Filter clients by search term
  const filteredClients = useMemo(() => {
    if (!searchTerm) return activeClients;
    const term = searchTerm.toLowerCase();
    return activeClients.filter(c => c.name.toLowerCase().includes(term));
  }, [activeClients, searchTerm]);

  // Get active CS team members
  const csMembers = useMemo(() => 
    members.filter(m => m.active),
    [members]
  );

  const handleSubmit = async () => {
    if (!selectedClientId) return;

    const meeting = await createMeeting.mutateAsync({
      client_id: selectedClientId,
      cs_owner_id: selectedOwnerId || member?.id || undefined,
      meeting_date: meetingDate,
    });

    setOpen(false);
    setSelectedClientId('');
    setSelectedOwnerId('');
    setSearchTerm('');
    
    // Navigate to the meeting page
    if (meeting?.id) {
      navigate(`/cs/onboarding/meeting/${meeting.id}`);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedClientId('');
      setSelectedOwnerId('');
      setSearchTerm('');
      setMeetingDate(new Date().toISOString().split('T')[0]);
    }
  };

  const isLoading = accountsLoading || membersLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Reunião de Onboarding
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Reunião de Onboarding</DialogTitle>
          <DialogDescription>
            Crie uma nova reunião de onboarding selecionando o cliente e o responsável.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredClients.length === 0 ? (
                    <div className="py-4 px-2 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* CS Owner Selection */}
            <div className="space-y-2">
              <Label htmlFor="owner">Responsável CS</Label>
              <Select value={selectedOwnerId || '_none_'} onValueChange={(v) => setSelectedOwnerId(v === '_none_' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">Nenhum (usar meu perfil)</SelectItem>
                  {csMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Meeting Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Data da Reunião</Label>
              <Input
                id="date"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedClientId || createMeeting.isPending}
          >
            
            Criar Reunião
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
