// All the words. Characters, barks, driver excuses, supervisor radio chatter.
// Humour is a creative pillar: when in doubt, add another line.

export const CHARACTERS = [
  {
    id: 'brenda', name: 'Brenda Pocock', title: 'The Biro',
    skin: '#f1c7a5', trim: '#e84a5f', speed: 1.0, writeTime: 1.2,
    ability: { id: 'scrawl', name: 'Rapid Scrawl', cooldown: 20, desc: 'For 6 seconds tickets are written almost instantly.' },
    quirk: 'Carries 36 biros. Has named all of them.',
    barks: {
      ticket: ['Signed, sealed, laminated.', "That's a Pocock special.", 'Lovely penmanship, if I say so myself.', 'Ooh, nearly ran out of ink there.', 'Gerald the biro strikes again.'],
      ability: ['BIRO MODE ENGAGED.', "Stand back. I'm clicking the pen.", 'Four colours. All of them angry.'],
      idle: ["I've got 36 biros in this vest.", "My hand's cramping but my spirit isn't.", 'Blue ink is for amateurs.'],
      complaint: ['It was a legal bay?! Well, it LOOKED smug.', "I'll just... pretend that didn't happen.", 'Gerald made me do it.'],
      hanging: ['...I was stretching.', 'Right. Yep. Fine.'],
      high5: ['Up top, love!', 'Team Biro!'],
      stunned: ['My pens! Mind my pens!']
    }
  },
  {
    id: 'kevin', name: 'Kevin Dimmock', title: 'The Small-Talker',
    skin: '#e8b48f', trim: '#4a90e2', speed: 1.0, writeTime: 1.3,
    ability: { id: 'smalltalk', name: 'Awkward Chat', cooldown: 18, desc: 'Nearby drivers are trapped in small talk for 7 seconds.' },
    quirk: 'Rehearses conversations in the mirror. They still go badly.',
    barks: {
      ticket: ['Sorry! Sorry. It\'s the rules. Sorry.', "I'll leave it here and walk away quickly.", 'Have a lovely day! ...despite this.', 'Please don\'t look at me.'],
      ability: ['So... weather, eh?', 'Did you see the match? I didn\'t. I just ask.', 'Big fan of your... shoes?', 'Funny how roads are long, isn\'t it?'],
      idle: ['I rehearse conversations in the mirror.', 'Is it rude to wave at a car?', 'I said "you too" to a lamppost earlier.'],
      complaint: ['Oh no. Oh no no no.', 'Can I un-ticket it? Is that a thing?'],
      hanging: ['I was... waving. At a bird.', 'That\'s going in the diary.'],
      high5: ['Oh! Contact! Wow!', 'We did it! We touched hands!'],
      stunned: ['Sorry! My fault! Probably!']
    }
  },
  {
    id: 'gordon', name: 'Gordon Clamp', title: 'Clampy',
    skin: '#d9a07f', trim: '#f5a623', speed: 0.9, writeTime: 1.3,
    ability: { id: 'clamp', name: 'Wheel Clamp', cooldown: 16, desc: 'Clamp a nearby offending car: +2 points and the driver is stuck for 14s.' },
    quirk: 'His surname is genuinely Clamp. He took it as a sign.',
    barks: {
      ticket: ['Clamp would be better. But fine.', 'Consider yourself warned. By me. Gordon.', 'Next time: the CLAMP.'],
      ability: ['Say hello to Big Sheila.', 'CLAMP. CLAMP. CLAMP.', "It's not a clamp, it's a lifestyle."],
      idle: ['I dream in clamps.', 'Every car is just a clamp that hasn\'t happened yet.'],
      complaint: ['A clamp would never have made that mistake.'],
      hanging: ['Hands are for clamps anyway.'],
      high5: ['Firm grip. Like a clamp.'],
      stunned: ['Not the knees!']
    }
  },
  {
    id: 'tariq', name: 'Tariq "Nudge" Nadeem', title: 'Creative Repositioner',
    skin: '#b5835a', trim: '#7ed321', speed: 1.0, writeTime: 1.2,
    ability: { id: 'nudge', name: 'Creative Repositioning', cooldown: 22, desc: 'Shove a nearby car into the nearest free illegal spot. Totally above board.' },
    quirk: 'Former removal man. Can lift a Fiat Panda "if it\'s being difficult".',
    barks: {
      ticket: ['Fair and square. Mostly square.', 'Nobody saw anything.', 'The car wanted to be there.'],
      ability: ['Just a little... *hnnng*... nudge.', 'Lift with the legs!', 'Where you parked is a matter of opinion.'],
      idle: ['Technically I\'m "rearranging the street".', 'I once moved a Hummer with spite alone.'],
      complaint: ['In my defence, I have no defence.'],
      hanging: ['I\'ll carry that shame. I carry everything.'],
      high5: ['Solid palm, that.'],
      stunned: ['Pulled something. Everything.']
    }
  },
  {
    id: 'maureen', name: 'Maureen Fennimore', title: 'The Meter Whisperer',
    skin: '#f3d2b8', trim: '#bd10e0', speed: 0.95, writeTime: 1.1,
    ability: { id: 'meter', name: 'Sweet Nothings', cooldown: 20, desc: 'Nearby parking meters mysteriously expire.' },
    quirk: 'Talks to parking meters. Claims they talk back. They do.',
    barks: {
      ticket: ['The meter told me everything.', 'Time\'s up, sunshine.', 'Meters don\'t lie. People do.'],
      ability: ['Shhh, little meter. Let it go.', 'Tick tock, darlings.', 'Who\'s a good meter? YOU are.'],
      idle: ['That meter on Chapel Street is a gossip.', 'Meter number 14 is going through a divorce.'],
      complaint: ['The meter lied to me! Wendy, how COULD you?'],
      hanging: ['The meters would never leave me hanging.'],
      high5: ['Ooh! Aren\'t you lovely.'],
      stunned: ['Oof, my hip!']
    }
  },
  {
    id: 'declan', name: 'Declan Rafferty', title: 'Freelance Line Painter',
    skin: '#f0c0a0', trim: '#f8e71c', speed: 1.0, writeTime: 1.3,
    ability: { id: 'paint', name: 'Fresh Lines', cooldown: 15, desc: 'Paint double yellows over the nearest bay. Parked cars become offenders.' },
    quirk: 'Not strictly employed by the council. Nobody has checked.',
    barks: {
      ticket: ['Should\'ve read the lines, mate.', 'Those lines have ALWAYS been there. Since just now.'],
      ability: ['Wet paint! Very legal wet paint!', 'A little yellow never hurt anyone.', 'Art is subjective. Fines are not.'],
      idle: ['Got three tins of yellow and a dream.', 'Is it still vandalism if it\'s yellow?'],
      complaint: ['Must have missed a spot. Of paint.'],
      hanging: ['Got paint on my hands anyway.'],
      high5: ['Oops, you\'re a bit yellow now.'],
      stunned: ['Mind the tin!']
    }
  },
  {
    id: 'nigel', name: 'Nigel Pratt', title: 'The Jobsworth',
    skin: '#f5d0b0', trim: '#50e3c2', speed: 0.95, writeTime: 1.0,
    ability: { id: 'lecture', name: 'Procedural Lecture', cooldown: 18, desc: 'Rival wardens nearby are stunned for 3s by a reading of Section 14b.' },
    quirk: 'Has read the Traffic Management Act 2004 eleven times. For fun.',
    barks: {
      ticket: ['Section 14b, subsection "gotcha".', 'Procedure has been followed.', 'I\'ve photographed it from four angles.'],
      ability: ['Actually, per Section 14b...', 'I\'ll need you to listen VERY carefully.', 'Chapter 3. Clipboard etiquette.'],
      idle: ['My clipboard has a clipboard.', 'Fun fact: nothing is fun.'],
      complaint: ['I will be appealing my own ticket.'],
      hanging: ['High-fives are not in the handbook.'],
      high5: ['Technically this is unauthorised contact.'],
      stunned: ['This is highly irregular!']
    }
  },
  {
    id: 'priya', name: 'Priya Chandra', title: 'Drone Operator',
    skin: '#a8754f', trim: '#00bcd4', speed: 1.05, writeTime: 1.2,
    ability: { id: 'drone', name: 'Eye in the Sky', cooldown: 20, desc: 'Launch the drone: every offender on the map is revealed to you for 8s.' },
    quirk: 'Bought the drone herself. Named it "Sergeant Buzz".',
    barks: {
      ticket: ['Sergeant Buzz saw it all.', 'Caught in 4K.', 'Aerial evidence, babe.'],
      ability: ['Sergeant Buzz, GO!', 'Deploying surveillance. Legally-ish.', 'Eyes in the sky!'],
      idle: ['Buzz has 12,000 followers.', 'The pigeons hate Buzz.'],
      complaint: ['Buzz. We need to talk about your camera.'],
      hanging: ['Buzz would have high-fived me.'],
      high5: ['Nice! Buzz got that on camera.'],
      stunned: ['Buzz! Help!']
    }
  },
  {
    id: 'sandra', name: 'Sandra Bassett', title: 'Tea Lady',
    skin: '#f1c7a5', trim: '#8b572a', speed: 0.9, writeTime: 1.2,
    ability: { id: 'tea', name: 'Tea Break', cooldown: 25, desc: 'Deploy a tea urn. Any warden near it (even rivals) moves and writes faster.' },
    quirk: 'Believes every problem is solved by a brew. Is usually right.',
    barks: {
      ticket: ['There you go, pet.', 'Nothing personal. Biscuit?'],
      ability: ['KETTLE\'S ON!', 'Milk, two sugars, no mercy.', 'Nobody tickets on an empty stomach.'],
      idle: ['Have you eaten? You look peaky.', 'I\'ve got custard creams in the vest.'],
      complaint: ['Oh dear. I\'ll bring them a cuppa to apologise.'],
      hanging: ['Nevermind, love. Tea?'],
      high5: ['Ooh, lovely! Warm hands, warm heart.'],
      stunned: ['Mind the urn!']
    }
  },
  {
    id: 'derek', name: 'Derek Bright', title: 'Hi-Vis Enthusiast',
    skin: '#e0b090', trim: '#ff6f00', speed: 1.0, writeTime: 1.2,
    ability: { id: 'dazzle', name: 'Retina Burn', cooldown: 18, desc: 'Flash the vest. Rival wardens nearby are blinded and slowed for 3.5s.' },
    quirk: 'Wears four hi-vis vests. Visible from space. Confirmed by NASA.',
    barks: {
      ticket: ['You couldn\'t have missed me. So why did you park there?', 'Brightly done.'],
      ability: ['BEHOLD THE VEST.', 'Maximum visibility!', 'Reflective strips: ACTIVATED.'],
      idle: ['Four vests. Zero regrets.', 'I\'m wearing hi-vis pyjamas right now.'],
      complaint: ['I was too bright to see the sign.'],
      hanging: ['...Could you not see me? I\'m VERY visible.'],
      high5: ['High-vis five!'],
      stunned: ['Mind the vests!']
    }
  },
  {
    id: 'colin', name: 'Colin Pyle', title: 'Cone Man',
    skin: '#f2c9a8', trim: '#ff5722', speed: 1.0, writeTime: 1.25,
    ability: { id: 'cone', name: 'Cone Zone', cooldown: 14, desc: 'Drop three traffic cones. Rival wardens who touch one trip over.' },
    quirk: 'Owns 400 cones. Knows each by the sound it makes when kicked.',
    barks: {
      ticket: ['Should have coned yourself.', 'One ticket, no cones. Tragic.'],
      ability: ['Cones! Cones everywhere!', 'Behold: my children.', 'Watch your step. Please don\'t.'],
      idle: ['A cone is just a hat for the road.', 'I sleep surrounded by cones.'],
      complaint: ['I\'ll cone myself in shame.'],
      hanging: ['At least the cones love me.'],
      high5: ['Cone-gratulations!'],
      stunned: ['Who put a cone there?! Oh. Me.']
    }
  },
  {
    id: 'agatha', name: 'Agatha Crumb', title: 'The Veteran (81)',
    skin: '#f5dcc8', trim: '#9b9b9b', speed: 0.85, writeTime: 0.9,
    ability: { id: 'veteran', name: 'Seen It All', cooldown: 24, desc: 'Your next 3 tickets are worth double points.' },
    quirk: 'Has been a warden since 1962. Fined a Beatle. Won\'t say which.',
    barks: {
      ticket: ['I fined better men than you in 1974.', 'Back in my day, we fined horses.', 'I\'ve got a bus pass and a grudge.'],
      ability: ['I\'ve seen it all, dear.', 'Watch and learn, children.', 'Time for some old-school justice.'],
      idle: ['I fined a Beatle once. Won\'t say which.', 'My knees predict rain. And fines.'],
      complaint: ['Hmph. My glasses were in my other cardigan.'],
      hanging: ['In my day we shook hands. Firmly.'],
      high5: ['Careful, my wrist!'],
      stunned: ['My hip! My OTHER hip!']
    }
  },
  {
    id: 'barry', name: 'Barry Stride', title: 'The Power Walker',
    skin: '#e3a883', trim: '#d0021b', speed: 1.12, writeTime: 1.35,
    ability: { id: 'sprint', name: 'Power Walk', cooldown: 12, desc: 'Three seconds of terrifyingly fast, technically-not-running walking.' },
    quirk: 'Wears shorts in all weathers. Counts steps out loud.',
    barks: {
      ticket: ['Twelve thousand and four steps. And a fine.', 'Feel the burn. Of this ticket.'],
      ability: ['HIPS. DON\'T. LIE.', 'This is NOT running.', 'Elbows OUT!'],
      idle: ['Nine thousand, eight hundred and twelve...', 'Shorts in January? Character building.'],
      complaint: ['Walked too fast to read the sign.'],
      hanging: ['I was just... doing a lunge.'],
      high5: ['SLAP! Cardio!'],
      stunned: ['My step count!']
    }
  },
  {
    id: 'lionel', name: 'Lionel Grift', title: 'The Paperwork Wizard',
    skin: '#f0caa0', trim: '#417505', speed: 1.0, writeTime: 1.2,
    ability: { id: 'steal', name: 'Paperwork Mix-up', cooldown: 20, desc: 'Swipe a point from the nearest rival warden. Honest mistake.' },
    quirk: 'His timesheets are works of fiction. Critically acclaimed.',
    barks: {
      ticket: ['Filed and fudged.', 'That one\'s definitely mine.'],
      ability: ['Oops! Clerical error!', 'Is this your ticket? It\'s mine now.', 'Paperwork is a contact sport.'],
      idle: ['Technically I\'m on lunch.', 'I have four staff IDs. For reasons.'],
      complaint: ['I\'ll file that under "someone else".'],
      hanging: ['I\'ll just write that down as a success.'],
      high5: ['Pleasure doing business.'],
      stunned: ['I want that on the record!']
    }
  }
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

// Bay types. `short` is what appears on the offence badge.
export const ZONES = {
  free:     { label: 'FREE 2HR', color: '#ffffff' },
  meter:    { label: 'PAY & DISPLAY', color: '#ffffff' },
  disabled: { label: 'BLUE BADGE', color: '#2f80ed' },
  resident: { label: 'PERMIT HOLDERS', color: '#27ae60' },
  loading:  { label: 'LOADING ONLY', color: '#f2c94c' },
  yellow:   { label: 'NO PARKING', color: '#f2c94c' },
  bus:      { label: 'BUS STOP', color: '#f2c94c' }
};

export const OFFENCES = {
  yellow:   { name: 'Double yellows', short: 'YEL', points: 1, reasons: ['Parked on double yellows with visible confidence', 'Treated the yellow lines as "a suggestion"'] },
  meter:    { name: 'Meter expired', short: 'MTR', points: 1, reasons: ['Meter expired. Driver "only popped in"', 'Paid for 10 minutes, stayed for a biography'] },
  disabled: { name: 'Blue badge bay', short: 'BB', points: 2, reasons: ['No blue badge. Claimed to be "emotionally limping"', 'Parked in blue badge bay, jogged away'] },
  resident: { name: 'No permit', short: 'PRM', points: 1, reasons: ['No permit. Claimed to be "a resident at heart"', 'Permit was a Nando\'s loyalty card'] },
  loading:  { name: 'Not loading', short: 'LDG', points: 1, reasons: ['Loading bay. Only thing loaded was a meal deal', 'Was "loading emotionally"'] },
  bus:      { name: 'Bus stop', short: 'BUS', points: 2, reasons: ['Parked in a bus stop. Was not a bus', 'Insisted the car "identifies as a bus"'] }
};

export const CAR_MODELS = [
  { name: 'Vauxhall Corsa', len: 42 },
  { name: 'Nissan Micra (dented)', len: 38 },
  { name: 'Range Rover (smug)', len: 50 },
  { name: 'Ford Fiesta', len: 42 },
  { name: 'Audi A4 (no indicators)', len: 46 },
  { name: 'Reliant Robin', len: 36 },
  { name: 'Tesla (vibes only)', len: 46 },
  { name: 'Mini Cooper', len: 36 },
  { name: 'Volvo Estate (dog inside)', len: 48 },
  { name: 'BMW (personalised plate)', len: 46 },
  { name: 'Fiat Panda', len: 36 },
  { name: 'Hearse (occupied)', len: 50 },
  { name: 'Transit Van', len: 50, van: true },
  { name: 'Ice Cream Van', len: 50, van: true },
  { name: 'Man With A Van', len: 48, van: true },
  { name: 'Florist\'s Van', len: 48, van: true }
];

export const CAR_COLORS = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#ecf0f1', '#2c3e50', '#d35400', '#16a085', '#7f8c8d', '#e84393', '#1abc9c', '#b33939'];

export const PLATES = ['B16 BOI', 'L4D 1ES', 'NO7 GLTY', 'V3RY FST', 'MUM 5CAR', 'G0T TIME', 'LAT3 AGN', 'P4RK HR', 'SUE ME', 'D4DDY', 'NO F1NE', 'Y4RD M4N', 'CH1P 5HP', 'S0RRY', 'OOP5'];

export const DRIVER_LINES = {
  ticketed: [
    'I was gone TWO minutes!',
    "I'm a personal friend of the mayor!",
    'Do you know who I am? ...some days neither do I.',
    "I'll be writing to the Echo about this!",
    'The sign was hidden by a pigeon!',
    'I pay your wages!',
    'This is a hate crime against Audis.',
    'I was only dropping off a trampoline!',
    'My horoscope said this would happen.',
    "I'm putting this on Facebook. With a frowny face."
  ],
  clamped: ['A CLAMP?! On a Tuesday?!', 'My nan\'s cooking a roast!', "I'm calling my solicitor. He's also my brother.", 'Take my car, but leave my dignity! ...too late.'],
  escaped: ['Ha! Too slow, jobsworth!', 'Nice try, Hi-Vis!', 'See you never!', 'Vroom vroom, loser!'],
  frozen: ['...uh, yes. Rainy.', 'I really must be— oh, another story.', 'Please let me leave.', 'Is he... still talking?'],
  happy: ['Lovely day for it!', 'Legal as a beagle.', 'Paid and displayed, darling.']
};

export const RADIO = {
  start: [
    "Morning all. Quota's {q}. Don't make eye contact with the Range Rovers.",
    'Control here. Quota is {q}. Remember: we are not the villains. Legally.',
    "Rise and shine, wardens. {q} tickets each or it's the car park at the leisure centre."
  ],
  random: [
    "Control: there's a Range Rover on {street} and it's feeling smug.",
    'Reminder: the vending machine in the depot now accepts tears.',
    "Control: someone's parked a mobility scooter on a roundabout. Ignore it. It's Doreen.",
    'Could whoever keeps painting yellow lines on my desk please stop. Declan.',
    "Control: reports of an Audi indicating. Unconfirmed. Probably a hoax.",
    "Warden appraisals are Friday. Bring a pen. Brenda, bring ONE pen.",
    'Control: the drone is not to be used to find your car keys, Priya.',
    "Please stop high-fiving members of the public. They don't like it.",
    "Control: Gordon, put the clamp down. That's a pram."
  ],
  halfway: ['Halfway through the shift. Team is on {team} of {teamq}. Sort it out.'],
  minute: ['One minute left. I can smell a performance review.'],
  complaint: ["Control: we've had a complaint about {name}. Again.", 'Control: {name}, that car was LEGAL. Head office is crying.', 'Control: {name}, please learn to read signs.']
};

export const SUPERVISOR_REVIEWS = {
  star: ['Exceptional. Frankly frightening. Promotion to Senior Warden (no pay rise).', "Absolute machine. The public fear you. I've never been prouder.", 'Quota smashed. I\'ve ordered you a novelty mug.'],
  met: ['Quota met. Adequate. I\'ll put a sticker on your locker.', 'Job done. Not spectacular, but the paperwork is tidy.', 'You met quota. The council is mildly pleased. That\'s a first.'],
  close: ['So close. Like a car that almost fits in a bay.', 'Nearly there. Try harder. Or cheat better.'],
  poor: ['Disappointing. You\'re on the leisure centre car park next week.', 'Was that a shift or a stroll? I\'m writing this down.', 'Your quota is crying. Please comfort it.'],
  complaints: ['Also: {c} complaints. The switchboard has asked for you by name.']
};

export const STREETS = ['Chapel Street', 'Grimsby Road', 'Mafeking Terrace', 'Pudding Lane', 'Station Approach'];

export const SHOPS = ['GREGGSY\'S', 'CURL UP & DYE', 'COD ALMIGHTY', 'VAPE ESCAPE', 'POUND PLUS PLUS', 'FLORIST GUMP', 'TAN-TASTIC', 'BREW-TIFUL', 'PLAICE OF WORSHIP', 'SOLE MAN SHOES', 'LORD OF THE FRIES', 'KNICKERBOCKER GLORY', 'HAIR FORCE ONE', 'NAILED IT', 'WOK THIS WAY', 'THE DEPOT', 'THAI TANIC', 'SPEC-TACULAR'];

// Mid-shift events. Two fire per shift; each bends the rules for a while.
export const EVENTS = [
  {
    id: 'inspection', name: 'Council Inspection', icon: '🕵️', duration: 30,
    desc: 'Inspector Hargreaves is watching. Tickets score DOUBLE, complaints cost 3.',
    start: ["Control: Inspector Hargreaves from the council is on site. Everybody look busy. Nigel, stop saluting.", "Control: council inspection, NOW. Double points. If you ticket a legal car I will personally cry."],
    end: ['Control: the inspector has left. He gave us a "satisfactory minus". Best result since 2009.'],
    barks: ['Hmm.', '*writes something down*', 'Is that a biro? Interesting.', 'I\'ll be noting that.', 'Carry on. Don\'t mind me.', 'Your vest is 3% less visible than regulation.', '*sniffs clipboard*']
  },
  {
    id: 'wedding', name: 'Wedding Convoy', icon: '💒', duration: 25,
    desc: 'A wedding party has parked EVERYWHERE illegal. Ribboned cars are worth +2 extra.',
    start: ['Control: a wedding convoy has just abandoned six cars on the double yellows. Congratulations to the happy couple. Fine them.', "Control: wedding party at the registry office. They've parked like they're in love. Which is to say, badly."],
    end: ['Control: the wedding convoy has driven off, honking. Somebody cried. Might have been Kevin.'],
    barks: []
  },
  {
    id: 'icecream', name: 'Rogue Ice Cream Van', icon: '🍦', duration: 35,
    desc: 'An ice cream van keeps parking illegally, then moving before you get there. Worth +4 extra.',
    start: ['Control: Mr Whippy is back. He parks, he sells, he vanishes. Catch that van.', 'Control: reports of an ice cream van playing Greensleeves on a bus stop. This is personal.'],
    end: ['Control: the ice cream van has escaped to the next town. We will meet again, Mr Whippy.'],
    barks: []
  },
  {
    id: 'rain', name: 'Sudden Downpour', icon: '🌧️', duration: 25,
    desc: 'Tickets smudge: writing is 50% slower. Drivers sprint back to their cars.',
    start: ["Control: it's chucking it down. Keep your tickets dry. Brenda, you can't laminate them in advance."],
    end: ['Control: rain has stopped. Please wring out your hats before entering the depot.'],
    barks: []
  },
  {
    id: 'rushhour', name: 'School Run', icon: '🚸', duration: 25,
    desc: 'Parents are abandoning cars wherever they like. Lots of offenders, very quickly.',
    start: ['Control: school run. Parents are parking on anything flat. Godspeed.', "Control: it's the school run. Chelsea tractors inbound. May God have mercy on the bus stops."],
    end: ['Control: school run over. The parents have gone. Silence returns to the land.'],
    barks: []
  }
];
