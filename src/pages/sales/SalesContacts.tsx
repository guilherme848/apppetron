import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { supabase } from '@/integrations/supabase/client';
import { DC } from '@/lib/dashboardColors';
import { Plus, Search, User, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function SalesContacts() {
  const { contacts, deals, loading, refetchContacts } = useSalesCrmData();
  const [search, setSearch] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', instagram: '', origin: '', notes: '' });

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const handleSave = async () => {
    if (!form.name) return;
    const { error } = await supabase.from('crm_contacts').insert(form as any);
    if (error) toast.error('Erro ao criar contato');
    else {
      toast.success('Contato criado!');
      setShowNewDialog(false);
      setForm({ name: '', company: '', phone: '', email: '', instagram: '', origin: '', notes: '' });
      refetchContacts();
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4" style={{ backgroundColor: DC.bgPage }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: DC.textPrimary }}>Contatos</h1>
        <Button onClick={() => setShowNewDialog(true)} style={{ backgroundColor: DC.orange }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Contato
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: DC.textSecondary }} />
        <Input
          placeholder="Buscar por nome, empresa, e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Negócios</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8" style={{ color: DC.textSecondary }}>
                    Nenhum contato encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(contact => {
                  const contactDeals = deals.filter(d => d.contact_id === contact.id);
                  return (
                    <TableRow key={contact.id} className="cursor-pointer" onClick={() => setSelectedContact(contact)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: DC.orange20 }}>
                            <User className="h-4 w-4" style={{ color: DC.orange }} />
                          </div>
                          {contact.name}
                        </div>
                      </TableCell>
                      <TableCell>{contact.company || '—'}</TableCell>
                      <TableCell>{contact.phone || '—'}</TableCell>
                      <TableCell>{contact.email || '—'}</TableCell>
                      <TableCell>{contact.origin || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{contactDeals.length}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Contact Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Empresa</Label>
              <Input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))} />
              </div>
              <div>
                <Label>Origem</Label>
                <Input value={form.origin} onChange={e => setForm(p => ({ ...p, origin: e.target.value }))} placeholder="Ex: Site, Indicação..." />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} style={{ backgroundColor: DC.orange }} disabled={!form.name}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Detail Sheet */}
      <Sheet open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px]">
          {selectedContact && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>{selectedContact.name}</SheetTitle>
                {selectedContact.company && (
                  <p className="text-sm" style={{ color: DC.textSecondary }}>{selectedContact.company}</p>
                )}
              </SheetHeader>
              <div className="space-y-3">
                {selectedContact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" style={{ color: DC.textSecondary }} />
                    <span className="text-sm">{selectedContact.phone}</span>
                  </div>
                )}
                {selectedContact.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{selectedContact.email}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Negócios vinculados</p>
                {deals.filter(d => d.contact_id === selectedContact.id).length === 0 ? (
                  <p className="text-sm" style={{ color: DC.textSecondary }}>Nenhum negócio</p>
                ) : (
                  deals.filter(d => d.contact_id === selectedContact.id).map(d => (
                    <div key={d.id} className="p-2 border rounded-lg mb-2" style={{ borderColor: DC.border }}>
                      <p className="text-sm font-medium">{d.title}</p>
                      <p className="text-xs" style={{ color: DC.textSecondary }}>
                        {Number(d.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
