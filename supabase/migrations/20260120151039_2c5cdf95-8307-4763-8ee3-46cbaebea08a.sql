-- 1. Ciclos de Tráfego
CREATE TABLE public.traffic_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  cadence_days INTEGER NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.traffic_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to traffic_cycles" 
ON public.traffic_cycles 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_traffic_cycles_updated_at
BEFORE UPDATE ON public.traffic_cycles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Templates de tarefas do ciclo
CREATE TABLE public.traffic_cycle_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.traffic_cycles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details TEXT,
  default_priority TEXT NOT NULL DEFAULT 'medium',
  due_offset_days INTEGER NOT NULL DEFAULT 0,
  task_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_cycle_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to traffic_cycle_tasks" 
ON public.traffic_cycle_tasks 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE TRIGGER update_traffic_cycle_tasks_updated_at
BEFORE UPDATE ON public.traffic_cycle_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Períodos por cliente
CREATE TABLE public.traffic_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.traffic_cycles(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, period_start)
);

ALTER TABLE public.traffic_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to traffic_periods" 
ON public.traffic_periods 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE TRIGGER update_traffic_periods_updated_at
BEFORE UPDATE ON public.traffic_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Tarefas geradas
CREATE TABLE public.traffic_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.traffic_periods(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  assignee_id UUID REFERENCES public.team_members(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to traffic_tasks" 
ON public.traffic_tasks 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE TRIGGER update_traffic_tasks_updated_at
BEFORE UPDATE ON public.traffic_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Adicionar traffic_cycle_id ao services
ALTER TABLE public.services ADD COLUMN traffic_cycle_id UUID REFERENCES public.traffic_cycles(id);

-- 6. Adicionar traffic_cycle_id ao accounts
ALTER TABLE public.accounts ADD COLUMN traffic_cycle_id UUID REFERENCES public.traffic_cycles(id);

-- 7. Seed de ciclos padrão
INSERT INTO public.traffic_cycles (name, cadence_days, description) VALUES
('Semanal', 7, 'Ciclo semanal com tarefas recorrentes de acompanhamento'),
('Quinzenal', 14, 'Ciclo quinzenal com tarefas de otimização'),
('Mensal', 30, 'Ciclo mensal com planejamento e relatórios');

-- 8. Seed de tarefas padrão para ciclo Semanal
INSERT INTO public.traffic_cycle_tasks (cycle_id, title, details, default_priority, due_offset_days, task_order)
SELECT 
  id as cycle_id,
  task.title,
  task.details,
  task.priority,
  task.offset_days,
  task.task_order
FROM public.traffic_cycles
CROSS JOIN (VALUES
  ('Checar gastos e entrega', 'Verificar se o orçamento está sendo consumido corretamente e se as entregas estão dentro do esperado', 'high', 0, 1),
  ('Análise CPA/ROAS', 'Analisar custo por aquisição e retorno sobre investimento das campanhas', 'high', 1, 2),
  ('Negativar termos/posicionamentos', 'Revisar e negativar termos de pesquisa e posicionamentos com baixa performance', 'medium', 2, 3),
  ('Otimizar criativos', 'Pausar criativos com baixa performance e escalar os melhores', 'medium', 3, 4),
  ('Revisar tracking', 'Verificar se o pixel e conversões estão funcionando corretamente', 'medium', 4, 5),
  ('Mini-relatório semanal', 'Preparar resumo semanal de resultados para o cliente', 'low', 5, 6)
) AS task(title, details, priority, offset_days, task_order)
WHERE traffic_cycles.name = 'Semanal';

-- 9. Seed de tarefas padrão para ciclo Mensal
INSERT INTO public.traffic_cycle_tasks (cycle_id, title, details, default_priority, due_offset_days, task_order)
SELECT 
  id as cycle_id,
  task.title,
  task.details,
  task.priority,
  task.offset_days,
  task.task_order
FROM public.traffic_cycles
CROSS JOIN (VALUES
  ('Planejamento do mês', 'Definir estratégias, orçamentos e metas para o período', 'high', 0, 1),
  ('Revisão de estratégia', 'Analisar o que funcionou no período anterior e ajustar abordagem', 'high', 5, 2),
  ('Teste de novos criativos', 'Criar e lançar novos criativos para teste A/B', 'medium', 10, 3),
  ('Análise de público', 'Revisar segmentações e identificar novos públicos potenciais', 'medium', 15, 4),
  ('Relatório mensal', 'Preparar relatório completo com resultados e recomendações', 'high', 25, 5),
  ('Reunião de alinhamento', 'Agendar e preparar pauta para reunião com cliente', 'medium', 27, 6)
) AS task(title, details, priority, offset_days, task_order)
WHERE traffic_cycles.name = 'Mensal';

-- 10. Adicionar permissões de tráfego
INSERT INTO public.permissions (key, label) VALUES
('view_traffic', 'Visualizar Tráfego Pago'),
('edit_traffic', 'Editar Tráfego Pago'),
('manage_traffic_cycles', 'Gerenciar Ciclos de Tráfego')
ON CONFLICT (key) DO NOTHING;