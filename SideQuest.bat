@echo off
REM Lance Claude Code dans le projet SideQuest en skip permissions (Windows).
REM Double-clique ce fichier, ou lance-le depuis un terminal.

cd /d "%~dp0"

echo SideQuest - demarrage de Claude Code (skip permissions)
echo Dossier: %cd%
echo.

claude --dangerously-skip-permissions
