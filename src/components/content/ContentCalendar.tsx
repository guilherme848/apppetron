import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentItem } from '@/types/content';
import { Account } from '@/types/crm';
import { ContentStatusBadge, OverdueBadge } from './ContentBadges';

interface ContentCalendarProps {
  items: ContentItem[];
  accounts: Account[];
  onItemClick: (id: string) => void;
}

export function ContentCalendar({ items, accounts, onItemClick }: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('month');
  
  const today = new Date().toISOString().split('T')[0];

  const getAccountName = (clientId: string | null) => {
    if (!clientId) return '';
    const account = accounts.find((a) => a.id === clientId);
    return account?.name || '';
  };

  const isOverdue = (item: ContentItem) => {
    return item.due_date && item.due_date < today && item.status !== 'published';
  };

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Previous month days
    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }, [currentDate]);

  const getItemsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return items.filter((item) => {
      const scheduledDate = item.scheduled_at?.split('T')[0];
      const dueDate = item.due_date;
      return scheduledDate === dateStr || dueDate === dateStr;
    });
  };

  const navigatePrev = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const navigateNext = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const renderDayItems = (date: Date) => {
    const dayItems = getItemsForDate(date);
    return dayItems.slice(0, 3).map((item) => (
      <button
        key={item.id}
        onClick={() => onItemClick(item.id)}
        className="w-full text-left text-xs p-1 rounded bg-primary/10 hover:bg-primary/20 truncate flex items-center gap-1"
      >
        {isOverdue(item) && <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />}
        <span className="truncate">{item.title}</span>
      </button>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium capitalize min-w-[180px] text-center">{monthName}</span>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setView('week')}>
            Semana
          </Button>
          <Button variant={view === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setView('month')}>
            Mês
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-background">
        <div className="grid grid-cols-7 border-b">
          {weekDayNames.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium bg-muted">
              {day}
            </div>
          ))}
        </div>
        
        {view === 'month' ? (
          <div className="grid grid-cols-7">
            {monthDays.map(({ date, isCurrentMonth }, idx) => {
              const dateStr = date.toISOString().split('T')[0];
              const isToday = dateStr === today;
              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-1 border-b border-r ${!isCurrentMonth ? 'bg-muted/30' : ''} ${isToday ? 'bg-primary/5' : ''}`}
                >
                  <div className={`text-sm mb-1 ${isToday ? 'font-bold text-primary' : ''} ${!isCurrentMonth ? 'text-muted-foreground' : ''}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {renderDayItems(date)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {weekDays.map((date, idx) => {
              const dateStr = date.toISOString().split('T')[0];
              const isToday = dateStr === today;
              return (
                <div
                  key={idx}
                  className={`min-h-[200px] p-2 border-r ${isToday ? 'bg-primary/5' : ''}`}
                >
                  <div className={`text-sm mb-2 ${isToday ? 'font-bold text-primary' : ''}`}>
                    {date.getDate()} {date.toLocaleDateString('pt-BR', { month: 'short' })}
                  </div>
                  <div className="space-y-1">
                    {renderDayItems(date)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
