import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

export function DealContactTab({ deal, updateContact }: Props) {
  const contact = deal.contact;
  if (!contact) return <p className="text-sm text-muted-foreground">Nenhum contato vinculado</p>;

  const handleSave = async (field: string, value: any) => {
    const ok = await updateContact(field, value);
    if (ok) toast.success('Salvo');
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Campos de contato</h2>
      </div>

      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground w-full py-2">
          <ChevronDown className="h-4 w-4" />
          Informações Gerais
        </CollapsibleTrigger>
        <CollapsibleContent className="grid grid-cols-2 gap-x-6 gap-y-1 pl-6">
          <InlineField label="Nome" value={contact.name} onSave={v => handleSave('name', v)} />
          <InlineField label="Email" value={contact.email} onSave={v => handleSave('email', v)} />
          <InlineField label="Telefone" value={contact.phone} onSave={v => handleSave('phone', v)} />
          <InlineField label="Cargo" value={contact.position} onSave={v => handleSave('position', v)} />
          <InlineField label="Link Manychat" value={contact.manychat_url} onSave={v => handleSave('manychat_url', v)} />
          <InlineField label="Documento (CPF/RG)" value={contact.document} onSave={v => handleSave('document', v)} />
          <InlineField label="Instagram" value={contact.instagram} onSave={v => handleSave('instagram', v)} />
          <div className="py-1.5">
            <p className="text-xs text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {(contact.tags || []).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
              {(!contact.tags || contact.tags.length === 0) && <span className="text-xs text-muted-foreground italic">Sem tags</span>}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
