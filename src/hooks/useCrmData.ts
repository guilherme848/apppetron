import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Account, Contract, Task, AccountStatus, ContractStatus, TaskStatus } from '@/types/crm';

// Helper functions to map Supabase data to typed objects
const mapAccount = (data: any): Account => ({
  id: data.id,
  name: data.name,
  status: data.status as AccountStatus,
  created_at: data.created_at,
  updated_at: data.updated_at,
  niche: data.niche,
  website: data.website,
  cpf_cnpj: data.cpf_cnpj,
  service_contracted: data.service_contracted,
  monthly_value: data.monthly_value,
  start_date: data.start_date,
  churned_at: data.churned_at,
  service_id: data.service_id,
  niche_id: data.niche_id,
  contact_name: data.contact_name,
  contact_phone: data.contact_phone,
  contact_email: data.contact_email,
  country: data.country,
  postal_code: data.postal_code,
  state: data.state,
  city: data.city,
  neighborhood: data.neighborhood,
  street: data.street,
  street_number: data.street_number,
  address_complement: data.address_complement,
  // Team member IDs
  designer_member_id: data.designer_member_id,
  videomaker_member_id: data.videomaker_member_id,
  social_member_id: data.social_member_id,
  traffic_member_id: data.traffic_member_id,
  support_member_id: data.support_member_id,
  cs_member_id: data.cs_member_id,
  // Tráfego Pago
  ad_payment_method: data.ad_payment_method,
  ad_monthly_budget: data.ad_monthly_budget,
  ad_payment_frequency: data.ad_payment_frequency,
});

const mapContract = (data: any): Contract => ({
  id: data.id,
  account_id: data.account_id,
  mrr: data.mrr,
  start_date: data.start_date,
  status: data.status as ContractStatus,
  created_at: data.created_at,
});

const mapTask = (data: any): Task => ({
  id: data.id,
  account_id: data.account_id,
  title: data.title,
  status: data.status as TaskStatus,
  due_date: data.due_date,
  created_at: data.created_at,
});

export function useCrmData() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching accounts:', error);
    } else {
      setAccounts((data || []).map(mapAccount));
    }
  }, []);

  const fetchContracts = useCallback(async () => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching contracts:', error);
    } else {
      setContracts((data || []).map(mapContract));
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks((data || []).map(mapTask));
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchAccounts(), fetchContracts(), fetchTasks()]);
    setLoading(false);
  }, [fetchAccounts, fetchContracts, fetchTasks]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addAccount = async (account: Partial<Account> & { name: string }) => {
    // Handle churned_at based on status
    const accountData = { ...account };
    if (accountData.status === 'churned' && !accountData.churned_at) {
      accountData.churned_at = new Date().toISOString().split('T')[0];
    } else if (accountData.status !== 'churned') {
      accountData.churned_at = null;
    }

    const { data, error } = await supabase
      .from('accounts')
      .insert([accountData])
      .select()
      .single();
    if (error) {
      console.error('Error adding account:', error);
      return null;
    }
    const mapped = mapAccount(data);
    setAccounts((prev) => [mapped, ...prev]);
    return mapped;
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    // Handle churned_at based on status change
    const currentAccount = accounts.find(a => a.id === id);
    const accountUpdates = { ...updates };
    
    if (updates.status === 'churned' && currentAccount?.status !== 'churned') {
      // Changing to churned - set churned_at if not already set
      if (!updates.churned_at) {
        accountUpdates.churned_at = new Date().toISOString().split('T')[0];
      }
    } else if (updates.status && updates.status !== 'churned' && currentAccount?.status === 'churned') {
      // Changing from churned to another status - clear churned_at
      accountUpdates.churned_at = null;
    }

    const { data, error } = await supabase
      .from('accounts')
      .update(accountUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating account:', error);
      return;
    }
    const mapped = mapAccount(data);
    setAccounts((prev) => prev.map((a) => (a.id === id ? mapped : a)));
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) {
      console.error('Error deleting account:', error);
      return;
    }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setContracts((prev) => prev.filter((c) => c.account_id !== id));
    setTasks((prev) => prev.map((t) => (t.account_id === id ? { ...t, account_id: null } : t)));
  };

  const addContract = async (contract: { account_id: string; mrr: number; start_date: string; status: ContractStatus }) => {
    const { data, error } = await supabase
      .from('contracts')
      .insert([contract])
      .select()
      .single();
    if (error) {
      console.error('Error adding contract:', error);
      return null;
    }
    const mapped = mapContract(data);
    setContracts((prev) => [mapped, ...prev]);
    return mapped;
  };

  const updateContract = async (id: string, updates: Partial<Contract>) => {
    const { error } = await supabase
      .from('contracts')
      .update(updates)
      .eq('id', id);
    if (error) {
      console.error('Error updating contract:', error);
      return;
    }
    setContracts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const deleteContract = async (id: string) => {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) {
      console.error('Error deleting contract:', error);
      return;
    }
    setContracts((prev) => prev.filter((c) => c.id !== id));
  };

  const addTask = async (task: { title: string; status: TaskStatus; account_id: string | null; due_date: string | null }) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();
    if (error) {
      console.error('Error adding task:', error);
      return null;
    }
    const mapped = mapTask(data);
    setTasks((prev) => [mapped, ...prev]);
    return mapped;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);
    if (error) {
      console.error('Error updating task:', error);
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const getAccountById = (id: string) => accounts.find((a) => a.id === id);
  const getContractsByAccount = (accountId: string) => contracts.filter((c) => c.account_id === accountId);
  const getTasksByAccount = (accountId: string) => tasks.filter((t) => t.account_id === accountId);

  const activeAccounts = accounts.filter((a) => a.status === 'active');
  const activeAccountsCount = activeAccounts.length;
  
  // MRR from accounts.monthly_value where status = 'active'
  const totalMrr = activeAccounts.reduce((sum, a) => sum + Number(a.monthly_value || 0), 0);
  const openTasksCount = tasks.filter((t) => t.status !== 'done').length;

  // Ticket Médio: AVG(monthly_value) for active clients with non-null values
  const activeWithValue = activeAccounts.filter((a) => a.monthly_value != null && a.monthly_value > 0);
  const averageTicket = activeWithValue.length > 0
    ? activeWithValue.reduce((sum, a) => sum + Number(a.monthly_value), 0) / activeWithValue.length
    : 0;

  // LT Médio: AVG months since start_date for active clients
  const now = new Date();
  const activeWithStartDate = activeAccounts.filter((a) => a.start_date);
  const averageLifetimeMonths = activeWithStartDate.length > 0
    ? activeWithStartDate.reduce((sum, a) => {
        const startDate = new Date(a.start_date!);
        const diffMonths = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
        return sum + Math.max(0, diffMonths);
      }, 0) / activeWithStartDate.length
    : 0;

  return {
    accounts,
    contracts,
    tasks,
    loading,
    addAccount,
    updateAccount,
    deleteAccount,
    addContract,
    updateContract,
    deleteContract,
    addTask,
    updateTask,
    deleteTask,
    getAccountById,
    getContractsByAccount,
    getTasksByAccount,
    activeAccountsCount,
    totalMrr,
    openTasksCount,
    averageTicket,
    averageLifetimeMonths,
    refetch: fetchAll,
  };
}
