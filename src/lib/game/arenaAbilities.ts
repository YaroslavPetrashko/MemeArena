import type {
  ArenaBattleState,
  ArenaUnit,
  Lane,
  ArenaStatusType,
} from "@/types/arena";

/**
 * Per-card arena behavior. The engine owns the simulation; abilities plug into
 * it through a small context of helpers so each card can express a unique
 * identity (special casts, on-attack riders, on-death effects, movement quirks)
 * without the engine knowing card specifics.
 */
export interface AbilityContext {
  state: ArenaBattleState;
  /** ms elapsed this tick. */
  dt: number;
  /** Deal damage to a unit (respects shield); returns actual hp removed. */
  damageUnit: (target: ArenaUnit, amount: number, opts?: { crit?: boolean }) => number;
  /** Damage the boss core. */
  damageBoss: (amount: number, opts?: { crit?: boolean }) => void;
  /** Heal/shield a unit. */
  shieldUnit: (target: ArenaUnit, amount: number) => void;
  healUnit: (target: ArenaUnit, amount: number) => void;
  /** Apply a status to a unit. */
  applyStatus: (target: ArenaUnit, type: ArenaStatusType, durationMs: number, amount?: number) => void;
  /** Allies/enemies in the same lane (excludes self for allies). */
  alliesInLane: (unit: ArenaUnit, range?: number) => ArenaUnit[];
  enemiesInLane: (unit: ArenaUnit, range?: number) => ArenaUnit[];
  /** Nearest enemy ahead within `range` (null if none). */
  nearestEnemy: (unit: ArenaUnit, range?: number) => ArenaUnit | null;
  lowestHpEnemy: (unit: ArenaUnit, range?: number) => ArenaUnit | null;
  /** Spawn a projectile from a unit toward a target. */
  fireProjectile: (
    unit: ArenaUnit,
    target: ArenaUnit | null,
    opts: { damage: number; speed: number; effect: "pop" | "bolt" | "note" | "dagger" | "acorn" | "claw" },
  ) => void;
  /** Spawn a floor decal. */
  decal: (lane: Lane, position: number, theme: string) => void;
  /** Spawn a floating number/marker. */
  float: (unit: ArenaUnit, kind: "damage" | "crit" | "heal" | "shield" | "energy" | "stun", value?: number, label?: string) => void;
  /** Grant the player energy. */
  grantEnergy: (amount: number) => void;
  /** Add hype. */
  addHype: (amount: number) => void;
  /** Push a brief board flash. */
  flash: (palette: string) => void;
  /** Add screen shake 0–1. */
  shake: (amount: number) => void;
  /** Mark a unit visual event. */
  visual: (unit: ArenaUnit, ev: ArenaUnit["visualEvents"][number]) => void;
  /** Log an event. */
  log: (text: string, kind: "player" | "enemy" | "combo" | "system" | "boss") => void;
}

export interface ArenaAbility {
  /** Special-ability cooldown in ms (also reduced at higher levels). */
  cooldownMs: number;
  /** Called once when the unit spawns. */
  onSpawn?: (unit: ArenaUnit, ctx: AbilityContext) => void;
  /** Called every tick. Return true if the special fired (resets cooldown). */
  onSpecial?: (unit: ArenaUnit, ctx: AbilityContext) => boolean;
  /** Rider on each basic attack against `target`. */
  onAttack?: (unit: ArenaUnit, target: ArenaUnit | "boss", ctx: AbilityContext) => void;
  /** Called when the unit dies. */
  onDeath?: (unit: ArenaUnit, ctx: AbilityContext) => void;
  /** Damage multiplier for a given basic attack (e.g. execute bonus). */
  damageMod?: (unit: ArenaUnit, target: ArenaUnit | "boss", ctx: AbilityContext) => number;
  /** Returns true to force a crit on this attack. */
  forceCrit?: (unit: ArenaUnit, target: ArenaUnit | "boss", ctx: AbilityContext) => boolean;
}

/** Cooldown scales down a touch per level. */
function cd(base: number, level: number): number {
  return base * (1 - Math.min(0.3, (level - 1) * 0.075));
}

function specialReady(unit: ArenaUnit, key: string): boolean {
  return (unit.cooldowns[key] ?? 0) <= 0;
}
function setCd(unit: ArenaUnit, key: string, ms: number) {
  unit.cooldowns[key] = ms;
}

/* ------------------------------------------------------------------ */
/* Per-card abilities                                                  */
/* ------------------------------------------------------------------ */

export const ARENA_ABILITIES: Record<string, ArenaAbility> = {
  /* Pepe — backline shield caster */
  pepe_the_frog: {
    cooldownMs: 3200,
    onSpecial(unit, ctx) {
      if (!specialReady(unit, "shield_wave")) return false;
      const allies = ctx.alliesInLane(unit, 100);
      if (allies.length === 0 && unit.level < 5) return false;
      const base = 30 + unit.level * 6;
      for (const a of [unit, ...allies]) {
        const amt = a.hp / a.maxHp < 0.4 && unit.level >= 3 ? base * 1.6 : base;
        ctx.shieldUnit(a, amt);
        ctx.visual(a, "shielded");
      }
      if (unit.level >= 5) {
        // Rare Pepe Blessing — slow enemies in lane.
        for (const e of ctx.enemiesInLane(unit, 100)) ctx.applyStatus(e, "slow", 2500, 0.4);
        ctx.flash("emerald");
      }
      ctx.decal(unit.lane, unit.position, "energy");
      ctx.float(unit, "shield");
      setCd(unit, "shield_wave", cd(this.cooldownMs, unit.level));
      ctx.visual(unit, "ability");
      return true;
    },
  },

  /* Dogwifhat — fast fighter, every 3rd hit boosted */
  dogwifhat: {
    cooldownMs: 6000,
    onAttack(unit, _t, ctx) {
      unit.abilityState.hits = (unit.abilityState.hits ?? 0) + 1;
      if (unit.abilityState.hits % 3 === 0) {
        ctx.visual(unit, "ability");
        ctx.decal(unit.lane, unit.position + 4, "gold");
      }
      // Lv3 passive — attack speed up near allies (handled via haste status).
      if (unit.level >= 3 && ctx.alliesInLane(unit, 20).length > 0 && !unit.statuses.some((s) => s.type === "haste")) {
        ctx.applyStatus(unit, "haste", 1500, 0.25);
      }
    },
    damageMod(unit) {
      return unit.abilityState.hits && unit.abilityState.hits % 3 === 0 ? 1.8 : 1;
    },
    onSpecial(unit, ctx) {
      if (unit.level < 5 || !specialReady(unit, "wif_charge")) return false;
      const enemies = ctx.enemiesInLane(unit, 22);
      if (enemies.length === 0) return false;
      unit.position = Math.min(98, unit.position + 14);
      ctx.visual(unit, "dash");
      for (const e of enemies) ctx.damageUnit(e, unit.damage * 1.5);
      ctx.shake(0.3);
      setCd(unit, "wif_charge", cd(8000, unit.level));
      return true;
    },
  },

  /* Mog Cat — assassin, crits the weak */
  mog_cat: {
    cooldownMs: 5000,
    forceCrit(unit, target, ctx) {
      void ctx;
      if (target === "boss") return false;
      const frac = target.hp / target.maxHp;
      return frac < 0.5;
    },
    onSpecial(unit, ctx) {
      if (unit.level < 5 || !specialReady(unit, "mogged")) return false;
      const weak = ctx.lowestHpEnemy(unit, 30);
      if (!weak) return false;
      unit.position = Math.max(0, Math.min(98, weak.position - 3));
      ctx.visual(unit, "dash");
      ctx.damageUnit(weak, unit.damage * 2.5, { crit: true });
      ctx.decal(weak.lane, weak.position, "ability");
      setCd(unit, "mogged", cd(7000, unit.level));
      return true;
    },
  },

  /* Popcat — ranged spam, burst of pops */
  popcat: {
    cooldownMs: 2600,
    onSpecial(unit, ctx) {
      if (!specialReady(unit, "pop_burst")) return false;
      const target = ctx.nearestEnemy(unit, unit.attackRange + 6);
      if (!target) return false;
      const shots = unit.level >= 5 ? 5 : 3;
      for (let i = 0; i < shots; i++) {
        ctx.fireProjectile(unit, target, { damage: unit.damage * 0.7, speed: 70, effect: "pop" });
      }
      ctx.visual(unit, "ability");
      setCd(unit, "pop_burst", cd(this.cooldownMs, unit.level));
      return true;
    },
  },

  /* Peanut — runner that generates energy at the boss line */
  peanut_the_squirrel: {
    cooldownMs: 4000,
    onSpawn(unit, ctx) {
      void ctx;
      unit.abilityState.reached = 0;
    },
    onSpecial(unit, ctx) {
      // Nut Dash — periodic forward dash to race the lane.
      if (!specialReady(unit, "nut_dash")) return false;
      unit.position = Math.min(100, unit.position + 10);
      ctx.visual(unit, "dash");
      ctx.decal(unit.lane, unit.position, "energy");
      setCd(unit, "nut_dash", cd(2200, unit.level));
      // Reaching boss side → bonus energy (Lv3 passive amplifies; Lv5 drops pickups).
      if (unit.position >= 95 && !unit.abilityState.reached) {
        unit.abilityState.reached = 1;
        const e = unit.level >= 5 ? 3 : unit.level >= 3 ? 2 : 1;
        ctx.grantEnergy(e);
        ctx.float(unit, "energy", e);
        ctx.state.comboFlags.peanut_reached = ctx.state.battleTime;
      }
      return true;
    },
  },

  /* Moo Deng — heavy tank with knockback stomp */
  moo_deng_hippo: {
    cooldownMs: 5200,
    onSpecial(unit, ctx) {
      if (!specialReady(unit, "stomp")) return false;
      const enemies = ctx.enemiesInLane(unit, 18);
      if (enemies.length === 0) return false;
      const radius = unit.level >= 5 ? 26 : 18;
      const targets = ctx.enemiesInLane(unit, radius);
      for (const e of targets) {
        ctx.damageUnit(e, unit.damage * (unit.level >= 5 ? 1.6 : 1.1));
        ctx.applyStatus(e, "stun", 600, 0);
        e.position = Math.max(unit.position + 6, e.position - 6); // knockback
      }
      // Lv3 — shield when surrounded.
      if (unit.level >= 3 && targets.length >= 2) ctx.shieldUnit(unit, 40);
      ctx.decal(unit.lane, unit.position, "stomp");
      ctx.shake(unit.level >= 5 ? 0.5 : 0.3);
      ctx.visual(unit, "ability");
      setCd(unit, "stomp", cd(this.cooldownMs, unit.level));
      return true;
    },
  },

  /* Tung Tung — control tank, drum stun */
  tung_tung_tung_sahur: {
    cooldownMs: 4200,
    onSpecial(unit, ctx) {
      if (!specialReady(unit, "drum_stun")) return false;
      const range = unit.level >= 5 ? 30 : 16;
      const enemies = ctx.enemiesInLane(unit, range);
      if (enemies.length === 0) return false;
      for (const e of enemies) {
        ctx.damageUnit(e, unit.damage * 0.6);
        ctx.applyStatus(e, "stun", unit.level >= 5 ? 1600 : 1100, 0);
      }
      // Track count for the 3 AM Sahur combo + boss interrupt at Lv3.
      ctx.state.comboFlags.tung_drum_stun = (ctx.state.comboFlags.tung_drum_stun ?? 0) + 1;
      if (unit.level >= 3 && unit.position > 70) ctx.state.boss.windup = Math.min(ctx.state.boss.windup, 300);
      ctx.decal(unit.lane, unit.position, "stun");
      ctx.visual(unit, "ability");
      setCd(unit, "drum_stun", cd(this.cooldownMs, unit.level));
      return true;
    },
  },

  /* GigaChad — slow heavy win-condition */
  gigachad: {
    cooldownMs: 6500,
    damageMod(unit, target, ctx) {
      void ctx;
      // Lv3 — bonus to boss core below 30%.
      if (unit.level >= 3 && target === "boss") {
        const bs = unit; void bs;
        if (ctx.state.boss.coreHp / ctx.state.boss.coreMaxHp < 0.3) return 1.5;
      }
      return 1;
    },
    onSpecial(unit, ctx) {
      if (unit.level < 5 || !specialReady(unit, "absolute_unit")) return false;
      ctx.applyStatus(unit, "unstoppable", 3000, 0);
      ctx.applyStatus(unit, "haste", 3000, 0.4);
      ctx.flash("gold");
      ctx.visual(unit, "ability");
      setCd(unit, "absolute_unit", cd(11000, unit.level));
      return true;
    },
  },

  /* Ballerina — dash tempo, dodges */
  ballerina_cappuccino: {
    cooldownMs: 4200,
    onSpawn(unit, ctx) {
      void ctx;
      if (unit.level >= 3) unit.statuses.push({ type: "dodge", remaining: 99999, amount: 1 });
    },
    onSpecial(unit, ctx) {
      if (!specialReady(unit, "pirouette")) return false;
      const target = ctx.nearestEnemy(unit, 24);
      if (!target) return false;
      const dashes = unit.level >= 5 ? 3 : 1;
      for (let i = 0; i < dashes; i++) {
        const t = ctx.nearestEnemy(unit, 26);
        if (!t) break;
        unit.position = Math.max(0, Math.min(98, t.position - 3));
        ctx.damageUnit(t, unit.damage * 1.2);
      }
      ctx.applyStatus(unit, "dodge", 1200, 1);
      ctx.visual(unit, "dash");
      ctx.decal(unit.lane, unit.position, "ability");
      setCd(unit, "pirouette", cd(this.cooldownMs, unit.level));
      return true;
    },
  },

  /* Tralalero — chaos caster, random positive roulette */
  tralalero_tralala: {
    cooldownMs: 3800,
    onSpecial(unit, ctx) {
      if (!specialReady(unit, "roulette")) return false;
      const enemies = ctx.enemiesInLane(unit, 60);
      const allies = ctx.alliesInLane(unit, 100);
      // Deterministic-ish roll from battleTime + unit id length.
      const roll = (Math.floor(ctx.state.battleTime / 137) + unit.cardId.length) % 5;
      const rolls = unit.level >= 5 ? [0, 1] : unit.level >= 3 ? [roll === 4 ? 0 : roll] : [roll];
      for (const r of rolls) {
        switch (r) {
          case 0: // damage
            for (const e of enemies) ctx.damageUnit(e, unit.damage * 1.3);
            break;
          case 1: // slow
            for (const e of enemies) ctx.applyStatus(e, "slow", 2500, 0.4);
            break;
          case 2: // confuse
            for (const e of enemies) ctx.applyStatus(e, "confuse", 2000, 0);
            break;
          case 3: // heal allies
            for (const a of [unit, ...allies]) ctx.healUnit(a, 30);
            break;
          case 4: // misfire (only at low level) — small self slow
            ctx.applyStatus(unit, "slow", 1000, 0.3);
            break;
        }
      }
      ctx.flash("purple");
      ctx.decal(unit.lane, unit.position, "chaos");
      ctx.visual(unit, "ability");
      setCd(unit, "roulette", cd(this.cooldownMs, unit.level));
      return true;
    },
  },

  /* Wojak — decoy, taunt + useful death */
  wojak: {
    cooldownMs: 3000,
    onSpawn(unit, ctx) {
      // It's Over — taunt enemies in lane immediately.
      for (const e of ctx.enemiesInLane(unit, 100)) ctx.applyStatus(e, "taunt", 2500, 0);
      ctx.decal(unit.lane, unit.position, "ability");
    },
    onDeath(unit, ctx) {
      const allies = ctx.alliesInLane(unit, 100);
      for (const a of allies) ctx.shieldUnit(a, unit.level >= 5 ? 50 : 30);
      if (unit.level >= 5) {
        ctx.grantEnergy(2);
        ctx.flash("emerald");
        for (const a of allies) ctx.applyStatus(a, "haste", 3000, 0.3);
      }
      ctx.state.comboFlags.wojak_died = ctx.state.battleTime;
      ctx.decal(unit.lane, unit.position, "energy");
    },
  },

  /* Sigma Cat — shield aura support */
  sigma_cat: {
    cooldownMs: 3400,
    onSpecial(unit, ctx) {
      if (!specialReady(unit, "sigma_aura")) return false;
      const allies = ctx.alliesInLane(unit, unit.level >= 5 ? 100 : 22);
      const amt = 24 + unit.level * 5;
      for (const a of [unit, ...allies]) {
        ctx.shieldUnit(a, amt);
        if (unit.level >= 3) ctx.applyStatus(a, "dodge", 1, 0); // control-resist marker (noop dodge)
      }
      ctx.decal(unit.lane, unit.position, "energy");
      ctx.float(unit, "shield");
      ctx.visual(unit, "ability");
      setCd(unit, "sigma_aura", cd(this.cooldownMs, unit.level));
      return true;
    },
  },

  /* Cappuccino Assassin — execute dasher */
  cappuccino_assassin: {
    cooldownMs: 4400,
    forceCrit(unit, target) {
      if (target === "boss") return false;
      return target.hp / target.maxHp < 0.4;
    },
    damageMod(unit, target) {
      if (target === "boss") return 1;
      return target.hp / target.maxHp < 0.35 ? 2 : 1;
    },
    onSpecial(unit, ctx) {
      if (!specialReady(unit, "execute")) return false;
      const weak = ctx.lowestHpEnemy(unit, 34);
      if (!weak || weak.hp / weak.maxHp > 0.55) return false;
      const chain = unit.level >= 5 ? 3 : 1;
      let killed = false;
      for (let i = 0; i < chain; i++) {
        const t = ctx.lowestHpEnemy(unit, 36);
        if (!t || t.hp / t.maxHp > 0.55) break;
        unit.position = Math.max(0, Math.min(98, t.position - 2));
        const removed = ctx.damageUnit(t, unit.damage * 2.2, { crit: true });
        if (removed >= t.maxHp || t.hp <= 0) killed = true;
      }
      ctx.visual(unit, "dash");
      // Lv3 — kill partially resets cooldown.
      setCd(unit, "execute", cd(unit.level >= 3 && killed ? 2200 : this.cooldownMs, unit.level));
      return true;
    },
  },
};

export function getAbility(cardId: string): ArenaAbility | undefined {
  return ARENA_ABILITIES[cardId];
}
