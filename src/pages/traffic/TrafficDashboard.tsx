import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, ListTodo } from 'lucide-react';
import TrafficOperationalDashboard from './TrafficOperationalDashboard';
import TrafficPlaybookTasksPage from './TrafficPlaybookTasksPage';

export default function TrafficDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Tarefas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <TrafficOperationalDashboard />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <TrafficPlaybookTasksPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
