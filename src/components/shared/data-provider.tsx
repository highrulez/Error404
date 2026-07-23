"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getDataService,
  type AppStore,
  type AutomationMode,
  type CaseProgressSummary,
  type ChecklistTask,
  type DataService,
  type Employee,
  type OnboardingCase,
  type ResponsibleTeam,
  type TaskStatus,
} from "@/data";

type DataContextValue = {
  ready: boolean;
  store: AppStore;
  service: DataService;
  refresh: () => void;
  createEmployee: DataService["createEmployee"];
  updateEmployee: DataService["updateEmployee"];
  updateTaskStatus: (
    taskId: string,
    status: TaskStatus,
    actor?: string
  ) =>
    | { task: ChecklistTask; accountCreatedNotice?: string }
    | undefined;
  updateTaskNotes: (
    taskId: string,
    notes: string,
    actor?: string
  ) => ChecklistTask | undefined;
  resetToSeed: (options?: {
    resetTemplates?: boolean;
    preserveCases?: boolean;
  }) => void;
  getCaseProgress: (caseId: string) => CaseProgressSummary;
  setAutomationMode: (mode: AutomationMode) => void;
  retryFailedNotification: (
    caseId: string,
    responsibleTeam?: ResponsibleTeam
  ) => Promise<{ ok: boolean; message: string }>;
  simulateReminder: (
    caseId: string
  ) => Promise<{ ok: boolean; message: string }>;
  triggerNewHireWorkflow: (
    caseId: string
  ) => Promise<{ ok: boolean; message: string }>;
};

const DataContext = createContext<DataContextValue | null>(null);

const EMPTY_STORE: AppStore = {
  version: 6,
  employees: [],
  onboardingCases: [],
  offboardingCases: [],
  tasks: [],
  activity: [],
  assignmentRules: [],
  checklistTemplates: [],
  checklistTemplateAudits: [],
  mockEmails: [],
  automationRuns: [],
  exitClearanceForms: [],
  exitClearanceTemplates: [],
  inductionForms: [],
  accessCardForms: [],
  laptopRequests: [],
  settings: { automationMode: "simulation" },
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<AppStore>(EMPTY_STORE);
  const service = useMemo(() => getDataService(), []);

  const refresh = useCallback(() => {
    setStore(service.getStore());
  }, [service]);

  useEffect(() => {
    // Idempotent: normalize Alicia links / laptop manager task+email on every load
    try {
      service.ensureAliciaOnboardingDemoData(null);
    } catch {
      /* ignore ensure errors during boot */
    }
    refresh();
    setReady(true);
  }, [refresh, service]);

  const createEmployee = useCallback(
    (...args: Parameters<DataService["createEmployee"]>) => {
      const result = service.createEmployee(...args);
      refresh();
      // Workflow runs async — refresh again shortly for notification status
      setTimeout(refresh, 800);
      return result;
    },
    [service, refresh]
  );

  const updateEmployee = useCallback(
    (...args: Parameters<DataService["updateEmployee"]>) => {
      const result = service.updateEmployee(...args);
      refresh();
      setTimeout(refresh, 800);
      return result;
    },
    [service, refresh]
  );

  const updateTaskStatus = useCallback(
    (taskId: string, status: TaskStatus, actor?: string) => {
      const result = service.updateTaskStatus(taskId, status, actor);
      refresh();
      return result;
    },
    [service, refresh]
  );

  const updateTaskNotes = useCallback(
    (taskId: string, notes: string, actor?: string) => {
      const result = service.updateTaskNotes(taskId, notes, actor);
      refresh();
      return result;
    },
    [service, refresh]
  );

  const resetToSeed = useCallback(
    (options?: { resetTemplates?: boolean; preserveCases?: boolean }) => {
      service.resetToSeed(options);
      refresh();
    },
    [service, refresh]
  );

  const getCaseProgress = useCallback(
    (caseId: string) => service.getCaseProgress(caseId),
    [service]
  );

  const setAutomationMode = useCallback(
    (mode: AutomationMode) => {
      service.setAutomationMode(mode);
      refresh();
    },
    [service, refresh]
  );

  const retryFailedNotification = useCallback(
    async (caseId: string, responsibleTeam?: ResponsibleTeam) => {
      const result = await service.retryFailedNotification(
        caseId,
        responsibleTeam
      );
      refresh();
      return result;
    },
    [service, refresh]
  );

  const simulateReminder = useCallback(
    async (caseId: string) => {
      const result = await service.simulateReminder(caseId);
      refresh();
      return result;
    },
    [service, refresh]
  );

  const triggerNewHireWorkflow = useCallback(
    async (caseId: string) => {
      const result = await service.triggerNewHireWorkflow(caseId);
      refresh();
      return result;
    },
    [service, refresh]
  );

  const value: DataContextValue = {
    ready,
    store,
    service,
    refresh,
    createEmployee,
    updateEmployee,
    updateTaskStatus,
    updateTaskNotes,
    resetToSeed,
    getCaseProgress,
    setAutomationMode,
    retryFailedNotification,
    simulateReminder,
    triggerNewHireWorkflow,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

export function useEmployee(id: string): Employee | undefined {
  const { store } = useData();
  return store.employees.find((e) => e.id === id);
}

export function useOnboardingCase(id: string): OnboardingCase | undefined {
  const { store } = useData();
  return store.onboardingCases.find((c) => c.id === id);
}
