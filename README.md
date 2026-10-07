# claude-mods

Mods para o [Claude Code](https://claude.com/claude-code).

## Instalar

No Claude Code (terminal ou app):

```
/plugin marketplace add rodrigofaerman/claude-mods
/plugin install progresso-tarefas@claude-mods
```

Ou pelo terminal:

```bash
claude plugin marketplace add rodrigofaerman/claude-mods
claude plugin install progresso-tarefas@claude-mods
```

Depois rode `/reload-plugins` ou abra uma sessão nova.

## Mods

### progresso-tarefas

Em vez de acompanhar cada comando, veja só as tarefas principais com progresso:

```
╭──────────────────────────────────────────────────────────────╮
│  ✓ Tudo pronto   Build a weather dashboard…     levou 1m 47s │
│ 4 de 4 tarefas  ████████████████████████████████████████ 100%│
│ ✓ Pick the page style and layout   ████████████████████ Feito│
│ ✓ Check how the page gets weather  ████████████████████ Feito│
│ ◐ Build the weather dashboard      ██████████░░░░░ Em andamento│
│ ○ Publish it and share the link    ░░░░░░░░░░░░░░░░░░ Pendente│
╰──────────────────────────────────────────────────────────────╯
```

- Faixa acima do prompt com cada tarefa, barra geral com % e tempo
- % na barra de status
- Aviso quando tudo termina
- `/progresso-demo` simula uma lista pra você ver a faixa

A faixa aparece quando o Claude monta uma lista de tarefas (pedidos com várias etapas).

## Atualizar

```bash
claude plugin marketplace update claude-mods
claude plugin update progresso-tarefas@claude-mods
```

## Licença

MIT
