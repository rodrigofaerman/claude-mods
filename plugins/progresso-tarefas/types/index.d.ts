export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type Task = { id: string; title: string; status: TaskStatus }
export type Run = {
  goal: string
  tasks: Task[]
  startedAt: number
  finishedMs: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'progresso-tarefas': { run: Run | null; isHidden: boolean }
  }
}
