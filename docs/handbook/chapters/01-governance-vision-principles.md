# 1. Governance, Vision, and Design Principles

## 1.1 Document purpose

This handbook aligns product, design, art, engineering, content, and QA. It defines what the game is, what it is not, which behavior is protected, and how new work enters the project. It should reduce rework, visual drift, and accidental changes to tuned gameplay.

The document is prescriptive where consistency matters and flexible where experimentation is healthy. A contributor may propose a better solution, but must identify the rule being challenged and obtain approval before replacing it.

## 1.2 Product vision

**One in a Million** turns an instantly understandable race-to-the-egg premise into a charming, skill-based mobile arcade game. Players physically rev up by shaking, steer by tilting, recover from mistakes, race friends or live opponents, and express themselves through a customizable hero.

The target feeling is:

> “I understood it in seconds, laughed at the premise, felt clever when I nailed the launch, and immediately wanted another run.”

## 1.3 Player promise

Every session should deliver at least three of these:

- a physical, satisfying launch ritual;
- a readable skill challenge;
- visible improvement or mastery;
- a close race or personal-best chase;
- a funny, shareable moment;
- a useful reward or progression step;
- a reason to compare with a friend.

## 1.4 Audience

The primary audience is casual and social mobile players aged approximately 13 and older who enjoy short arcade sessions, friendly competition, customization, and shareable challenges. The tone must remain suitable for broad app-store distribution.

The game must be approachable to players who do not identify as “gamers.” Skill depth comes from timing, body control, route choice, and recovery—not from complex button combinations.

## 1.5 Positioning

The useful comparison is “the energy and clarity of a polished casual endless racer with a cute biology theme.” References such as *Jetpack Joyride*, *Subway Surfers*, *Fall Guys*, and *Brawl Stars* communicate polish, silhouette readability, and playful motion. They are inspiration, not templates to copy.

Distinctive features:

- motion controls are the main mechanic, not a novelty;
- shaking creates speed but temporarily reduces steering control;
- there is no ordinary crash death, so races stay competitive;
- asynchronous ghost challenges are native to sharing;
- the character and premise support strong cosmetic expression.

## 1.6 Product pillars

### Physical fun

The phone becomes part of the fantasy. Shake and tilt must feel responsive, intentional, and safe. Controls should be calibratable, explainable in seconds, and backed by touch/keyboard alternatives.

### Skill without exclusion

Perfect launches, clean lines, resource timing, and fast recovery reward mastery. Failure should cost time and position without routinely ending a session.

### Readable chaos

The race may be energetic, but the player must understand hazards, opponents, pickups, speed, and finish state at a glance—even while moving the phone.

### Social replayability

Live rooms, codes, ghost links, results, and later leaderboards should make “one more race” easy to initiate and easy to share.

### Expressive charm

Spermy is a lovable avatar. Cosmetics provide identity and progression without changing the competitive hitbox or hiding important gameplay information.

## 1.7 Design principles

### Protect the control loop

The loop is:

```text
Shake to build speed → release in the GO zone → tilt to dodge
→ shake briefly to recover speed → release to steer → sprint to finish
```

Any feature that makes continuous shaking optimal, makes tilting irrelevant, or adds another required thumb action during precision steering weakens the core.

### Clarity before decoration

Hazards need readable silhouettes, telegraphs, and collision expectations. Cosmetics, particles, and track detail must not obscure routes, pickups, rivals, or the player.

### Feedback for every meaningful action

Launch quality, collision, pickup collection, shield use, boost, checkpoint, position change, final sprint, finish, unlock, purchase, and equip all require clear visual feedback. Sound and haptics reinforce—but never replace—visual communication.

### Motion everywhere, distraction nowhere

The world should feel alive: tails wave, walls breathe, cells pulse, particles drift, buttons compress, and rewards sparkle. Ambient motion is slow and low contrast; gameplay motion is directional and higher contrast.

### Friendly biology, not anatomy

Use abstract organic forms, soft wet materials, cells, membranes, bubbles, cilia, and flowing light. Avoid realistic tissue, bodily fluids, medical gore, sexualized framing, or explicit anatomy.

### Consistency creates quality

Use the same tokens, radii, outline language, lighting direction, icon weight, naming scheme, and interaction states across all features.

### Fair monetization

Purchases may accelerate collection or provide cosmetics and convenience. Competitive outcomes must not be sold. Any paid random mechanic requires a separate legal and ethical review and is not part of the baseline.

## 1.8 Tone and writing

Voice is confident, playful, brief, and encouraging.

Use:

- “Perfect launch!”
- “You’re gaining!”
- “New best!”
- “Shake it off.”
- “Ready for a rematch?”

Avoid:

- crude jokes;
- shame, reproductive-health claims, or medical claims;
- aggressive casino language;
- overly technical sensor instructions;
- jokes that target a player’s body, identity, or fertility.

Keep in-race messages to one short line. Buttons use clear verbs: `RACE`, `EQUIP`, `INVITE`, `TRY AGAIN`, `CLAIM`.

## 1.9 Platform and accessibility baseline

- CSS viewport range: design down to 320 × 568 and up through tablet portrait.
- Reference artboard: 1080 × 1920.
- Respect `safe-area-inset-*`.
- Minimum touch target: 44 × 44 CSS pixels; 48 × 48 preferred.
- Essential text contrast: WCAG AA where practicable.
- Do not communicate state by color alone.
- Offer reduced motion for menus and nonessential effects.
- Offer haptic, sound, and music controls independently.
- Support touch and keyboard fallback.
- Provide calibration and re-center controls.
- Avoid rapid flashes and high-frequency full-screen pulses.

## 1.10 Decision records

Material decisions use this template:

```markdown
## ADR-YYYY-NNN: Decision title
- Date:
- Status: Proposed | Accepted | Superseded
- Owner:
- Context:
- Decision:
- Alternatives:
- Consequences:
- Systems affected:
- Migration:
```

Use a decision record for control changes, economy changes, networking authority, data migrations, art-style changes, new currencies, or a major rendering migration.

