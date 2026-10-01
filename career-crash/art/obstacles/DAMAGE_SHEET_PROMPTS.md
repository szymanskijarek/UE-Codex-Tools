# Damage sheet prompts: the obstacles still without damaged / destroyed art

These objects squash into a plain grey heap when destroyed until their sheets
exist. Each arena needs two sheets, `<arena>-damaged.png` and
`<arena>-destroyed.png`, saved in `art/obstacles/`. Docks only needs the damaged one.

**Attach the arena's intact sheet** (`art/obstacles/<arena>.png`) as the reference
image with every prompt. The damaged and destroyed versions must be the same objects.

**Checklist for every sheet** (the slicer relies on this):
- 1254 × 1254 px, transparent background (flat white if the generator can't).
- The grid, order and cell positions in the table below. Every cell holds exactly
  one object; the slicer can't handle an empty cell.
- Every object fully inside its cell, with a clear gap around it. No floor tiles,
  ground shadows, text or labels.
- Same 3/4 top-down camera angle, scale, outline weight and palette as the intact art.

## Shared style preamble

Paste this first, then the arena's paragraph:

> Game asset sheet for a 2D cartoon workplace brawler, matching the attached
> reference sheet exactly: same objects, same order and grid positions, same 3/4
> top-down camera angle, same scale, same thick dark outline, flat colour fills
> with one soft shadow tone, light from the top left, transparent background,
> each object isolated in its own cell with generous empty space around it, no
> floor, no ground shadow, no text.

Then add **one** of these two state paragraphs:

**Damaged** (shown at half health, still standing):

> DAMAGED STATE: each object is still standing in the same pose and silhouette,
> but clearly beaten up in a funny way: dents, cracks, a hanging panel or door,
> a missing piece or two, scuffs, a little smoke or sparks where it makes sense,
> spilled contents peeking out. It must still read instantly as the same object.

**Destroyed** (lies flat on the floor and becomes part of the background):

> DESTROYED STATE: each object completely wrecked and collapsed FLAT onto the
> floor: a low pile of broken pieces, panels, debris and spilled contents,
> spread out roughly over the object's original footprint. Nothing sticks up
> higher than about a fifth of the original object's height. Seen from the same
> 3/4 top-down angle, as if you could walk over it. Keep the colours and key
> details so you can tell what it used to be.

## Per arena

Cells are listed in reading order (left to right, top to bottom).

| Sheet | Grid | Cells |
|---|---|---|
| `diner-damaged` / `diner-destroyed` | 3 × 2 | diner counter · diner booth · jukebox · diner table · diner pass (kitchen hatch) · drinks fridge |
| `office-damaged` / `office-destroyed` | 3 × 2 | cubicle cluster · meeting table · bench desks · filing cabinets · photocopier · reception desk |
| `station-damaged` / `station-destroyed` | 3 × 2 | ticket gates · station bench · news kiosk · coffee kiosk · ticket booth · timetable board |
| `supermarket-damaged` / `supermarket-destroyed` | 3 × 2 | gondola shelf · fridge wall · checkout · chest freezer · produce stand · floor scrubber *(filler; skipped on import)* |
| `warehouse-damaged` / `warehouse-destroyed` | 2 × 2 | pallet rack · crate stack · cage pallet · drum rack |
| `construction-damaged` / `construction-destroyed` | 3 × 2 | scaffold · jersey barrier · cement mixer · rebar bundle · brick stack · site cabin |
| `docks-damaged` | 2 × 2 | shipping container · dock crane · winch · bollards |

The floor scrubber, forklift and conveyor never break: they are moving or floor
machines. The warehouse sheet leaves them out and uses a 2 × 2 grid with
`"cols": 2`, like the newer arenas. The supermarket's floor scrubber stays only to
fill the sixth cell.

Arena paragraphs to add after the state paragraph:

- **Diner:** retro 1950s American diner furniture: chrome, red vinyl, checkered
  details. Broken pieces include ketchup splats, smashed plates, spilled fries and
  milkshake.
- **Office:** modern open-plan office furniture: grey partitions, monitors,
  swivel chairs, paper everywhere, a printer spitting pages, coffee spills.
- **Train station:** Victorian-meets-modern station furniture: dark green
  ironwork, wooden bench slats, newspapers and magazines scattered, coffee cups,
  timetable letters fallen off.
- **Supermarket:** shop fittings: shelves of colourful packaged goods, glass
  fridge doors, conveyor checkout, ice and frozen food, rolling fruit and veg.
- **Warehouse:** only four objects, in a 2 × 2 grid: pallet rack, crate stack,
  cage pallet, drum rack (leave out the forklift and conveyor). Industrial racking and storage: orange steel racks, cardboard
  boxes, wooden pallets, oil drums, a wire roll cage; boxes burst open.
- **Construction site:** building-site kit: steel scaffold tubes, concrete
  barrier, cement mixer with spilled cement, rebar, bricks, a portable site cabin.
- **Docks:** harbour equipment, weathered and salty: blue shipping container,
  small yellow dock crane, rope winch, iron mooring bollards.

## After importing

Add the new sheets to `art/obstacles/manifest.json`, using the same layout as the
existing ones:
- Name each object `<art>-damaged` or `<art>-destroyed`.
- Put `null` for the supermarket's floor-scrubber cell.
- Add `"px": 130` on destroyed sheets.

Then run `pnpm --filter @cc/art-pipeline items obstacles` and check the preview.
The renderer picks the new states up by name; no code changes are needed (`PIPELINES.md` §5.4).
