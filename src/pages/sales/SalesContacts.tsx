import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { supabase } from '@/integrations/supabase/client';
import { DC } from '@/lib/dashboardColors';
import { ACTIVITY_TYPE_COLORS, ACTIVITY_TYPE_LABELS } from '@/types/sales';
import { Plus, Search, User, Phone, Mail, AtSign, MapPin, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SalesContacts() {
  const { contacts, deals, activities, loading, refetchContacts } = useSalesCrmData();
  const [search, setSearch] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', instagram: '', origin: '', notes: '' });
  const [editForm, setEditForm] = useState({ name: '', company: '', phone: '', email: '', instagram: '', origin: '', notes: '' });

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

  const handleUpdate = async () => {
    if (!selectedContact || !editForm.name) return;
    const { error } = await supabase.from('crm_contacts').update(editForm as any).eq('id', selectedContact.id);
    if (error) toast.error('Erro ao atualizar');
    else {
      toast.success('Contato atualizado');
      setEditing(false);
      setSelectedContact({ ...selectedContact, ...editForm });
      refetchContacts();
    }
  };

  const openContact = (contact: any) => {
    setSelectedContact(contact);
    setEditForm({
      name: contact.name || '',
      company: contact.company || '',
      phone: contact.phone || '',
      email: contact.email || '',
      instagram: contact.instagram || '',
      origin: contact.origin || '',
      notes: contact.notes || '',
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const contactDeals = selectedContact ? deals.filter(d => d.contact_id === selectedContact.id) : [];
  const contactActivities = selectedContact ? activities.filter(a => a.contact_id === selectedContact.id).sort((a, b) =>
    new Date(b.scheduled_at || b.created_at).getTime() - new Date(a.scheduled_at || a.created_at).getTime()
  ) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Contato
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, empresa, e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Negócios</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum contato encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(contact => {
                  const cDeals = deals.filter(d => d.contact_id === contact.id);
                  return (
                    <TableRow key={contact.id} className="cursor-pointer" onClick={() => openContact(contact)}>
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
                        <div className="flex gap-1 flex-wrap">
                          {(contact.tags || []).slice(0, 2).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{cDeals.length}</Badge>
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
            <DialogDescription>Adicione um novo contato ao CRM</DialogDescription>
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
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          {selectedContact && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-foreground">{selectedContact.name}</SheetTitle>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
                    <Pencil className="h-4 w-4 mr-1" /> {editing ? 'Cancelar' : 'Editar'}
                  </Button>
                </div>
                {selectedContact.company && (
                  <p className="text-sm text-muted-foreground">{selectedContact.company}</p>
                )}
              </SheetHeader>

              {editing ? (
                <div className="space-y-3">
                  <div>
                    <Label>Nome</Label>
                    <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Empresa</Label>
                    <Input value={editForm.company} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Telefone</Label><Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
                    <div><Label>E-mail</Label><Input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Instagram</Label><Input value={editForm.instagram} onChange={e => setEditForm(p => ({ ...p, instagram: e.target.value }))} /></div>
                    <div><Label>Origem</Label><Input value={editForm.origin} onChange={e => setEditForm(p => ({ ...p, origin: e.target.value }))} /></div>
                  </div>
                  <div><Label>Observações</Label><Textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} /></div>
                  <Button onClick={handleUpdate} style={{ backgroundColor: DC.orange }} className="w-full">Salvar Alterações</Button>
                </div>
              ) : (
                <>
                  {/* Contact Info */}
                  <div className="space-y-2">
                    {selectedContact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedContact.phone}</span>
                      </div>
                    )}
                    {selectedContact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedContact.email}</span>
                      </div>
                    )}
                    {selectedContact.instagram && (
                      <div className="flex items-center gap-2 text-sm">
                        <AtSign className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedContact.instagram}</span>
                      </div>
                    )}
                    {selectedContact.origin && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>Origem: {selectedContact.origin}</span>
                      </div>
                    )}
                    {(selectedContact.tags || []).length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {selectedContact.tags.map((tag: string) => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tabs */}
                  <Tabs defaultValue="deals">
                    <TabsList className="w-full">
                      <TabsTrigger value="deals" className="flex-1">Negócios ({contactDeals.length})</TabsTrigger>
                      <TabsTrigger value="activities" className="flex-1">Atividades ({contactActivities.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="deals" className="mt-4 space-y-2">
                      {contactDeals.length === 0 ? (
                        <p className="text-sm text-center py-4 text-muted-foreground">Nenhum negócio</p>
                      ) : (
                        contactDeals.map(d => {
                          const stage = d.stage_id ? (deals as any[]).find(x => x.id === d.id) : null;
                          return (
                            <div key={d.id} className="p-3 border rounded-lg border-border">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-foreground">{d.title}</p>
                                <Badge variant={d.status === 'won' ? 'default' : d.status === 'lost' ? 'destructive' : 'secondary'}>
                                  {d.status === 'won' ? 'Ganho' : d.status === 'lost' ? 'Perdido' : 'Aberto'}
                                </Badge>
                              </div>
                              <p className="text-sm font-bold mt-1" style={{ color: DC.orange }}>
                                {Number(d.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </TabsContent>
                    <TabsContent value="activities" className="mt-4 space-y-2">
                      {contactActivities.length === 0 ? (
                        <p className="text-sm text-center py-4 text-muted-foreground">Nenhuma atividade</p>
                      ) : (
                        contactActivities.slice(0, 20).map(act => (
                          <div key={act.id} className="p-3 border rounded-lg border-border" style={{
                            backgroundColor: act.status === 'pending' && act.scheduled_at && act.scheduled_at < new Date().toISOString() ? DC.redBg : undefined,
                          }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge style={{ backgroundColor: ACTIVITY_TYPE_COLORS[act.type] || DC.textSecondary, color: '#fff' }} className="text-[10px]">
                                  {ACTIVITY_TYPE_LABELS[act.type] || act.type}
                                </Badge>
                                <span className="text-sm font-medium text-foreground">{act.title}</span>
                              </div>
                              <Badge variant={act.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                                {act.status === 'completed' ? 'Concluída' : 'Pendente'}
                              </Badge>
                            </div>
                            {act.scheduled_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(act.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </TabsContent>
                  </Tabs>

                  {selectedContact.notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedContact.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
