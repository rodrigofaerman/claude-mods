import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Run, Task, TaskStatus } from '../types'

const run = atom({ plugin: 'progresso-tarefas', key: 'run' } as const, null)
const isHidden = atom({ plugin: 'progresso-tarefas', key: 'isHidden' } as const, false)

const BAR = 20
const GREEN = '#3fb950'

const bar = (fraction: number, width: number) => {
  const full = Math.round(fraction * width)
  return '█'.repeat(full) + '░'.repeat(width - full)
}

const duration = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

const percent = (tasks: readonly Task[]) =>
  tasks.length === 0
    ? 0
    : Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)

const isDone = (r: Run | null) =>
  r !== null && r.tasks.length > 0 && r.tasks.every(t => t.status === 'completed')

// Escreve a lista nova, atualiza status line e avisa quando tudo terminou.
async function commit($: EngineInterface, goal: string, tasks: Task[]) {
  const now = await $.clock.now()
  const before = await read($, run)
  // Uma lista nova depois de uma já concluída começa uma nova rodada.
  const fresh = before === null || isDone(before)
  const next: Run = {
    goal: fresh ? goal : before.goal,
    tasks,
    startedAt: fresh ? now : before.startedAt,
    finishedMs: null,
  }
  if (isDone(next)) next.finishedMs = now - next.startedAt

  await update($, run, () => next)
  await update($, isHidden, () => false)

  const done = tasks.filter(t => t.status === 'completed').length
  $.ui.status(tasks.length ? `${bar(percent(tasks) / 100, 10)} ${percent(tasks)}% · ${done}/${tasks.length}` : undefined)

  if (next.finishedMs !== null && !isDone(before)) {
    $.ui.toast(`✓ Tudo pronto: ${tasks.length} tarefas em ${duration(next.finishedMs)}`)
  }
}

const DEMO = [
  'Escolher estilo e layout da página',
  'Ver como a página busca o clima',
  'Construir o dashboard de clima',
  'Publicar e compartilhar o link',
]

// Etapa i da demo: tarefas antes de i feitas, a i em andamento.
async function demoStep($: EngineInterface, i: number) {
  const tasks: Task[] = DEMO.map((title, k) => ({
    id: `demo-${k}`,
    title,
    status: k < i ? 'completed' : k === i ? 'in_progress' : 'pending',
  }))
  await commit($, 'Demo: dashboard de clima para Nova York', tasks)
}

export const register: Register = on => {
  let goal = ''

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'progresso-demo',
      description: 'Simula 4 tarefas avançando pra mostrar a faixa de progresso',
    })
    return next(e)
  })

  on('command.run', { command: 'progresso-demo' }, async $ => {
    await update($, run, () => null)
    for (let i = 0; i <= DEMO.length; i++) {
      $.clock.after(i * 2500, () => void demoStep($, i).catch(() => {}))
    }
    return { text: 'Demo iniciada: veja a faixa acima do prompt (10s).' }
  })

  on('prompt.submit', ($, e, next) => {
    goal = (e.text.split('\n')[0] ?? '').slice(0, 80)
    return next(e)
  })

  // Lista de tarefas no formato TodoWrite: vem inteira a cada chamada.
  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && !ran.isError) {
      await commit(
        $,
        goal,
        e.todos.map((t, i) => ({ id: String(i), title: t.content, status: t.status })),
      ).catch(() => {})
    }
    return ran
  })

  // Lista no formato TaskCreate/TaskUpdate: uma tarefa por chamada.
  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && !ran.isError) {
      const id = (ran.result as { task?: { id?: string } }).task?.id ?? String(Date.now())
      const current = await read($, run)
      const base = current === null || isDone(current) ? [] : current.tasks
      await commit($, goal, [...base, { id, title: e.subject, status: 'pending' }]).catch(() => {})
    }
    return ran
  })

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    const current = await read($, run)
    if (ran.deny === undefined && !ran.isError && current !== null) {
      const tasks = current.tasks
        .filter(t => !(t.id === e.taskId && e.status === 'deleted'))
        .map(t =>
          t.id === e.taskId
            ? {
                ...t,
                title: e.subject ?? t.title,
                status: (e.status && e.status !== 'deleted' ? e.status : t.status) as TaskStatus,
              }
            : t,
        )
      await commit($, goal, tasks).catch(() => {})
    }
    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const r = await read($, run)
    if (e.props.hasSurvey || r === null || r.tasks.length === 0 || (await read($, isHidden))) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const pct = percent(r.tasks)
    const done = r.tasks.filter(t => t.status === 'completed').length
    const finished = r.finishedMs !== null
    const elapsed = finished ? (r.finishedMs as number) : (await $.clock.now()) - r.startedAt

    const label: Record<TaskStatus, string> = {
      completed: 'Feito',
      in_progress: 'Em andamento',
      pending: 'Pendente',
    }
    const icon: Record<TaskStatus, string> = { completed: '✓', in_progress: '◐', pending: '○' }
    const fill: Record<TaskStatus, number> = { completed: 1, in_progress: 0.5, pending: 0 }

    return (
      <Box flexDirection="column" borderStyle="round" borderColor={finished ? GREEN : 'gray'} paddingX={1}>
        <Box justifyContent="space-between">
          <Box gap={1}>
            <Text backgroundColor={finished ? GREEN : undefined} color={finished ? 'black' : 'yellow'} bold>
              {finished ? ' ✓ Tudo pronto ' : ' ◐ Trabalhando '}
            </Text>
            <Text bold wrap="truncate">{r.goal}</Text>
          </Box>
          <Text dimColor>{finished ? `levou ${duration(elapsed)}` : duration(elapsed)}</Text>
        </Box>
        <Box gap={1}>
          <Text dimColor>{`${done} de ${r.tasks.length} tarefas`}</Text>
          <Text color={GREEN}>{bar(pct / 100, BAR * 2)}</Text>
          <Text bold>{`${pct}%`}</Text>
        </Box>
        {r.tasks.map(t => (
          <Box key={t.id} gap={1}>
            <Text color={t.status === 'completed' ? GREEN : t.status === 'in_progress' ? 'yellow' : 'gray'}>
              {icon[t.status]}
            </Text>
            <Box width={40}>
              <Text wrap="truncate" dimColor={t.status === 'pending'}>{t.title}</Text>
            </Box>
            <Text color={t.status === 'completed' ? GREEN : 'yellow'}>{bar(fill[t.status], BAR)}</Text>
            <Text dimColor={t.status !== 'completed'}>{label[t.status]}</Text>
          </Box>
        ))}
        {finished ? (
          <Box>
            <Button key="hide" label="Ocultar" onPress={() => update($, isHidden, () => true)} />
          </Box>
        ) : null}
      </Box>
    )
  })
}
