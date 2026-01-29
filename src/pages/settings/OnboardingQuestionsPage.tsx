import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Settings,
  Sparkles,
} from 'lucide-react';
import {
  useOnboardingQuestions,
  useCreateOnboardingQuestion,
  useUpdateOnboardingQuestion,
  useDeleteOnboardingQuestion,
} from '@/hooks/useOnboardingMeeting';
import { groupQuestionsByBlock, CsOnboardingQuestion, FIELD_TYPE_LABELS, QuestionFieldType, SelectOption } from '@/types/onboardingMeeting';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';

interface QuestionFormData {
  block_key: string;
  block_title: string;
  question_text: string;
  field_type: QuestionFieldType;
  options_json: SelectOption[] | null;
  placeholder: string;
  help_text: string;
  answer_key: string;
  ai_extract_hint: string;
  is_required: boolean;
  is_decision_field: boolean;
  impacts_quality: boolean;
  weight: number;
  order_index: number;
  is_active: boolean;
}

const DEFAULT_BLOCKS = [
  { key: 'A', title: 'Governança' },
  { key: 'B', title: 'Objetivo e Métricas' },
  { key: 'C', title: 'Oferta e Anúncios' },
  { key: 'D', title: 'Estoque e Disponibilidade' },
  { key: 'E', title: 'Entrega e Frete' },
  { key: 'F', title: 'WhatsApp e Vendas' },
  { key: 'G', title: 'Diferenciais e Concorrência' },
  { key: 'H', title: 'Mídia, Verba e Acessos' },
  { key: 'I', title: 'Administrativo e Cronograma' },
];

const FIELD_TYPES: { value: QuestionFieldType; label: string }[] = [
  { value: 'long_text', label: 'Texto Longo' },
  { value: 'short_text', label: 'Texto Curto' },
  { value: 'number', label: 'Número' },
  { value: 'money', label: 'Valor (R$)' },
  { value: 'boolean', label: 'Sim/Não' },
  { value: 'single_select', label: 'Seleção Única' },
  { value: 'multi_select', label: 'Seleção Múltipla' },
  { value: 'date', label: 'Data' },
  { value: 'time', label: 'Horário' },
  { value: 'phone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
];

const emptyFormData: QuestionFormData = {
  block_key: 'A',
  block_title: 'Governança',
  question_text: '',
  field_type: 'long_text',
  options_json: null,
  placeholder: '',
  help_text: '',
  answer_key: '',
  ai_extract_hint: '',
  is_required: false,
  is_decision_field: false,
  impacts_quality: true,
  weight: 3,
  order_index: 0,
  is_active: true,
};

export default function OnboardingQuestionsPage() {
  const { data: questions = [], isLoading } = useOnboardingQuestions(false);
  const createQuestion = useCreateOnboardingQuestion();
  const updateQuestion = useUpdateOnboardingQuestion();
  const deleteQuestion = useDeleteOnboardingQuestion();

  const [openBlocks, setOpenBlocks] = useState<Set<string>>(new Set(['A']));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CsOnboardingQuestion | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<CsOnboardingQuestion | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(emptyFormData);
  const [optionsText, setOptionsText] = useState('');

  const blocks = useMemo(() => groupQuestionsByBlock(questions), [questions]);

  // Get all unique blocks from questions + defaults
  const availableBlocks = useMemo(() => {
    const blockSet = new Map<string, string>();
    for (const b of DEFAULT_BLOCKS) {
      blockSet.set(b.key, b.title);
    }
    for (const q of questions) {
      blockSet.set(q.block_key, q.block_title);
    }
    return Array.from(blockSet.entries())
      .map(([key, title]) => ({ key, title }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [questions]);

  const toggleBlock = (key: string) => {
    setOpenBlocks(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const parseOptionsText = (text: string): SelectOption[] | null => {
    if (!text.trim()) return null;
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => ({
        label: line,
        value: line.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      }));
  };

  const optionsToText = (options: SelectOption[] | null): string => {
    if (!options || !Array.isArray(options)) return '';
    return options.map(o => o.label).join('\n');
  };

  const openNewDialog = (blockKey?: string, blockTitle?: string) => {
    const maxOrder = questions
      .filter(q => q.block_key === (blockKey || 'A'))
      .reduce((max, q) => Math.max(max, q.order_index), 0);

    setEditingQuestion(null);
    setFormData({
      ...emptyFormData,
      block_key: blockKey || 'A',
      block_title: blockTitle || 'Governança',
      order_index: maxOrder + 1,
    });
    setOptionsText('');
    setDialogOpen(true);
  };

  const openEditDialog = (question: CsOnboardingQuestion) => {
    setEditingQuestion(question);
    setFormData({
      block_key: question.block_key,
      block_title: question.block_title,
      question_text: question.question_text,
      field_type: (question.field_type as QuestionFieldType) || 'long_text',
      options_json: question.options_json as SelectOption[] | null,
      placeholder: question.placeholder || '',
      help_text: question.help_text || '',
      answer_key: question.answer_key || '',
      ai_extract_hint: question.ai_extract_hint || '',
      is_required: question.is_required,
      is_decision_field: question.is_decision_field || false,
      impacts_quality: question.impacts_quality,
      weight: question.weight,
      order_index: question.order_index,
      is_active: question.is_active,
    });
    setOptionsText(optionsToText(question.options_json as SelectOption[] | null));
    setDialogOpen(true);
  };

  const handleBlockChange = (key: string) => {
    const block = availableBlocks.find(b => b.key === key);
    setFormData(prev => ({
      ...prev,
      block_key: key,
      block_title: block?.title || key,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.question_text.trim()) return;

    const options = parseOptionsText(optionsText);
    const payload = {
      ...formData,
      options_json: options,
    };

    if (editingQuestion) {
      await updateQuestion.mutateAsync({
        id: editingQuestion.id,
        ...payload,
      });
    } else {
      await createQuestion.mutateAsync(payload);
    }

    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!questionToDelete) return;
    await deleteQuestion.mutateAsync(questionToDelete.id);
    setDeleteDialogOpen(false);
    setQuestionToDelete(null);
  };

  const showOptionsField = formData.field_type === 'single_select' || formData.field_type === 'multi_select';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Perguntas do Onboarding</h1>
            <p className="text-muted-foreground">Configure as perguntas da reunião de onboarding</p>
          </div>
        </div>
        <Button onClick={() => openNewDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Pergunta
        </Button>
      </div>

      {/* Blocks */}
      <div className="space-y-4">
        {availableBlocks.map(block => {
          const blockQuestions = blocks.find(b => b.block_key === block.key)?.questions || [];
          const isOpen = openBlocks.has(block.key);
          const activeCount = blockQuestions.filter(q => q.is_active).length;

          return (
            <Card key={block.key}>
              <Collapsible open={isOpen} onOpenChange={() => toggleBlock(block.key)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                        <CardTitle className="text-lg">
                          Bloco {block.key} — {block.title}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {activeCount} {activeCount === 1 ? 'pergunta ativa' : 'perguntas ativas'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openNewDialog(block.key, block.title);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {blockQuestions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        Nenhuma pergunta neste bloco.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {blockQuestions.map((question, idx) => (
                          <div
                            key={question.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              question.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                            }`}
                          >
                            <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5 cursor-grab" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {idx + 1}. {question.question_text}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="secondary" className="text-xs">
                                  {FIELD_TYPE_LABELS[question.field_type as QuestionFieldType] || 'Texto'}
                                </Badge>
                                {question.is_required && (
                                  <Badge variant="destructive" className="text-xs">Obrigatória</Badge>
                                )}
                                {question.impacts_quality && (
                                  <Badge variant="outline" className="text-xs">
                                    Peso: {question.weight}
                                  </Badge>
                                )}
                                {question.answer_key && (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {question.answer_key}
                                  </Badge>
                                )}
                                {question.ai_extract_hint && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    IA
                                  </Badge>
                                )}
                                {!question.is_active && (
                                  <Badge variant="secondary" className="text-xs">Inativa</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(question)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setQuestionToDelete(question);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="type">Tipo e Opções</TabsTrigger>
              <TabsTrigger value="ai">IA e Avançado</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bloco</Label>
                  <Select value={formData.block_key} onValueChange={handleBlockChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBlocks.map(b => (
                        <SelectItem key={b.key} value={b.key}>
                          {b.key} — {b.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Título do Bloco</Label>
                  <Input
                    value={formData.block_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, block_title: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pergunta</Label>
                <Textarea
                  value={formData.question_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
                  placeholder="Digite a pergunta..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Peso (1-10)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Obrigatória</Label>
                  <Switch
                    checked={formData.is_required}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Impacta Qualidade</Label>
                  <Switch
                    checked={formData.impacts_quality}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, impacts_quality: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Ativa</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="type" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tipo de Campo</Label>
                <Select 
                  value={formData.field_type} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, field_type: val as QuestionFieldType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(ft => (
                      <SelectItem key={ft.value} value={ft.value}>
                        {ft.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showOptionsField && (
                <div className="space-y-2">
                  <Label>Opções (uma por linha)</Label>
                  <Textarea
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    placeholder="WhatsApp&#10;E-mail&#10;Telefone&#10;..."
                    className="min-h-[120px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite uma opção por linha. O valor será gerado automaticamente.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  value={formData.placeholder}
                  onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                  placeholder="Texto de exemplo no campo..."
                />
              </div>

              <div className="space-y-2">
                <Label>Texto de Ajuda</Label>
                <Input
                  value={formData.help_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, help_text: e.target.value }))}
                  placeholder="Dica exibida ao usuário..."
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Campo de Decisão</Label>
                  <p className="text-xs text-muted-foreground">Marca como decisão obrigatória</p>
                </div>
                <Switch
                  checked={formData.is_decision_field}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_decision_field: checked }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Chave de Resposta (answer_key)</Label>
                <Input
                  value={formData.answer_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, answer_key: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') }))}
                  placeholder="ex: approval_sla_hours"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único para uso em relatórios e integração com IA. Use snake_case.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Dica para Extração IA</Label>
                <Textarea
                  value={formData.ai_extract_hint}
                  onChange={(e) => setFormData(prev => ({ ...prev, ai_extract_hint: e.target.value }))}
                  placeholder="ex: Extrair número de horas do SLA de aprovação mencionado pelo cliente..."
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  Instrução para a IA sobre como extrair esta informação da transcrição.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.question_text.trim()}>
              {editingQuestion ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Excluir Pergunta"
        description="Tem certeza que deseja excluir esta pergunta? Esta ação não pode ser desfeita."
      >
        <span />
      </ConfirmDeleteDialog>
    </div>
  );
}