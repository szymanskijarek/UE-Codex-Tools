# Body sheet prompts: the four careers still without one

Security Guard, Delivery Driver, Janitor and Engineer draw a plain body under
their painted face until these sheets exist. Generate each one, save it as
`art/sheets/<file>.png`, then run
`pnpm --filter @cc/art-pipeline puppets <career>` and check the labelled preview
in `tools/art-pipeline/out/puppets/` (see `PIPELINES.md` §5.1).

**Checklist for every sheet** (the slicer relies on this):
- Transparent background, or flat white if the generator can't do transparency.
- Posed full figure on the **left**, the same figure's parts laid out on the **right**.
- Parts: head, torso, pelvis, 2 upper arms, 2 forearms with hands, 2 thighs,
  2 shins, 2 feet (shoes). Every part is separate, with a clear gap around it.
- No text, labels, shadows on the ground, props or back views.
- About 1600 × 1000 px or larger, landscape.

## Shared style preamble

Paste this first, then the career's paragraph:

> Character sheet for a 2D cartoon ragdoll puppet, comedic workplace brawler game.
> Stylised 2D, big head (head to body about 1 : 1.4), expressive face, thick dark
> navy outline (#1b1f2a), flat colour fills with a single soft shadow tone, lighting
> from the top left, no gradients, bright readable palette, transparent background.
> Left side: the full character standing in a relaxed 3/4 view facing right.
> Right side: the same character cut into separate paper-doll parts laid out in a
> neat grid with generous empty space between them: head (with hair and hat), torso,
> pelvis/hips, left and right upper arm, left and right forearm with hand, left and
> right thigh, left and right shin, left and right shoe. Each part is complete with
> its own outline and rounded joint ends so it can be pinned at the joints. No
> text, no labels, no floor shadow, no background.

## Security Guard → `security-guard.png`

> A stocky night-shift security guard in his fifties. Charcoal-black uniform
> (#1f2937) with a short-sleeved shirt, shoulder epaulettes, a silver badge and a
> radio clipped to the chest, black peaked cap (#111827) with a small badge, heavy
> utility belt on the pelvis, dark trousers and polished black boots.
> Expression: unimpressed, eyebrow raised, small moustache. He is holding nothing
> (the game adds his torch).

## Delivery Driver → `delivery-driver.png`

> A wiry, permanently late parcel delivery driver in her twenties. Brown courier
> polo shirt (#8b5a2b) with a lighter tan collar and a small parcel logo, tan
> baseball cap (#d4a373) worn slightly backwards, a lanyard with an ID card, cargo
> shorts with bulging pockets, high-vis ankle socks and battered running trainers.
> Expression: out of breath, mid-sprint energy, one earbud in. Hands empty (the
> game adds her parcel scanner).

## Janitor → `janitor.png`

> A calm, seen-it-all school janitor in his sixties. Slate-grey overalls
> (#64748b) with a name tag and a rag hanging from the back pocket, darker grey
> flat cap (#475569), rolled-up sleeves, a big key ring on the belt loop, work
> boots with rubber toes. Grey stubble, half-closed eyes, a knowing smirk.
> Hands empty (the game adds his mop).

## Engineer → `engineer.png`

> A confident site engineer in her forties. Teal work jacket (#0f766e) over a
> checked shirt, a high-vis orange stripe across the chest, white hard hat
> (#f5f5f5) with a sticker, a pencil behind the ear, a tape measure clipped to the
> belt, sturdy work trousers with knee pads and steel-toe boots. Expression:
> squinting at a problem she has already solved. Hands empty (the game adds her
> wrench).

## After importing

- If the preview shows parts numbered in the wrong slots, map them in
  `art/sheets/manifest.json` (`parts`; `split` for merged parts, `flip` for
  upside-down ones, `noFeet` if the shins include the shoes).
- `pnpm check`, look at a Sandbox fight, then delete the career's line from
  *Still needed* in `WORKFLOW.md`.
