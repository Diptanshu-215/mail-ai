export interface PlannerStep { id: string; name: string; status: 'pending'|'running'|'done'|'error'; }
export interface PlannerPlan { emailId: string; steps: PlannerStep[]; }
