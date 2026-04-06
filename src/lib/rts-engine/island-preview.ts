/**
 * Island Preview Renderer — Renders an IslandDNA to a canvas image.
 *
 * Used for:
 *   - Codex island browser
 *   - cNFT preview images
 *   - Island selection UI in-game
 *   - Marketplace thumbnails
 *
 * Renders the island procedurally using the DNA's coastline, elevation,
 * decorations, features, and biome. No tileset sprites required — pure
 * Canvas2D procedural rendering with biome-specific color palettes.
 */

import type { IslandDNA, IslandBiome, IslandDecoration, IslandFeatureGen, IslandResourceGen } from './island-gen';
import type { Vec2 } from './types';

// ── Biome color palettes ────────────────────────────────────────────────────────

interface BiomePalette {
  water: string;
  waterHighlight: string;
  foam: string;
  grass: string;
  grassLight: string;
  grassDark: string;
  cliff: string;
  cliffDark: string;
  cliffHighlight: string;
  sand: string;
}

const BIOME_PALETTES: Record<IslandBiome, BiomePalette> = {
  grassland: {
    water: '#2d8a9e', waterHighlight: '#4db8d1', foam: '#a8dce6',
    grass: '#5a9e3e', grassLight: '#6db84a', grassDark: '#3d7a2a',
    cliff: '#7a8b96', cliffDark: '#4a5860', cliffHighlight: '#9aabb6',
    sand: '#d4c090',
  },
  autumn: {
    water: '#2d7a8e', waterHighlight: '#3da0b0', foam: '#90c8d4',
    grass: '#b87830', grassLight: '#d49040', grassDark: '#8a5820',
    cliff: '#6b5a4a', cliffDark: '#4a3a2a', cliffHighlight: '#8b7a6a',
    sand: '#c4a870',
  },
  desert: {
    water: '#1e6b8e', waterHighlight: '#2e8aae', foam: '#80b8ce',
    grass: '#d4b878', grassLight: '#e4c888', grassDark: '#b49858',
    cliff: '#a08060', cliffDark: '#706040', cliffHighlight: '#c0a080',
    sand: '#e8d8b0',
  },
  snow: {
    water: '#2a6a8a', waterHighlight: '#3a8aaa', foam: '#b0d8e8',
    grass: '#c8d8e0', grassLight: '#e0e8f0', grassDark: '#a0b8c8',
    cliff: '#8090a0', cliffDark: '#607080', cliffHighlight: '#a0b0c0',
    sand: '#d0dce4',
  },
  volcanic: {
    water: '#1a3a4e', waterHighlight: '#2a5a6e', foam: '#4a7a8e',
    grass: '#3a3a3a', grassLight: '#4a4a4a', grassDark: '#2a2a2a',
    cliff: '#5a4040', cliffDark: '#3a2020', cliffHighlight: '#7a5050',
    sand: '#504040',
  },
};

// ── Feature icons ───────────────────────────────────────────────────────────────

const FEATURE_ICONS: Record<string, { icon: string; color: string }> = {
  capture_flag: { icon: '🚩', color: '#f59e0b' },
  watchtower:   { icon: '🗼', color: '#60a5fa' },
  ancient_ruin:  { icon: '🏛️', color: '#a78bfa' },
  cannon_fort:  { icon: '💣', color: '#ef4444' },
  pirate_shop:  { icon: '🏴‍☠️', color: '#f97316' },
  shipyard:     { icon: '⚓', color: '#22d3ee' },
};

const RESOURCE_ICONS: Record<string, { icon: string; color: string }> = {
  goldmine:  { icon: '💰', color: '#fbbf24' },
  tree:      { icon: '🌲', color: '#22c55e' },
  fish_node: { icon: '🐟', color: '#38bdf8' },
  rare_ore:  { icon: '💎', color: '#a855f7' },
};

// ── Main render function ────────────────────────────────────────────────────────

const TILE_PX = 32; // Pixels per tile in preview
const PADDING = 16; // Padding around the island

/**
 * Render an island preview to a canvas.
 * Returns the canvas element (can be used as an image source or for toDataURL).
 */
export function renderIslandPreview(
  dna: IslandDNA,
  scale = 1,
): HTMLCanvasElement {
  const tilePx = Math.round(TILE_PX * scale);
  const pad = Math.round(PADDING * scale);
  const canvas = document.createElement('canvas');
  canvas.width = dna.gridW * tilePx + pad * 2;
  canvas.height = dna.gridH * tilePx + pad * 2;
  const ctx = canvas.getContext('2d')!;
  const pal = BIOME_PALETTES[dna.biome];

  // ── Water background ──────────────────────────────────────────────────
  ctx.fillStyle = pal.water;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Animated-look water ripples (static for preview)
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = pal.waterHighlight;
  for (let i = 0; i < 20; i++) {
    const rx = pad + ((dna.seed * 31 + i * 97) % (dna.gridW * tilePx));
    const ry = pad + ((dna.seed * 17 + i * 53) % (dna.gridH * tilePx));
    ctx.beginPath();
    ctx.ellipse(rx, ry, tilePx * 1.5, tilePx * 0.4, i * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Water foam (around coastline) ─────────────────────────────────────
  ctx.fillStyle = pal.foam;
  ctx.globalAlpha = 0.4;
  for (let y = 0; y < dna.gridH; y++) {
    for (let x = 0; x < dna.gridW; x++) {
      if (dna.coastline[y * dna.gridW + x]) continue;
      // Check if any neighbor is land
      let nearLand = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < dna.gridW && ny >= 0 && ny < dna.gridH) {
            if (dna.coastline[ny * dna.gridW + nx]) nearLand = true;
          }
        }
      }
      if (nearLand) {
        ctx.beginPath();
        ctx.arc(pad + x * tilePx + tilePx / 2, pad + y * tilePx + tilePx / 2, tilePx * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;

  // ── Cliff shadows (below elevated tiles) ──────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let y = 0; y < dna.gridH; y++) {
    for (let x = 0; x < dna.gridW; x++) {
      if (dna.elevation[y * dna.gridW + x]) {
        ctx.fillRect(pad + x * tilePx + 2, pad + y * tilePx + tilePx - 2, tilePx, 6);
      }
    }
  }

  // ── Cliff face (south side of elevated tiles) ─────────────────────────
  for (let y = 0; y < dna.gridH; y++) {
    for (let x = 0; x < dna.gridW; x++) {
      if (!dna.elevation[y * dna.gridW + x]) continue;
      const belowElevated = y + 1 < dna.gridH && dna.elevation[(y + 1) * dna.gridW + x];
      if (!belowElevated) {
        // Draw cliff face
        const dx = pad + x * tilePx;
        const dy = pad + y * tilePx + tilePx - 4;
        ctx.fillStyle = pal.cliffDark;
        ctx.fillRect(dx, dy, tilePx, 8);
        ctx.fillStyle = pal.cliff;
        ctx.fillRect(dx, dy, tilePx, 5);
        ctx.fillStyle = pal.cliffHighlight;
        ctx.fillRect(dx + 2, dy + 1, tilePx - 4, 2);
      }
    }
  }

  // ── Flat ground tiles ─────────────────────────────────────────────────
  for (let y = 0; y < dna.gridH; y++) {
    for (let x = 0; x < dna.gridW; x++) {
      if (!dna.coastline[y * dna.gridW + x]) continue;
      const isElevated = dna.elevation[y * dna.gridW + x];
      const dx = pad + x * tilePx;
      const dy = pad + y * tilePx + (isElevated ? -4 : 0);

      // Base grass
      ctx.fillStyle = isElevated ? pal.grassLight : pal.grass;
      ctx.fillRect(dx, dy, tilePx, tilePx);

      // Grass texture variation (deterministic per tile)
      const hash = (x * 7 + y * 13 + dna.seed) & 0xff;
      if (hash < 80) {
        ctx.fillStyle = pal.grassDark;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(dx + 2, dy + 2, tilePx - 4, tilePx - 4);
        ctx.globalAlpha = 1;
      } else if (hash < 140) {
        ctx.fillStyle = pal.grassLight;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(dx + tilePx / 2, dy + tilePx / 2, tilePx * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Sand edge (coast tiles)
      const isCoast =
        (x === 0 || !dna.coastline[y * dna.gridW + (x - 1)]) ||
        (x === dna.gridW - 1 || !dna.coastline[y * dna.gridW + (x + 1)]) ||
        (y === 0 || !dna.coastline[(y - 1) * dna.gridW + x]) ||
        (y === dna.gridH - 1 || !dna.coastline[(y + 1) * dna.gridW + x]);
      if (isCoast && !isElevated) {
        ctx.fillStyle = pal.sand;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(dx, dy, tilePx, tilePx);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ── Second elevation tier ─────────────────────────────────────────────
  for (let y = 0; y < dna.gridH; y++) {
    for (let x = 0; x < dna.gridW; x++) {
      if (!dna.elevation2[y * dna.gridW + x]) continue;
      const dx = pad + x * tilePx;
      const dy = pad + y * tilePx - 8;
      ctx.fillStyle = pal.grassLight;
      ctx.fillRect(dx, dy, tilePx, tilePx);
      // Extra cliff
      const belowElev2 = y + 1 < dna.gridH && dna.elevation2[(y + 1) * dna.gridW + x];
      if (!belowElev2) {
        ctx.fillStyle = pal.cliff;
        ctx.fillRect(dx, dy + tilePx - 3, tilePx, 6);
      }
    }
  }

  // ── Decorations ───────────────────────────────────────────────────────
  const DECO_COLORS: Record<string, string> = {
    tree1: '#2d6b1b', tree2: '#3d8c28', tree3: '#8b5e20', tree4: '#a07030',
    bush1: '#4a8030', bush2: '#5a9040',
    rock1: '#888', rock2: '#777', rock3: '#666',
    sheep: '#f0f0f0',
  };

  for (const deco of dna.decorations) {
    const dx = pad + deco.gridX * tilePx + tilePx / 2;
    const dy = pad + deco.gridY * tilePx + tilePx / 2;
    const color = DECO_COLORS[deco.type] ?? '#888';

    if (deco.type.startsWith('tree')) {
      // Tree: trunk + canopy
      ctx.fillStyle = '#5b3a1a';
      ctx.fillRect(dx - 1, dy - 2, 3, 6);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dx, dy - 5, tilePx * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (deco.type.startsWith('bush')) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dx, dy, tilePx * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (deco.type.startsWith('rock')) {
      ctx.fillStyle = color;
      ctx.fillRect(dx - 3, dy - 2, 6, 5);
    } else if (deco.type === 'sheep') {
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.arc(dx, dy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(dx + 2, dy - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Resources ─────────────────────────────────────────────────────────
  for (const res of dna.resources) {
    const dx = pad + res.gridX * tilePx + tilePx / 2;
    const dy = pad + res.gridY * tilePx + tilePx / 2;
    const ri = RESOURCE_ICONS[res.type];
    if (ri) {
      ctx.fillStyle = ri.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(dx, dy, tilePx * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.round(tilePx * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(ri.icon, dx, dy + tilePx * 0.15);
      ctx.textAlign = 'left';
    }
  }

  // ── Features ──────────────────────────────────────────────────────────
  for (const feat of dna.features) {
    const dx = pad + feat.gridX * tilePx + tilePx / 2;
    const dy = pad + feat.gridY * tilePx + tilePx / 2;
    const fi = FEATURE_ICONS[feat.type];
    if (fi) {
      // Glow ring
      ctx.strokeStyle = fi.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(dx, dy, tilePx * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Icon
      ctx.font = `${Math.round(tilePx * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(fi.icon, dx, dy + tilePx * 0.2);
      ctx.textAlign = 'left';
    }
  }

  // ── Docks ─────────────────────────────────────────────────────────────
  for (const dock of dna.docks) {
    const dx = pad + dock.x * tilePx;
    const dy = pad + dock.y * tilePx;
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(dx + 2, dy + tilePx - 4, tilePx - 4, 8);
    ctx.fillStyle = '#5b3a1a';
    ctx.fillRect(dx + 4, dy + tilePx - 2, 3, 6);
    ctx.fillRect(dx + tilePx - 7, dy + tilePx - 2, 3, 6);
  }

  // ── Island name + rarity badge ────────────────────────────────────────
  const RARITY_COLORS: Record<string, string> = {
    common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
  };

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(pad, canvas.height - pad - 24, canvas.width - pad * 2, 24);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(dna.name, pad + 6, canvas.height - pad - 8);
  // Rarity badge
  ctx.fillStyle = RARITY_COLORS[dna.rarity] ?? '#888';
  ctx.font = `bold ${Math.round(9 * scale)}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(dna.rarity.toUpperCase(), canvas.width - pad - 6, canvas.height - pad - 8);
  ctx.textAlign = 'left';

  return canvas;
}

/**
 * Render island preview to a data URL (for img src or NFT image upload).
 */
export function renderIslandPreviewDataURL(dna: IslandDNA, scale = 1): string {
  return renderIslandPreview(dna, scale).toDataURL('image/png');
}
