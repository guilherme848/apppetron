import { useState } from 'react';
import { Settings as SettingsIcon, Briefcase, Layers, Target, GitBranch, Plus, Pencil, Trash2, Loader2, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useSettings } from '@/contexts/SettingsContext';
import { useJobRoles } from '@/hooks/useJobRoles';
import { useStageResponsibilities } from '@/hooks/useStageResponsibilities';
import { BATCH_STATUS_OPTIONS } from '@/types/contentProduction';
import { useSearchParams } from 'react-router-dom';

const VARIABLE_STAGES = ['production', 'changes'];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'pipeline';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Configurações
        </h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <Tabs 
        value={defaultTab} 
        onValueChange={(value) => setSearchParams({ tab: value })}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Cargos
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Serviços
          </TabsTrigger>
          <TabsTrigger value="niches" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Nichos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <PipelineTab />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab />
        </TabsContent>

        <TabsContent value="niches">
          <NichesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== Pipeline Tab ====================
function PipelineTab() {
  const { roles, loading: loadingRoles } = useJobRoles();
  const { responsibilities, loading: loadingResp, updateResponsibility } = useStageResponsibilities();

  const handleRoleChange = async (stageKey: string, roleId: string) => {
    const value = roleId === '_none_' ? null : roleId;
    const { error } = await updateResponsibility(stageKey, value);
    if (error) {
      toast.error('Erro ao atualizar responsável');
    } else {
      toast.success('Responsável atualizado');
    }
  };

  const getRoleForStage = (stageKey: string) => {
    const resp = responsibilities.find((r) => r.stage_key === stageKey);
    return resp?.role_id || null;
  };

  if (loadingRoles || loadingResp) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Responsáveis por Etapa do Pipeline</CardTitle>
        <CardDescription>
          Defina o cargo responsável por cada etapa. Para "Produção" e "Alteração", o responsável varia por item.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {BATCH_STATUS_OPTIONS.map((stage) => {
          const isVariable = VARIABLE_STAGES.includes(stage.value);
          const currentRoleId = getRoleForStage(stage.value);

          return (
            <div key={stage.value} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-center gap-3">
                <span className="font-medium">{stage.label}</span>
                {isVariable && (
                  <Badge variant="secondary" className="text-xs">
                    <Info className="h-3 w-3 mr-1" />
                    Variável por item
                  </Badge>
                )}
              </div>
              {isVariable ? (
                <span className="text-sm text-muted-foreground">
                  Designer (design) / Videomaker (vídeo)
                </span>
              ) : (
                <Select
                  value={currentRoleId || '_none_'}
                  onValueChange={(v) => handleRoleChange(stage.value, v)}
                >
                  <SelectTrigger className="w-48 bg-background">
                    <SelectValue placeholder="Selecionar cargo" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="_none_">Sem responsável</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ==================== Roles Tab ====================
function RolesTab() {
  const { roles, loading, addRole, updateRole, deleteRole } = useJobRoles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setName('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (role: { id: string; name: string }) => {
    setEditingRole(role);
    setName(role.name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    if (editingRole) {
      const { error } = await updateRole(editingRole.id, name.trim());
      if (error) {
        toast.error('Erro ao atualizar cargo');
      } else {
        toast.success('Cargo atualizado');
        setDialogOpen(false);
      }
    } else {
      const { error } = await addRole(name.trim());
      if (error) {
        toast.error('Erro ao criar cargo');
      } else {
        toast.success('Cargo criado');
        setDialogOpen(false);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, roleName: string) => {
    const { error } = await deleteRole(id);
    if (error) {
      toast.error('Erro ao excluir cargo. Pode estar em uso.');
    } else {
      toast.success(`Cargo "${roleName}" excluído`);
    }
  };

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
            <CardTitle className="text-base">Cargos</CardTitle>
            <CardDescription>
              Cargos são usados para definir responsabilidades nas etapas do pipeline.
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cargo
          </Button>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum cargo cadastrado</p>
              <Button variant="link" onClick={handleOpenCreate}>
                Criar primeiro cargo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(role)}
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
                              <AlertDialogTitle>Excluir cargo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Se o cargo estiver em uso, a exclusão falhará.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(role.id, role.name)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Nome do Cargo *</Label>
              <Input
                id="roleName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Designer, Videomaker, Social Media"
              />
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

// ==================== Services Tab ====================
function ServicesTab() {
  const { services, loading, addService, updateService, deleteService, toggleServiceActive } = useSettings();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setFormOpen(true);
  };

  const handleOpenEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setName(currentName);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let result;
    if (editingId) {
      result = await updateService(editingId, { name });
    } else {
      result = await addService(name);
    }

    if (result.success) {
      toast.success(editingId ? 'Serviço atualizado' : 'Serviço criado');
      setFormOpen(false);
    } else {
      toast.error(result.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string, serviceName: string) => {
    const result = await deleteService(id);
    if (result.success) {
      toast.success(`Serviço "${serviceName}" excluído`);
    } else {
      toast.error(result.error || 'Erro ao excluir');
    }
  };

  const filteredServices = showInactive ? services : services.filter(s => s.active);

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
            <CardTitle className="text-base">Serviços</CardTitle>
            <CardDescription>
              Serviços ativos aparecem no cadastro de clientes. Desative para ocultar sem excluir.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="showInactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="showInactive" className="text-sm">Mostrar inativos</Label>
            </div>
            <Button onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Serviço
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredServices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {showInactive ? 'Nenhum serviço cadastrado' : 'Nenhum serviço ativo'}
              </p>
              <Button variant="link" onClick={handleOpenNew}>
                Criar primeiro serviço
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px]">Ativo</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <Switch
                        checked={service.active}
                        onCheckedChange={() => toggleServiceActive(service.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(service.id, service.name)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(service.id, service.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Nome do Serviço *</Label>
              <Input
                id="serviceName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Social Media, Tráfego Pago"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== Niches Tab ====================
function NichesTab() {
  const { niches, loading, addNiche, updateNiche, deleteNiche, toggleNicheActive } = useSettings();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setFormOpen(true);
  };

  const handleOpenEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setName(currentName);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let result;
    if (editingId) {
      result = await updateNiche(editingId, { name });
    } else {
      result = await addNiche(name);
    }

    if (result.success) {
      toast.success(editingId ? 'Nicho atualizado' : 'Nicho criado');
      setFormOpen(false);
    } else {
      toast.error(result.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string, nicheName: string) => {
    const result = await deleteNiche(id);
    if (result.success) {
      toast.success(`Nicho "${nicheName}" excluído`);
    } else {
      toast.error(result.error || 'Erro ao excluir');
    }
  };

  const filteredNiches = showInactive ? niches : niches.filter(n => n.active);

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
            <CardTitle className="text-base">Nichos</CardTitle>
            <CardDescription>
              Nichos ativos aparecem no cadastro de clientes. Desative para ocultar sem excluir.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="showInactiveNiches"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="showInactiveNiches" className="text-sm">Mostrar inativos</Label>
            </div>
            <Button onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Nicho
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredNiches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {showInactive ? 'Nenhum nicho cadastrado' : 'Nenhum nicho ativo'}
              </p>
              <Button variant="link" onClick={handleOpenNew}>
                Criar primeiro nicho
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px]">Ativo</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNiches.map((niche) => (
                  <TableRow key={niche.id}>
                    <TableCell className="font-medium">{niche.name}</TableCell>
                    <TableCell>
                      <Switch
                        checked={niche.active}
                        onCheckedChange={() => toggleNicheActive(niche.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(niche.id, niche.name)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(niche.id, niche.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Nicho' : 'Novo Nicho'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nicheName">Nome do Nicho *</Label>
              <Input
                id="nicheName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Tecnologia, Saúde, Varejo"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
