# Path to your oh-my-zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Set theme
ZSH_THEME="robbyrussell"

# Load Oh My Zsh
source $ZSH/oh-my-zsh.sh

# git aliases
alias ga='git add'
alias gaa='git add --all'
alias gcm='git commit -m'
alias gco='git checkout'
alias gco-='git checkout -'
alias gcom='git checkout main'
alias gcob='git checkout -b'
alias gb='git branch'
alias gp='git pull'
alias gs='git status'
alias gst='git stash'
alias gstpum='git stash push -m'
alias gsta='git stash apply'
alias gstl='git stash list'
alias gstp='git stash pop'
alias glg='git log --graph --oneline --decorate --all'

# npm aliases
alias nrd='npm run dev'
alias nrt='npm run test'