import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  deal: any;
  updateDealField: (field: string, value: any, label?: string) => Promise<boolean>;
}

function InlineField({ label, value, onSave, type = 'text' }: { label: string; value: string; onSave: (v: string) => void; type?: string }) {
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
        type={type}
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

export function DealBusinessTab({ deal, updateDealField }: Props) {
  const [notes, setNotes] = useState(deal.notes || '');

  const handleSave = async (field: string, value: any, label?: string) => {
    const ok = await updateDealField(field, value, label);
    if (ok) toast.success('Salvo');
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Campos de negócio</h2>

      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground w-full py-2">
          <ChevronDown className="h-4 w-4" />
          Informações Gerais
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pl-6">
          <InlineField label="Valor (R$)" value={String(deal.value || '')} type="number"
            onSave={v => handleSave('value', parseFloat(v) || 0, 'Valor')} />
          <div className="py-1.5">
            <Label className="text-xs">Notas</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => { if (notes !== (deal.notes || '')) handleSave('notes', notes); }}
              rows={3}
              className="text-sm"
              placeholder="Anotações sobre o negócio..."
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground w-full py-2">
          <ChevronDown className="h-4 w-4" />
          Facebook Leads Ads
        </CollapsibleTrigger>
        <CollapsibleContent className="grid grid-cols-2 gap-x-6 gap-y-1 pl-6">
          <InlineField label="ID do formulário" value={deal.fb_form_id} onSave={v => handleSave('fb_form_id', v)} />
          <InlineField label="Nome do formulário" value={deal.fb_form_name} onSave={v => handleSave('fb_form_name', v)} />
          <InlineField label="ID AD" value={deal.fb_ad_id} onSave={v => handleSave('fb_ad_id', v)} />
          <InlineField label="Nome AD" value={deal.fb_ad_name} onSave={v => handleSave('fb_ad_name', v)} />
          <InlineField label="ID da campanha" value={deal.fb_campaign_id} onSave={v => handleSave('fb_campaign_id', v)} />
          <InlineField label="Nome da campanha" value={deal.fb_campaign_name} onSave={v => handleSave('fb_campaign_name', v)} />
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground w-full py-2">
          <ChevronDown className="h-4 w-4" />
          Recuperação de vendas
        </CollapsibleTrigger>
        <CollapsibleContent className="grid grid-cols-2 gap-x-6 gap-y-1 pl-6">
          <InlineField label="Nome do produto" value={deal.recovery_product_name} onSave={v => handleSave('recovery_product_name', v)} />
          <InlineField label="Link do boleto" value={deal.recovery_boleto_url} onSave={v => handleSave('recovery_boleto_url', v)} />
          <InlineField label="Link do checkout" value={deal.recovery_checkout_url} onSave={v => handleSave('recovery_checkout_url', v)} />
          <InlineField label="ID do produto" value={deal.recovery_product_id} onSave={v => handleSave('recovery_product_id', v)} />
          <InlineField label="ID da fatura" value={deal.recovery_invoice_id} onSave={v => handleSave('recovery_invoice_id', v)} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
