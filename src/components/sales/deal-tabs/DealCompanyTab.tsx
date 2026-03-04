import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  deal: any;
  updateContact: (field: string, value: any) => Promise<boolean>;
}

function InlineField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value || '');

  const commit = () => {
    if (local !== (value || '')) onSave(local);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="group cursor-pointer py-1.5" onClick={() => { setLocal(value || ''); setEditing(true); }}>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground min-h-[20px]">{value || <span className="text-muted-foreground italic">Clique para editar</span>}</p>
      </div>
    );
  }

  return (
    <div className="py-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        autoFocus
        className="h-8 text-sm"
      />
    </div>
  );
}

export function DealCompanyTab({ deal, updateContact }: Props) {
  const contact = deal.contact;
  if (!contact) return <p className="text-sm text-muted-foreground">Nenhum contato vinculado</p>;

  const handleSave = async (field: string, value: any) => {
    const ok = await updateContact(field, value);
    if (ok) toast.success('Salvo');
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Campos de empresa</h2>

      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground w-full py-2">
          <ChevronDown className="h-4 w-4" />
          Informações Gerais
        </CollapsibleTrigger>
        <CollapsibleContent className="grid grid-cols-2 gap-x-6 gap-y-1 pl-6">
          <InlineField label="Nome da empresa" value={contact.company} onSave={v => handleSave('company', v)} />
          <InlineField label="URL (site)" value={contact.company_url} onSave={v => handleSave('company_url', v)} />
          <InlineField label="Cidade" value={contact.city} onSave={v => handleSave('city', v)} />
          <InlineField label="Estado" value={contact.state} onSave={v => handleSave('state', v)} />
          <InlineField label="Categoria" value={contact.category} onSave={v => handleSave('category', v)} />
          <InlineField label="Segmento" value={contact.segment} onSave={v => handleSave('segment', v)} />
          <InlineField label="Número de funcionários" value={contact.employee_count} onSave={v => handleSave('employee_count', v)} />
          <InlineField label="Instagram da Empresa" value={contact.company_instagram} onSave={v => handleSave('company_instagram', v)} />
          <InlineField label="Faturamento Mensal" value={contact.monthly_revenue} onSave={v => handleSave('monthly_revenue', v)} />
          <InlineField label="Telefone da empresa" value={contact.company_phone} onSave={v => handleSave('company_phone', v)} />
          <InlineField label="CNPJ" value={contact.cnpj} onSave={v => handleSave('cnpj', v)} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
