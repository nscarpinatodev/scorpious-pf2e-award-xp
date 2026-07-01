# Scorpious187's PF2e Award XP

A Foundry VTT module for **Pathfinder 2e** that automatically calculates and awards XP for combat encounters, plus a UI for granting XP for social encounters, accomplishments, or any custom reason.

## Features

- **Automatic combat XP** — when an encounter ends, the module gathers the participating party PCs and opposition, calls the PF2e system's own XP routine (`game.pf2e.gm.calculateXP`, honoring the Proficiency-Without-Level variant), and opens a confirmation dialog pre-filled with the difficulty rating and XP per character. Nothing is granted until you confirm.
- **Manual / social / custom awards** — a trophy button in the token scene controls opens the award dialog for the active party. Choose a Combat Encounter value, a Minor / Moderate / Major accomplishment preset, or a custom amount, with a free-text reason.
- **Per-character selection** — include or exclude individual characters from any award.
- **Chat summary** — each award posts a GM chat card noting the amount, reason, and recipients.
- **Correct hazard scoring** — hazard actors are passed to the system's calculator so complex hazards are scored correctly.

## Requirements

- Foundry VTT v13+
- Pathfinder 2e system

## Usage

- **End a combat** to be prompted with the calculated encounter XP.
- **Click the trophy** in the token controls (GM only) to open the award dialog at any time.
- **Macro / API:** `game.modules.get("scorpious-pf2e-award-xp").api.openAwardDialog()`

## Settings

- **Prompt to award XP when combat ends** — toggle the automatic end-of-combat dialog.

## License

MIT
