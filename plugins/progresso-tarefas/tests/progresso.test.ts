import { expect, mock, test } from 'claude-code/testing'

const todos = (statuses: ('pending' | 'in_progress' | 'completed')[]) =>
  statuses.map((status, i) => ({ content: `Tarefa ${i + 1}`, activeForm: `Fazendo ${i + 1}`, status }))

test('mostra % na status line e avisa quando tudo termina', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const status: (string | undefined)[] = []
  const toasts: string[] = []

  on('ui.status', ($, e) => { status.push(e.text); return { value: undefined } })
  on('ui.toast', ($, e) => { toasts.push(e.text); return { value: undefined } })
  on('tool.call', { tool: 'TodoWrite' }, ($, e) => ({ result: { oldTodos: [], newTodos: e.todos } }))

  await $.tool.call({ tool: 'TodoWrite', todos: todos(['completed', 'in_progress', 'pending', 'pending']) })
  expect(status.at(-1)).toContain('25%')
  expect(status.at(-1)).toContain('1/4')
  expect(toasts).toEqual([])

  await clock.advance(107_000)
  await $.tool.call({ tool: 'TodoWrite', todos: todos(['completed', 'completed', 'completed', 'completed']) })
  expect(status.at(-1)).toContain('100%')
  expect(toasts).toEqual(['✓ Tudo pronto: 4 tarefas em 1m 47s'])
})
