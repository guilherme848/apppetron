import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Account, AccountStatus } from '@/types/crm';
import { useSettings } from '@/contexts/SettingsContext';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

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
  
  const [formData, setFormData] = useState({
    name: '',
    status: 'lead' as AccountStatus,
    service_id: '',
    niche_id: '',
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

  useEffect(() => {
    if (account) {
      // Try to map legacy text fields to IDs
      let serviceId = account.service_id || '';
      let nicheId = account.niche_id || '';
      
      // If no ID but has legacy text, try to find matching entry
      if (!serviceId && account.service_contracted) {
        const matchingService = findServiceByName(account.service_contracted);
        if (matchingService) serviceId = matchingService.id;
      }
      if (!nicheId && account.niche) {
        const matchingNiche = findNicheByName(account.niche);
        if (matchingNiche) nicheId = matchingNiche.id;
      }

      setFormData({
        name: account.name || '',
        status: account.status || 'lead',
        service_id: serviceId,
        niche_id: nicheId,
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
    } else {
      setFormData({
        name: '',
        status: 'lead',
        service_id: '',
        niche_id: '',
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
    }
    setEmailError('');
  }, [account, open, findServiceByName, findNicheByName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    if (!isValidEmail(formData.contact_email)) {
      setEmailError('Email inválido');
      return;
    }

    // Get service and niche names for legacy compatibility
    const selectedService = services.find(s => s.id === formData.service_id);
    const selectedNiche = niches.find(n => n.id === formData.niche_id);

    onSubmit({
      name: formData.name.trim(),
      status: formData.status,
      service_id: formData.service_id || null,
      niche_id: formData.niche_id || null,
      // Keep legacy fields in sync
      service_contracted: selectedService?.name || null,
      niche: selectedNiche?.name || null,
      website: formData.website || null,
      cpf_cnpj: formData.cpf_cnpj || null,
      monthly_value: formData.monthly_value ? parseFloat(formData.monthly_value) : null,
      start_date: formData.start_date || null,
      contact_name: formData.contact_name || null,
      contact_phone: formData.contact_phone || null,
      contact_email: formData.contact_email || null,
      country: formData.country || null,
      postal_code: formData.postal_code || null,
      state: formData.state || null,
      city: formData.city || null,
      neighborhood: formData.neighborhood || null,
      street: formData.street || null,
      street_number: formData.street_number || null,
      address_complement: formData.address_complement || null,
    });
    onClose();
  };

  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpfCnpj(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 14) {
      setFormData({ ...formData, cpf_cnpj: formatted });
    }
  };

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPostalCode(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 8) {
      setFormData({ ...formData, postal_code: formatted });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 11) {
      setFormData({ ...formData, contact_phone: formatted });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, contact_email: e.target.value });
    if (emailError) setEmailError('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome da empresa"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as AccountStatus })}>
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
                <Select value={formData.niche_id} onValueChange={(v) => setFormData({ ...formData, niche_id: v === 'none' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um nicho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {activeNiches.map((niche) => (
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
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
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
                  <Link to="/settings/services" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Gerenciar
                  </Link>
                </div>
                <Select value={formData.service_id} onValueChange={(v) => setFormData({ ...formData, service_id: v === 'none' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {activeServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_value">Valor Mensal (R$)</Label>
                <Input
                  id="monthly_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_value}
                  onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Data de Entrada</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              {formData.status === 'churned' && (
                <div className="space-y-2">
                  <Label htmlFor="churned_at">Data de Churn</Label>
                  <Input
                    id="churned_at"
                    type="date"
                    value={formData.churned_at}
                    onChange={(e) => setFormData({ ...formData, churned_at: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Nome do contato principal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Telefone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={handlePhoneChange}
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
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Brasil"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">CEP</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={handlePostalCodeChange}
                  placeholder="00000-000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="SP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="São Paulo"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Centro"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street">Logradouro</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="Rua, Avenida, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="street_number">Número</Label>
                <Input
                  id="street_number"
                  value={formData.street_number}
                  onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                  placeholder="123"
                />
              </div>
              <div className="col-span-3 space-y-2">
                <Label htmlFor="address_complement">Complemento</Label>
                <Input
                  id="address_complement"
                  value={formData.address_complement}
                  onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                  placeholder="Sala, Andar, Bloco, etc."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
