import { PlannerPlan } from './types';

export function buildInitialPlan(emailId: string): PlannerPlan {
  return {
    emailId,
    steps: [
      { id: 'fetch_thread', name: 'Fetch Thread', status: 'pending' },
      { id: 'classify', name: 'Classify Email', status: 'pending' },
      { id: 'generate', name: 'Generate Drafts', status: 'pending' },
      { id: 'optimize', name: 'Optimize Draft', status: 'pending' },
      { id: 'await_user', name: 'Await User Approval', status: 'pending' },
      { id: 'send', name: 'Send Reply', status: 'pending' },
      { id: 'index_rag', name: 'Index RAG', status: 'pending' }
    ]
  };
}
