import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useJobRoles } from '@/hooks/useJobRoles';
import { useCurrentUserPermissions } from '@/hooks/usePermissions';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TeamMembersTab() {
  const { members, loading, addMember, updateMember, deleteMember, refetch } = useTeamMembers();
  const { roles, getRoleById } = useJobRoles();
  const { can, isAdmin } = useCurrentUserPermissions();
  const { uploadPhoto, uploading } = useProfilePhoto();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<{ 
    id: string; 
    name: string; 
    full_name: string | null;
    role_id: string | null; 
    email: string | null; 
    active: boolean;
    birth_date: string | null;
    admission_date: string | null;
    profile_photo_path: string | null;
  } | null>(null);
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState<string>('');
  const [email, setEmail] = useState('');
  const [active, setActive] = useState(true);
  const [birthDate, setBirthDate] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const canEditAdmission = isAdmin || can('edit_admission_date');

  const handleOpenCreate = () => {
    setEditingMember(null);
    setName('');
    setRoleId('');
    setEmail('');
    setActive(true);
    setBirthDate('');
    setAdmissionDate('');
    setPhotoPath(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (member: typeof editingMember) => {
    if (!member) return;
    setEditingMember(member);
    setName(member.full_name || member.name);
    setRoleId(member.role_id || '');
    setEmail(member.email || '');
    setActive(member.active);
    setBirthDate(member.birth_date || '');
    setAdmissionDate(member.admission_date || '');
    setPhotoPath(member.profile_photo_path);
    setDialogOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMember) return;
    
    const path = await uploadPhoto(editingMember.id, file);
    if (path) {
      setPhotoPath(path);
      await updateMember(editingMember.id, { profile_photo_path: path });
      toast.success('Foto atualizada!');
      refetch();
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    const memberData: Record<string, unknown> = {
      name: name.trim(),
      full_name: name.trim(),
      role_id: roleId || null,
      email: email.trim() || null,
      active,
      birth_date: birthDate || null,
      profile_photo_path: photoPath,
    };

    // Only include admission_date if user can edit it
    if (canEditAdmission) {
      memberData.admission_date = admissionDate || null;
    }

    if (editingMember) {
      const { error } = await updateMember(editingMember.id, memberData);
      if (error) {
        toast.error('Erro ao atualizar usuário');
      } else {
        toast.success('Usuário atualizado');
        setDialogOpen(false);
      }
    } else {
      const { error } = await addMember(memberData as { name: string });
      if (error) {
        toast.error('Erro ao criar usuário');
      } else {
        toast.success('Usuário criado');
        setDialogOpen(false);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, memberName: string) => {
    const { error } = await deleteMember(id);
    if (error) {
      toast.error('Erro ao excluir usuário. Pode estar em uso.');
    } else {
      toast.success(`Usuário "${memberName}" excluído`);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await updateMember(id, { active: !currentActive });
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(currentActive ? 'Usuário desativado' : 'Usuário ativado');
    }
  };

  const filteredMembers = showInactive ? members : members.filter(m => m.active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Usuários Internos</CardTitle>
            <CardDescription>
              Membros da equipe para atribuição de tarefas. Não requer login.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="showInactiveMembers"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="showInactiveMembers" className="text-sm">Mostrar inativos</Label>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {showInactive ? 'Nenhum usuário cadastrado' : 'Nenhum usuário ativo'}
              </p>
              <Button variant="link" onClick={handleOpenCreate}>
                Criar primeiro usuário
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead className="w-[100px]">Ativo</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <MemberAvatar
                        name={member.full_name || member.name}
                        photoPath={member.profile_photo_path}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{member.full_name || member.name}</TableCell>
                    <TableCell>
                      {member.role_id ? (
                        <Badge variant="outline">{getRoleById(member.role_id)?.name || '-'}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.email || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {member.admission_date ? (
                        format(parseISO(member.admission_date), 'dd/MM/yyyy')
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={member.active}
                        onCheckedChange={() => handleToggleActive(member.id, member.active)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Se o usuário estiver atribuído a posts, a exclusão falhará.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(member.id, member.full_name || member.name)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Photo section (only for editing) */}
            {editingMember && (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <MemberAvatar
                    name={name}
                    photoPath={photoPath}
                    size="lg"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-6 w-6"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Camera className="h-3 w-3" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  Clique para alterar a foto
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="memberName">Nome Completo *</Label>
              <Input
                id="memberName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberRole">Cargo</Label>
              <Select value={roleId || '_none_'} onValueChange={(v) => setRoleId(v === '_none_' ? '' : v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="_none_">Sem cargo</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberEmail">Email (opcional)</Label>
              <Input
                id="memberEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memberBirthDate">Data de Nascimento</Label>
                <Input
                  id="memberBirthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberAdmissionDate">
                  Data de Admissão
                  {!canEditAdmission && <span className="text-muted-foreground ml-1">(somente admin)</span>}
                </Label>
                <Input
                  id="memberAdmissionDate"
                  type="date"
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                  disabled={!canEditAdmission}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="memberActive"
                checked={active}
                onCheckedChange={setActive}
              />
              <Label htmlFor="memberActive">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
