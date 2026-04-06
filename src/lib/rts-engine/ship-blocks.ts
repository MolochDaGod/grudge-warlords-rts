/**
 * Space Ship Block Catalog — Grudge Space RTS (NOT the WC3 island game)
 *
 * These are SPACESHIP blocks for the space fleet/dogfight game mode.
 * For the WC3-style wooden sailing ships (sloop, galleon, frigate),
 * see ships.ts which handles the island RTS naval system.
 *
 * 95 OBJ blocks organized into categories:
 *   Structure (70): Cockpits, Fuselage, Wings, Rods, Runways, Habitats
 *   Propulsion (12): Thrusters, Hyperdrives
 *   Weapons (10): Cannons, Torpedoes, Modular Guns
 *   Miscellaneous (3): Bay Doors, Dishes
 *
 * Each block has a slot type, size, and stat modifiers.
 * Ships are assembled from blocks snapped onto attachment points.
 */

// ── Block Categories ────────────────────────────────────────────────────────────

export type BlockCategory = 'structure' | 'propulsion' | 'weapon' | 'misc';
export type BlockSlot = 'cockpit' | 'fuselage' | 'wing' | 'thruster' | 'hyperdrive' | 'cannon' | 'torpedo' | 'gunMount' | 'rod' | 'runway' | 'habitat' | 'flap' | 'dish' | 'bayDoor';
export type BlockSize = 'small' | 'medium' | 'large';

export interface ShipBlock {
  id: string;
  name: string;
  category: BlockCategory;
  slot: BlockSlot;
  size: BlockSize;
  /** OBJ file path (relative to /models/spaceship-blocks/) */
  objFile: string;
  /** Display icon for 2D UI */
  icon: string;
  /** Stat modifiers when this block is on a ship */
  stats: {
    hp?: number;
    speed?: number;
    turnSpeed?: number;
    cannonDamage?: number;
    cannonRange?: number;
    crewCapacity?: number;
    cargoCapacity?: number;
  };
  /** Attachment points for connecting other blocks */
  attachPoints: AttachPoint[];
  /** Cost to build */
  cost: { gold: number; wood: number };
  /** Description */
  description: string;
}

export interface AttachPoint {
  id: string;
  /** Allowed slot types that can connect here */
  accepts: BlockSlot[];
  /** Position offset from block center */
  offset: { x: number; y: number };
  /** Direction this point faces */
  facing: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
}

// ── Block Catalog ───────────────────────────────────────────────────────────────

const BASE = '/models/spaceship-blocks';

function block(
  id: string, name: string, category: BlockCategory, slot: BlockSlot, size: BlockSize,
  objFile: string, icon: string, stats: ShipBlock['stats'], cost: { gold: number; wood: number },
  description: string,
): ShipBlock {
  // Auto-generate basic attach points based on slot type
  const attachPoints: AttachPoint[] = [];
  if (slot === 'cockpit') {
    attachPoints.push({ id: `${id}_back`, accepts: ['fuselage', 'rod'], offset: { x: -1, y: 0 }, facing: 'back' });
  }
  if (slot === 'fuselage') {
    attachPoints.push(
      { id: `${id}_front`, accepts: ['cockpit', 'fuselage', 'runway'], offset: { x: 1, y: 0 }, facing: 'front' },
      { id: `${id}_back`, accepts: ['fuselage', 'thruster', 'hyperdrive'], offset: { x: -1, y: 0 }, facing: 'back' },
      { id: `${id}_left`, accepts: ['wing', 'cannon', 'gunMount'], offset: { x: 0, y: -1 }, facing: 'left' },
      { id: `${id}_right`, accepts: ['wing', 'cannon', 'gunMount'], offset: { x: 0, y: 1 }, facing: 'right' },
    );
  }
  if (slot === 'wing') {
    attachPoints.push(
      { id: `${id}_tip`, accepts: ['cannon', 'torpedo', 'thruster'], offset: { x: 0, y: -1 }, facing: 'left' },
    );
  }
  if (slot === 'thruster' || slot === 'hyperdrive') {
    attachPoints.push(
      { id: `${id}_mount`, accepts: ['fuselage', 'rod'], offset: { x: 1, y: 0 }, facing: 'front' },
    );
  }
  return { id, name, category, slot, size, objFile: `${BASE}/${objFile}.obj`, icon, stats, attachPoints, cost, description };
}

export const SHIP_BLOCKS: ShipBlock[] = [
  // ── COCKPITS ──────────────────────────────────────────────────────────────
  block('cockpit_a', 'Cockpit Model A', 'structure', 'cockpit', 'small',
    'Spacestation_Structure_Cockpit_Model_A', '🔹',
    { hp: 50, crewCapacity: 2 }, { gold: 100, wood: 50 },
    'Standard single-seat cockpit. Light and maneuverable.'),
  block('cockpit_b_center', 'Cockpit B (Center)', 'structure', 'cockpit', 'medium',
    'Spacestation_Structure_Cockpit_Model_B_Center', '🔷',
    { hp: 80, crewCapacity: 4 }, { gold: 200, wood: 100 },
    'Wide cockpit center section with bridge controls.'),
  block('cockpit_b_end1', 'Cockpit B (End Cap 1)', 'structure', 'cockpit', 'small',
    'Spacestation_Structure_Cockpit_Model_B_End_1', '🔹',
    { hp: 30 }, { gold: 50, wood: 30 },
    'Streamlined cockpit end cap variant.'),
  block('cockpit_b_end2', 'Cockpit B (End Cap 2)', 'structure', 'cockpit', 'small',
    'Spacestation_Structure_Cockpit_Model_B_End_2', '🔹',
    { hp: 30 }, { gold: 50, wood: 30 },
    'Reinforced cockpit end cap variant.'),

  // ── FUSELAGE — STRAIGHT ───────────────────────────────────────────────────
  block('fuse_straight', 'Fuselage Straight', 'structure', 'fuselage', 'medium',
    'Spacestation_Structure_Fuselage_Straight_Normal', '▬',
    { hp: 60, cargoCapacity: 2 }, { gold: 80, wood: 60 },
    'Standard straight fuselage section.'),
  block('fuse_straight_band', 'Fuselage Straight Band', 'structure', 'fuselage', 'medium',
    'Spacestation_Structure_Fuselage_Straight_Band', '▬',
    { hp: 70, cargoCapacity: 2 }, { gold: 90, wood: 70 },
    'Reinforced straight fuselage with armor band.'),
  block('fuse_straight_windows', 'Fuselage Windows', 'structure', 'fuselage', 'medium',
    'Spacestation_Structure_Fuselage_Straight_Windows', '▬',
    { hp: 50, crewCapacity: 2 }, { gold: 100, wood: 50 },
    'Windowed fuselage section — crew quarters.'),
  block('fuse_straight_vented', 'Fuselage Vented', 'structure', 'fuselage', 'medium',
    'Spacestation_Structure_Fuselage_Straight_Vented', '▬',
    { hp: 55, speed: 5 }, { gold: 85, wood: 55 },
    'Vented fuselage for improved heat dissipation.'),

  // ── FUSELAGE — ANGLED ─────────────────────────────────────────────────────
  block('fuse_angled_h', 'Fuselage Angled Horizontal', 'structure', 'fuselage', 'medium',
    'Spacestation_Structure_Fuselage_Angled_Horizontal_Normal', '◣',
    { hp: 55 }, { gold: 90, wood: 65 },
    'Horizontal angle transition piece.'),
  block('fuse_angled_v', 'Fuselage Angled Vertical', 'structure', 'fuselage', 'medium',
    'Spacestation_Structure_Fuselage_Angled_Vertical_Normal', '◥',
    { hp: 55 }, { gold: 90, wood: 65 },
    'Vertical angle transition piece.'),
  block('fuse_angled_diag', 'Fuselage Diagonal', 'structure', 'fuselage', 'medium',
    'Spacestation_Structure_Fuselage_Angled_Diagonal_Normal', '╲',
    { hp: 50 }, { gold: 85, wood: 60 },
    'Diagonal fuselage connector.'),

  // ── FUSELAGE — CURVED ─────────────────────────────────────────────────────
  block('fuse_curved_inner', 'Fuselage Curved Inner', 'structure', 'fuselage', 'medium',
    'Spacestation_Structure_Fuselage_Curved_Inner_Normal', '◜',
    { hp: 50 }, { gold: 95, wood: 70 },
    'Inner curve fuselage piece.'),
  block('fuse_curved_outer', 'Fuselage Curved Outer', 'structure', 'fuselage', 'medium',
    'Spacestation_Structure_Fuselage_Curved_Outer_Normal', '◝',
    { hp: 50 }, { gold: 95, wood: 70 },
    'Outer curve fuselage piece.'),
  block('fuse_curved_outer_large', 'Fuselage Large Curve', 'structure', 'fuselage', 'large',
    'Spacestation_Structure_Fuselage_Curved_Outer_Large_Normal', '◠',
    { hp: 80, cargoCapacity: 3 }, { gold: 150, wood: 100 },
    'Large curved fuselage section.'),

  // ── FUSELAGE — NARROW ─────────────────────────────────────────────────────
  block('fuse_narrow_front', 'Narrow Fuselage Front', 'structure', 'fuselage', 'small',
    'Spacestation_Structure_Fuselage_Narrow_Front', '▸',
    { hp: 30, speed: 10 }, { gold: 60, wood: 40 },
    'Narrow front section — reduces drag.'),

  // ── FUSELAGE — LONG ANGLED ────────────────────────────────────────────────
  block('fuse_long_angled', 'Long Angled Fuselage', 'structure', 'fuselage', 'large',
    'Spacestation_Structure_Fuselage_Long_Angled_Mid_Normal', '▬',
    { hp: 90, cargoCapacity: 4 }, { gold: 140, wood: 90 },
    'Extended angled fuselage with cargo space.'),

  // ── WINGS — THICK ─────────────────────────────────────────────────────────
  block('wing_thick_large_straight', 'Large Thick Wing', 'structure', 'wing', 'large',
    'Spacestation_Structure_Wing_Thick_Large_Straight', '═',
    { hp: 60, turnSpeed: -0.1 }, { gold: 120, wood: 80 },
    'Large straight wing — stable but reduces turn rate.'),
  block('wing_thick_large_angled', 'Large Swept Wing', 'structure', 'wing', 'large',
    'Spacestation_Structure_Wing_Thick_Large_Angled', '╲',
    { hp: 55, speed: 10 }, { gold: 130, wood: 85 },
    'Large swept wing — improved speed.'),
  block('wing_thick_medium_straight', 'Medium Thick Wing', 'structure', 'wing', 'medium',
    'Spacestation_Structure_Wing_Thick_Medium_Straight', '─',
    { hp: 40 }, { gold: 80, wood: 50 },
    'Standard medium wing.'),
  block('wing_thick_small_straight', 'Small Thick Wing', 'structure', 'wing', 'small',
    'Spacestation_Structure_Wing_Thick_Small_Straight', '╴',
    { hp: 25, turnSpeed: 0.1 }, { gold: 50, wood: 30 },
    'Compact wing — good for agility.'),

  // ── WINGS — THIN ──────────────────────────────────────────────────────────
  block('wing_thin_centered', 'Thin Wing Centered', 'structure', 'wing', 'medium',
    'Spacestation_Structure_Wing_Thin_Centered', '─',
    { hp: 20, speed: 15 }, { gold: 70, wood: 40 },
    'Thin aerodynamic wing — speed boost.'),
  block('wing_thin_forward', 'Forward Swept Wing', 'structure', 'wing', 'medium',
    'Spacestation_Structure_Wing_Thin_Foreward_Flush', '╱',
    { hp: 20, turnSpeed: 0.2 }, { gold: 75, wood: 45 },
    'Forward-swept wing — improved maneuverability.'),
  block('wing_thin_backward', 'Backward Swept Wing', 'structure', 'wing', 'medium',
    'Spacestation_Structure_Wing_Thin_Backward_Flush', '╲',
    { hp: 20, speed: 20 }, { gold: 75, wood: 45 },
    'Backward-swept wing — maximum speed.'),
  block('wing_double', 'Double Wing', 'structure', 'wing', 'large',
    'Spacestation_Structure_Wing_Double', '═',
    { hp: 45, speed: 5, turnSpeed: -0.15 }, { gold: 140, wood: 90 },
    'Double-stacked wing assembly.'),
  block('winglet_standard', 'Winglet Standard', 'structure', 'wing', 'small',
    'Spacestation_Structure_Wing_Thin_Winglet_Standard', '⌐',
    { hp: 10, turnSpeed: 0.1 }, { gold: 30, wood: 20 },
    'Small winglet for stability.'),

  // ── THRUSTERS ─────────────────────────────────────────────────────────────
  block('thruster_single_small', 'Small Single Thruster', 'propulsion', 'thruster', 'small',
    'Spacestation_Propulsion_Thruster_Single_Small', '🔥',
    { speed: 20 }, { gold: 60, wood: 30 },
    'Compact single-nozzle thruster.'),
  block('thruster_triple_small', 'Small Triple Thruster', 'propulsion', 'thruster', 'small',
    'Spacestation_Propulsion_Thruster_Triple_Small', '🔥',
    { speed: 40 }, { gold: 100, wood: 50 },
    'Triple-nozzle thruster cluster.'),
  block('thruster_triple_large', 'Large Triple Thruster', 'propulsion', 'thruster', 'large',
    'Spacestation_Propulsion_Thruster_Triple_Large', '🔥',
    { speed: 80, hp: -10 }, { gold: 200, wood: 100 },
    'Heavy thruster array — massive thrust but fragile.'),

  // ── HYPERDRIVES ───────────────────────────────────────────────────────────
  block('hyper_rear_small', 'Small Rear Hyperdrive', 'propulsion', 'hyperdrive', 'small',
    'Spacestation_Propulsion_Hyperdrive_Rearmount_Small', '⚡',
    { speed: 60 }, { gold: 200, wood: 80 },
    'Compact hyperdrive — enables island-to-island travel.'),
  block('hyper_rear_medium', 'Medium Rear Hyperdrive', 'propulsion', 'hyperdrive', 'medium',
    'Spacestation_Propulsion_Hyperdrive_Rearmount_Medium', '⚡',
    { speed: 100 }, { gold: 350, wood: 150 },
    'Standard hyperdrive — fast inter-island transit.'),
  block('hyper_rear_large', 'Large Rear Hyperdrive', 'propulsion', 'hyperdrive', 'large',
    'Spacestation_Propulsion_Hyperdrive_Rearmount_Large', '⚡',
    { speed: 150 }, { gold: 500, wood: 250 },
    'Capital-class hyperdrive — carries entire fleets.'),
  block('hyper_side_small', 'Small Side Hyperdrive', 'propulsion', 'hyperdrive', 'small',
    'Spacestation_Propulsion_Hyperdrive_Sidemount_Small', '⚡',
    { speed: 50, turnSpeed: 0.1 }, { gold: 180, wood: 70 },
    'Side-mounted compact hyperdrive.'),
  block('hyper_side_medium', 'Medium Side Hyperdrive', 'propulsion', 'hyperdrive', 'medium',
    'Spacestation_Propulsion_Hyperdrive_Sidemount_Medium', '⚡',
    { speed: 90, turnSpeed: 0.05 }, { gold: 300, wood: 120 },
    'Side-mounted standard hyperdrive.'),

  // ── WEAPONS ───────────────────────────────────────────────────────────────
  block('cannon', 'Turret Cannon', 'weapon', 'cannon', 'medium',
    'Spacestation_Weapon_Cannon', '💥',
    { cannonDamage: 30, cannonRange: 200 }, { gold: 150, wood: 50 },
    'Rotating turret cannon — medium range, medium damage.'),
  block('flush_cannon', 'Flush-Mount Cannon', 'weapon', 'cannon', 'small',
    'Spacestation_Weapon_Flush_Mount_Cannon', '💥',
    { cannonDamage: 20, cannonRange: 180 }, { gold: 100, wood: 30 },
    'Low-profile flush-mounted cannon.'),
  block('torpedo_launcher', 'Torpedo Launcher', 'weapon', 'torpedo', 'medium',
    'Spacestation_Weapon_Flush_Mount_Torpedo_Launcher', '🚀',
    { cannonDamage: 60, cannonRange: 350 }, { gold: 250, wood: 100 },
    'Heavy torpedo launcher — high damage, slow reload.'),
  block('torpedo', 'Torpedo', 'weapon', 'torpedo', 'small',
    'Spacestation_Weapon_Torpedo', '🚀',
    { cannonDamage: 80 }, { gold: 50, wood: 20 },
    'Single-use torpedo munition.'),
  block('gun_base', 'Modular Gun Base', 'weapon', 'gunMount', 'small',
    'Spacestation_Weapon_Modular_Gun_Base', '🔧',
    { hp: 20 }, { gold: 60, wood: 30 },
    'Base mount for modular gun assembly.'),
  block('gun_mount', 'Gun Turret Mount', 'weapon', 'gunMount', 'small',
    'Spacestation_Weapon_Modular_Gun_Mount', '🔧',
    { hp: 15 }, { gold: 40, wood: 20 },
    'Rotating mount for modular gun barrel.'),
  block('gun_barrel_straight', 'Straight Gun Barrel', 'weapon', 'cannon', 'small',
    'Spacestation_Weapon_Modular_Gun_Barrel_Straight', '│',
    { cannonDamage: 15, cannonRange: 160 }, { gold: 80, wood: 30 },
    'Straight barrel for modular gun.'),
  block('gun_barrel_angled', 'Angled Gun Barrel', 'weapon', 'cannon', 'small',
    'Spacestation_Weapon_Modular_Gun_Barrel_Angled', '╱',
    { cannonDamage: 15, cannonRange: 140 }, { gold: 80, wood: 30 },
    'Angled barrel for modular gun — wider firing arc.'),
  block('gun_end_cannon', 'Gun End: Cannon', 'weapon', 'cannon', 'small',
    'Spacestation_Weapon_Modular_Gun_End_Cannon', '●',
    { cannonDamage: 25, cannonRange: 200 }, { gold: 100, wood: 40 },
    'Cannon muzzle for modular gun.'),
  block('gun_end_torpedo', 'Gun End: Torpedo', 'weapon', 'torpedo', 'small',
    'Spacestation_Weapon_Modular_Gun_End_Torpedo_Launcher', '●',
    { cannonDamage: 50, cannonRange: 300 }, { gold: 180, wood: 60 },
    'Torpedo launcher muzzle for modular gun.'),

  // ── MISCELLANEOUS ─────────────────────────────────────────────────────────
  block('bay_door', 'Bay Door', 'misc', 'bayDoor', 'medium',
    'Spacestation_Miscellaneous_Bay_Door', '🚪',
    { crewCapacity: 4, cargoCapacity: 6 }, { gold: 120, wood: 80 },
    'Cargo bay door — increases crew and cargo capacity.'),
  block('dish', 'Sensor Dish', 'misc', 'dish', 'medium',
    'Spacestation_Miscellaneous_Dish', '📡',
    { cannonRange: 50 }, { gold: 80, wood: 40 },
    'Sensor dish — extends weapon targeting range.'),
  block('dish_rotating', 'Rotating Sensor Dish', 'misc', 'dish', 'medium',
    'Spacestation_Miscellaneous_Dish_Rotating', '📡',
    { cannonRange: 80 }, { gold: 120, wood: 60 },
    'Rotating dish — superior targeting range.'),

  // ── STRUCTURE EXTRAS ──────────────────────────────────────────────────────
  block('habitat', 'Habitat Module', 'structure', 'habitat', 'large',
    'Spacestation_Structure_Habitat', '🏠',
    { hp: 100, crewCapacity: 8 }, { gold: 300, wood: 200 },
    'Large habitat module — houses up to 8 crew.'),
  block('rod', 'Structural Rod', 'structure', 'rod', 'small',
    'Spacestation_Structure_Rod', '│',
    { hp: 10 }, { gold: 20, wood: 15 },
    'Simple connecting rod between sections.'),
  block('runway_mid', 'Runway Section', 'structure', 'runway', 'large',
    'Spacestation_Structure_Runway_Mid', '▬',
    { hp: 40, cargoCapacity: 2 }, { gold: 100, wood: 70 },
    'Runway section for fighter launch/landing.'),
  block('flap', 'Control Flap', 'structure', 'flap', 'small',
    'Spacestation_Structure_Flap', '▸',
    { turnSpeed: 0.15 }, { gold: 40, wood: 25 },
    'Control surface — improves maneuverability.'),
];

// ── Ship Blueprint (assembled ship) ─────────────────────────────────────────────

export interface ShipBlueprint {
  id: string;
  name: string;
  /** Block placements (block ID + position + rotation) */
  blocks: PlacedBlock[];
  /** Computed stats (sum of all block stats) */
  totalStats: {
    hp: number;
    speed: number;
    turnSpeed: number;
    cannonDamage: number;
    cannonRange: number;
    crewCapacity: number;
    cargoCapacity: number;
  };
  /** Total cost */
  totalCost: { gold: number; wood: number };
}

export interface PlacedBlock {
  blockId: string;
  /** Grid position in the builder */
  gridX: number;
  gridY: number;
  /** Rotation in 90° increments (0-3) */
  rotation: number;
}

// ── Compute blueprint stats ─────────────────────────────────────────────────────

const blockMap = new Map<string, ShipBlock>();
for (const b of SHIP_BLOCKS) blockMap.set(b.id, b);

export function getBlock(id: string): ShipBlock | undefined {
  return blockMap.get(id);
}

export function computeBlueprintStats(blocks: PlacedBlock[]): ShipBlueprint['totalStats'] {
  const stats = { hp: 0, speed: 0, turnSpeed: 1.0, cannonDamage: 0, cannonRange: 0, crewCapacity: 0, cargoCapacity: 0 };
  for (const pb of blocks) {
    const b = blockMap.get(pb.blockId);
    if (!b) continue;
    stats.hp += b.stats.hp ?? 0;
    stats.speed += b.stats.speed ?? 0;
    stats.turnSpeed += b.stats.turnSpeed ?? 0;
    stats.cannonDamage += b.stats.cannonDamage ?? 0;
    stats.cannonRange = Math.max(stats.cannonRange, b.stats.cannonRange ?? 0);
    stats.crewCapacity += b.stats.crewCapacity ?? 0;
    stats.cargoCapacity += b.stats.cargoCapacity ?? 0;
  }
  return stats;
}

export function computeBlueprintCost(blocks: PlacedBlock[]): { gold: number; wood: number } {
  let gold = 0, wood = 0;
  for (const pb of blocks) {
    const b = blockMap.get(pb.blockId);
    if (!b) continue;
    gold += b.cost.gold;
    wood += b.cost.wood;
  }
  return { gold, wood };
}

// ── Preset Ship Templates ───────────────────────────────────────────────────────

export const SHIP_TEMPLATES: { name: string; description: string; blocks: PlacedBlock[] }[] = [
  {
    name: 'Scout Fighter',
    description: 'Fast and agile — cockpit + narrow fuselage + thin wings + small thruster',
    blocks: [
      { blockId: 'cockpit_a', gridX: 3, gridY: 2, rotation: 0 },
      { blockId: 'fuse_narrow_front', gridX: 2, gridY: 2, rotation: 0 },
      { blockId: 'fuse_straight', gridX: 1, gridY: 2, rotation: 0 },
      { blockId: 'wing_thin_backward', gridX: 1, gridY: 1, rotation: 0 },
      { blockId: 'wing_thin_backward', gridX: 1, gridY: 3, rotation: 0 },
      { blockId: 'thruster_single_small', gridX: 0, gridY: 2, rotation: 0 },
    ],
  },
  {
    name: 'War Frigate',
    description: 'Heavy combat ship — armored fuselage + thick wings + cannons + triple thruster',
    blocks: [
      { blockId: 'cockpit_b_center', gridX: 5, gridY: 3, rotation: 0 },
      { blockId: 'fuse_straight_band', gridX: 4, gridY: 3, rotation: 0 },
      { blockId: 'fuse_straight_band', gridX: 3, gridY: 3, rotation: 0 },
      { blockId: 'fuse_straight', gridX: 2, gridY: 3, rotation: 0 },
      { blockId: 'wing_thick_large_straight', gridX: 3, gridY: 1, rotation: 0 },
      { blockId: 'wing_thick_large_straight', gridX: 3, gridY: 5, rotation: 0 },
      { blockId: 'cannon', gridX: 3, gridY: 0, rotation: 0 },
      { blockId: 'cannon', gridX: 3, gridY: 6, rotation: 0 },
      { blockId: 'cannon', gridX: 4, gridY: 2, rotation: 0 },
      { blockId: 'cannon', gridX: 4, gridY: 4, rotation: 0 },
      { blockId: 'thruster_triple_large', gridX: 1, gridY: 3, rotation: 0 },
      { blockId: 'dish_rotating', gridX: 5, gridY: 2, rotation: 0 },
    ],
  },
  {
    name: 'Cargo Hauler',
    description: 'Maximum cargo — habitat + bay doors + hyperdrive for island runs',
    blocks: [
      { blockId: 'cockpit_a', gridX: 4, gridY: 2, rotation: 0 },
      { blockId: 'fuse_straight_windows', gridX: 3, gridY: 2, rotation: 0 },
      { blockId: 'habitat', gridX: 2, gridY: 2, rotation: 0 },
      { blockId: 'bay_door', gridX: 2, gridY: 1, rotation: 0 },
      { blockId: 'bay_door', gridX: 2, gridY: 3, rotation: 0 },
      { blockId: 'wing_thick_medium_straight', gridX: 3, gridY: 1, rotation: 0 },
      { blockId: 'wing_thick_medium_straight', gridX: 3, gridY: 3, rotation: 0 },
      { blockId: 'hyper_rear_medium', gridX: 1, gridY: 2, rotation: 0 },
    ],
  },
];

// ── Block lookup helpers ────────────────────────────────────────────────────────

export function getBlocksByCategory(category: BlockCategory): ShipBlock[] {
  return SHIP_BLOCKS.filter(b => b.category === category);
}

export function getBlocksBySlot(slot: BlockSlot): ShipBlock[] {
  return SHIP_BLOCKS.filter(b => b.slot === slot);
}
