import { MODULE_ID, computeEncounterXP } from "./xp-calculator.js";
import { AwardXPApp } from "./award-app.js";

/* -------------------------------------------- */
/*  Settings                                    */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "autoPromptOnCombatEnd", {
    name: "SCORPXP.Settings.AutoPrompt",
    hint: "SCORPXP.Settings.AutoPromptHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Public API for macros and other modules.
  game.modules.get(MODULE_ID).api = {
    openAwardDialog: (config) => AwardXPApp.open(config),
    computeEncounterXP
  };
});

/* -------------------------------------------- */
/*  Combat end -> confirmation dialog           */
/* -------------------------------------------- */

Hooks.on("preDeleteCombat", (combat) => {
  if (!game.user.isGM) return;
  if (!game.settings.get(MODULE_ID, "autoPromptOnCombatEnd")) return;

  const data = computeEncounterXP(combat);
  if (!data) return; // nothing to award (no PCs or no opposition)

  const { pcs, result } = data;
  const rating = result.rating;
  const prettyRating = rating.charAt(0).toUpperCase() + rating.slice(1);

  AwardXPApp.open({
    xp: result.xpPerPlayer,
    reason: game.i18n.format("SCORPXP.Encounter.Reason", { rating: prettyRating }),
    rating: prettyRating,
    isEncounter: true,
    recipients: pcs
  });
});

/* -------------------------------------------- */
/*  Manual entry point in the Combat Tracker    */
/* -------------------------------------------- */

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;

  const tool = {
    name: "scorpious-award-xp",
    title: "SCORPXP.Control.AwardXP",
    icon: "fa-solid fa-trophy",
    button: true,
    visible: true,
    onChange: () => AwardXPApp.open(),
    onClick: () => AwardXPApp.open()
  };

  // v13 scene controls are an object keyed by control name; older shapes use
  // an array. Support both, and attach to the token layer's toolset.
  const tokenControl = Array.isArray(controls)
    ? controls.find((c) => c.name === "token" || c.name === "tokens")
    : controls.tokens ?? controls.token;
  if (!tokenControl) return;

  if (Array.isArray(tokenControl.tools)) tokenControl.tools.push(tool);
  else if (tokenControl.tools) tokenControl.tools[tool.name] = tool;
});
