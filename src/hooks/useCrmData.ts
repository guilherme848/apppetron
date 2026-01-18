import { useState } from 'react';
import { Account, Contract, Task } from '@/types/crm';
import { mockAccounts, mockContracts, mockTasks } from '@/data/mockData';

export function useCrmData() {
  const [accounts, setAccounts] = useState<Account[]>(mockAccounts);
  const [contracts, setContracts] = useState<Contract[]>(mockContracts);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  const addAccount = (account: Omit<Account, 'id' | 'created_at'>) => {
    const newAccount: Account = {
      ...account,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString().split('T')[0],
    };
    setAccounts([...accounts, newAccount]);
    return newAccount;
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts(accounts.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAccount = (id: string) => {
    setAccounts(accounts.filter(a => a.id !== id));
  };

  const addContract = (contract: Omit<Contract, 'id' | 'created_at'>) => {
    const newContract: Contract = {
      ...contract,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString().split('T')[0],
    };
    setContracts([...contracts, newContract]);
    return newContract;
  };

  const updateContract = (id: string, updates: Partial<Contract>) => {
    setContracts(contracts.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteContract = (id: string) => {
    setContracts(contracts.filter(c => c.id !== id));
  };

  const addTask = (task: Omit<Task, 'id' | 'created_at'>) => {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString().split('T')[0],
    };
    setTasks([...tasks, newTask]);
    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const getAccountById = (id: string) => accounts.find(a => a.id === id);
  const getContractsByAccount = (accountId: string) => contracts.filter(c => c.account_id === accountId);
  const getTasksByAccount = (accountId: string) => tasks.filter(t => t.account_id === accountId);

  const activeAccountsCount = accounts.filter(a => a.status === 'active').length;
  const totalMrr = contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + c.mrr, 0);
  const openTasksCount = tasks.filter(t => t.status !== 'done').length;

  return {
    accounts,
    contracts,
    tasks,
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
  };
}
