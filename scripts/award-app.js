import { MODULE_ID, awardXP } from "./xp-calculator.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;

/**
 * Preset accomplishment awards (Gamemastery Guide values). The "encounter"
 * preset uses whatever XP value the dialog was opened with.
 */
const AWARD_PRESETS = {
  minor: { xp: 10, label: "SCORPXP.Preset.Minor" },
  moderate: { xp: 30, label: "SCORPXP.Preset.Moderate" },
  major: { xp: 40, label: "SCORPXP.Preset.Major" }
};

/**
 * Dialog for reviewing and granting an XP award to the party.
 */
export class AwardXPApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @param {object} [config]
   * @param {number} [config.xp]          Suggested XP amount.
   * @param {string} [config.reason]      Reason/description for the award.
   * @param {string} [config.rating]      Encounter difficulty rating, if any.
   * @param {Actor[]} [config.recipients] Actors eligible to receive XP.
   * @param {boolean} [config.isEncounter] Whether this came from a combat.
   */
  constructor(config = {}, options = {}) {
    super(options);
    this.config = {
      xp: config.xp ?? 0,
      reason: config.reason ?? "",
      rating: config.rating ?? null,
      isEncounter: config.isEncounter ?? false,
      recipients: config.recipients ?? defaultRecipients()
    };
  }

  static DEFAULT_OPTIONS = {
    id: "scorpious-award-xp",
    tag: "form",
    classes: ["scorpious-award-xp"],
    window: {
      title: "SCORPXP.Dialog.Title",
      icon: "fa-solid fa-trophy",
      resizable: true
    },
    position: { width: 460, height: "auto" },
    form: {
      handler: AwardXPApp.#onSubmit,
      closeOnSubmit: true
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/award-dialog.hbs` }
  };

  /** @override */
  async _prepareContext() {
    const presets = Object.entries(AWARD_PRESETS).map(([key, p]) => ({
      key,
      xp: p.xp,
      label: game.i18n.localize(p.label)
    }));
    return {
      xp: this.config.xp,
      reason: this.config.reason,
      rating: this.config.rating,
      isEncounter: this.config.isEncounter,
      encounterXp: this.config.isEncounter ? this.config.xp : 0,
      presets,
      recipients: this.config.recipients.map((a) => ({
        id: a.id,
        name: a.name,
        img: a.img,
        level: a.level ?? a.system.details.level.value,
        xp: a.system.details.xp.value
      }))
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    // Sync the XP field when the award type changes.
    const typeSelect = html.querySelector("[name=awardType]");
    const xpInput = html.querySelector("[name=xp]");
    typeSelect?.addEventListener("change", (ev) => {
      const opt = ev.target.selectedOptions[0];
      const preset = opt?.dataset.xp;
      if (preset !== undefined && preset !== "") {
        xpInput.value = preset;
      }
      // Custom leaves the value editable and untouched.
      xpInput.readOnly = ev.target.value !== "custom";
    });

    // "Select all / none" toggle for recipients.
    html.querySelector("[data-action=toggleAll]")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      const boxes = html.querySelectorAll("input[name=recipient]");
      const anyUnchecked = [...boxes].some((b) => !b.checked);
      boxes.forEach((b) => (b.checked = anyUnchecked));
    });
  }

  /**
   * Handle the form submission: award XP and post a chat summary.
   * @this {AwardXPApp}
   */
  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    const amount = Number(data.xp);
    if (!Number.isFinite(amount) || amount <= 0) {
      ui.notifications.error(game.i18n.localize("SCORPXP.Error.InvalidAmount"));
      throw new Error("Invalid XP amount");
    }

    // Collect checked recipients.
    const selectedIds = Array.isArray(data.recipient)
      ? data.recipient
      : data.recipient
        ? [data.recipient]
        : [];
    const destinations = this.config.recipients.filter((a) => selectedIds.includes(a.id));
    if (!destinations.length) {
      ui.notifications.error(game.i18n.localize("SCORPXP.Error.NoRecipients"));
      throw new Error("No recipients selected");
    }

    const reason = (data.reason || "").trim() || game.i18n.localize("SCORPXP.Dialog.DefaultReason");
    const updated = await awardXP(destinations, amount);
    if (updated.length) await AwardXPApp.postChatSummary(amount, reason, updated);
  }

  /**
   * Post a chat card summarising the award.
   * @param {number} amount
   * @param {string} reason
   * @param {Actor[]} destinations
   */
  static async postChatSummary(amount, reason, destinations) {
    const content = await renderTemplate(`modules/${MODULE_ID}/templates/chat-summary.hbs`, {
      amount,
      reason,
      recipients: destinations.map((a) => ({ name: a.name, img: a.img }))
    });
    await ChatMessage.create({
      content,
      whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
      speaker: { alias: game.i18n.localize("SCORPXP.Dialog.Title") }
    });
  }

  /** Convenience opener used by the public API and controls. */
  static open(config = {}) {
    return new AwardXPApp(config).render(true);
  }
}

/**
 * Default recipients when the dialog is opened outside of combat: the active
 * party's PC members.
 * @returns {Actor[]}
 */
function defaultRecipients() {
  const members = game.actors?.party?.members ?? [];
  return members.filter((a) => a.type === "character" && a.alliance === "party");
}
