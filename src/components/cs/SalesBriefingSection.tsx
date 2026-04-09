import { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, CheckCircle, FileText, Edit3, ArrowRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useSalesBriefing } from '@/hooks/useSalesBriefing';
import { BRIEFING_RISK_LABELS, type BriefingContent } from '@/types/salesBriefing';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface SalesBriefingSectionProps {
  clientId: string;
  onCompleteStep?: () => void;
  stepCompleted?: boolean;
  completeLoading?: boolean;
}

export function SalesBriefingSection({ clientId, onCompleteStep, stepCompleted, completeLoading }: SalesBriefingSectionProps) {
  const { 
    transcript, 
    briefing, 
    loading, 
    generating, 
    fetchData, 
    generateBriefing, 
    updateBriefing 
  } = useSalesBriefing(clientId);

  const [transcriptText, setTranscriptText] = useState('');
  const [csNotes, setCsNotes] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<BriefingContent | null>(null);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (transcript?.transcript_text) {
      setTranscriptText(transcript.transcript_text);
    }
    if (briefing?.cs_notes) {
      setCsNotes(briefing.cs_notes);
    }
    if (briefing?.briefing_content) {
      setEditedContent(briefing.briefing_content);
    }
  }, [transcript, briefing]);

  const handleGenerate = async () => {
    if (!transcriptText.trim()) return;
    await generateBriefing(transcriptText);
  };

  const handleSaveNotes = async () => {
    await updateBriefing({ cs_notes: csNotes });
  };

  const handleSaveContent = async () => {
    if (editedContent) {
      await updateBriefing({ briefing_content: editedContent });
      setEditingSection(null);
    }
  };

  const handleCompleteStep = () => {
    if (onCompleteStep) {
      onCompleteStep();
    }
  };

  const getRiskColor = (level: string | null) => {
    switch (level) {
      case 'low': return 'bg-success/10 text-success';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'high': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskIcon = (level: string | null) => {
    switch (level) {
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Note: stepCompleted no longer blocks editing - users can always view/edit the briefing

  return (
    <div className="space-y-4">
      {/* Step Completed Banner */}
      {stepCompleted && (
        <Alert className="border-primary/50 bg-primary/5">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>Etapa 1 Concluída.</strong> O briefing foi gerado e você pode continuar editando se necessário.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alert - Venda sempre fechada */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          A venda é considerada fechada, pois o cliente já está ativo no sistema. A transcrição serve para extrair contexto, expectativas e riscos operacionais.
        </AlertDescription>
      </Alert>

      {/* Transcript Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transcrição da Reunião de Vendas
          </CardTitle>
          <CardDescription>
            Cole a transcrição da call de vendas para gerar automaticamente o briefing de onboarding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Cole aqui a transcrição completa da reunião de vendas/fechamento..."
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {transcriptText.length} caracteres
            </p>
            <Button 
              onClick={handleGenerate} 
              disabled={generating || transcriptText.length < 100}
            >
              {generating ? (
                <>
                  <Skeleton className="h-4 w-16 rounded" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Briefing Automaticamente
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Briefing Display */}
      {briefing && editedContent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Briefing de Onboarding</CardTitle>
                <CardDescription>
                  Gerado automaticamente pela IA • Editável pelo CS
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* Risk Badge */}
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                  getRiskColor(briefing.risk_level)
                )}>
                  {getRiskIcon(briefing.risk_level)}
                  <span>Risco Operacional: {briefing.risk_score}/100</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Accordion type="multiple" defaultValue={['resumo', 'objetivos', 'riscos', 'checklist']} className="space-y-2">
              {/* Resumo Executivo */}
              <AccordionItem value="resumo" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <span className="font-semibold">1. Resumo Executivo</span>
                </AccordionTrigger>
                <AccordionContent>
                  {editingSection === 'resumo' ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedContent.resumo_executivo}
                        onChange={(e) => setEditedContent({ ...editedContent, resumo_executivo: e.target.value })}
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveContent}>Salvar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <p className="text-muted-foreground">{editedContent.resumo_executivo}</p>
                      <Button size="icon" variant="ghost" onClick={() => setEditingSection('resumo')}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Objetivos e Expectativas */}
              <AccordionItem value="objetivos" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <span className="font-semibold">2. Objetivos e Expectativas do Cliente</span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {editedContent.objetivos_expectativas.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* Escopo Vendido */}
              <AccordionItem value="escopo" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <span className="font-semibold">3. Escopo Vendido</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div>
                    <p className="font-medium mb-1">Itens:</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      {editedContent.escopo_vendido.itens.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  {editedContent.escopo_vendido.riscos_desalinhamento.length > 0 && (
                    <div>
                      <p className="font-medium mb-1 text-primary">Riscos de Desalinhamento:</p>
                      <ul className="list-disc pl-5 space-y-1 text-primary">
                        {editedContent.escopo_vendido.riscos_desalinhamento.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Pontos de Atenção */}
              <AccordionItem value="riscos" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <span className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    4. Pontos de Atenção e Riscos Operacionais
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {editedContent.pontos_atencao_riscos.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* Checklist */}
              <AccordionItem value="checklist" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <span className="font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    5. Checklist de Validação no Onboarding
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {editedContent.checklist_validacao.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded border-2 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* Frases-chave */}
              <AccordionItem value="frases" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <span className="font-semibold">6. Frases-chave do Cliente</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {editedContent.frases_chave.map((frase, idx) => (
                      <blockquote key={idx} className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                        "{frase}"
                      </blockquote>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Perfil Comportamental */}
              <AccordionItem value="perfil" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <span className="font-semibold">7. Perfil Comportamental</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">{editedContent.perfil_comportamental}</p>
                </AccordionContent>
              </AccordionItem>

              {/* Score de Risco */}
              <AccordionItem value="score" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <span className="font-semibold">8. Score de Risco Operacional</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "text-3xl font-bold",
                        briefing.risk_level === 'low' && 'text-success',
                        briefing.risk_level === 'medium' && 'text-warning',
                        briefing.risk_level === 'high' && 'text-destructive',
                      )}>
                        {briefing.risk_score}/100
                      </div>
                      <Badge className={getRiskColor(briefing.risk_level)}>
                        {briefing.risk_level && BRIEFING_RISK_LABELS[briefing.risk_level]}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{editedContent.risk_justificativa}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* CS Notes */}
            <div className="pt-4 border-t">
              <label className="text-sm font-medium mb-2 block">Observações do CS</label>
              <Textarea
                placeholder="Adicione suas observações pessoais sobre este cliente..."
                value={csNotes}
                onChange={(e) => setCsNotes(e.target.value)}
                className="min-h-[100px]"
                onBlur={handleSaveNotes}
              />
            </div>

            {/* Complete Step CTA */}
            {onCompleteStep && !stepCompleted && (
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleCompleteStep}
                  disabled={!!completeLoading}
                  className="w-full"
                  size="lg"
                >
                  {completeLoading ? (
                    <>
                      <Skeleton className="h-4 w-16 rounded" />
                      Concluindo...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Concluir Briefing e Avançar para Etapa 2
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Ao concluir, a Etapa 2 (Reunião de Onboarding) será desbloqueada automaticamente.
                </p>
              </div>
            )}
            
            {/* Step completed indicator */}
            {stepCompleted && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Etapa 1 Concluída</span>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Você ainda pode editar o briefing acima. As alterações serão salvas automaticamente.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
