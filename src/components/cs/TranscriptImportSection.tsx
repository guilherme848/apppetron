import { useState, useEffect } from 'react';
import { FileText, Upload, Save, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLatestTranscript, useSaveTranscript, useUpdateTranscript } from '@/hooks/useCsTranscripts';
import { useAuth } from '@/contexts/AuthContext';
import type { TranscriptType } from '@/types/onboardingMeeting';

interface TranscriptImportSectionProps {
  clientId: string;
  transcriptType: TranscriptType;
  title: string;
  description: string;
  onTranscriptSaved?: (transcriptText: string) => void;
  showAiButton?: boolean;
  onAiAutofill?: () => void;
  aiButtonDisabled?: boolean;
  aiButtonLoading?: boolean;
}

export function TranscriptImportSection({
  clientId,
  transcriptType,
  title,
  description,
  onTranscriptSaved,
  showAiButton = false,
  onAiAutofill,
  aiButtonDisabled = false,
  aiButtonLoading = false,
}: TranscriptImportSectionProps) {
  const { member } = useAuth();
  const { data: existingTranscript, isLoading } = useLatestTranscript(clientId, transcriptType);
  const saveTranscript = useSaveTranscript();
  const updateTranscript = useUpdateTranscript();

  const [transcriptText, setTranscriptText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Load existing transcript
  useEffect(() => {
    if (existingTranscript?.transcript_text) {
      setTranscriptText(existingTranscript.transcript_text);
    }
  }, [existingTranscript]);

  const handleTextChange = (value: string) => {
    setTranscriptText(value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!transcriptText.trim()) return;

    if (existingTranscript) {
      // Update existing
      await updateTranscript.mutateAsync({
        id: existingTranscript.id,
        client_id: clientId,
        transcript_text: transcriptText,
      });
    } else {
      // Create new
      await saveTranscript.mutateAsync({
        client_id: clientId,
        transcript_type: transcriptType,
        transcript_text: transcriptText,
        source: 'paste',
        created_by: member?.id,
      });
    }

    setIsDirty(false);
    onTranscriptSaved?.(transcriptText);
  };

  const isSaving = saveTranscript.isPending || updateTranscript.isPending;
  const hasTranscript = transcriptText.trim().length > 0;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="text-sm">{description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {existingTranscript && (
                  <Badge variant="outline" className="text-xs">
                    {existingTranscript.transcript_text.length.toLocaleString()} caracteres
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Textarea
                  placeholder="Cole aqui a transcrição completa..."
                  value={transcriptText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground">
                    {transcriptText.length.toLocaleString()} caracteres
                    {isDirty && <span className="text-accent ml-2">• Alterações não salvas</span>}
                  </p>

                  <div className="flex items-center gap-2">
                    {showAiButton && hasTranscript && (
                      <Button
                        variant="outline"
                        onClick={onAiAutofill}
                        disabled={aiButtonDisabled || aiButtonLoading || isDirty}
                      >
                        {aiButtonLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Preenchendo...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Preencher respostas com IA
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      onClick={handleSave}
                      disabled={isSaving || !hasTranscript}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Transcrição
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
