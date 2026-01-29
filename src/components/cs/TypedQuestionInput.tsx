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
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Sparkles, AlertTriangle, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CsOnboardingQuestion, CsOnboardingAnswer } from '@/types/onboardingMeeting';
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
}: TypedQuestionInputProps) {
  const hasAnswer = value?.trim().length > 0 || valueJson !== null;
  const isAiGenerated = answer?.answered_by_ai;
  const needsValidation = answer?.needs_validation;

  const handleTextChange = (newValue: string) => {
    onChange(newValue, undefined);
  };

  const handleJsonChange = (newValue: unknown) => {
    // For typed fields, store value in JSON and generate text representation
    let textRepresentation = '';
    
    if (newValue === null || newValue === undefined) {
      textRepresentation = '';
    } else if (typeof newValue === 'boolean') {
      textRepresentation = newValue ? 'Sim' : 'Não';
    } else if (Array.isArray(newValue)) {
      textRepresentation = newValue.join(', ');
    } else {
      textRepresentation = String(newValue);
    }

    onChange(textRepresentation, newValue);
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
            value={valueJson !== undefined ? String(valueJson) : value}
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
              value={valueJson !== undefined ? String(valueJson) : value.replace(/[^\d.,]/g, '')}
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

      case 'boolean':
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

      case 'single_select':
        const options = question.options_json || [];
        return (
          <Select
            value={valueJson !== undefined ? String(valueJson) : value}
            onValueChange={(val) => {
              handleJsonChange(val);
              onBlur();
            }}
            disabled={disabled}
          >
            <SelectTrigger className="max-w-[300px]">
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
        );

      case 'multi_select':
        const multiOptions = question.options_json || [];
        const selectedValues: string[] = Array.isArray(valueJson) 
          ? valueJson 
          : value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];

        return (
          <div className="space-y-2">
            {multiOptions.map((opt) => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <div key={opt.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`${question.id}-${opt.value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...selectedValues, opt.value]
                        : selectedValues.filter(v => v !== opt.value);
                      handleJsonChange(newValues);
                      onBlur();
                    }}
                    disabled={disabled}
                  />
                  <label 
                    htmlFor={`${question.id}-${opt.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {opt.label}
                  </label>
                </div>
              );
            })}
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={valueJson !== undefined ? String(valueJson) : value}
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
            value={valueJson !== undefined ? String(valueJson) : value}
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
          <label className="text-sm font-medium leading-tight flex items-center gap-1">
            {question.question_text}
            {question.is_required && (
              <span className="text-destructive">*</span>
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
