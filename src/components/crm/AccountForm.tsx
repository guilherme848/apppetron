import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Account, AccountStatus } from '@/types/crm';
import { useSettings } from '@/contexts/SettingsContext';
import { useTraffic } from '@/contexts/TrafficContext';
import { Link } from 'react-router-dom';
import { ExternalLink, RotateCcw, Undo2 } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { SaveStatus } from '@/components/ui/save-status';

interface AccountFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Account>) => void;
  account?: Account;
}

const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const formatPostalCode = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
};

const isValidEmail = (email: string) => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export function AccountForm({ open, onClose, onSubmit, account }: AccountFormProps) {
  const { activeServices, activeNiches, services, niches, findServiceByName, findNicheByName } = useSettings();
  const { trafficRoutines, getTrafficRoutineById } = useTraffic();
  
  const activeRoutines = trafficRoutines.filter(r => r.active);
  const isEditing = !!account;
  const skipAutoSave = useRef(false);

  // Ensure selects can display the current value even if it's not in the active list
  const selectedService = services.find(s => s.id === formData.service_id);
  const selectedNiche = niches.find(n => n.id === formData.niche_id);

  const serviceOptions = selectedService && !activeServices.some(s => s.id === selectedService.id)
    ? [selectedService, ...activeServices]
    : activeServices;

  const nicheOptions = selectedNiche && !activeNiches.some(n => n.id === selectedNiche.id)
    ? [selectedNiche, ...activeNiches]
    : activeNiches;
  
  // Track the account ID and open state to control form initialization
  const accountId = account?.id;
  const lastInitializedRef = useRef<{ accountId: string | undefined; wasOpen: boolean }>({ 
    accountId: undefined, 
    wasOpen: false 
  });
  
  const [formData, setFormData] = useState({
    name: '',
    status: 'lead' as AccountStatus,
    service_id: '',
    niche_id: '',
    traffic_routine_id: '',
    website: '',
    cpf_cnpj: '',
    monthly_value: '',
    start_date: '',
    churned_at: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    country: 'Brasil',
    postal_code: '',
    state: '',
    city: '',
    neighborhood: '',
    street: '',
    street_number: '',
    address_complement: '',
  });
  const [emailError, setEmailError] = useState('');

  // Build the data object for saving
  const buildSaveData = useCallback((data: typeof formData): Partial<Account> => {
    const selectedService = services.find(s => s.id === data.service_id);
    const selectedNiche = niches.find(n => n.id === data.niche_id);

    return {
      name: data.name.trim(),
      status: data.status,
      service_id: data.service_id || null,
      niche_id: data.niche_id || null,
      traffic_routine_id: data.traffic_routine_id || null,
      service_contracted: selectedService?.name || null,
      niche: selectedNiche?.name || null,
      website: data.website || null,
      cpf_cnpj: data.cpf_cnpj || null,
      monthly_value: data.monthly_value ? parseFloat(data.monthly_value) : null,
      start_date: data.start_date || null,
      contact_name: data.contact_name || null,
      contact_phone: data.contact_phone || null,
      contact_email: data.contact_email || null,
      country: data.country || null,
      postal_code: data.postal_code || null,
      state: data.state || null,
      city: data.city || null,
      neighborhood: data.neighborhood || null,
      street: data.street || null,
      street_number: data.street_number || null,
      address_complement: data.address_complement || null,
    } as Partial<Account>;
  }, [services, niches]);

  // AutoSave hook - only used when editing existing account
  const { status: saveStatus, saveNow, queueChange, flush } = useAutoSave({
    onSave: async (patch) => {
      if (!isEditing || !account) return;
      if (import.meta.env.DEV) {
        console.debug('[CRM] AccountForm autosave', {
          mode: 'edit',
          accountId: account.id,
          keys: Object.keys(patch as Record<string, unknown>),
        });
      }
      // We need to send the full data with the patch applied
      const currentData = { ...formData, ...patch };
      const saveData = buildSaveData(currentData);
      await onSubmit(saveData);
    },
  });

  // Flush on dialog close
  const handleClose = useCallback(() => {
    flush();
    onClose();
  }, [flush, onClose]);

  // Initialize form data only when:
  // 1. Dialog opens for the first time
  // 2. Account ID changes (switching to a different account)
  // NOT when account object reference changes after a save
  useEffect(() => {
    const shouldInitialize = 
      // Dialog just opened
      (open && !lastInitializedRef.current.wasOpen) ||
      // Account ID changed
      (open && accountId !== lastInitializedRef.current.accountId);
    
    if (!shouldInitialize) {
      // Update the wasOpen state even if we don't initialize
      lastInitializedRef.current.wasOpen = open;
      return;
    }
    
    // Mark that we're initializing for this account and open state
    lastInitializedRef.current = { accountId, wasOpen: open };
    
    if (account) {
      let serviceId = account.service_id || '';
      let nicheId = account.niche_id || '';
      
      if (!serviceId && account.service_contracted) {
        const matchingService = findServiceByName(account.service_contracted);
        if (matchingService) serviceId = matchingService.id;
      }
      if (!nicheId && account.niche) {
        const matchingNiche = findNicheByName(account.niche);
        if (matchingNiche) nicheId = matchingNiche.id;
      }

      skipAutoSave.current = true;
      setFormData({
        name: account.name || '',
        status: account.status || 'lead',
        service_id: serviceId,
        niche_id: nicheId,
        traffic_routine_id: (account as any).traffic_routine_id || '',
        website: account.website || '',
        cpf_cnpj: account.cpf_cnpj || '',
        monthly_value: account.monthly_value?.toString() || '',
        start_date: account.start_date || '',
        churned_at: account.churned_at || '',
        contact_name: account.contact_name || '',
        contact_phone: account.contact_phone || '',
        contact_email: account.contact_email || '',
        country: account.country || 'Brasil',
        postal_code: account.postal_code || '',
        state: account.state || '',
        city: account.city || '',
        neighborhood: account.neighborhood || '',
        street: account.street || '',
        street_number: account.street_number || '',
        address_complement: account.address_complement || '',
      });
      setTimeout(() => { skipAutoSave.current = false; }, 100);
    } else {
      skipAutoSave.current = true;
      setFormData({
        name: '',
        status: 'lead',
        service_id: '',
        niche_id: '',
        traffic_routine_id: '',
        website: '',
        cpf_cnpj: '',
        monthly_value: '',
        start_date: '',
        churned_at: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        country: 'Brasil',
        postal_code: '',
        state: '',
        city: '',
        neighborhood: '',
        street: '',
        street_number: '',
        address_complement: '',
      });
      setTimeout(() => { skipAutoSave.current = false; }, 100);
    }
    setEmailError('');
  }, [account, accountId, open, findServiceByName, findNicheByName]);
  
  // Reset the ref when dialog closes so next open will reinitialize
  useEffect(() => {
    if (!open) {
      lastInitializedRef.current = { accountId: undefined, wasOpen: false };
    }
  }, [open]);

  // For new accounts, use submit button. For existing, use autosave
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    if (!isValidEmail(formData.contact_email)) {
      setEmailError('Email inválido');
      return;
    }

    if (!isEditing) {
      // New account - submit and close
      onSubmit(buildSaveData(formData));
      onClose();
    } else {
      // Editing - just close (autosave handles it)
      handleClose();
    }
  };

  // Text field handlers with commit-based autosave (queue on change, flush on blur)
  const handleTextChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (isEditing && !skipAutoSave.current) {
      queueChange({ [field]: value });
    }
  };

  const handleTextBlur = (field: keyof typeof formData) => async () => {
    if (isEditing && !skipAutoSave.current) {
      await flush();
    }
  };

  // Select handlers with immediate save
  const handleSelectChange = (field: keyof typeof formData) => (value: string) => {
    const actualValue = value === 'none' || value === 'inherit' ? '' : value;
    setFormData(prev => ({ ...prev, [field]: actualValue }));
    if (isEditing && !skipAutoSave.current) {
      saveNow({ [field]: actualValue });
    }
  };

  // Special formatted inputs - queue on change, flush on blur
  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpfCnpj(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 14) {
      setFormData(prev => ({ ...prev, cpf_cnpj: formatted }));
      if (isEditing && !skipAutoSave.current) {
        queueChange({ cpf_cnpj: formatted });
      }
    }
  };

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPostalCode(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 8) {
      setFormData(prev => ({ ...prev, postal_code: formatted }));
      if (isEditing && !skipAutoSave.current) {
        queueChange({ postal_code: formatted });
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 11) {
      setFormData(prev => ({ ...prev, contact_phone: formatted }));
      if (isEditing && !skipAutoSave.current) {
        queueChange({ contact_phone: formatted });
      }
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, contact_email: e.target.value }));
    if (emailError) setEmailError('');
    if (isEditing && !skipAutoSave.current && isValidEmail(e.target.value)) {
      queueChange({ contact_email: e.target.value });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{account ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            {isEditing && <SaveStatus status={saveStatus} />}
          </div>
          <DialogDescription className="sr-only">
            {account ? 'Formulário para editar os dados do cliente' : 'Formulário para criar um novo cliente'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do Cliente */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados do Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cliente *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleTextChange('name')}
                  onBlur={handleTextBlur('name')}
                  placeholder="Nome da empresa"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={handleSelectChange('status')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="niche_id">Nicho</Label>
                  <Link to="/settings/niches" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Gerenciar
                  </Link>
                </div>
                <Select value={formData.niche_id || 'none'} onValueChange={handleSelectChange('niche_id')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um nicho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {nicheOptions.map((niche) => (
                      <SelectItem key={niche.id} value={niche.id}>
                        {niche.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                <Input
                  id="cpf_cnpj"
                  value={formData.cpf_cnpj}
                  onChange={handleCpfCnpjChange}
                  onBlur={handleTextBlur('cpf_cnpj')}
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={handleTextChange('website')}
                  onBlur={handleTextBlur('website')}
                  placeholder="https://exemplo.com.br"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Contrato */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contrato</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="service_id">Serviço Contratado</Label>
                  <Link to="/settings/plans/services" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Gerenciar
                  </Link>
                </div>
                <Select value={formData.service_id || 'none'} onValueChange={handleSelectChange('service_id')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {serviceOptions.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Traffic Routine with override */}
              <div className="col-span-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="traffic_routine_id">Rotina de Tráfego</Label>
                  <Link to="/settings/traffic/routines" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Gerenciar
                  </Link>
                </div>
                {(() => {
                  const selectedService = services.find(s => s.id === formData.service_id);
                  const planRoutineId = selectedService?.traffic_routine_id;
                  const planRoutine = planRoutineId ? getTrafficRoutineById(planRoutineId) : null;
                  const clientRoutine = formData.traffic_routine_id ? getTrafficRoutineById(formData.traffic_routine_id) : null;
                  const hasOverride = !!formData.traffic_routine_id && formData.traffic_routine_id !== planRoutineId;
                  
                  return (
                    <>
                      <Select 
                        value={formData.traffic_routine_id || 'inherit'} 
                        onValueChange={handleSelectChange('traffic_routine_id')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={planRoutine ? `Herdar do plano (${planRoutine.name})` : 'Selecione uma rotina'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inherit">
                            {planRoutine ? `Herdar do plano (${planRoutine.name})` : 'Nenhuma (herdar do plano)'}
                          </SelectItem>
                          {activeRoutines.map((routine) => (
                            <SelectItem key={routine.id} value={routine.id}>
                              {routine.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {planRoutine && !hasOverride && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <RotateCcw className="h-3 w-3" />
                          <span>Usando rotina do plano: <span className="font-medium text-foreground">{planRoutine.name}</span></span>
                        </div>
                      )}
                      
                      {hasOverride && clientRoutine && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <RotateCcw className="h-3 w-3" />
                            <span>Override: <span className="font-medium text-foreground">{clientRoutine.name}</span></span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, traffic_routine_id: '' }));
                              if (isEditing && !skipAutoSave.current) {
                                saveNow({ traffic_routine_id: '' });
                              }
                            }}
                          >
                            <Undo2 className="h-3 w-3 mr-1" />
                            Usar padrão do plano
                          </Button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_value">Valor Mensal (R$)</Label>
                <Input
                  id="monthly_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_value}
                  onChange={handleTextChange('monthly_value')}
                  onBlur={handleTextBlur('monthly_value')}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Data de Entrada</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, start_date: e.target.value }));
                    if (isEditing && !skipAutoSave.current) {
                      saveNow({ start_date: e.target.value });
                    }
                  }}
                />
              </div>
              {formData.status === 'churned' && (
                <div className="space-y-2">
                  <Label htmlFor="churned_at">Data de Churn</Label>
                  <Input
                    id="churned_at"
                    type="date"
                    value={formData.churned_at}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, churned_at: e.target.value }));
                      if (isEditing && !skipAutoSave.current) {
                        saveNow({ churned_at: e.target.value });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Preenchido automaticamente ao marcar como Churned
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contato</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Nome do Contato</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={handleTextChange('contact_name')}
                  onBlur={handleTextBlur('contact_name')}
                  placeholder="Nome do contato principal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Telefone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={handlePhoneChange}
                  onBlur={handleTextBlur('contact_phone')}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={handleEmailChange}
                  onBlur={handleTextBlur('contact_email')}
                  placeholder="email@exemplo.com"
                  className={emailError ? 'border-destructive' : ''}
                />
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Endereço</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={handleTextChange('country')}
                  onBlur={handleTextBlur('country')}
                  placeholder="Brasil"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">CEP</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={handlePostalCodeChange}
                  onBlur={handleTextBlur('postal_code')}
                  placeholder="00000-000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={handleTextChange('state')}
                  onBlur={handleTextBlur('state')}
                  placeholder="SP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={handleTextChange('city')}
                  onBlur={handleTextBlur('city')}
                  placeholder="São Paulo"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleTextChange('neighborhood')}
                  onBlur={handleTextBlur('neighborhood')}
                  placeholder="Centro"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street">Logradouro</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={handleTextChange('street')}
                  onBlur={handleTextBlur('street')}
                  placeholder="Rua, Avenida, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="street_number">Número</Label>
                <Input
                  id="street_number"
                  value={formData.street_number}
                  onChange={handleTextChange('street_number')}
                  onBlur={handleTextBlur('street_number')}
                  placeholder="123"
                />
              </div>
              <div className="col-span-3 space-y-2">
                <Label htmlFor="address_complement">Complemento</Label>
                <Input
                  id="address_complement"
                  value={formData.address_complement}
                  onChange={handleTextChange('address_complement')}
                  onBlur={handleTextBlur('address_complement')}
                  placeholder="Sala, Andar, Bloco, etc."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {isEditing ? 'Fechar' : 'Cancelar'}
            </Button>
            {!isEditing && <Button type="submit">Salvar</Button>}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
