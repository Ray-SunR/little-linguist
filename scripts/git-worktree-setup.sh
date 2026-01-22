#!/bin/bash
set -e

# Usage: ./git-worktree-setup.sh [target_dir] [worktree_name]

TARGET_ARG="${1:-.}"
if [ ! -d "$TARGET_ARG" ]; then
  echo "Error: Directory '$TARGET_ARG' does not exist."
  exit 1
fi
TARGET_DIR=$(cd "$TARGET_ARG" && pwd)

if ! git -C "$TARGET_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: '$TARGET_DIR' is not a git directory."
  exit 1
fi

WT_NAME="$2"
if [ -z "$WT_NAME" ]; then
  read -p "Enter worktree name: " WT_NAME
fi

if [ -z "$WT_NAME" ]; then
  echo "Error: Worktree name is required."
  exit 1
fi

REPO_ROOT=$(git -C "$TARGET_DIR" rev-parse --show-toplevel)
WORKTREES_DIR="$REPO_ROOT/.worktrees"

if [ ! -d "$WORKTREES_DIR" ]; then
  mkdir -p "$WORKTREES_DIR"
fi

NEW_WT_PATH="$WORKTREES_DIR/$WT_NAME"

if [ -d "$NEW_WT_PATH" ]; then
  echo "Error: Path '$NEW_WT_PATH' already exists."
  exit 1
fi

echo "Creating worktree '$WT_NAME' at '$NEW_WT_PATH'..."
if ! git -C "$TARGET_DIR" worktree add -b "$WT_NAME" "$NEW_WT_PATH" 2>/dev/null; then
  echo "Branch '$WT_NAME' might already exist. Trying to checkout..."
  git -C "$TARGET_DIR" worktree add "$NEW_WT_PATH" "$WT_NAME"
fi

echo "Copying .env files..."
cp "$REPO_ROOT"/.env* "$NEW_WT_PATH/" 2>/dev/null || echo "No .env files found to copy."

SESSION_NAME="$WT_NAME"

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Tmux session '$SESSION_NAME' already exists."
else
  echo "Setting up tmux session '$SESSION_NAME'..."
  
  tmux new-session -d -s "$SESSION_NAME" -n "dev" -c "$NEW_WT_PATH"
  tmux split-window -h -t "$SESSION_NAME:dev" -c "$NEW_WT_PATH"
  
  tmux send-keys -t "$SESSION_NAME:dev.0" "npm run dev" C-m
  tmux send-keys -t "$SESSION_NAME:dev.1" "npm run test:watch" C-m
  
  tmux new-window -t "$SESSION_NAME" -n "agent" -c "$NEW_WT_PATH"
  tmux send-keys -t "$SESSION_NAME:agent" "opencode" C-m
  
  tmux select-window -t "$SESSION_NAME:dev"
fi

echo "---------------------------------------------------"
echo "Worktree setup successful!"
echo "Location: $NEW_WT_PATH"
echo "Tmux Session: $SESSION_NAME"
echo ""
echo "Attach using: tmux attach -t $SESSION_NAME"
echo "---------------------------------------------------"
