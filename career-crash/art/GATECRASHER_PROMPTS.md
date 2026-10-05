# Gatecrasher prompts: brief for the image agent

> **Status:** delivered and in the game (3 October 2026): all 72 body sheets
> and all 288 heads (72 characters × 4 expressions).

This file is self-contained: hand it to the image agent with the reference
images it names. Design: `docs/career-crash/07-gatecrashers.md`.

## What gatecrashers are

Now and then, partway through a fight, up to three people burst in who
belong to the venue: the train driver and two ticket inspectors at the
station, a hedge-fund owner and his lackeys at the hotel. They fight
everyone, shout a catchphrase as they arrive, and post about it afterwards.
There are 24 sets, two per arena, and each set also visits two other venues.

Each set is a **leader** and one kind of **henchman**. Up to two henchmen come
along, so every henchman type has two looks: **A** (the first one) and **B**
(the second). They are the same job in the same uniform, but different people.

**They are not playable.** Make them funnier and more specific than the
regular careers: these are the people who make a day at work worse.

## Reference images to attach

All are in `career-crash/art/heads/_reference/`:

- **`body-sheet-example.webp`**: the builder's body sheet. **Attach it to every
  body-sheet prompt.** Copy its layout and style exactly.
- For each henchman **B**, also attach the finished **A** sheet, so the two
  match in uniform and style.

## Part 1: body sheets

### Layout (copy `body-sheet-example.webp` exactly)

- **Canvas:** 1254 × 1254 px (or 1536 × 1024 landscape), transparent background.
- **Left half:** the full character standing, 3/4 view facing right, arms
  relaxed slightly away from the body, feet apart, **hands empty**.
- **Right half:** the same character cut into **13 separate pieces**, each with
  a clear transparent gap around it: head (with any hat or hair), torso,
  pelvis, left and right upper arm, left and right forearm with hand, left and
  right thigh, left and right shin, left and right shoe.
- Each piece is complete, outlined, with rounded joint ends.
- **Leave out:** held items (clipboards, torches and so on go on the body:
  clipped to a belt, hanging from a lanyard, tucked in a pocket), text,
  labels, readable logos, floor shadows, background.

### Style preamble (paste first)

> Pixel-art character sheet for "Career Crash", a comedic 2D workplace
> brawler, matching the attached example sheet exactly in style and layout:
> chunky clean pixel art, thick dark outline (#1b1f2a), flat colours with one
> shade tone, light from the top left, big head (head to body about 1 : 1.4),
> friendly cartoon proportions. Transparent background. LEFT: the full
> character standing in 3/4 view facing right, hands empty. RIGHT: the same
> character cut into 13 separate paper-doll pieces laid out like the example
> (head, torso, pelvis, two upper arms, two forearms with hands, two thighs,
> two shins, two shoes), each piece outlined, with rounded joint ends and a
> clear gap around it. No text, no labels, no shadow, no extra pieces.

### File names

- Leader: `art/sheets/npc-<persona>.png`
- Henchman A: `art/sheets/npc-<persona>.png`
- Henchman B: `art/sheets/npc-<persona>-b.png`

The `<persona>` for each character is given in its heading below.

### The characters

Main colour in brackets: use it for the main garment, so each set reads as
one group in a busy fight.

#### Supermarket

**1. Mystery Shopper: Agnes Clipboard-Hale** (`mystery-shopper`, purple #6b21a8)
> A prim woman in her sixties trying very hard to look inconspicuous and
> failing: huge black wraparound sunglasses, a purple headscarf, a beige
> trench coat with the collar turned up, a tiny notebook clipped to the belt,
> a pen behind the ear, sensible flat shoes. Pursed lips, one eyebrow raised.

**2. Trainee Mystery Shopper** (`trainee-shopper`, violet #7c3aed)
> A: Dev, a nervous young man in a fake moustache that is slipping, an
> oversized purple hoodie with the hood up, cheap sunglasses pushed up on his
> head, jeans and trainers, a notebook in the hoodie pocket.
> B: Pippa, a young woman in a too-big beige trench coat (a hand-me-down from
> Agnes), a violet beret, round sunglasses, a fake newspaper tucked under the
> belt, ankle boots.

**3. Car Park Trolley Marshal: Big Kev Pushworth** (`trolley-marshal`, orange #ea580c)
> A huge, proud car-park marshal: orange high-vis jacket over a straining
> T-shirt, a lanyard full of trolley tokens, a whistle, cargo shorts in all
> weathers, chunky work boots, a shaved head, sunburnt neck, thick ginger
> beard. Looks like he's about to tell you off for leaving a trolley in the
> wrong bay.

**4. Trolley Lad** (`trolley-lad`, orange #f97316)
> A: Jordan "Wheels", a skinny teenager-ish young man (clearly an adult) in an
> orange high-vis tabard over a tracksuit, a backwards cap, earbuds, white
> trainers, grinning.
> B: Tyler, a stocky lad in the same tabard over a football shirt, a bucket
> hat, knee-length shorts, socks pulled up, looking bored.

#### Office

**5. Change Management Consultant: Tristan Vale** (`change-consultant`, teal #0f766e)
> A smug consultant in his forties: slim-fit teal suit with no tie, white
> shirt open at the collar, a smartwatch, a laptop bag strapped across the
> chest, very white teeth, perfect swept-back hair, pointed brown shoes.

**6. Junior Associate** (`junior-associate`, teal #14b8a6)
> A: Hamish, a tall posh young man in a slightly too-big grey suit, teal tie,
> lanyard, floppy hair, wide eager eyes, shiny shoes.
> B: Ottilie, a young woman in a teal blazer and pencil skirt, hair in a tight
> bun, glasses on a chain, three pens in the breast pocket, flats.

**7. Head of IT Support: Gary from IT** (`it-support-lead`, blue #1d4ed8)
> A dishevelled IT manager who has not had his lunch: a blue polo shirt
> with a coffee stain, a lanyard with a dozen keycards, a tangle of cables over
> one shoulder, cargo trousers, sandals with socks, tired eyes, unkempt
> stubble, a headset round his neck.

**8. IT Intern** (`it-intern`, blue #3b82f6)
> A: Neil, a gangly young man in a blue T-shirt with a cartoon computer on it,
> a USB stick on a lanyard, a backpack, cords trailing from the pockets,
> trainers.
> B: Becca, a young woman in a blue hoodie with cat ears, big headphones round
> her neck, a screwdriver in the back pocket, high-tops.

#### Diner

**9. Health Inspector: Mona Grubb** (`health-inspector`, green #15803d)
> A severe inspector in a white lab coat over a green cardigan, a hairnet, blue
> latex gloves, a thermometer probe in the breast pocket, half-moon glasses,
> grey hair in a bun, white clogs. Permanently disgusted expression.

**10. Swab Deputy** (`swab-deputy`, green #22c55e)
> A: Lionel, a timid man in green scrubs, a hairnet, a face mask pulled down
> under his chin, a belt of sample tubes, white clogs.
> B: Tasha, an over-enthusiastic young woman in green scrubs, safety goggles,
> a hairnet, a clipboard clipped to the belt, white trainers.

**11. Food Truck Kingpin: Don Taco Delgado** (`food-truck-boss`, red #b91c1c)
> A big, flashy food-truck mob boss: red chef's jacket worn open over a gold
> chain, a pencil moustache, slicked-back black hair, sunglasses, a white
> apron with sauce stains, rings on every finger, two-tone shoes.

**12. Sauce Lad** (`sauce-boy`, red #dc2626)
> A: Sriracha Sam, a wiry guy in a red bandana and a red food-truck T-shirt,
> bottles of hot sauce in a bandolier across the chest, jeans, trainers.
> B: Mayo Mario, a round cheerful guy in a white paper hat and a red apron,
> squeeze bottles in the apron pocket, checked trousers, clogs.

#### Train station

**13. Train Driver: Doug Platt** (`train-driver`, navy #1e3a8a)
> A grumpy veteran train driver: navy uniform jacket with a railway badge
> (no readable text), a peaked driver's cap, an orange high-vis vest over the
> top, a big flask clipped to the belt, grey moustache, navy trousers, black
> boots. Arms like he's been leaning on a dead man's handle for 30 years.

**14. Ticket Inspector** (`ticket-inspector`, navy #1e40af)
> A: Barry, a stout inspector with a navy peaked cap, a navy waistcoat over a
> white shirt, a ticket machine on a strap across the chest, a clipped
> moustache, black shoes.
> B: Joan, a tall stern inspector with the same cap over a grey perm, a navy
> uniform skirt suit, a ticket punch on a chain, sensible black shoes.

**15. Rail Replacement Coordinator: Brenda Diversion** (`replacement-coordinator`, yellow #ca8a04)
> A frazzled, chaotic coordinator: a yellow high-vis jacket over a fleece, a
> headset, a lanyard with a laminated map, a "lollipop" diversion sign
> slung on her back, wild curly hair, walking boots.

**16. Hi-Vis Marshal** (`hi-vis-marshal`, yellow #eab308)
> A: Clive, a lanky marshal in a full yellow high-vis suit, a white hard hat,
> traffic cones stacked on a backpack, wellies.
> B: Dot, a small older woman in an oversized yellow high-vis coat down to her
> knees, a woolly hat, a whistle, wellies.

#### Warehouse

**17. Stocktake Auditor: Margaret Tally** (`auditor`, grey #4b5563)
> A meticulous auditor: grey twin-set and pearls, reading glasses on a cord, a
> calculator on a lanyard, a pencil behind each ear, a clicker counter on the
> belt, grey hair in a tight bun, practical shoes.

**18. Barcode Scanner Operator** (`barcode-scanner`, grey #6b7280)
> A: Ron, a bored warehouse worker in a grey fleece and a high-vis vest, a
> handheld scanner holstered on the hip, a beanie, steel-toe boots.
> B: Kirsty, a speedy young woman in grey overalls, a scanner holstered on the
> hip, a ponytail through a cap, knee pads, trainers.

**19. Union Rep: Big Sal Strickland** (`union-rep`, dark red #7f1d1d)
> A barrel-chested union rep: a dark red bomber jacket covered in enamel
> badges (no readable text), a megaphone hanging from the belt, a flat cap,
> a grey ponytail, jeans, Doc Martens.

**20. Shop Steward** (`shop-steward`, red #991b1b)
> A: Dennis, a mild-mannered steward in a red cardigan, a clipboard tucked in
> the belt, glasses, corduroy trousers, a tea mug clipped to the belt.
> B: Fay, a fierce steward in a red boiler suit, a whistle, a rolled-up placard
> on her back (blank), a bandana, work boots.

#### Construction site

**21. Planning Officer: Councillor Gordon Pruitt** (`planning-officer`, dark green #065f46)
> A pompous councillor: a dark green three-piece suit, a gold chain of office,
> a rolled-up planning permit tucked in the waistcoat, round glasses, a
> comb-over, polished brogues.

**22. Council Surveyor** (`surveyor`, green #047857)
> A: Ian, a lanky surveyor in a green high-vis jacket, a white hard hat, a
> folded theodolite tripod on his back, a tape measure on the belt, wellies.
> B: Bev, a brisk surveyor in a green fleece and a high-vis vest, a white hard
> hat over a short bob, a range-finder holstered on the hip, walking boots.

**23. Crane Operator: Mick "Hook" O'Hara** (`crane-operator`, amber #b45309)
> A weather-beaten crane operator who hasn't come down in a year: an amber
> work jacket, a big crane hook hanging from his belt like a medal, a hard hat
> with stickers (no text), a bushy grey beard, a harness, huge boots.

**24. Tea-Break Labourer** (`labourer`, amber #d97706)
> A: Gaz, a big labourer in an amber high-vis vest over a bare belly, a hard
> hat pushed back, a mug of tea clipped to the belt, ripped jeans, rigger boots.
> B: Stevie, a skinny labourer in an amber hoodie, a hard hat over a beanie, a
> bacon sandwich in the hoodie pocket, cargo trousers, rigger boots.

#### Docks

**25. Customs Officer: Hilda Stamp** (`customs-officer`, slate #334155)
> A suspicious customs officer: a slate-grey uniform with epaulettes, a peaked
> cap, a giant rubber stamp holstered on the belt, a torch, latex gloves,
> narrowed eyes, polished boots.

**26. Sniffer Dog Handler** (`dog-handler`, slate #475569)
> A: Colin, a gentle handler in a slate fleece and a utility vest, a dog lead
> wrapped round his waist, a pouch of dog treats, wellies.
> B: Mo, a cheerful handler in a slate jacket, a bum bag of biscuits, a dog
> whistle, a cap, trainers. (No dog: the dogs are a separate summon.)

**27. Trawler Captain: Barnaby Sole** (`trawler-captain`, teal #0e7490)
> A salty trawler captain: a yellow sou'wester hat, a teal cable-knit
> jumper, orange waterproof dungarees, wellies, a pipe in the mouth, a huge
> white beard, a fish tucked in the dungarees' bib pocket.

**28. Gutting Crew** (`gutting-crew`, teal #0891b2)
> A: Gilly, a burly deckhand in teal oilskins, a woolly hat, rubber gloves
> up to the elbows, white wellies, a fish scale on the cheek.
> B: Ray, a lanky deckhand in a teal apron over a striped top, a headtorch,
> rubber gloves, white wellies.

#### Hotel

**29. Hedge Fund Owner: Sterling Vance III** (`hedge-fund-owner`, gold-brown #854d0e)
> An absurdly rich hedge-fund owner: a camel-coloured overcoat over a
> double-breasted suit, a gold watch, a silk pocket square, slicked-back
> silver hair, a tan, loafers without socks. Looks like he owns the building.
> (He does, for about an hour.)

**30. Lackey** (`lackey`, mustard #a16207)
> A: Fitzgerald, a nervous yes-man in a mustard suit, carrying an umbrella
> furled on his back, a phone earpiece, a briefcase strapped to his back,
> shiny shoes.
> B: Penelope, an anxious assistant in a mustard skirt suit, two phones
> clipped to the belt, a tablet in a cross-body holster, a sleek bun, heels.

**31. Bride-to-Be: Kayleigh Fairweather** (`bride-to-be`, pink #db2777)
> A bride-to-be on her hen night: a short veil on a tiara, an "L-plate"
> pinned to her back, a pink sash (no readable text), a sparkly pink party
> dress, a feather boa, one high heel and one bare foot, smudged mascara,
> an enormous grin.

**32. Bridesmaid** (`bridesmaid`, pink #ec4899)
> A: Shaz, a loud bridesmaid in a hot-pink bodycon dress, a devil-horn
> headband, a pink sash, trainers (sensible), big hoop earrings.
> B: Big Lou, a tall broad bridesmaid in a pink tracksuit, a tiara, a pink
> sash, a whistle round the neck, trainers.

#### Hospital

**33. Professional Visitor: Nana Edith Bunch** (`professional-visitor`, plum #9d174d)
> A tiny, fearsome grandmother who visits everyone: a plum knitted cardigan
> over a flowery dress, a string bag of grapes hanging from her wrist, a
> balloon tied to her handbag strap (on her back), white curly perm, thick
> glasses, sturdy orthopaedic shoes.

**34. Bored Grandson** (`grandchild`, magenta #be185d)
> Both adults, about 20.
> A: Tyler, a gangly young man in a magenta hoodie, joggers, phone in the
> hoodie pocket, earbuds, sliders with socks, eyes half-closed with boredom.
> B: Kayden, a stocky young man in a magenta puffer jacket, a bucket hat,
> track pants, big white trainers, a get-well card sticking out of a pocket.

**35. Pharmaceutical Sales Rep: Chad Pfennig** (`pharma-rep`, blue #0369a1)
> A slick sales rep: a fitted blue suit, a lanyard with a logo (no text),
> bleached teeth, gelled hair, a wheelie sample case strapped to his back,
> pens in every pocket, pointy shoes.

**36. Free Pen Intern** (`free-pen-intern`, blue #0284c7)
> A: Josh, an eager intern in a blue branded polo, a lanyard, a tote bag full
> of pens over the shoulder, chinos, trainers.
> B: Freya, an eager intern in a blue branded T-shirt dress, a baseball cap,
> a sash of free pens like a bandolier, trainers.

#### Museum

**37. Year 4 Teacher: Mrs Pickering** (`school-teacher`, brown #7c2d12)
> A no-nonsense primary-school teacher: a brown corduroy jacket over a
> patterned jumper, a whistle and a lanyard, a register clipped to the belt,
> reading glasses on her head, short grey hair, a high-vis vest on top
> (trip day), sturdy shoes.

**38. Parent Helper** (`parent-helper`, rust #9a3412)
> A: Mr Dawson (dad), a harassed dad in a rust fleece and a high-vis vest, a
> child's backpack worn on the front, a packed lunch box on the belt, cargo
> shorts, walking boots.
> B: Mrs Ahmed (mum), a calm, capable mum in a rust raincoat and a high-vis
> vest, a first-aid bum bag, a clipboard on a strap, trainers.

**39. Night Watchman: Reg Lantern** (`night-watchman`, indigo #312e81)
> A jumpy, elderly night watchman: an indigo security uniform two sizes too
> big, a peaked cap, a big torch on the belt, a thermos, a ring of keys,
> enormous bags under the eyes, white tufty hair.

**40. Wax Figure (Somehow Alive)** (`wax-figure`, indigo #4338ca)
> Museum waxworks that came to life: glossy, waxy skin with a slight sheen
> and a drip melting off the chin, stiff posture, glassy eyes, a little
> museum plinth label hanging from a string on the ankle (blank).
> A: Henry VIII in wax: indigo-and-gold Tudor doublet, puffed sleeves, a
> feathered cap, a big red beard, hose and flat shoes.
> B: Napoleon in wax: an indigo military coat with gold epaulettes, a
> bicorne hat, white breeches, black boots, one hand tucked into his coat
> in the famous pose.

#### Airport

**41. Duty Free Perfume Counter Queen: Valentina Spritz** (`perfume-queen`, magenta #a21caf)
> A glamorous perfume-counter queen: a fitted magenta blazer and pencil
> skirt, a towering blow-dry, heavy make-up, long nails, a perfume atomiser
> in a holster on the hip, a gold name badge (no text), stilettos.

**42. Tester Sprayer** (`sample-sprayer`, magenta #c026d3)
> A: Mikey, a chirpy young man in a magenta waistcoat and bow tie, tester
> bottles in a bandolier, slicked hair, shiny shoes.
> B: Clara, a chirpy young woman in a magenta tunic, a scarf, test strips
> fanned in the breast pocket, a high ponytail, ballet flats.

**43. Head Baggage Handler: Terry Carousel** (`baggage-handler`, brown #78350f)
> A careless baggage handler: brown overalls with high-vis stripes, ear
> defenders round the neck, luggage tags stuck all over him, work gloves,
> a dented hard hat, steel-toe boots. Built like a suitcase.

**44. Carousel Crew** (`carousel-crew`, brown #92400e)
> A: Danny, a wiry handler in brown overalls and a high-vis vest, a roll of
> luggage tags on the belt, ear defenders, boots.
> B: Big Sue, a strong handler in a brown fleece with high-vis bands, a strap
> wound round her arm, a cap, boots.

#### Theatre

**45. Theatre Critic: Lady Penelope Scathe** (`theatre-critic`, charcoal #3f3f46)
> A withering theatre critic: a charcoal velvet cape over a black polo neck,
> opera glasses on a chain, a long cigarette holder tucked in a pocket (no
> smoke), a silver bob, a sneer, pointed boots.

**46. Understudy** (`understudy`, grey #52525b)
> A: Rupert, a hopeful actor in a half-finished costume: grey tights, a
> doublet with one sleeve, a script tucked in the belt, a ruff.
> B: Jess, a hopeful actor in a grey rehearsal leotard, leg warmers, a
> top-hat from a costume, a script in the waistband, jazz shoes.

**47. Pantomime Dame: Dame Trevor Twankey** (`pantomime-dame`, crimson #be123c)
> A towering pantomime dame: a huge crimson polka-dot frock with a bustle,
> a bright orange beehive wig, a bonnet, enormous drawn-on eyelashes and
> rosy cheeks, a five-o'clock shadow, striped stockings, giant clown shoes.

**48. Pantomime Horse (One Half)** (`panto-horse`, red #e11d48)
> A: Barry (front half): a man inside the front half of a red-and-white
> pantomime horse costume, the googly-eyed horse head over his head, his own
> legs in red tights showing below, the costume ending in a ragged edge at
> his waist.
> B: Barry (back half): another man inside the back half of the same
> costume, with the tail at the back, bent forward slightly, the head part
> missing so his own sweaty face shows through a gap at the front.

## Part 2: heads

Four heads per character (the game swaps them during a fight and uses them
for portraits).

- **Format:** one head per file, **256 × 256 px**, transparent background,
  head only, centred, filling about 85% of the canvas, the same 3/4 angle
  facing right as the head on the body sheet.
- **Files:** `art/heads/<expression>/npc-<persona>.png`, and
  `art/heads/<expression>/npc-<persona>-b.png` for henchman B.
- **Expressions:** `neutral`, `angry`, `surprised`, `hurt`.
- Generate the body sheet first and attach it to the head prompts.

> Pixel-art cartoon head for "Career Crash": chunky clean pixel art, thick dark
> outline (#1b1f2a), flat colours with one shade tone, light from the top
> left, transparent background, 256 × 256. The character from the attached
> sheet, same hat, hair and accessories. Expression: [neutral: their usual
> look, in character | angry: shouting their catchphrase, eyebrows in a V |
> surprised: eyes wide, mouth open | hurt: eyes squeezed shut, teeth gritted].

## Priority

Leaders first, in the order the career ladder reaches their arena:
supermarket, office, diner, station, warehouse, construction, docks, hotel,
hospital, museum, airport, theatre. Then henchmen A, then B. Until B arrives,
both henchmen use A.

## Importing

```
pnpm --filter @cc/art-pipeline puppets npc-train-driver npc-ticket-inspector npc-ticket-inspector-b
pnpm --filter @cc/art-pipeline faces
```

Check the labelled previews in `tools/art-pipeline/out/`. Files named
`npc-<persona>` import as the persona `npc.<persona>`, which the game looks for
before falling back to the career's art.
