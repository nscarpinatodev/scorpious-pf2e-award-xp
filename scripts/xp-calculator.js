/**
 * XP calculation helpers.
 *
 * All encounter math is delegated to the PF2e system's own routine,
 * `game.pf2e.gm.calculateXP(partyLevel, partySize, npcLevels, hazards, { pwol })`,
 * so we always match the system's budgets and honour the
 * Proficiency-Without-Level variant.
 */

export const MODULE_ID = "scorpious-pf2e-award-xp";

/**
 * Party PCs participating in a given encounter. Eidolons and minions are
 * excluded so they don't inflate the party size.
 * @param {Combat} combat
 * @returns {Actor[]}
 */
export function getEncounterPCs(combat) {
  return (combat?.combatants ?? [])
    .map((c) => c.actor)
    .filter(
      (a) =>
        a?.type === "character" &&
        a.alliance === "party" &&
        !a.traits?.has("eidolon") &&
        !a.traits?.has("minion")
    );
}

/**
 * Opposition actors (NPCs + hazards) in an encounter.
 * @param {Combat} combat
 * @returns {Actor[]}
 */
export function getOpposition(combat) {
  return (combat?.combatants ?? [])
    .map((c) => c.actor)
    .filter((a) => a && (a.alliance === "opposition" || a.type === "hazard"));
}

/**
 * Compute the XP earned from an encounter.
 * @param {Combat} combat
 * @returns {{pcs: Actor[], partyLevel: number, result: object}|null}
 *   `result` is the object returned by the system's calculateXP, or null when
 *   there is nothing to award (no PCs or no opposition).
 */
export function computeEncounterXP(combat) {
  const pcs = getEncounterPCs(combat);
  const opposition = getOpposition(combat);
  if (!pcs.length || !opposition.length) return null;

  const pcLevels = pcs.map((a) => a.level ?? a.system.details.level.value);
  const partyLevel = Math.round(pcLevels.reduce((a, b) => a + b, 0) / pcLevels.length);

  // NPC/creature opposition contributes levels; hazards are passed as actors
  // because the system reads `hazard.isComplex` and `hazard.level`.
  const npcLevels = opposition
    .filter((a) => a.type === "npc" || a.type === "character")
    .map((a) => a.level ?? a.system.details.level.value);
  const hazards = opposition.filter((a) => a.type === "hazard");

  const pwol = game.pf2e?.settings?.variants?.pwol?.enabled ?? false;
  const result = game.pf2e.gm.calculateXP(partyLevel, pcs.length, npcLevels, hazards, { pwol });

  return { pcs, partyLevel, result };
}

/**
 * Add XP to a set of actors. The PF2e system tracks XP as a running total in
 * `system.details.xp.value` and handles the level-up prompt itself, so we only
 * need to increment that value.
 * @param {Actor[]} destinations
 * @param {number} amount
 * @returns {Promise<Actor[]>} the actors that were successfully updated
 */
export async function awardXP(destinations, amount) {
  const xp = Number(amount);
  if (!Number.isFinite(xp) || xp === 0 || !destinations?.length) return [];

  const updated = [];
  for (const actor of destinations) {
    try {
      const current = Number(actor.system.details.xp.value) || 0;
      await actor.update({ "system.details.xp.value": current + Math.trunc(xp) });
      updated.push(actor);
    } catch (err) {
      ui.notifications.warn(`${actor.name}: ${err.message}`);
      console.error(`${MODULE_ID} | Failed to award XP to ${actor.name}`, err);
    }
  }
  return updated;
}
