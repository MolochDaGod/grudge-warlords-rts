import type { UnitType, BuildingType, UnitConfig, BuildingConfig, HeroConfig, AbilityDef, ItemDef, SpriteConfig, UpgradeDef } from './types';

// ── Display constants ──────────────────────────────────────────────────────────
export const TILE_SIZE = 64;
export const UNIT_DISPLAY = 48;
export const WATER_SPEED_MULT = 0.22;
export const WATER_DAMAGE_RATE = 8;
export const DAY_DURATION = 300;   // 5 min day
export const NIGHT_DURATION = 300; // 5 min night
export const CYCLE_LENGTH = DAY_DURATION + NIGHT_DURATION;
export const NIGHT_VISION_MULT = 0.6;  // 40% reduction at night

// ── Upkeep thresholds (WC3) ────────────────────────────────────────────────────
export const UPKEEP_NONE_MAX = 50;
export const UPKEEP_LOW_MAX = 80;
export const UPKEEP_NONE_RATE = 1.0;
export const UPKEEP_LOW_RATE = 0.7;
export const UPKEEP_HIGH_RATE = 0.4;

// ── Sprite CDN (R2 primary, GitHub Pages fallback) ───────────────────────
const CDN = 'https://assets.grudge-studio.com';
const CDN_PAGES = 'https://molochdagod.github.io/ObjectStore';

// ── Unit Configs (WC3 roles mapped from Miniworld data) ────────────────────────
export const UNIT_CONFIGS: Record<string, UnitConfig> = {
  // ── WORKERS ──────────────────────────────────────────────────────────────────
  pawn:     { hp:50,  speed:80,  damage:6,  armor:0, range:40,  attackSpeed:2.0, role:'worker', foodCost:1, harvestSpeed:12, carryCapacity:40, trainCost:{wood:0,  gold:75},  trainTime:5,  trainedAt:'castle', requiredTier:1 },
  orcPawn:  { hp:60,  speed:78,  damage:8,  armor:0, range:42,  attackSpeed:2.0, role:'worker', foodCost:1, harvestSpeed:10, carryCapacity:35, trainCost:{wood:0,  gold:75},  trainTime:5,  trainedAt:'castle', requiredTier:1 },
  farmer:   { hp:30,  speed:75,  damage:4,  armor:0, range:35,  attackSpeed:2.0, role:'worker', foodCost:1, harvestSpeed:10, carryCapacity:30, trainCost:{wood:0,  gold:50},  trainTime:4,  trainedAt:'castle', requiredTier:1 },

  // ── MELEE (Barracks T1) ──────────────────────────────────────────────────────
  swordsman:    { hp:90,  speed:82,  damage:12, armor:1, range:48,  attackSpeed:1.2, role:'melee', foodCost:2, trainCost:{wood:0,   gold:135}, trainTime:8,  trainedAt:'barracks', requiredTier:1 },
  spearman:     { hp:100, speed:78,  damage:15, armor:1, range:60,  attackSpeed:1.0, role:'melee', foodCost:2, trainCost:{wood:30,  gold:120}, trainTime:9,  trainedAt:'barracks', requiredTier:1 },
  axeman:       { hp:120, speed:76,  damage:18, armor:2, range:50,  attackSpeed:0.9, role:'melee', foodCost:3, trainCost:{wood:40,  gold:150}, trainTime:10, trainedAt:'barracks', requiredTier:1 },
  orcWarrior:   { hp:280, speed:88,  damage:38, armor:3, range:52,  attackSpeed:1.0, role:'melee', foodCost:4, trainCost:{wood:90,  gold:200}, trainTime:15, trainedAt:'barracks', requiredTier:2 },
  orcSpearman:  { hp:180, speed:82,  damage:22, armor:2, range:65,  attackSpeed:1.1, role:'melee', foodCost:3, trainCost:{wood:35,  gold:160}, trainTime:12, trainedAt:'barracks', requiredTier:1 },
  knight:       { hp:200, speed:115, damage:25, armor:4, range:55,  attackSpeed:1.3, role:'melee', foodCost:4, trainCost:{wood:60,  gold:250}, trainTime:18, trainedAt:'barracks', requiredTier:2 },
  assasin:      { hp:65,  speed:105, damage:28, armor:0, range:44,  attackSpeed:1.8, role:'melee', foodCost:2, trainCost:{wood:30,  gold:180}, trainTime:12, trainedAt:'barracks', requiredTier:2 },

  // ── RANGED (Archery T1) ──────────────────────────────────────────────────────
  bowman:       { hp:55,  speed:80,  damage:16, armor:0, range:170, attackSpeed:1.4, role:'ranged', foodCost:2, trainCost:{wood:30,  gold:130}, trainTime:8,  trainedAt:'archery', requiredTier:1 },
  musketeer:    { hp:70,  speed:78,  damage:32, armor:1, range:210, attackSpeed:0.8, role:'ranged', foodCost:3, trainCost:{wood:50,  gold:200}, trainTime:14, trainedAt:'archery', requiredTier:2 },
  orcArcher:    { hp:100, speed:80,  damage:30, armor:0, range:210, attackSpeed:1.4, role:'ranged', foodCost:3, trainCost:{wood:30,  gold:170}, trainTime:12, trainedAt:'archery', requiredTier:1 },

  // ── CASTERS (Chapel T2) ──────────────────────────────────────────────────────
  mage:         { hp:50,  mana:200, speed:72,  damage:24, armor:0, range:200, attackSpeed:1.0, role:'caster', foodCost:3, trainCost:{wood:20,  gold:220}, trainTime:16, trainedAt:'chapel', requiredTier:2 },
  orcHealer:    { hp:90,  mana:180, speed:74,  damage:15, armor:0, range:170, attackSpeed:1.6, role:'caster', foodCost:2, trainCost:{wood:60,  gold:190}, trainTime:14, trainedAt:'chapel', requiredTier:2 },
  necromancer:  { hp:55,  mana:250, speed:65,  damage:26, armor:0, range:200, attackSpeed:0.8, role:'caster', foodCost:3, trainCost:{wood:30,  gold:250}, trainTime:18, trainedAt:'chapel', requiredTier:2 },
  orcMage:      { hp:65,  mana:200, speed:70,  damage:28, armor:0, range:190, attackSpeed:0.9, role:'caster', foodCost:3, trainCost:{wood:25,  gold:230}, trainTime:16, trainedAt:'chapel', requiredTier:2 },

  // ── SIEGE (Workshop T2) ──────────────────────────────────────────────────────
  ballista:     { hp:150, speed:40,  damage:70, armor:2, range:300, attackSpeed:0.4, role:'siege', foodCost:4, trainCost:{wood:120, gold:200}, trainTime:22, trainedAt:'workshop', requiredTier:2 },

  // ── ELITE (Sanctum T3 — Champions) ──────────────────────────────────────────
  minotaur:     { hp:350, speed:90,  damage:45, armor:4, range:55,  attackSpeed:0.9, role:'melee', foodCost:5, trainCost:{wood:100, gold:300}, trainTime:25, trainedAt:'sanctum', requiredTier:3 },
  demon:        { hp:200, speed:95,  damage:35, armor:3, range:50,  attackSpeed:1.1, role:'melee', foodCost:4, trainCost:{wood:80,  gold:280}, trainTime:20, trainedAt:'sanctum', requiredTier:3 },
  mammoth:      { hp:500, speed:60,  damage:60, armor:5, range:65,  attackSpeed:0.6, role:'siege', foodCost:6, trainCost:{wood:200, gold:350}, trainTime:30, trainedAt:'sanctum', requiredTier:3 },
  dragon:       { hp:600, speed:120, damage:85, armor:5, range:200, attackSpeed:0.8, role:'ranged',foodCost:8, trainCost:{wood:300, gold:400}, trainTime:40, trainedAt:'sanctum', requiredTier:3 },

  // ── CREEP-ONLY (not trainable, used for neutral camps) ───────────────────────
  goblin:           { hp:40,  speed:100, damage:10, armor:0, range:40,  attackSpeed:1.5, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  spearGoblin:      { hp:55,  speed:90,  damage:14, armor:0, range:55,  attackSpeed:1.2, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  archerGoblin:     { hp:35,  speed:95,  damage:12, armor:0, range:140, attackSpeed:1.4, role:'ranged', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  skeleton:         { hp:60,  speed:70,  damage:16, armor:1, range:48,  attackSpeed:1.0, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  slime:            { hp:40,  speed:60,  damage:10, armor:0, range:36,  attackSpeed:1.0, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  orc:              { hp:100, speed:85,  damage:20, armor:1, range:50,  attackSpeed:1.0, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  yeti:             { hp:220, speed:80,  damage:35, armor:3, range:52,  attackSpeed:0.9, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  fireElemental:    { hp:250, speed:70,  damage:40, armor:2, range:50,  attackSpeed:0.9, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  desertScorpio:    { hp:180, speed:85,  damage:30, armor:2, range:55,  attackSpeed:1.0, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  ogreBoss:         { hp:700, speed:65,  damage:65, armor:5, range:65,  attackSpeed:0.7, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  steampunkMech:    { hp:900, speed:55,  damage:85, armor:6, range:100, attackSpeed:0.6, role:'siege',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  desertVulture:    { hp:90,  speed:130, damage:20, armor:0, range:80,  attackSpeed:1.4, role:'ranged', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  mimic:            { hp:200, speed:30,  damage:50, armor:3, range:48,  attackSpeed:0.7, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  mineElemental:    { hp:180, speed:60,  damage:35, armor:3, range:52,  attackSpeed:0.85,role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  pirateCaptainHero:{ hp:400, speed:95,  damage:55, armor:4, range:200, attackSpeed:1.0, role:'ranged', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },

  // ── ANIMALS (ambient / map dressing, 0 food cost) ─────────────────────────────
  sheep:        { hp:15,  speed:35, damage:0, armor:0, range:0,  attackSpeed:0, role:'worker', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  hornedSheep:  { hp:25,  speed:30, damage:3, armor:1, range:30, attackSpeed:2.0, role:'melee', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  chicken:      { hp:5,   speed:50, damage:0, armor:0, range:0,  attackSpeed:0, role:'worker', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  chick:        { hp:3,   speed:55, damage:0, armor:0, range:0,  attackSpeed:0, role:'worker', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  horse:        { hp:80,  speed:140,damage:5, armor:1, range:40, attackSpeed:1.5, role:'melee', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  boar:         { hp:60,  speed:90, damage:12,armor:1, range:40, attackSpeed:1.2, role:'melee', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  pig:          { hp:20,  speed:45, damage:0, armor:0, range:0,  attackSpeed:0, role:'worker', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
};

// ── Building Configs (WC3 tech tree) ───────────────────────────────────────────
export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  // Town Hall line
  castle:    { hp:1500, w:128, h:128, cost:{wood:0,   gold:0  }, buildTime:0,  foodProvided:12, techTier:1, requiredTier:1, prerequisites:[],                canAttack:false, trains:['pawn','orcPawn','farmer'] },
  keep:      { hp:2000, w:128, h:128, cost:{wood:200, gold:500}, buildTime:60, foodProvided:12, techTier:2, requiredTier:1, prerequisites:['castle'],         canAttack:false, trains:['pawn','orcPawn','farmer'] },
  fortress:  { hp:2500, w:128, h:128, cost:{wood:300, gold:700}, buildTime:80, foodProvided:12, techTier:3, requiredTier:2, prerequisites:['keep'],           canAttack:false, trains:['pawn','orcPawn','farmer'] },

  // Military
  barracks:  { hp:500,  w:96,  h:96,  cost:{wood:200, gold:0  }, buildTime:25, foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:false, trains:['swordsman','spearman','axeman','orcSpearman','knight','assasin','orcWarrior'] },
  archery:   { hp:450,  w:96,  h:96,  cost:{wood:150, gold:50 }, buildTime:25, foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:false, trains:['bowman','orcArcher','musketeer'] },
  chapel:    { hp:500,  w:96,  h:96,  cost:{wood:200, gold:100}, buildTime:30, foodProvided:0, techTier:2, requiredTier:2, prerequisites:['barracks'],        canAttack:false, trains:['mage','orcHealer','necromancer','orcMage'] },
  workshop:  { hp:400,  w:96,  h:64,  cost:{wood:200, gold:100}, buildTime:28, foodProvided:0, techTier:2, requiredTier:2, prerequisites:['barracks'],        canAttack:false, trains:['ballista'] },
  sanctum:   { hp:600,  w:96,  h:96,  cost:{wood:300, gold:250}, buildTime:50, foodProvided:0, techTier:3, requiredTier:3, prerequisites:['chapel','fortress'],canAttack:false, trains:['minotaur','demon','mammoth','dragon'] },

  // Defense
  tower:     { hp:400,  w:64,  h:96,  cost:{wood:100, gold:80 }, buildTime:18, foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:true,  attackDamage:30, attackRange:220, trains:[] },

  // Economy
  house:     { hp:200,  w:48,  h:64,  cost:{wood:50,  gold:0  }, buildTime:10, foodProvided:10, techTier:1, requiredTier:1, prerequisites:[],                canAttack:false, trains:[] },
  market:    { hp:300,  w:64,  h:64,  cost:{wood:200, gold:50 }, buildTime:18, foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:false, trains:[] },
  tavern:    { hp:300,  w:64,  h:64,  cost:{wood:200, gold:50 }, buildTime:20, foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:false, trains:[] },
  docks:     { hp:400,  w:96,  h:64,  cost:{wood:200, gold:100}, buildTime:22, foodProvided:0, techTier:2, requiredTier:2, prerequisites:[],                 canAttack:false, trains:[] },

  // Upgrades & Heroes
  blacksmith:{ hp:400,  w:64,  h:64,  cost:{wood:200, gold:80 }, buildTime:20, foodProvided:0, techTier:1, requiredTier:1, prerequisites:['barracks'],       canAttack:false, trains:[] },
  altar:     { hp:600,  w:96,  h:96,  cost:{wood:200, gold:150}, buildTime:30, foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:false, trains:[] },
  goldmine:  { hp:999,  w:64,  h:64,  cost:{wood:0,   gold:0  }, buildTime:0,  foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:false, trains:[] },
};

// ── Hero Ability Definitions ───────────────────────────────────────────────────
export const ABILITY_DEFS: Record<string, AbilityDef> = {
  // Warrior Hero (Arthax — Blade Master)
  storm_bolt:      { id:'storm_bolt',      name:'Storm Bolt',      icon:'⚡', description:'Hurls a bolt of lightning that stuns and damages a target.',            targetType:'unit',          cooldown:8,  manaCost:75,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[100,175,250] },
  cleave_strike:   { id:'cleave_strike',   name:'Cleave Strike',   icon:'⚔️', description:'Each attack hits nearby enemies for bonus damage.',                    targetType:'none',          cooldown:0,  manaCost:0,   levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[15,25,35] },
  war_stomp:       { id:'war_stomp',       name:'War Stomp',       icon:'💥', description:'Slams the ground, stunning nearby enemies.',                           targetType:'none',          cooldown:12, manaCost:90,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[50,80,110] },
  avatar:          { id:'avatar',          name:'Avatar',          icon:'🗡️', description:'Transforms into a giant, gaining massive HP and damage.',              targetType:'none',          cooldown:120,manaCost:150, levelRequired:6, maxRank:1, isUltimate:true,  effectPerRank:[500] },

  // Mage Hero (Kanji — Archmage)
  arcane_blast:    { id:'arcane_blast',    name:'Arcane Blast',    icon:'✨', description:'Fires a bolt of arcane energy at a target.',                           targetType:'unit',          cooldown:6,  manaCost:60,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[120,200,280] },
  blizzard:        { id:'blizzard',        name:'Blizzard',        icon:'❄️', description:'Calls down ice shards in an area, damaging and slowing enemies.',      targetType:'point',         cooldown:10, manaCost:90,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[50,80,110] },
  brilliance_aura: { id:'brilliance_aura', name:'Brilliance Aura', icon:'💎', description:'Nearby allies regenerate mana faster.',                                targetType:'none',          cooldown:0,  manaCost:0,   levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[1,2,3] },
  mass_teleport:   { id:'mass_teleport',   name:'Mass Teleport',   icon:'🌀', description:'Teleports all nearby units to a friendly building.',                   targetType:'point',         cooldown:180,manaCost:200, levelRequired:6, maxRank:1, isUltimate:true,  effectPerRank:[0] },

  // Ranger Hero (Katan — Dark Ranger)
  multishot:       { id:'multishot',       name:'Multi-Shot',      icon:'🏹', description:'Fires arrows at multiple targets simultaneously.',                     targetType:'none',          cooldown:8,  manaCost:75,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[60,100,140] },
  shadow_strike:   { id:'shadow_strike',   name:'Shadow Strike',   icon:'🗡️', description:'Throws a poisoned dagger that slows and damages over time.',           targetType:'unit',          cooldown:10, manaCost:65,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[75,125,175] },
  evasion:         { id:'evasion',         name:'Evasion',         icon:'💨', description:'Chance to dodge incoming attacks.',                                    targetType:'none',          cooldown:0,  manaCost:0,   levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[15,25,35] },
  rain_of_arrows:  { id:'rain_of_arrows',  name:'Rain of Arrows',  icon:'🌧️', description:'Fires a massive volley of arrows in a target area.',                   targetType:'point',         cooldown:120,manaCost:175, levelRequired:6, maxRank:1, isUltimate:true,  effectPerRank:[300] },

  // Tank Hero (Grum — Mountain King)
  thunder_clap:    { id:'thunder_clap',    name:'Thunder Clap',    icon:'⚡', description:'Slams the ground, damaging and slowing nearby enemies.',                targetType:'none',          cooldown:8,  manaCost:80,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[60,100,140] },
  bash:            { id:'bash',            name:'Bash',            icon:'🔨', description:'Each attack has a chance to stun the target.',                          targetType:'none',          cooldown:0,  manaCost:0,   levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[15,25,35] },
  devotion_aura:   { id:'devotion_aura',   name:'Devotion Aura',   icon:'🛡️', description:'Nearby allied units gain bonus armor.',                                targetType:'none',          cooldown:0,  manaCost:0,   levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[2,4,6] },
  reincarnation:   { id:'reincarnation',   name:'Reincarnation',   icon:'♻️', description:'Upon death, automatically revives at full health after a short delay.', targetType:'none',          cooldown:240,manaCost:0,   levelRequired:6, maxRank:1, isUltimate:true,  effectPerRank:[0] },

  // Assassin Hero (Gangblanc — Shadow Blade)
  backstab:        { id:'backstab',        name:'Backstab',        icon:'🔪', description:'Teleports behind a target and deals massive damage.',                   targetType:'unit',          cooldown:8,  manaCost:70,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[120,200,280] },
  smoke_bomb:      { id:'smoke_bomb',      name:'Smoke Bomb',      icon:'💨', description:'Creates a smoke cloud that grants invisibility to nearby allies.',      targetType:'point',         cooldown:14, manaCost:85,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[3,4,5] },
  blade_dance:     { id:'blade_dance',     name:'Blade Dance',     icon:'⚔️', description:'Chance to deal double damage on each attack.',                          targetType:'none',          cooldown:0,  manaCost:0,   levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[15,25,35] },
  death_mark:      { id:'death_mark',      name:'Death Mark',      icon:'💀', description:'Marks a target for death, dealing massive delayed damage.',             targetType:'unit',          cooldown:100,manaCost:175, levelRequired:6, maxRank:1, isUltimate:true,  effectPerRank:[500] },

  // Monk Hero (Okomo — Spirit Fist)
  spirit_punch:    { id:'spirit_punch',    name:'Spirit Punch',    icon:'👊', description:'Channels spiritual energy into a devastating melee strike.',             targetType:'unit',          cooldown:6,  manaCost:55,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[90,160,230] },
  inner_fire:      { id:'inner_fire',      name:'Inner Fire',      icon:'🔥', description:'Buffs a friendly unit with bonus damage and armor.',                    targetType:'unit',          cooldown:10, manaCost:65,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[4,7,10] },
  windwalk:        { id:'windwalk',        name:'Windwalk',        icon:'🌬️', description:'Becomes invisible and moves faster for a short duration.',              targetType:'none',          cooldown:12, manaCost:75,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[30,50,70] },
  fury_of_spirits: { id:'fury_of_spirits', name:'Fury of Spirits', icon:'👻', description:'Summons spectral warriors that attack all nearby enemies.',              targetType:'none',          cooldown:120,manaCost:200, levelRequired:6, maxRank:1, isUltimate:true,  effectPerRank:[400] },

  // Ninja Hero (Zhinja — Wind Shadow)
  shuriken_toss:   { id:'shuriken_toss',   name:'Shuriken Toss',   icon:'🌀', description:'Throws shurikens that bounce between enemies.',                         targetType:'unit',          cooldown:7,  manaCost:60,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[80,140,200] },
  shadow_step:     { id:'shadow_step',     name:'Shadow Step',     icon:'👤', description:'Instantly teleports to a target location.',                             targetType:'point',         cooldown:8,  manaCost:50,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[0,0,0] },
  wind_slash:      { id:'wind_slash',      name:'Wind Slash',      icon:'💨', description:'Sends a blade of wind that damages all enemies in a line.',             targetType:'point',         cooldown:10, manaCost:80,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[70,120,170] },
  shadow_clone:    { id:'shadow_clone',    name:'Shadow Clone',    icon:'🥷', description:'Creates shadow clones that fight alongside you.',                       targetType:'none',          cooldown:110,manaCost:180, levelRequired:6, maxRank:1, isUltimate:true,  effectPerRank:[0] },

  // Berserker Hero (Börg — Iron Juggernaut)
  raging_charge:   { id:'raging_charge',   name:'Raging Charge',   icon:'🐂', description:'Charges at a target, dealing damage and stunning on impact.',            targetType:'unit',          cooldown:10, manaCost:80,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[100,175,250] },
  battle_roar:     { id:'battle_roar',     name:'Battle Roar',     icon:'🦁', description:'Roars, increasing nearby allies attack speed and damage.',               targetType:'none',          cooldown:16, manaCost:90,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[10,18,26] },
  blood_rage:      { id:'blood_rage',      name:'Blood Rage',      icon:'🩸', description:'Each kill heals for a percentage of max HP.',                           targetType:'none',          cooldown:0,  manaCost:0,   levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[5,10,15] },
  apocalypse:      { id:'apocalypse',      name:'Apocalypse',      icon:'☠️', description:'Unleashes devastating AoE damage around the hero.',                     targetType:'none',          cooldown:130,manaCost:200, levelRequired:6, maxRank:1, isUltimate:true,  effectPerRank:[600] },
};

// ── Hero Configs (WC3 heroes — max 3 per match) ───────────────────────────────
export const HERO_CONFIGS: HeroConfig[] = [
  {
    type: 'arthax', name: 'Arthax', title: 'Blade Master',
    hp: 650, mana: 200, damage: 35, armor: 3, speed: 95, range: 55, attackSpeed: 1.2,
    hpPerLevel: 50, manaPerLevel: 15, damagePerLevel: 4, armorPerLevel: 0.5,
    abilities: ['storm_bolt', 'cleave_strike', 'war_stomp', 'avatar'],
    summonedAt: 'altar', reviveTime: 55, reviveCost: 425,
  },
  {
    type: 'kanji', name: 'Kanji', title: 'Archmage',
    hp: 400, mana: 350, damage: 22, armor: 1, speed: 80, range: 250, attackSpeed: 1.0,
    hpPerLevel: 30, manaPerLevel: 25, damagePerLevel: 3, armorPerLevel: 0.3,
    abilities: ['arcane_blast', 'blizzard', 'brilliance_aura', 'mass_teleport'],
    summonedAt: 'altar', reviveTime: 55, reviveCost: 425,
  },
  {
    type: 'katan', name: 'Katan', title: 'Dark Ranger',
    hp: 450, mana: 250, damage: 30, armor: 2, speed: 110, range: 200, attackSpeed: 1.5,
    hpPerLevel: 35, manaPerLevel: 18, damagePerLevel: 4, armorPerLevel: 0.4,
    abilities: ['multishot', 'shadow_strike', 'evasion', 'rain_of_arrows'],
    summonedAt: 'altar', reviveTime: 55, reviveCost: 425,
  },
  {
    type: 'grum', name: 'Grum', title: 'Mountain King',
    hp: 800, mana: 200, damage: 28, armor: 5, speed: 75, range: 50, attackSpeed: 0.9,
    hpPerLevel: 60, manaPerLevel: 12, damagePerLevel: 3, armorPerLevel: 0.6,
    abilities: ['thunder_clap', 'bash', 'devotion_aura', 'reincarnation'],
    summonedAt: 'altar', reviveTime: 55, reviveCost: 425,
  },
  {
    type: 'gangblanc', name: 'Gangblanc', title: 'Shadow Blade',
    hp: 500, mana: 250, damage: 38, armor: 2, speed: 120, range: 48, attackSpeed: 1.6,
    hpPerLevel: 35, manaPerLevel: 18, damagePerLevel: 5, armorPerLevel: 0.3,
    abilities: ['backstab', 'smoke_bomb', 'blade_dance', 'death_mark'],
    summonedAt: 'altar', reviveTime: 55, reviveCost: 425,
  },
  {
    type: 'okomo', name: 'Okomo', title: 'Spirit Fist',
    hp: 600, mana: 220, damage: 32, armor: 3, speed: 100, range: 50, attackSpeed: 1.3,
    hpPerLevel: 45, manaPerLevel: 16, damagePerLevel: 4, armorPerLevel: 0.5,
    abilities: ['spirit_punch', 'inner_fire', 'windwalk', 'fury_of_spirits'],
    summonedAt: 'altar', reviveTime: 55, reviveCost: 425,
  },
  {
    type: 'zhinja', name: 'Zhinja', title: 'Wind Shadow',
    hp: 420, mana: 280, damage: 34, armor: 1, speed: 130, range: 140, attackSpeed: 1.5,
    hpPerLevel: 30, manaPerLevel: 20, damagePerLevel: 4, armorPerLevel: 0.3,
    abilities: ['shuriken_toss', 'shadow_step', 'wind_slash', 'shadow_clone'],
    summonedAt: 'altar', reviveTime: 55, reviveCost: 425,
  },
  {
    type: 'borg', name: 'Börg', title: 'Iron Juggernaut',
    hp: 900, mana: 180, damage: 30, armor: 6, speed: 70, range: 52, attackSpeed: 0.8,
    hpPerLevel: 65, manaPerLevel: 10, damagePerLevel: 3, armorPerLevel: 0.7,
    abilities: ['raging_charge', 'battle_roar', 'blood_rage', 'apocalypse'],
    summonedAt: 'altar', reviveTime: 55, reviveCost: 425,
  },
];

// ── Item Definitions (WC3-style drops) ─────────────────────────────────────────
export const ITEM_DEFS: Record<string, ItemDef> = {
  // Consumables
  healing_salve:     { id:'healing_salve',     name:'Healing Salve',        icon:'🧪', rarity:'common',   slot:'consumable', description:'Restores 200 HP.',                           healAmount:200,  goldValue:50  },
  mana_potion:       { id:'mana_potion',       name:'Mana Potion',          icon:'💧', rarity:'common',   slot:'consumable', description:'Restores 100 mana.',                         manaRestore:100, goldValue:50  },
  scroll_healing:    { id:'scroll_healing',    name:'Scroll of Healing',    icon:'📜', rarity:'uncommon', slot:'consumable', description:'Heals all nearby units for 150 HP.',           healAmount:150,  goldValue:100 },
  potion_invuln:     { id:'potion_invuln',     name:'Potion of Invuln.',    icon:'🛡️', rarity:'rare',     slot:'consumable', description:'Grants invulnerability for 5 seconds.',        goldValue:200 },

  // Permanent stat items
  claws_of_attack:   { id:'claws_of_attack',   name:'Claws of Attack +6',   icon:'🗡️', rarity:'uncommon', slot:'permanent', description:'+6 damage.',                                   bonusDamage:6,  goldValue:150 },
  ring_of_protection:{ id:'ring_of_protection', name:'Ring of Protection +3',icon:'💍', rarity:'uncommon', slot:'permanent', description:'+3 armor.',                                    bonusArmor:3,   goldValue:150 },
  boots_of_speed:    { id:'boots_of_speed',     name:'Boots of Speed',       icon:'👢', rarity:'uncommon', slot:'permanent', description:'+50 movement speed.',                          bonusSpeed:50,  goldValue:150 },
  periapt_of_vitality:{ id:'periapt_of_vitality',name:'Periapt of Vitality', icon:'❤️', rarity:'uncommon', slot:'permanent', description:'+150 max HP.',                                  bonusHp:150,    goldValue:175 },
  tome_of_power:     { id:'tome_of_power',      name:'Tome of Power',        icon:'📕', rarity:'rare',     slot:'permanent', description:'+12 damage.',                                  bonusDamage:12, goldValue:300 },
  amulet_of_mana:    { id:'amulet_of_mana',     name:'Amulet of Mana',       icon:'🔮', rarity:'rare',     slot:'permanent', description:'+100 max mana.',                               bonusMana:100,  goldValue:250 },

  // Artifacts (rare boss drops)
  crown_of_kings:    { id:'crown_of_kings',    name:'Crown of Kings',       icon:'👑', rarity:'epic',      slot:'artifact',  description:'+250 HP, +5 armor, +10 damage.',              bonusHp:250, bonusArmor:5, bonusDamage:10, goldValue:600 },
  orb_of_fire:       { id:'orb_of_fire',       name:'Orb of Fire',          icon:'🔥', rarity:'epic',      slot:'artifact',  description:'+20 damage, attacks burn for splash damage.',  bonusDamage:20, goldValue:500 },
  dragon_heart:      { id:'dragon_heart',      name:'Dragon Heart',         icon:'💜', rarity:'legendary', slot:'artifact',  description:'+500 HP, +5 HP regen/sec.',                   bonusHp:500, goldValue:900 },
};

// ── Upgrade Definitions ────────────────────────────────────────────────────────
export const UPGRADE_DEFS: Record<string, UpgradeDef> = {
  melee_attack_1:  { id:'melee_attack_1',  name:'Iron Forged Swords',  icon:'⚔️', description:'+2 damage to melee units.',  cost:{gold:150,wood:50},  researchTime:30, building:'blacksmith', requiredTier:1, bonusDamage:2 },
  melee_attack_2:  { id:'melee_attack_2',  name:'Steel Forged Swords', icon:'⚔️', description:'+4 damage to melee units.',  cost:{gold:250,wood:100}, researchTime:45, building:'blacksmith', requiredTier:2, bonusDamage:4 },
  melee_armor_1:   { id:'melee_armor_1',   name:'Iron Plating',        icon:'🛡️', description:'+2 armor to melee units.',   cost:{gold:150,wood:75},  researchTime:30, building:'blacksmith', requiredTier:1, bonusArmor:2 },
  melee_armor_2:   { id:'melee_armor_2',   name:'Steel Plating',       icon:'🛡️', description:'+4 armor to melee units.',   cost:{gold:250,wood:125}, researchTime:45, building:'blacksmith', requiredTier:2, bonusArmor:4 },
  ranged_attack_1: { id:'ranged_attack_1', name:'Improved Bows',       icon:'🏹', description:'+2 damage to ranged units.', cost:{gold:150,wood:50},  researchTime:30, building:'blacksmith', requiredTier:1, bonusDamage:2 },
  ranged_attack_2: { id:'ranged_attack_2', name:'Reinforced Bows',     icon:'🏹', description:'+4 damage to ranged units.', cost:{gold:250,wood:100}, researchTime:45, building:'blacksmith', requiredTier:2, bonusDamage:4 },
};

// ── Priest heal config ─────────────────────────────────────────────────────────
export const PRIEST_HEAL_RANGE = 140;
export const PRIEST_HEAL_AMOUNT = 18;
export const PRIEST_HEAL_PULSE = 2.5;

// ── Building Sprites — Tiny Swords Free Pack (local assets) ───────────────────

export interface BuildingSpriteFrame {
  /** Local path to the building PNG (single full image, not spritesheet) */
  sheet: string;
  /** Source rect (0,0,fullW,fullH for single images) */
  sx: number; sy: number; sw: number; sh: number;
  /** Display size in game world */
  displayW: number; displayH: number;
}

/**
 * Tiny Swords Free Pack building sprites:
 *   - Each building is a single PNG (not a spritesheet grid)
 *   - Available per faction: blue, red, black, yellow
 *   - Available buildings: Castle, Barracks, Archery, Tower, House1-3, Monastery
 *   - Actual dimensions vary: Castle=320×256, others smaller
 */
function bldPath(faction: 'blue' | 'red' | 'neutral', name: string): string {
  const fDir = faction === 'blue' ? 'blue' : faction === 'red' ? 'red' : 'black';
  return `/sprites/tiny-swords/buildings/${fDir}/${name}.png`;
}

export function getBuildingSprite(faction: 'blue' | 'red' | 'neutral', type: BuildingType): BuildingSpriteFrame | null {
  const f = faction === 'neutral' ? 'neutral' : faction;
  // Actual PNG dimensions (measured from image headers):
  //   Castle.png   = 320×256   Barracks.png = 192×256   Archery.png  = 192×256
  //   Tower.png    = 128×256   House1/2/3   = 128×192   Monastery    = 192×320
  // Available PNGs per faction: Castle.png, Barracks.png, House1.png, Tower.png
  // Missing files (Archery, Monastery, House2, House3) fall back to Barracks/House1
  switch (type) {
    case 'castle': return { sheet: bldPath(f, 'Castle'), sx: 0, sy: 0, sw: 320, sh: 256, displayW: 128, displayH: 102 };
    case 'keep': return { sheet: bldPath(f, 'Castle'), sx: 0, sy: 0, sw: 320, sh: 256, displayW: 128, displayH: 102 };
    case 'fortress': return { sheet: bldPath(f, 'Castle'), sx: 0, sy: 0, sw: 320, sh: 256, displayW: 140, displayH: 112 };
    case 'barracks': return { sheet: bldPath(f, 'Barracks'), sx: 0, sy: 0, sw: 192, sh: 256, displayW: 96, displayH: 96 };
    case 'archery': return { sheet: bldPath(f, 'Barracks'), sx: 0, sy: 0, sw: 192, sh: 256, displayW: 96, displayH: 96 };
    case 'chapel': return { sheet: bldPath(f, 'Barracks'), sx: 0, sy: 0, sw: 192, sh: 256, displayW: 96, displayH: 96 };
    case 'sanctum': return { sheet: bldPath(f, 'Barracks'), sx: 0, sy: 0, sw: 192, sh: 256, displayW: 96, displayH: 96 };
    case 'tower': return { sheet: bldPath(f, 'Tower'), sx: 0, sy: 0, sw: 128, sh: 256, displayW: 64, displayH: 96 };
    case 'house': return { sheet: bldPath(f, 'House1'), sx: 0, sy: 0, sw: 128, sh: 192, displayW: 48, displayH: 64 };
    case 'market': return { sheet: bldPath(f, 'House1'), sx: 0, sy: 0, sw: 128, sh: 192, displayW: 64, displayH: 64 };
    case 'tavern': return { sheet: bldPath(f, 'House1'), sx: 0, sy: 0, sw: 128, sh: 192, displayW: 64, displayH: 64 };
    case 'workshop': return { sheet: bldPath(f, 'Barracks'), sx: 0, sy: 0, sw: 192, sh: 256, displayW: 96, displayH: 64 };
    case 'blacksmith': return { sheet: bldPath(f, 'Barracks'), sx: 0, sy: 0, sw: 192, sh: 256, displayW: 64, displayH: 64 };
    case 'altar': return { sheet: bldPath(f, 'Barracks'), sx: 0, sy: 0, sw: 192, sh: 256, displayW: 96, displayH: 96 };
    case 'docks': return { sheet: bldPath(f, 'Barracks'), sx: 0, sy: 0, sw: 192, sh: 256, displayW: 96, displayH: 64 };
    case 'goldmine': return null; // Rendered procedurally
    default: return null;
  }
}

// ── Sprite System — All assets from ObjectStore CDN ────────────────────────────

/** Spritesheet config builder from ObjectStore CDN */
function cdnSprite(path: string, frames: number, msPerFrame: number, frameW: number, frameH: number): SpriteConfig {
  return { src: `${CDN}${path}`, frameW, frameH, frames, msPerFrame };
}

// ── Tiny Swords local faction-colored unit sprites ────────────────────────────
// Served from /public/sprites/tiny-swords/units/{faction}/{type}/
// Dimensions measured from actual PNG headers (all 192×192 px per frame, 192px tall strips):
//   warrior: Idle=1536×192 (8f), Run=1152×192 (6f), Attack1=768×192 (4f)
//   archer:  Idle=1152×192 (6f), Run=768×192  (4f), Shoot=1536×192  (8f)
//   monk:    Idle=1152×192 (6f), Run=768×192  (4f), Heal=2112×192   (11f)

interface TsUnitPaths { idle: string; run: string; attack: string }
interface TsUnitMapping { blue: TsUnitPaths; red: TsUnitPaths; frameW: number; frameH: number; idleFrames: number; runFrames: number; attackFrames: number }

function _tsPaths(sprite: 'warrior' | 'archer' | 'monk', faction: 'blue' | 'red'): TsUnitPaths {
  const b = `/sprites/tiny-swords/units/${faction}/${sprite}`;
  if (sprite === 'warrior') return { idle: `${b}/Warrior_Idle.png`, run: `${b}/Warrior_Run.png`, attack: `${b}/Warrior_Attack1.png` };
  if (sprite === 'archer') return { idle: `${b}/Archer_Idle.png`, run: `${b}/Archer_Run.png`, attack: `${b}/Archer_Shoot.png` };
  /* monk */                return { idle: `${b}/Idle.png`, run: `${b}/Run.png`, attack: `${b}/Heal.png` };
}

const _TS_SPRITES: Record<'warrior' | 'archer' | 'monk', TsUnitMapping> = {
  warrior: { blue: _tsPaths('warrior', 'blue'), red: _tsPaths('warrior', 'red'), frameW: 192, frameH: 192, idleFrames: 8, runFrames: 6, attackFrames: 4 },
  archer: { blue: _tsPaths('archer', 'blue'), red: _tsPaths('archer', 'red'), frameW: 192, frameH: 192, idleFrames: 6, runFrames: 4, attackFrames: 8 },
  monk: { blue: _tsPaths('monk', 'blue'), red: _tsPaths('monk', 'red'), frameW: 192, frameH: 192, idleFrames: 6, runFrames: 4, attackFrames: 11 },
};

/** Maps unit configKey → which tiny-swords local sprite type to use.
 *  Only maps types that have real PNGs under public/sprites/tiny-swords/units/.
 *  All others fall through to the ObjectStore CDN SPRITE_MAP below. */
const _TS_UNIT_MAP: Partial<Record<string, 'warrior' | 'archer' | 'monk'>> = {
  // Only archer, lancer, and monk directories exist locally.
  // 'warrior' directory does NOT exist — those units use CDN sprites instead.
  bowman: 'archer', musketeer: 'archer', orcArcher: 'archer',
  farmer: 'monk', mage: 'monk', orcHealer: 'monk', orcMage: 'monk',
};

/**
 * Sprite path mapping — every unit type mapped to ObjectStore CDN with CORRECT
 * frame dimensions measured from actual PNG IHDR headers.
 *
 * Size groups:
 *   100×100: soldier, archer, knight, lancer, priest, swordsman, orc, armored-orc,
 *            elite-orc, skeleton-archer, skeleton, slime, barbarian-warrior, werebear
 *   128×128: human-mage, frost-guardian, fire-wizard, necromancer, wind-hashashin, forest-guardian
 *   96×96:   dark-knight, shadow-warrior, crossbowman
 *   162×162: fantasy-warrior
 *   250×250: evil-wizard-2
 *   44×44:   spirit_boxer
 *   32×32:   bandit-necro
 *   64×64:   skeleton-enemy
 *   48×48:   desert-vulture
 */
interface SpriteMapping {
  folder: string;
  frameW: number; frameH: number;
  idleFrames: number; walkFrames: number; attackFrames: number;
  idleFile?: string; walkFile?: string; attackFile?: string;
}

/** Shorthand for 100×100 standard units (6 idle, 8 walk, 6 attack) */
const S100 = { frameW: 100, frameH: 100, idleFrames: 6, walkFrames: 8, attackFrames: 6 } as const;
const S128 = { frameW: 128, frameH: 128, idleFrames: 7, walkFrames: 6, attackFrames: 4 } as const;
const S96  = { frameW: 96,  frameH: 96,  idleFrames: 5, walkFrames: 8, attackFrames: 11 } as const;

const SPRITE_MAP: Partial<Record<string, SpriteMapping>> = {
  // ── 100×100 units (soldier, archer, knight, lancer, priest, swordsman, orc variants) ──
  pawn:         { folder: '/sprites/characters/soldier',    ...S100 },
  farmer:       { folder: '/sprites/characters/soldier',    ...S100 },
  swordsman:    { folder: '/sprites/characters/swordsman',  ...S100, attackFrames: 7 },
  spearman:     { folder: '/sprites/characters/lancer',     ...S100 },
  bowman:       { folder: '/sprites/characters/archer',     ...S100, attackFrames: 9 },
  knight:       { folder: '/sprites/characters/knight',     ...S100, attackFrames: 7 },
  ballista:     { folder: '/sprites/characters/soldier',    ...S100 },
  warrior:      { folder: '/sprites/characters/soldier',    ...S100 },
  archer:       { folder: '/sprites/characters/archer',     ...S100, attackFrames: 9 },
  lancer:       { folder: '/sprites/characters/lancer',     ...S100 },
  priest:       { folder: '/sprites/characters/priest',     ...S100, attackFrames: 9 },
  orcPawn:      { folder: '/sprites/characters/orc',        ...S100 },
  orcWarrior:   { folder: '/sprites/enemies/armored-orc',   ...S100, attackFrames: 7 },
  orcSpearman:  { folder: '/sprites/characters/elite-orc',  ...S100, attackFrames: 7 },
  orcArcher:    { folder: '/sprites/enemies/skeleton-archer',...S100, attackFrames: 9 },
  goblin:       { folder: '/sprites/characters/orc',        ...S100 },
  spearGoblin:  { folder: '/sprites/characters/elite-orc',  ...S100, attackFrames: 7 },
  archerGoblin: { folder: '/sprites/enemies/skeleton-archer',...S100, attackFrames: 9 },
  orc:          { folder: '/sprites/enemies/armored-orc',   ...S100, attackFrames: 7 },
  skeleton:     { folder: '/sprites/enemies/skeleton',      ...S100 },
  slime:        { folder: '/sprites/enemies/slime',         ...S100 },
  slimeBlue:    { folder: '/sprites/enemies/slime',         ...S100 },
  megaSlime:    { folder: '/sprites/enemies/slime',         ...S100 },
  megaSlimeBlue:{ folder: '/sprites/enemies/slime',         ...S100 },
  kingSlime:    { folder: '/sprites/enemies/slime',         ...S100 },
  kingSlimeGreen:{ folder: '/sprites/enemies/slime',        ...S100 },
  pirate:       { folder: '/sprites/characters/soldier',    ...S100 },
  wendigo:      { folder: '/sprites/characters/werebear',   ...S100, attackFrames: 9 },
  kamikazeGoblin:{ folder: '/sprites/characters/orc',       ...S100 },
  farmerGoblin: { folder: '/sprites/characters/orc',        ...S100 },

  // ── 100×100 large frame counts (barbarian-warrior: 28 idle, 14 walk, 53 atk) ──
  axeman:       { folder: '/sprites/characters/barbarian-warrior', frameW: 100, frameH: 100, idleFrames: 28, walkFrames: 14, attackFrames: 53 },
  minotaur:     { folder: '/sprites/characters/barbarian-warrior', frameW: 100, frameH: 100, idleFrames: 28, walkFrames: 14, attackFrames: 53 },
  borg:         { folder: '/sprites/characters/barbarian-warrior', frameW: 100, frameH: 100, idleFrames: 28, walkFrames: 14, attackFrames: 53 },

  // ── 128×128 units (mages, guardians, wizards) ──────────────────────────
  mage:         { folder: '/sprites/characters/human-mage',     frameW: 128, frameH: 128, idleFrames: 18, walkFrames: 23, attackFrames: 16 },
  kanji:        { folder: '/sprites/characters/human-mage',     frameW: 128, frameH: 128, idleFrames: 18, walkFrames: 23, attackFrames: 16 },
  necromancer:  { folder: '/sprites/characters/necromancer',     frameW: 128, frameH: 128, idleFrames: 10, walkFrames: 10, attackFrames: 16 },
  orcMage:      { folder: '/sprites/characters/fire-wizard',    frameW: 128, frameH: 128, idleFrames: 7,  walkFrames: 6,  attackFrames: 4 },
  fireElemental:{ folder: '/sprites/characters/fire-wizard',    frameW: 128, frameH: 128, idleFrames: 7,  walkFrames: 6,  attackFrames: 4 },
  mammoth:      { folder: '/sprites/characters/frost-guardian',  frameW: 128, frameH: 128, idleFrames: 9,  walkFrames: 15, attackFrames: 21 },
  yeti:         { folder: '/sprites/characters/frost-guardian',  frameW: 128, frameH: 128, idleFrames: 9,  walkFrames: 15, attackFrames: 21 },
  steampunkMech:{ folder: '/sprites/characters/frost-guardian',  frameW: 128, frameH: 128, idleFrames: 9,  walkFrames: 15, attackFrames: 21 },
  mineElemental:{ folder: '/sprites/characters/forest-guardian', frameW: 128, frameH: 128, idleFrames: 6,  walkFrames: 6,  attackFrames: 6 },
  zhinja:       { folder: '/sprites/characters/wind-hashashin',  frameW: 128, frameH: 128, idleFrames: 18, walkFrames: 0,  attackFrames: 18, walkFile: 'run.png' },

  // ── 96×96 units (dark-knight, shadow-warrior, crossbowman) ───────────────
  assasin:      { folder: '/sprites/characters/dark-knight',    ...S96 },
  gangblanc:    { folder: '/sprites/characters/shadow-warrior',  ...S96, attackFrames: 16 },
  pirateCaptainHero: { folder: '/sprites/characters/dark-knight', ...S96 },
  pirateCaptain:{ folder: '/sprites/characters/dark-knight',    ...S96 },
  musketeer:    { folder: '/sprites/enemies/crossbowman',       frameW: 96, frameH: 96, idleFrames: 6, walkFrames: 8, attackFrames: 6, idleFile: 'Idle.png', walkFile: 'Walk.png', attackFile: 'Attack_1.png' },
  pirateGunner: { folder: '/sprites/enemies/crossbowman',       frameW: 96, frameH: 96, idleFrames: 6, walkFrames: 8, attackFrames: 6, idleFile: 'Idle.png', walkFile: 'Walk.png', attackFile: 'Attack_1.png' },

  // ── 162×162 (fantasy-warrior) ───────────────────────────────────────
  arthax:       { folder: '/sprites/characters/fantasy-warrior', frameW: 162, frameH: 162, idleFrames: 10, walkFrames: 0, attackFrames: 7 },

  // ── 250×250 (evil-wizard-2) ──────────────────────────────────────
  orcHealer:    { folder: '/sprites/enemies/evil-wizard-2',     frameW: 250, frameH: 250, idleFrames: 8, walkFrames: 8, attackFrames: 8 },

  // ── 44×44 (spirit_boxer) ─────────────────────────────────────────
  okomo:        { folder: '/sprites/characters/spirit_boxer',   frameW: 44, frameH: 44, idleFrames: 12, walkFrames: 19, attackFrames: 19 },

  // ── 32×32 (bandit-necro) ────────────────────────────────────────
  orcShaman:    { folder: '/sprites/enemies/bandit-necro',      frameW: 32, frameH: 32, idleFrames: 8, walkFrames: 8, attackFrames: 8 },

  // ── 64×64 (skeleton-enemy) ───────────────────────────────────────
  mimic:        { folder: '/sprites/enemies/skeleton-enemy',    frameW: 64, frameH: 64, idleFrames: 13, walkFrames: 13, attackFrames: 12 },

  // ── 48×48 (desert-vulture) ──────────────────────────────────────
  desertVulture:{ folder: '/sprites/enemies/desert-vulture',    frameW: 48, frameH: 48, idleFrames: 4, walkFrames: 4, attackFrames: 4, attackFile: 'attack.png' },

  // ── Special size units ────────────────────────────────────────────
  desertScorpio:{ folder: '/sprites/enemies/stormhead',         frameW: 124, frameH: 124, idleFrames: 9, walkFrames: 0, attackFrames: 9, attackFile: 'attack.png', walkFile: 'run.png' },
  ogreBoss:     { folder: '/sprites/boss-demon',                frameW: 100, frameH: 100, idleFrames: 6, walkFrames: 6, attackFrames: 6, attackFile: 'cleave.png' },
  giantCrab:    { folder: '/sprites/enemies/stormhead',         frameW: 124, frameH: 124, idleFrames: 9, walkFrames: 0, attackFrames: 9, attackFile: 'attack.png', walkFile: 'run.png' },
  grum:         { folder: '/sprites/characters/knight',         ...S100, attackFrames: 7 },
  katan:        { folder: '/sprites/characters/archer',         ...S100, attackFrames: 9 },

  // ── Demons (demon-minion1 sprites use prefixed filenames) ─────────────────
  demon:        { folder: '/sprites/enemies/demon-minion1',     frameW: 100, frameH: 100, idleFrames: 6, walkFrames: 6, attackFrames: 6, idleFile: 'Demon1_idle.png', walkFile: 'Demon1_walk.png', attackFile: 'Demon1_attack.png' },
  armouredDemon:{ folder: '/sprites/enemies/demon-minion1',     frameW: 100, frameH: 100, idleFrames: 6, walkFrames: 6, attackFrames: 6, idleFile: 'Demon1_idle.png', walkFile: 'Demon1_walk.png', attackFile: 'Demon1_attack.png' },
  purpleDemon:  { folder: '/sprites/enemies/demon-minion1',     frameW: 100, frameH: 100, idleFrames: 6, walkFrames: 6, attackFrames: 6, idleFile: 'Demon1_idle.png', walkFile: 'Demon1_walk.png', attackFile: 'Demon1_attack.png' },

  // ── Dragons (PascalCase filenames) ───────────────────────────────────
  dragon:       { folder: '/sprites/dragon-red',   frameW: 128, frameH: 128, idleFrames: 4, walkFrames: 6, attackFrames: 4, idleFile: 'Idle.png', walkFile: 'Walk.png', attackFile: 'Attack_1.png' },
  blackDragon:  { folder: '/sprites/dragon-red',   frameW: 128, frameH: 128, idleFrames: 4, walkFrames: 6, attackFrames: 4, idleFile: 'Idle.png', walkFile: 'Walk.png', attackFile: 'Attack_1.png' },
  blueDragon:   { folder: '/sprites/dragon-white', frameW: 128, frameH: 128, idleFrames: 4, walkFrames: 6, attackFrames: 4, idleFile: 'Idle.png', walkFile: 'Walk.png', attackFile: 'Attack_1.png' },
  whiteDragon:  { folder: '/sprites/dragon-white', frameW: 128, frameH: 128, idleFrames: 4, walkFrames: 6, attackFrames: 4, idleFile: 'Idle.png', walkFile: 'Walk.png', attackFile: 'Attack_1.png' },
  yellowDragon: { folder: '/sprites/dragon-red',   frameW: 128, frameH: 128, idleFrames: 4, walkFrames: 6, attackFrames: 4, idleFile: 'Idle.png', walkFile: 'Walk.png', attackFile: 'Attack_1.png' },

  // ── Animals (Miniworld single spritesheets) ───────────────────────────
  sheep:        { folder: '/sprites/miniworld/Animals', frameW: 16, frameH: 16, idleFrames: 4, walkFrames: 4, attackFrames: 4, idleFile: 'Sheep.png', walkFile: 'Sheep.png', attackFile: 'Sheep.png' },
  hornedSheep:  { folder: '/sprites/miniworld/Animals', frameW: 16, frameH: 16, idleFrames: 4, walkFrames: 4, attackFrames: 4, idleFile: 'HornedSheep.png', walkFile: 'HornedSheep.png', attackFile: 'HornedSheep.png' },
  chicken:      { folder: '/sprites/miniworld/Animals', frameW: 16, frameH: 16, idleFrames: 4, walkFrames: 4, attackFrames: 4, idleFile: 'Chicken.png', walkFile: 'Chicken.png', attackFile: 'Chicken.png' },
  chick:        { folder: '/sprites/miniworld/Animals', frameW: 16, frameH: 16, idleFrames: 2, walkFrames: 2, attackFrames: 2, idleFile: 'Chick.png', walkFile: 'Chick.png', attackFile: 'Chick.png' },
  horse:        { folder: '/sprites/miniworld/Animals', frameW: 32, frameH: 32, idleFrames: 4, walkFrames: 4, attackFrames: 4, idleFile: 'Horse(32x32).png', walkFile: 'Horse(32x32).png', attackFile: 'Horse(32x32).png' },
  boar:         { folder: '/sprites/miniworld/Animals', frameW: 16, frameH: 16, idleFrames: 4, walkFrames: 4, attackFrames: 4, idleFile: 'Boar.png', walkFile: 'Boar.png', attackFile: 'Boar.png' },
  pig:          { folder: '/sprites/miniworld/Animals', frameW: 16, frameH: 16, idleFrames: 4, walkFrames: 4, attackFrames: 4, idleFile: 'Pig.png', walkFile: 'Pig.png', attackFile: 'Pig.png' },
};

/** Kept for backward compat — returns same as getUnitSprites */
export function getLegionSprites(type: UnitType): Record<string, SpriteConfig> {
  return getUnitSprites('red', type);
}

/**
 * Unified sprite resolver — all units, all factions.
 * Priority: local Tiny Swords faction-colored sprites → ObjectStore CDN sprites → empty (fallback circle).
 */
export function getUnitSprites(faction: 'blue' | 'red' | 'neutral', type: UnitType): Record<string, SpriteConfig> {
  // 1. Try local faction-colored Tiny Swords sprite
  const tsSpriteKey = _TS_UNIT_MAP[type];
  if (tsSpriteKey) {
    const fKey = faction === 'red' ? 'red' : 'blue';
    const ts = _TS_SPRITES[tsSpriteKey];
    const paths = ts[fKey];
    const make = (src: string, frames: number, msPF: number): SpriteConfig =>
      ({ src, frameW: ts.frameW, frameH: ts.frameH, frames, msPerFrame: msPF });
    return {
      idle: make(paths.idle, ts.idleFrames, 160),
      run: make(paths.run, ts.runFrames, 100),
      attack: make(paths.attack, ts.attackFrames, 80),
      interact: make(paths.idle, ts.idleFrames, 120),
    };
  }

  // 2. Fall back to ObjectStore CDN sprite map
  const mapping = SPRITE_MAP[type];
  if (!mapping) return {};

  const fw = mapping.frameW;
  const fh = mapping.frameH;
  const idleFile   = mapping.idleFile   ?? 'idle.png';
  const walkFile   = mapping.walkFile   ?? 'walk.png';
  const attackFile = mapping.attackFile ?? 'attack1.png';

  // Use idle as fallback for walk if walkFrames is 0
  const walkSrc = mapping.walkFrames > 0 ? walkFile : idleFile;
  const walkFrames = mapping.walkFrames > 0 ? mapping.walkFrames : mapping.idleFrames;

  return {
    idle:     cdnSprite(`${mapping.folder}/${idleFile}`,   mapping.idleFrames,   160, fw, fh),
    run:      cdnSprite(`${mapping.folder}/${walkSrc}`,    walkFrames,            100, fw, fh),
    attack:   cdnSprite(`${mapping.folder}/${attackFile}`, mapping.attackFrames,  80,  fw, fh),
    interact: cdnSprite(`${mapping.folder}/${idleFile}`,   mapping.idleFrames,   120, fw, fh),
  };
}
