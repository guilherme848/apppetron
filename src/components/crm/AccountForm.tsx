import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Account, AccountStatus } from '@/types/crm';
import { useSettings } from '@/contexts/SettingsContext';
import { useTraffic } from '@/contexts/TrafficContext';
import { useSensitivePermission } from '@/hooks/useSensitivePermission';
import { Link } from 'react-router-dom';
import { ExternalLink, RotateCcw, Undo2, Lock, Loader2, Facebook, Chrome } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SaveStatus } from '@/components/ui/save-status';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const { canViewFinancialValues } = useSensitivePermission();
  const showFinancialFields = canViewFinancialValues();

  const LEGACY_SERVICE_PREFIX = '__legacy_service__:';
  const isLegacyServiceValue = (value: string) => value.startsWith(LEGACY_SERVICE_PREFIX);
  
  const activeRoutines = trafficRoutines.filter(r => r.active);
  const isEditing = !!account;
  const skipAutoSave = useRef(false);
  
  const RestrictedField = ({ label }: { label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 h-10 px-3 py-2 rounded-md border border-input bg-muted/50 text-muted-foreground cursor-not-allowed">
              <Lock className="h-4 w-4" />
              <span className="text-sm">Restrito ao Administrador</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Você não tem permissão para visualizar valores financeiros</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
  
  const accountId = account?.id;
  const lastInitializedRef = useRef<{ accountId: string | undefined; wasOpen: boolean }>({ 
    accountId: undefined, 
    wasOpen: false 
  });
  
  const [formData, setFormData] = useState({
    name: '',
    razao_social: '',
    origin: '',
    status: 'lead' as AccountStatus,
    service_id: '',
    niche_id: '',
    traffic_routine_id: '',
    website: '',
    cpf_cnpj: '',
    monthly_value: '',
    start_date: '',
    billing_day: '',
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
  
  // Account services (toggles)
  const [accountServiceIds, setAccountServiceIds] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // Mídias ativas
  const [midiasAtivas, setMidiasAtivas] = useState<string[]>(account?.midias_ativas || ['meta_ads']);

  // Load account services when editing
  useEffect(() => {
    if (!open || !account?.id) {
      setAccountServiceIds([]);
      return;
    }
    const loadAccountServices = async () => {
      setLoadingServices(true);
      const { data, error } = await supabase
        .from('account_services')
        .select('service_id')
        .eq('account_id', account.id);
      if (!error && data) {
        setAccountServiceIds(data.map(d => d.service_id));
      }
      setLoadingServices(false);
    };
    loadAccountServices();
  }, [open, account?.id]);

  const toggleAccountService = async (serviceId: string, enabled: boolean) => {
    if (!account?.id) return;
    if (enabled) {
      const { error } = await supabase
        .from('account_services')
        .insert({ account_id: account.id, service_id: serviceId });
      if (!error) {
        setAccountServiceIds(prev => [...prev, serviceId]);
        toast.success('Serviço ativado');
      }
    } else {
      const { error } = await supabase
        .from('account_services')
        .delete()
        .eq('account_id', account.id)
        .eq('service_id', serviceId);
      if (!error) {
        setAccountServiceIds(prev => prev.filter(id => id !== serviceId));
        toast.success('Serviço desativado');
      }
    }
  };

  useEffect(() => {
    if (!open || !account) return;
    console.debug('[CRM] AccountForm open snapshot', {
      accountId: account.id,
      account_service_id: (account as any).service_id,
      form_service_id: formData.service_id,
      servicesCount: services.length,
    });
  }, [open, account, formData.service_id, services.length]);

  const selectedService = services.find(s => s.id === formData.service_id);
  const selectedNiche = niches.find(n => n.id === formData.niche_id);

  const fallbackServiceOption = (!selectedService && formData.service_id && (account?.service_name || account?.service_contracted))
    ? {
        id: formData.service_id,
        name: account?.service_name || account?.service_contracted || 'Serviço selecionado',
        active: true,
        created_at: '',
        traffic_cycle_id: null,
        traffic_routine_id: null,
      }
    : null;

  const fallbackNicheOption = (!selectedNiche && formData.niche_id && account?.niche)
    ? { id: formData.niche_id, name: account.niche, active: true, created_at: '' }
    : null;

  const serviceOptions = selectedService && !activeServices.some(s => s.id === selectedService.id)
    ? [selectedService, ...activeServices]
    : fallbackServiceOption && !activeServices.some(s => s.id === fallbackServiceOption.id)
      ? [fallbackServiceOption, ...activeServices]
      : activeServices;

  const nicheOptions = selectedNiche && !activeNiches.some(n => n.id === selectedNiche.id)
    ? [selectedNiche, ...activeNiches]
    : fallbackNicheOption && !activeNiches.some(n => n.id === fallbackNicheOption.id)
      ? [fallbackNicheOption, ...activeNiches]
      : activeNiches;

  const buildSaveData = useCallback((data: typeof formData): Partial<Account> => {
    const normalizedServiceId = !data.service_id || isLegacyServiceValue(data.service_id) ? '' : data.service_id;
    const selectedService = services.find(s => s.id === normalizedServiceId);
    const selectedNiche = niches.find(n => n.id === data.niche_id);

    const serviceContracted = selectedService?.name
      ?? (normalizedServiceId ? null : (account?.service_contracted ?? account?.service_name ?? null));
    const nicheName = selectedNiche?.name ?? (data.niche_id ? null : (account?.niche ?? null));

    return {
      name: data.name.trim(),
      razao_social: data.razao_social || null,
      origin: (data.origin || null) as any,
      status: data.status,
      service_id: normalizedServiceId || null,
      niche_id: data.niche_id || null,
      traffic_routine_id: data.traffic_routine_id || null,
      service_contracted: serviceContracted,
      niche: nicheName,
      website: data.website || null,
      cpf_cnpj: data.cpf_cnpj || null,
      monthly_value: data.monthly_value ? parseFloat(data.monthly_value) : null,
      start_date: data.start_date || null,
      billing_day: data.billing_day ? parseInt(data.billing_day) : null,
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
  }, [services, niches, account]);

  const { status: saveStatus, saveNow, queueChange, flush } = useAutoSave({
    onSave: async (patch) => {
      if (!isEditing || !account) return;
      const currentData = { ...formData, ...patch };
      const saveData = buildSaveData(currentData);
      await onSubmit(saveData);
    },
  });

  const handleClose = useCallback(() => {
    flush();
    onClose();
  }, [flush, onClose]);

  useEffect(() => {
    const shouldInitialize = 
      (open && !lastInitializedRef.current.wasOpen) ||
      (open && accountId !== lastInitializedRef.current.accountId);
    
    if (!shouldInitialize) {
      lastInitializedRef.current.wasOpen = open;
      return;
    }
    
    lastInitializedRef.current = { accountId, wasOpen: open };
    
    if (account) {
      let serviceId = account.service_id || '';
      let nicheId = account.niche_id || '';
      
      if (!serviceId && account.service_contracted) {
        const matchingService = findServiceByName(account.service_contracted);
        if (matchingService) serviceId = matchingService.id;
      }
      if (!serviceId && (account as Account & { service_name?: string | null }).service_name) {
        const matchingService = findServiceByName(
          (account as Account & { service_name?: string | null }).service_name as string
        );
        if (matchingService) serviceId = matchingService.id;
      }
      if (!serviceId) {
        const legacyLabel = (account as Account & { service_name?: string | null }).service_name || account.service_contracted;
        if (legacyLabel) {
          serviceId = `${LEGACY_SERVICE_PREFIX}${legacyLabel}`;
        }
      }
      if (!nicheId && account.niche) {
        const matchingNiche = findNicheByName(account.niche);
        if (matchingNiche) nicheId = matchingNiche.id;
      }

      skipAutoSave.current = true;
      setFormData({
        name: account.name || '',
        razao_social: (account as any).razao_social || '',
        origin: (account as any).origin || '',
        status: account.status || 'lead',
        service_id: serviceId,
        niche_id: nicheId,
        traffic_routine_id: (account as any).traffic_routine_id || '',
        website: account.website || '',
        cpf_cnpj: account.cpf_cnpj || '',
        monthly_value: account.monthly_value?.toString() || '',
        start_date: account.start_date || '',
        billing_day: (account as any).billing_day?.toString() || '',
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
      setMidiasAtivas(account.midias_ativas || ['meta_ads']);
      setTimeout(() => { skipAutoSave.current = false; }, 100);
    } else {
      skipAutoSave.current = true;
      setFormData({
        name: '',
        razao_social: '',
        origin: '',
        status: 'lead',
        service_id: '',
        niche_id: '',
        traffic_routine_id: '',
        website: '',
        cpf_cnpj: '',
        monthly_value: '',
        start_date: '',
        billing_day: '',
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
  
  useEffect(() => {
    if (!open) {
      lastInitializedRef.current = { accountId: undefined, wasOpen: false };
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    if (!isValidEmail(formData.contact_email)) {
      setEmailError('Email inválido');
      return;
    }

    if (!isEditing) {
      onSubmit(buildSaveData(formData));
      onClose();
    } else {
      handleClose();
    }
  };

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

  const handleSelectChange = (field: keyof typeof formData) => (value: string) => {
    const actualValue = value === 'none' || value === 'inherit' ? '' : value;
    setFormData(prev => ({ ...prev, [field]: actualValue }));
    if (isEditing && !skipAutoSave.current) {
      saveNow({ [field]: actualValue });
    }
  };

  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);

  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpfCnpj(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 14) {
      setFormData(prev => ({ ...prev, cpf_cnpj: formatted }));
      if (isEditing && !skipAutoSave.current) {
        queueChange({ cpf_cnpj: formatted });
      }
    }
  };

  const handleCpfCnpjBlur = async () => {
    if (isEditing && !skipAutoSave.current) {
      await flush();
    }
    const cleanCnpj = formData.cpf_cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setCnpjLookupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-cnpj-address', {
        body: { cnpj: cleanCnpj }
      });
      if (error || !data?.address) {
        toast.warning('Não foi possível localizar endereço automaticamente.');
        return;
      }
      const address = data.address;
      const updates: Partial<typeof formData> = {};
      let fieldsUpdated = 0;
      if (address.cep && !formData.postal_code) { updates.postal_code = address.cep; fieldsUpdated++; }
      if (address.state && !formData.state) { updates.state = address.state; fieldsUpdated++; }
      if (address.city && !formData.city) { updates.city = address.city; fieldsUpdated++; }
      if (address.neighborhood && !formData.neighborhood) { updates.neighborhood = address.neighborhood; fieldsUpdated++; }
      if (address.street && !formData.street) { updates.street = address.street; fieldsUpdated++; }
      if (address.complement && !formData.address_complement) { updates.address_complement = address.complement; fieldsUpdated++; }

      if (fieldsUpdated > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
        if (isEditing && !skipAutoSave.current) {
          Object.entries(updates).forEach(([key, value]) => {
            queueChange({ [key]: value });
          });
          await flush();
        }
        toast.success(`${fieldsUpdated} campo(s) de endereço preenchido(s) automaticamente.`);
      } else {
        toast.info('Todos os campos de endereço já estavam preenchidos.');
      }
    } catch (err) {
      console.error('CNPJ lookup error:', err);
      toast.warning('Não foi possível localizar endereço automaticamente.');
    } finally {
      setCnpjLookupLoading(false);
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

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  const handlePostalCodeBlur = async () => {
    if (isEditing && !skipAutoSave.current) {
      await flush();
    }
    setCepError('');
    const cleanCep = formData.postal_code.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado');
        setCepLoading(false);
        return;
      }
      const updates: Partial<typeof formData> = {};
      if (data.uf) updates.state = data.uf;
      if (data.localidade) updates.city = data.localidade;
      if (data.bairro) updates.neighborhood = data.bairro;
      if (data.logradouro) updates.street = data.logradouro;
      if (data.complemento && !formData.address_complement) updates.address_complement = data.complemento;

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
        if (isEditing && !skipAutoSave.current) {
          Object.entries(updates).forEach(([key, value]) => {
            queueChange({ [key]: value });
          });
          await flush();
        }
      }
    } catch {
      setCepError('Erro ao buscar CEP');
    } finally {
      setCepLoading(false);
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

  // Gradient separator component
  const GradientSeparator = () => (
    <div className="h-px w-full" style={{
      background: 'linear-gradient(90deg, transparent, hsl(var(--border)), transparent)'
    }} />
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
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
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Dados do Cliente</h3>
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
                <Label htmlFor="razao_social">Razão Social</Label>
                <Input
                  id="razao_social"
                  value={formData.razao_social}
                  onChange={handleTextChange('razao_social')}
                  onBlur={handleTextBlur('razao_social')}
                  placeholder="Razão social da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin">Fonte do Cliente</Label>
                <Select value={formData.origin || 'none'} onValueChange={handleSelectChange('origin')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="indicacao">Indicação</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
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
                <div className="relative">
                  <Input
                    id="cpf_cnpj"
                    value={formData.cpf_cnpj}
                    onChange={handleCpfCnpjChange}
                    onBlur={handleCpfCnpjBlur}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    disabled={cnpjLookupLoading}
                  />
                  {cnpjLookupLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
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

          <GradientSeparator />

          {/* Contrato */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Contrato</h3>
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
              
              {/* Traffic Routine */}
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
              {showFinancialFields ? (
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
              ) : (
                <RestrictedField label="Valor Mensal (R$)" />
              )}
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
              <div className="space-y-2">
                <Label htmlFor="billing_day">Dia de Vencimento</Label>
                <Input
                  id="billing_day"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.billing_day}
                  onChange={handleTextChange('billing_day')}
                  onBlur={handleTextBlur('billing_day')}
                  placeholder="1-31"
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

          {/* Serviços Contratados - only show when editing */}
          {isEditing && (
            <>
              <GradientSeparator />
              <div className="space-y-4">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Serviços Contratados</h3>
                {loadingServices ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Carregando serviços...</span>
                  </div>
                ) : services.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Nenhum plano cadastrado no sistema.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {services.filter(s => s.active).map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary/20"
                      >
                        <span className="text-sm font-medium">{service.name}</span>
                        <Switch
                          checked={accountServiceIds.includes(service.id)}
                          onCheckedChange={(checked) => toggleAccountService(service.id, checked)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <GradientSeparator />

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Contato</h3>
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

          <GradientSeparator />

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Endereço</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">CEP</Label>
                <div className="relative">
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={handlePostalCodeChange}
                    onBlur={handlePostalCodeBlur}
                    placeholder="00000-000"
                    disabled={cepLoading}
                  />
                  {cepLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {cepError && <p className="text-xs text-destructive">{cepError}</p>}
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
