#!/bin/bash
# Lance Claude Code dans le projet SideQuest en skip permissions.
# Double-clique ce fichier depuis le Finder.

# Se place dans le dossier du script, peu importe d'où il est lancé
cd "$(dirname "$0")" || exit 1

echo "🗡️  SideQuest — démarrage de Claude Code (skip permissions)"
echo "📂  $(pwd)"
echo ""

# Si claude n'est pas dans le PATH du Finder, on l'ajoute
export PATH="$HOME/.local/bin:$PATH"

exec claude --dangerously-skip-permissions
