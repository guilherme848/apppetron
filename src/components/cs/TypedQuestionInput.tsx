import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Sparkles, AlertTriangle, HelpCircle, Database } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CsOnboardingQuestion, CsOnboardingAnswer, SubFieldDef, SelectOption } from '@/types/onboardingMeeting';
import { cn } from '@/lib/utils';

interface TypedQuestionInputProps {
  question: CsOnboardingQuestion;
  answer?: CsOnboardingAnswer;
  value: string;
  valueJson?: unknown;
  onChange: (textValue: string, jsonValue?: unknown) => void;
  onBlur: () => void;
  disabled?: boolean;
  isPending?: boolean;
  clientData?: Record<string, unknown>;
}

export function TypedQuestionInput({
  question,
  answer,
  value,
  valueJson,
  onChange,
  onBlur,
  disabled = false,
  isPending = false,
  clientData,
}: TypedQuestionInputProps) {
  const hasAnswer = value?.trim().length > 0 || (valueJson !== null && valueJson !== undefined);
  const isAiGenerated = answer?.answered_by_ai;
  const needsValidation = answer?.needs_validation;
  const isPrefilled = !!question.prefill_field;

  const handleTextChange = (newValue: string) => {
    onChange(newValue, undefined);
  };

  const handleJsonChange = (newValue: unknown) => {
    let textRepresentation = '';
    if (newValue === null || newValue === undefined) {
      textRepresentation = '';
    } else if (typeof newValue === 'boolean') {
      textRepresentation = newValue ? 'Sim' : 'Não';
    } else if (Array.isArray(newValue)) {
      textRepresentation = newValue.join(', ');
    } else if (typeof newValue === 'object') {
      textRepresentation = JSON.stringify(newValue);
    } else {
      textRepresentation = String(newValue);
    }
    onChange(textRepresentation, newValue);
  };

  // Check if a compound sub-field condition is met
  const isSubFieldVisible = (subField: SubFieldDef, currentJson: Record<string, unknown>): boolean => {
    if (!subField.condition) return true;
    const { field, equals, in: inValues } = subField.condition;
    const fieldValue = currentJson[field];
    if (equals !== undefined) return fieldValue === equals;
    if (inValues) return inValues.includes(String(fieldValue));
    return true;
  };

  const renderChipSelect = (
    options: SelectOption[],
    selectedValues: string[],
    onToggle: (value: string, checked: boolean) => void,
    allowOther: boolean = false,
    otherValue: string = '',
    onOtherChange?: (val: string) => void,
  ) => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isChecked = selectedValues.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onToggle(opt.value, !isChecked);
                onBlur();
              }}
              disabled={disabled}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border transition-all duration-200',
                isChecked
                  ? 'bg-primary/12 border-primary/40 text-primary font-medium'
                  : 'bg-muted border-border text-muted-foreground hover:border-primary/30'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {allowOther && (
        <Input
          value={otherValue}
          onChange={(e) => onOtherChange?.(e.target.value)}
          onBlur={onBlur}
          placeholder="Outro..."
          disabled={disabled}
          className="max-w-xs"
        />
      )}
    </div>
  );

  const renderSubField = (
    subField: SubFieldDef,
    subValue: unknown,
    onSubChange: (val: unknown) => void,
  ) => {
    switch (subField.type) {
      case 'short_text':
        return (
          <Input
            value={String(subValue || '')}
            onChange={(e) => onSubChange(e.target.value)}
            onBlur={onBlur}
            placeholder={subField.label}
            disabled={disabled}
          />
        );
      case 'single_select':
        return (
          <Select
            value={String(subValue || '')}
            onValueChange={(val) => { onSubChange(val); onBlur(); }}
            disabled={disabled}
          >
            <SelectTrigger className="h-[42px] rounded-lg">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {(subField.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'multi_select': {
        const selected: string[] = Array.isArray(subValue) ? subValue : [];
        return renderChipSelect(
          subField.options || [],
          selected,
          (val, checked) => {
            const newValues = checked
              ? [...selected, val]
              : selected.filter(v => v !== val);
            onSubChange(newValues);
          }
        );
      }
      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={!!subValue}
              onCheckedChange={(checked) => { onSubChange(checked); onBlur(); }}
              disabled={disabled}
            />
            <span className="text-sm">{subValue ? 'Sim' : 'Não'}</span>
          </div>
        );
      case 'money':
        return (
          <div className="flex items-center gap-2 max-w-[200px]">
            <span className="text-muted-foreground text-sm">R$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={subValue !== undefined && subValue !== null ? String(subValue) : ''}
              onChange={(e) => onSubChange(e.target.value ? parseFloat(e.target.value) : null)}
              onBlur={onBlur}
              placeholder="0,00"
              disabled={disabled}
            />
          </div>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={String(subValue || '')}
            onChange={(e) => onSubChange(e.target.value || null)}
            onBlur={onBlur}
            disabled={disabled}
            className="max-w-[200px]"
          />
        );
      default:
        return (
          <Input
            value={String(subValue || '')}
            onChange={(e) => onSubChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
          />
        );
    }
  };

  const renderInput = () => {
    switch (question.field_type) {
      case 'short_text':
        return (
          <Input
            value={value}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={onBlur}
            placeholder={question.placeholder || 'Digite sua resposta...'}
            disabled={disabled}
          />
        );

      case 'long_text':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={onBlur}
            placeholder={question.placeholder || 'Digite sua resposta...'}
            disabled={disabled}
            className="min-h-[80px]"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={valueJson !== undefined && valueJson !== null ? String(valueJson) : value}
            onChange={(e) => {
              const numValue = e.target.value ? parseFloat(e.target.value) : null;
              handleJsonChange(numValue);
            }}
            onBlur={onBlur}
            placeholder={question.placeholder || '0'}
            disabled={disabled}
            className="max-w-[200px]"
          />
        );

      case 'money':
        return (
          <div className="flex items-center gap-2 max-w-[200px]">
            <span className="text-muted-foreground">R$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={valueJson !== undefined && valueJson !== null ? String(valueJson) : value.replace(/[^\d.,]/g, '')}
              onChange={(e) => {
                const numValue = e.target.value ? parseFloat(e.target.value) : null;
                handleJsonChange(numValue);
              }}
              onBlur={onBlur}
              placeholder="0,00"
              disabled={disabled}
            />
          </div>
        );

      case 'boolean': {
        const boolValue = valueJson === true || value?.toLowerCase() === 'sim';
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={boolValue}
              onCheckedChange={(checked) => {
                handleJsonChange(checked);
                onBlur();
              }}
              disabled={disabled}
            />
            <span className="text-sm">{boolValue ? 'Sim' : 'Não'}</span>
          </div>
        );
      }

      case 'single_select': {
        const options = question.options_json || [];
        const currentVal = valueJson !== undefined && valueJson !== null ? String(valueJson) : value;
        const subFields = (question.sub_fields || []) as SubFieldDef[];
        const compoundJson: Record<string, unknown> = typeof valueJson === 'object' && valueJson !== null && !Array.isArray(valueJson)
          ? (valueJson as Record<string, unknown>)
          : { value: currentVal };

        return (
          <div className="space-y-3">
            <Select
              value={String(compoundJson.value || currentVal || '')}
              onValueChange={(val) => {
                if (subFields.length > 0) {
                  const newJson = { ...compoundJson, value: val };
                  handleJsonChange(newJson);
                } else {
                  handleJsonChange(val);
                }
                onBlur();
              }}
              disabled={disabled}
            >
              <SelectTrigger className="max-w-[400px] h-[42px] rounded-lg">
                <SelectValue placeholder={question.placeholder || 'Selecione...'} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Conditional sub-fields */}
            {subFields.filter(sf => isSubFieldVisible(sf, compoundJson)).map(sf => (
              <div key={sf.key} className="animate-in slide-in-from-top-2 duration-200">
                <label className="text-sm text-muted-foreground mb-1 block">{sf.label}</label>
                {renderSubField(sf, compoundJson[sf.key], (val) => {
                  const newJson = { ...compoundJson, [sf.key]: val };
                  handleJsonChange(newJson);
                })}
              </div>
            ))}
          </div>
        );
      }

      case 'multi_select': {
        const multiOptions = question.options_json || [];
        const compoundJson: Record<string, unknown> = typeof valueJson === 'object' && valueJson !== null && !Array.isArray(valueJson)
          ? (valueJson as Record<string, unknown>)
          : {};
        const selectedValues: string[] = Array.isArray(valueJson) 
          ? valueJson 
          : Array.isArray(compoundJson.selected)
            ? compoundJson.selected as string[]
            : value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];

        const otherValue = typeof compoundJson.other === 'string' ? compoundJson.other : '';
        const subFields = (question.sub_fields || []) as SubFieldDef[];

        const handleToggle = (optValue: string, checked: boolean) => {
          const newValues = checked
            ? [...selectedValues, optValue]
            : selectedValues.filter(v => v !== optValue);
          
          if (subFields.length > 0 || question.allow_other) {
            handleJsonChange({ ...compoundJson, selected: newValues });
          } else {
            handleJsonChange(newValues);
          }
        };

        return (
          <div className="space-y-3">
            {renderChipSelect(
              multiOptions,
              selectedValues,
              handleToggle,
              question.allow_other,
              otherValue,
              (val) => handleJsonChange({ ...compoundJson, selected: selectedValues, other: val })
            )}
            {/* Extra sub-fields for multi_select (e.g. carro-chefe, handles) */}
            {subFields.map(sf => {
              if (sf.per_option) {
                // Show one input per selected option
                return selectedValues.filter(v => v !== 'nenhuma').map(optVal => {
                  const opt = multiOptions.find(o => o.value === optVal);
                  if (!opt) return null;
                  const handleKey = `${sf.key}_${optVal}`;
                  return (
                    <div key={handleKey} className="flex items-center gap-2 max-w-xs">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">{opt.label}:</span>
                      <Input
                        value={String((compoundJson as Record<string, unknown>)[handleKey] || '')}
                        onChange={(e) => handleJsonChange({ ...compoundJson, selected: selectedValues, [handleKey]: e.target.value })}
                        onBlur={onBlur}
                        placeholder={`@ ${opt.label}`}
                        disabled={disabled}
                        className="h-8"
                      />
                    </div>
                  );
                });
              }
              return (
                <div key={sf.key}>
                  <label className="text-sm text-muted-foreground mb-1 block">{sf.label}</label>
                  {renderSubField(sf, compoundJson[sf.key], (val) => {
                    handleJsonChange({ ...compoundJson, selected: selectedValues, [sf.key]: val });
                  })}
                </div>
              );
            })}
          </div>
        );
      }

      case 'compound': {
        const subFields = (question.sub_fields || []) as SubFieldDef[];
        const compoundJson: Record<string, unknown> = typeof valueJson === 'object' && valueJson !== null && !Array.isArray(valueJson)
          ? (valueJson as Record<string, unknown>)
          : {};

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {subFields.filter(sf => isSubFieldVisible(sf, compoundJson)).map(sf => (
                <div key={sf.key} className="flex-1 min-w-[200px] animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm text-muted-foreground">{sf.label}</label>
                    {sf.prefill_field && (
                      <Badge variant="outline" className="text-[11px] px-1.5 py-0 text-blue-500 border-blue-200">
                        <Database className="h-2.5 w-2.5 mr-0.5" />
                        Do cadastro
                      </Badge>
                    )}
                  </div>
                  {renderSubField(sf, compoundJson[sf.key], (val) => {
                    const newJson = { ...compoundJson, [sf.key]: val };
                    // Handle "mesma_pessoa" toggle
                    if (sf.key === 'mesma_pessoa' && val === true && newJson.quem_decide) {
                      newJson.quem_executa = newJson.quem_decide;
                    }
                    handleJsonChange(newJson);
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'date':
        return (
          <Input
            type="date"
            value={valueJson !== undefined && valueJson !== null ? String(valueJson) : value}
            onChange={(e) => handleJsonChange(e.target.value || null)}
            onBlur={onBlur}
            disabled={disabled}
            className="max-w-[200px]"
          />
        );

      case 'time':
        return (
          <Input
            type="time"
            value={valueJson !== undefined && valueJson !== null ? String(valueJson) : value}
            onChange={(e) => handleJsonChange(e.target.value || null)}
            onBlur={onBlur}
            disabled={disabled}
            className="max-w-[150px]"
          />
        );

      case 'phone':
        return (
          <Input
            type="tel"
            value={value}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={onBlur}
            placeholder={question.placeholder || '(00) 00000-0000'}
            disabled={disabled}
            className="max-w-[200px]"
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={onBlur}
            placeholder={question.placeholder || 'email@exemplo.com'}
            disabled={disabled}
            className="max-w-[300px]"
          />
        );

      default:
        return (
          <Textarea
            value={value}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={onBlur}
            placeholder="Digite sua resposta..."
            disabled={disabled}
            className="min-h-[80px]"
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      {/* Question Label */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <label className="text-sm font-medium leading-tight flex items-center gap-1.5">
            {question.question_text}
            {question.is_required && (
              <span className="text-destructive">*</span>
            )}
            {isPrefilled && (
              <Badge variant="outline" className="text-[11px] px-1.5 py-0 text-blue-500 border-blue-200">
                <Database className="h-2.5 w-2.5 mr-0.5" />
                Do cadastro
              </Badge>
            )}
            {question.help_text && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{question.help_text}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </label>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {question.impacts_quality && (
            <Badge variant="outline" className="text-xs">
              Peso: {question.weight}
            </Badge>
          )}
          {isPending && (
            <span className="text-xs text-muted-foreground">Salvando...</span>
          )}
          {!isPending && hasAnswer && !needsValidation && (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
          {isAiGenerated && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              IA
            </Badge>
          )}
          {needsValidation && (
            <Badge variant="outline" className="text-xs gap-1 border-accent text-accent">
              <AlertTriangle className="h-3 w-3" />
              Validar
            </Badge>
          )}
        </div>
      </div>

      {/* Input Field */}
      {renderInput()}
    </div>
  );
}
