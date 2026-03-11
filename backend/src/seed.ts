// ---------------------------------------------------------------------------
// Database Seed — creates Valeron, a demo Human Fighter 3
// Run: npm run db:seed
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'
import { randomUUID }   from 'crypto'
import type { CharacterData } from './modules/characters/types'

const prisma = new PrismaClient()

// ── Formula helpers (inline — backend has no formula engine dep) ────────────

const mod = (score: number) => Math.floor((score - 10) / 2)

function score(base: number, racial = 0, item = 0, temp = 0) {
  const total = base + racial + item + temp
  return { base, racialBonus: racial, itemBonus: item, tempBonus: temp, total, modifier: mod(total) }
}

// ── Skill list (39 Pathfinder skills) ──────────────────────────────────────
// Fighter class skills: Climb, Craft, Handle Animal, Intimidate,
// Knowledge(Dungeon), Knowledge(Engineering), Ride, Survival, Swim

const SKILLS: Array<{
  id: string; name: string
  linkedStat: CharacterData['skills'][0]['linkedStat']
  trainedOnly: boolean; isClassSkill: boolean
  ranks: number
}> = [
  { id:'acrobatics',          name:'Acrobatics',                   linkedStat:'dexterity',    trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'appraise',            name:'Appraise',                     linkedStat:'intelligence', trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'bluff',               name:'Bluff',                        linkedStat:'charisma',     trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'climb',               name:'Climb',                        linkedStat:'strength',     trainedOnly:false, isClassSkill:true,  ranks:3 },
  { id:'craft_alchemy',       name:'Craft (Alchemy)',              linkedStat:'intelligence', trainedOnly:false, isClassSkill:true,  ranks:0 },
  { id:'craft_armor',         name:'Craft (Armor)',                linkedStat:'intelligence', trainedOnly:false, isClassSkill:true,  ranks:0 },
  { id:'craft_weapons',       name:'Craft (Weapons)',              linkedStat:'intelligence', trainedOnly:false, isClassSkill:true,  ranks:0 },
  { id:'diplomacy',           name:'Diplomacy',                    linkedStat:'charisma',     trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'disable_device',      name:'Disable Device',               linkedStat:'dexterity',    trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'disguise',            name:'Disguise',                     linkedStat:'charisma',     trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'escape_artist',       name:'Escape Artist',                linkedStat:'dexterity',    trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'fly',                 name:'Fly',                          linkedStat:'dexterity',    trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'handle_animal',       name:'Handle Animal',                linkedStat:'charisma',     trainedOnly:true,  isClassSkill:true,  ranks:0 },
  { id:'heal',                name:'Heal',                         linkedStat:'wisdom',       trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'intimidate',          name:'Intimidate',                   linkedStat:'charisma',     trainedOnly:false, isClassSkill:true,  ranks:3 },
  { id:'knowledge_arcana',    name:'Knowledge (Arcana)',           linkedStat:'intelligence', trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'knowledge_dungeon',   name:'Knowledge (Dungeoneering)',    linkedStat:'intelligence', trainedOnly:true,  isClassSkill:true,  ranks:0 },
  { id:'knowledge_engineering',name:'Knowledge (Engineering)',     linkedStat:'intelligence', trainedOnly:true,  isClassSkill:true,  ranks:0 },
  { id:'knowledge_geography', name:'Knowledge (Geography)',        linkedStat:'intelligence', trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'knowledge_history',   name:'Knowledge (History)',          linkedStat:'intelligence', trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'knowledge_local',     name:'Knowledge (Local)',            linkedStat:'intelligence', trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'knowledge_nature',    name:'Knowledge (Nature)',           linkedStat:'intelligence', trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'knowledge_nobility',  name:'Knowledge (Nobility)',         linkedStat:'intelligence', trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'knowledge_planes',    name:'Knowledge (Planes)',           linkedStat:'intelligence', trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'knowledge_religion',  name:'Knowledge (Religion)',         linkedStat:'intelligence', trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'linguistics',         name:'Linguistics',                  linkedStat:'intelligence', trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'perception',          name:'Perception',                   linkedStat:'wisdom',       trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'perform_act',         name:'Perform (Act)',                linkedStat:'charisma',     trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'perform_dance',       name:'Perform (Dance)',              linkedStat:'charisma',     trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'perform_sing',        name:'Perform (Sing)',               linkedStat:'charisma',     trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'profession',          name:'Profession',                   linkedStat:'wisdom',       trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'ride',                name:'Ride',                         linkedStat:'dexterity',    trainedOnly:false, isClassSkill:true,  ranks:0 },
  { id:'sense_motive',        name:'Sense Motive',                 linkedStat:'wisdom',       trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'sleight_of_hand',     name:'Sleight of Hand',              linkedStat:'dexterity',    trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'spellcraft',          name:'Spellcraft',                   linkedStat:'intelligence', trainedOnly:true,  isClassSkill:false, ranks:0 },
  { id:'stealth',             name:'Stealth',                      linkedStat:'dexterity',    trainedOnly:false, isClassSkill:false, ranks:0 },
  { id:'survival',            name:'Survival',                     linkedStat:'wisdom',       trainedOnly:false, isClassSkill:true,  ranks:0 },
  { id:'swim',                name:'Swim',                         linkedStat:'strength',     trainedOnly:false, isClassSkill:true,  ranks:0 },
  { id:'use_magic_device',    name:'Use Magic Device',             linkedStat:'charisma',     trainedOnly:true,  isClassSkill:false, ranks:0 },
]

// Compute totals for each skill
// Stat modifiers: STR+3, DEX+2, CON+2, INT+0, WIS+1, CHA-1
const STAT_MODS: Record<string, number> = {
  strength:3, dexterity:2, constitution:2, intelligence:0, wisdom:1, charisma:-1,
}

const skills = SKILLS.map(s => {
  const classBon = s.isClassSkill && s.ranks >= 1 ? 3 : 0
  // Armor Training 1 reduces ACP by 1 (chain mail ACP was -5, now -4 for class skills)
  const acp      = s.id === 'acrobatics' || s.id === 'climb' || s.id === 'escape_artist'
                || s.id === 'fly'       || s.id === 'ride'  || s.id === 'stealth' || s.id === 'swim'
                   ? -4 : 0  // chain mail ACP -5, Armor Training reduces by 1 → -4
  const total    = STAT_MODS[s.linkedStat] + s.ranks + classBon + acp
  return {
    id:           s.id,
    name:         s.name,
    linkedStat:   s.linkedStat,
    isClassSkill: s.isClassSkill,
    trainedOnly:  s.trainedOnly,
    ranks:        s.ranks,
    classBonus:   classBon,
    racialBonus:  0,
    itemBonus:    0,
    tempBonus:    0,
    armorPenalty: acp,
    total,
  }
})

// ── Valeron CharacterData ───────────────────────────────────────────────────

const valeron: CharacterData = {
  // ── Identity ──────────────────────────────────────────────────────────────
  name:       'Valeron',
  playerName: 'Demo Player',
  race:       'Human',
  className:  'Fighter',
  level:      3,
  alignment:  'Lawful Good',
  background: 'Soldier',
  deity:      'Iomedae',
  size:       'Medium',
  age:        24,
  gender:     'Male',
  height:     "6'1\"",
  weight:     '210 lbs',
  homeland:   'Andoran',

  // ── Stats ──────────────────────────────────────────────────────────────────
  // Human racial bonus applied to STR
  stats: {
    strength:     score(15, 1),   // 15 base + 1 racial = 16, mod +3
    dexterity:    score(14),      // 14, mod +2
    constitution: score(14),      // 14, mod +2
    intelligence: score(10),      // 10, mod  0
    wisdom:       score(12),      // 12, mod +1
    charisma:     score(8),       //  8, mod -1
  },

  // ── Combat ────────────────────────────────────────────────────────────────
  // Chain Mail: +6 armor, max DEX +2, ACP -5
  // Heavy Steel Shield: +2 shield, ACP -2
  // Armor Training 1 reduces ACP by 1 total
  combat: {
    hitPoints: { max: 28, current: 28, temp: 0 },
    armorClass: {
      total:           20,  // 10 + 6(armor) + 2(shield) + 2(DEX)
      touch:           12,  // 10 + 2(DEX)
      flatFooted:      18,  // 10 + 6(armor) + 2(shield)
      armorBonus:       6,
      shieldBonus:      2,
      dexBonus:         2,
      naturalArmor:     0,
      deflectionBonus:  0,
      miscBonus:        0,
    },
    initiative:          2,   // DEX mod
    initiativeMiscBonus: 0,
    baseAttackBonus:     3,   // Fighter: BAB = level
    meleeAttackBonus:    6,   // BAB + STR mod (3+3)
    rangedAttackBonus:   5,   // BAB + DEX mod (3+2)
    speed:              30,
    cmb:                 6,   // BAB + STR mod (3+3)
    cmd:                18,   // 10 + BAB + STR + DEX (10+3+3+2)
  },

  // ── Saving Throws ─────────────────────────────────────────────────────────
  // Fighter level 3: Fort good (+3), Ref poor (+1), Will poor (+1)
  saves: {
    fortitude: { base:3, statModifier:2, magicBonus:0, miscBonus:0, tempBonus:0, total:5 },
    reflex:    { base:1, statModifier:2, magicBonus:0, miscBonus:0, tempBonus:0, total:3 },
    will:      { base:1, statModifier:1, magicBonus:0, miscBonus:0, tempBonus:0, total:2 },
  },

  // ── XP ────────────────────────────────────────────────────────────────────
  experience:  5000,
  nextLevelXp: 9000,

  // ── Skills ────────────────────────────────────────────────────────────────
  skills,

  // ── Feats ─────────────────────────────────────────────────────────────────
  feats: [
    {
      id:            randomUUID(),
      name:          'Power Attack',
      type:          'combat',
      prerequisites: 'STR 13, BAB +1',
      benefit:       'You can choose to take a –1 penalty on all melee attack rolls and combat maneuver checks to gain a +2 bonus on all melee damage rolls. When your BAB reaches +4, and every 4 points thereafter, the penalty increases by –1 and the bonus on damage rolls increases by +2.',
      normal:        '',
      special:       '',
      notes:         'Core fighting style. Penalty: –1 / bonus: +2.',
    },
    {
      id:            randomUUID(),
      name:          'Weapon Focus (Longsword)',
      type:          'combat',
      prerequisites: 'Proficiency with longsword, BAB +1',
      benefit:       '+1 bonus on all attack rolls with longsword.',
      normal:        '',
      special:       'You can gain this feat multiple times, but its effects do not stack. Each time you take the feat, it applies to a new type of weapon.',
      notes:         'Effective melee attack with longsword: +7 (+6 BAB+STR, +1 focus).',
    },
    {
      id:            randomUUID(),
      name:          'Cleave',
      type:          'combat',
      prerequisites: 'STR 13, Power Attack, BAB +1',
      benefit:       'As a standard action, you can make a single attack at your highest BAB against a foe within reach. If you hit, you deal damage normally and can make an additional attack (using your full BAB) against a foe that is adjacent to the first and also within reach. You can only make one additional attack per round with this feat.',
      normal:        '',
      special:       '',
      notes:         'Fighter bonus feat (level 2).',
    },
    {
      id:            randomUUID(),
      name:          'Vital Strike',
      type:          'combat',
      prerequisites: 'BAB +6',  // Note: requires BAB +6 normally; treat as early access
      benefit:       'When you use the attack action, you can make one attack at your highest BAB that deals additional weapon damage dice.',
      normal:        '',
      special:       '',
      notes:         'Level 3 feat — planned for BAB +6.',
    },
  ],

  // ── Special Abilities ──────────────────────────────────────────────────────
  abilities: [
    {
      id:             randomUUID(),
      name:           'Bravery +1',
      type:           'extraordinary',
      usesPerDay:     null,
      usesRemaining:  null,
      description:    'Starting at 2nd level, a fighter gains a +1 bonus on Will saves against fear effects. This bonus increases by +1 for every four levels beyond 2nd.',
    },
    {
      id:             randomUUID(),
      name:           'Armor Training 1',
      type:           'extraordinary',
      usesPerDay:     null,
      usesRemaining:  null,
      description:    'Starting at 3rd level, a fighter learns to be more maneuverable while wearing armor. Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum of 0) and increases the maximum Dexterity bonus allowed by his armor by 1.',
    },
    {
      id:             randomUUID(),
      name:           'Human Bonus Feat',
      type:           'racial trait',
      usesPerDay:     null,
      usesRemaining:  null,
      description:    'Humans select one extra feat at 1st level.',
    },
    {
      id:             randomUUID(),
      name:           'Skilled',
      type:           'racial trait',
      usesPerDay:     null,
      usesRemaining:  null,
      description:    'Humans gain an additional skill rank at first level and one additional rank whenever they gain a level.',
    },
  ],

  // ── Spells ─────────────────────────────────────────────────────────────────
  // Fighter has no spellcasting
  spells: {
    casterLevel:        0,
    castingStat:        'intelligence',
    spellDC:            10,
    concentrationBonus: 0,
    spellsPerDay:       [0,0,0,0,0,0,0,0,0,0],
    knownSpells:        [],
    preparedSpells:     [],
  },

  // ── Inventory ──────────────────────────────────────────────────────────────
  inventory: {
    currency: { platinum:0, gold:48, silver:7, copper:0 },
    maxCarryWeight: 346,   // Heavy load limit for STR 16
    totalWeight:    90,
    items: [
      {
        id:          randomUUID(),
        name:        'Chain Mail',
        category:    'armor',
        quantity:    1,
        weight:      40,
        value:       150,
        equipped:    true,
        description: '+6 armor bonus; max DEX +2; ACP −4 (−5 with Armor Training 1); arcane spell failure 35%; speed 20 ft.',
      },
      {
        id:          randomUUID(),
        name:        'Heavy Steel Shield',
        category:    'shield',
        quantity:    1,
        weight:      15,
        value:       20,
        equipped:    true,
        description: '+2 shield bonus; ACP −2 (−1 with Armor Training 1).',
      },
      {
        id:          randomUUID(),
        name:        'Longsword',
        category:    'weapon',
        quantity:    1,
        weight:      4,
        value:       15,
        equipped:    true,
        description: '1d8 slashing; crit 19–20/×2; martial melee weapon.',
      },
      {
        id:          randomUUID(),
        name:        'Shortbow',
        category:    'weapon',
        quantity:    1,
        weight:      2,
        value:       30,
        equipped:    false,
        description: '1d6 piercing; crit ×3; range 60 ft; martial ranged weapon.',
      },
      {
        id:          randomUUID(),
        name:        'Arrows',
        category:    'ammunition',
        quantity:    20,
        weight:      3,
        value:       1,
        equipped:    false,
        description: 'Standard arrows for shortbow.',
      },
      {
        id:          randomUUID(),
        name:        'Potion of Cure Light Wounds',
        category:    'potion',
        quantity:    2,
        weight:      0,
        value:       50,
        equipped:    false,
        description: 'Cures 1d8+1 hp of damage. Caster level 1.',
      },
      {
        id:          randomUUID(),
        name:        'Backpack',
        category:    'gear',
        quantity:    1,
        weight:      2,
        value:       2,
        equipped:    true,
        description: 'Standard adventuring backpack.',
      },
      {
        id:          randomUUID(),
        name:        'Rope, Silk (50 ft)',
        category:    'gear',
        quantity:    1,
        weight:      5,
        value:       10,
        equipped:    false,
        description: 'Silk rope — DC 24 to break (Strength check).',
      },
      {
        id:          randomUUID(),
        name:        'Torches',
        category:    'gear',
        quantity:    5,
        weight:      5,
        value:       0.05,
        equipped:    false,
        description: 'Burns for 1 hour, illuminates 20-ft radius.',
      },
      {
        id:          randomUUID(),
        name:        'Trail Rations',
        category:    'gear',
        quantity:    5,
        weight:      5,
        value:       0.5,
        equipped:    false,
        description: '1 day of trail rations per unit.',
      },
      {
        id:          randomUUID(),
        name:        'Waterskin',
        category:    'gear',
        quantity:    1,
        weight:      4,
        value:       1,
        equipped:    true,
        description: 'Holds 1 gallon of liquid.',
      },
      {
        id:          randomUUID(),
        name:        'Flint and Steel',
        category:    'gear',
        quantity:    1,
        weight:      0,
        value:       1,
        equipped:    false,
        description: 'Used to light fires.',
      },
    ],
  },

  // ── Languages ─────────────────────────────────────────────────────────────
  languages: ['Common', 'Celestial'],

  // ── Notes ──────────────────────────────────────────────────────────────────
  notes: `Valeron is a seasoned soldier from Andoran who took up the sword in service of Iomedae's cause.
He fought in several border skirmishes before adventuring life called him away from the army.

Background:
- Born in Almas, Andoran
- Served 3 years in the Eagle Knights
- Left to pursue a personal quest after his patrol was ambushed

Personality:
- Lawful Good — always plays by the rules, even when inconvenient
- Protective of innocents; dislikes bullies and tyrants
- Struggles to understand arcane magic but respects its practitioners

Goals:
- Find the bandit lord who ambushed his patrol
- Earn enough gold to buy property in Almas
- Achieve the rank of Sentinel in Iomedae's faith`,
}

// ── Seed runner ─────────────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding database…')

  // Wipe existing demo character if it exists
  await prisma.character.deleteMany({
    where: { data: { contains: '"name":"Valeron"' } },
  })

  const id = randomUUID()
  await prisma.character.create({
    data: {
      id,
      data: JSON.stringify(valeron),
    },
  })

  console.log(`✔ Created Valeron (id: ${id})`)
  console.log('Seed complete.')
}

seed()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => void prisma.$disconnect())
