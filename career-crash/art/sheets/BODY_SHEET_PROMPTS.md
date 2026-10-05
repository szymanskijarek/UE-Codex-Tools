# Body sheet prompts

Replaced by [`art/CHARACTER_PROMPTS.md`](../CHARACTER_PROMPTS.md). It has:

- up-to-date prompts for the Security Guard, Delivery Driver, Janitor and
  Engineer, rewritten to match their existing faces;
- the referee's body sheet and heads;
- the pixel-art layout reference (`art/heads/_reference/body-sheet-example.webp`).

## After importing a body sheet

1. Run `pnpm --filter @cc/art-pipeline puppets <career>` and check the labelled
   preview in `tools/art-pipeline/out/puppets/`.
2. If parts land in the wrong slots, map them in `art/sheets/manifest.json`:
   `parts` for the slot order, `split` for merged parts, `flip` for upside-down
   ones, `noFeet` if the shins include the shoes.
3. Run `pnpm check`, then watch a Sandbox fight.
