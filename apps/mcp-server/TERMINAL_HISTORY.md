# Terminal History Search Guide

This guide helps you search terminal history, especially when using tmux with multiple windows.

## 1. Check tmux pane scrollback (most reliable for recent activity)

```bash
# List all panes
tmux list-panes -a -F "#{session_name}:#{window_index}.#{pane_index} #{pane_current_command}"

# Capture scrollback from specific pane (e.g., 0:1.2)
tmux capture-pane -p -S -3000 -t 0:1.2 | less

# Search all panes for a pattern
for pane in $(tmux list-panes -a -F '#S:#I.#P'); do
  echo "=== Pane $pane ==="
  tmux capture-pane -p -S -3000 -t $pane | grep -i "your_search_term"
done
```

## 2. Shell history file

```bash
# For zsh
cat ~/.zsh_history | less

# Search with timestamps (if enabled)
cat ~/.zsh_history | grep -B1 -A1 "search_term"

# For bash
cat ~/.bash_history | less
```

## 3. Enable better history tracking (for future)

Add to `~/.zshrc`:
```bash
setopt EXTENDED_HISTORY       # Write timestamp
setopt INC_APPEND_HISTORY     # Write after each command
setopt SHARE_HISTORY          # Share between sessions
export HISTSIZE=100000
export SAVEHIST=100000
```

For bash, add to `~/.bashrc`:
```bash
export HISTSIZE=100000
export HISTFILESIZE=100000
export HISTTIMEFORMAT="%F %T "
shopt -s histappend
```

## 4. Check system logs (if you ran system commands)

```bash
# macOS
log show --predicate 'eventMessage contains "your_command"' --last 5h

# Linux
journalctl --since "5 hours ago" | grep "your_command"
```

## Tips

- The tmux scrollback buffer is your best bet for recovering what you did in closed windows
- Use `-S -` with `tmux capture-pane` to capture the entire scrollback buffer
- Consider using `tmux-logging` plugin to automatically save all pane output to files
- For persistent history across tmux sessions, ensure your shell history settings are properly configured