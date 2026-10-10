# Own-words summaries for rules text that is NOT in the SRD 5.2.
# Written fresh from the mechanics; full wording is on 5e.tools (linked in the app).

SPELLS = {
 "arcane gate": "Open two linked, Large, sight-blocking portals: one at a point in range and one within 10 ft of you. Anything that goes in the open side of one comes out of the other as if they were next to each other. Bonus Action: swap which side of each portal is open.",
 "arcane vigor": "Heal yourself by spending one or two of your unspent Hit Point Dice: roll them and regain that total plus your spellcasting modifier.",
 "armor of agathys": "You gain 5 Temporary Hit Points. While any remain, a creature that hits you with a melee attack takes 5 Cold damage. The spell ends when the temporary HP run out.",
 "arms of hadar": "Every creature within 10 ft of you makes a Strength save. Fail: 2d6 Necrotic damage and it can't take Reactions until the start of its next turn. Success: half damage only.",
 "blade ward": "Until the spell ends, any creature making an attack roll against you subtracts 1d4 from the roll.",
 "cloud of daggers": "Fill a 5-ft Cube at a point in range with spinning blades. A creature takes 4d4 Slashing when the Cube appears on it, when it enters the Cube, when it ends its turn there, or when the Cube moves onto it (once per turn). On later turns, a Magic action teleports the Cube up to 30 ft.",
 "crown of madness": "A Humanoid you can see makes a Wisdom save or is Charmed. On each of its turns, before moving, it must use its action to make a melee attack against a creature you pick mentally (if one is in reach). It repeats the save at the end of each of its turns. You must take a Magic action each turn to keep control or the spell ends.",
 "friends": "One creature you can see makes a Wisdom save or is Charmed by you. It succeeds automatically if it isn't Humanoid, if you are fighting it, or if you used this on it in the last 24 hours. The spell ends if it takes damage or you attack, deal damage or force a save. Afterwards it knows you charmed it.",
 "hunger of hadar": "A 20-ft-radius Sphere of unlightable darkness appears. It is Difficult Terrain and creatures fully inside are Blinded. A creature starting its turn inside takes 2d6 Cold. A creature ending its turn inside makes a Dexterity save or takes 2d6 Acid.",
 "jallarzi's storm of radiance": "A 10-ft-radius, 40-ft-high Cylinder of light and thunder. Creatures inside are Blinded and Deafened and can't cast Verbal spells. Constitution save when it appears, on first entering in a turn, or on ending a turn there (once per turn): 2d10 Radiant plus 2d10 Thunder, half on a success.",
 "mind sliver": "One creature you can see makes an Intelligence save. Fail: 1d6 Psychic damage, and it subtracts 1d4 from the next saving throw it makes before the end of your next turn.",
 "summon aberration": "Summon an Aberrant Spirit (choose Beholderkin, Mind Flayer or Slaad) using its stat block, which scales with the slot level. It is your ally, acts straight after you on your Initiative and follows your spoken commands (no action needed). Without orders it Dodges and avoids danger.",
 "summon fey": "Summon a Fey Spirit (choose a Fuming, Mirthful or Tricksy mood) using its stat block, which scales with the slot level. It is your ally, acts straight after you on your Initiative and follows your spoken commands. Without orders it Dodges and avoids danger.",
 "summon fiend": "Summon a Fiendish Spirit (choose Demon, Devil or Yugoloth) using its stat block, which scales with the slot level. It is your ally, acts straight after you on your Initiative and follows your spoken commands. Without orders it Dodges and avoids danger.",
 "summon undead": "Summon an Undead Spirit (choose Ghostly, Putrid or Skeletal) using its stat block, which scales with the slot level. It is your ally, acts straight after you on your Initiative and follows your spoken commands. Without orders it Dodges and avoids danger.",
 "summon celestial": "Summon an angelic Celestial Spirit (choose Avenger or Defender) using its stat block, which scales with the slot level. It is your ally, acts straight after you on your Initiative and follows your spoken commands. Without orders it Dodges and avoids danger.",
 "synaptic static": "Psychic blast in a 20-ft-radius Sphere. Intelligence save: 8d6 Psychic, half on a success. A creature that fails is muddled for 1 minute: it subtracts 1d6 from attack rolls, ability checks and Concentration saves, and repeats the Intelligence save at the end of each of its turns to end it.",
 "tasha's bubbling cauldron": "A fixed cauldron appears within 5 ft and brews copies of one Common or Uncommon potion you choose. You or an ally can take one out as a Bonus Action. It makes a number of potions equal to your spellcasting modifier (minimum 1). Unused potions vanish if you cast the spell again.",
 "thorn whip": "Melee spell attack against a creature within 30 ft: 1d6 Piercing, and if it is Large or smaller you can pull it up to 10 ft towards you.",
 "thunderclap": "Each creature within 5 ft of you makes a Constitution save or takes 1d6 Thunder damage. The noise carries 100 ft.",
 "toll the dead": "One creature you can see makes a Wisdom save or takes 1d8 Necrotic, or 1d12 Necrotic if it is already missing any Hit Points.",
 "witch bolt": "Ranged spell attack: 2d12 Lightning on a hit. On each later turn you can use a Bonus Action to deal 1d12 Lightning to the same target automatically, even if the first attack missed. Ends if the target leaves range or has Total Cover from you.",
 "word of radiance": "Creatures of your choice that you can see within 5 ft of you make a Constitution save or take 1d6 Radiant damage.",
 "mold earth": "Work a 5-ft cube of dirt or stone you can see in range: instantly dig out loose earth and dump it up to 5 ft away, mark it with shapes, colours or words for 1 hour, or turn ground into Difficult Terrain (or back to normal) for 1 hour. Up to two lasting effects at a time; dismiss one with an action.",
 "encode thoughts": "Pull a memory, idea or message from your mind into a ribbon-like thought strand that you can hand to someone. While concentrating on a mind-reading effect (such as Detect Thoughts) you can encode the thoughts you are reading instead. Casting this while holding a strand lets you receive what it holds.",
}

SPELLS_HL = {
 "arcane vigor": "Each slot level above 2 lets you roll one more Hit Point Die.",
 "armor of agathys": "+5 Temporary Hit Points and +5 Cold damage per slot level above 1.",
 "arms of hadar": "+1d6 damage per slot level above 1.",
 "cloud of daggers": "+2d4 damage per slot level above 2.",
 "hunger of hadar": "+1d6 to the Cold or the Acid damage (your choice) per slot level above 3.",
 "jallarzi's storm of radiance": "+1d10 Radiant and +1d10 Thunder per slot level above 5.",
 "mind sliver": "Cantrip upgrade: 2d6 at level 5, 3d6 at 11, 4d6 at 17.",
 "thorn whip": "Cantrip upgrade: 2d6 at level 5, 3d6 at 11, 4d6 at 17.",
 "thunderclap": "Cantrip upgrade: 2d6 at level 5, 3d6 at 11, 4d6 at 17.",
 "toll the dead": "Cantrip upgrade: one extra die at levels 5, 11 and 17.",
 "word of radiance": "Cantrip upgrade: 2d6 at level 5, 3d6 at 11, 4d6 at 17.",
 "witch bolt": "+1d12 initial damage per slot level above 1.",
 "summon aberration": "The stat block uses the slot level you cast it with.",
 "summon celestial": "The stat block uses the slot level you cast it with.",
 "summon fey": "The stat block uses the slot level you cast it with.",
 "summon fiend": "The stat block uses the slot level you cast it with.",
 "summon undead": "The stat block uses the slot level you cast it with.",
}

# Subclass features: (class, level, name, summary)
SUBCLASS = {
 "Celestial": [
  (3, "Celestial Spells", "You always have these prepared: Light and Sacred Flame (cantrips), Aid, Cure Wounds, Guiding Bolt and Lesser Restoration. Level 5 adds Daylight and Revivify, level 7 Guardian of Faith and Wall of Fire, level 9 Greater Restoration and Summon Celestial. They don't count against your prepared spells."),
  (3, "Healing Light", "You have a pool of d6s equal to 1 + your Warlock level. Bonus Action: heal yourself or a creature you can see within 60 ft by spending dice from the pool, up to your pact ability modifier at once (minimum 1), and restore the total rolled. The pool refills on a Long Rest. (The rules say Charisma; this sheet runs the pact on Intelligence.)"),
  (6, "Radiant Soul", "You have Resistance to Radiant damage. Once per turn, when one of your spells deals Radiant or Fire damage, add your pact ability modifier to that spell's damage against one target."),
  (10, "Celestial Resilience", "Whenever you use Magical Cunning or finish a Short or Long Rest, gain Temporary Hit Points equal to your Warlock level + your pact ability modifier. Up to five creatures you can see also gain half your Warlock level + that modifier."),
  (14, "Searing Vengeance", "Once per Long Rest, when you or an ally within 60 ft is about to make a Death Saving Throw, they instead regain half their Hit Point maximum and can stand up from Prone. Creatures of your choice within 30 ft of them take 2d8 + your pact ability modifier Radiant damage and are Blinded until the end of the turn."),
 ],
 "Aberrant": [
  (3, "Psionic Spells", "You always have these prepared: Mind Sliver, Arms of Hadar, Calm Emotions, Detect Thoughts and Dissonant Whispers. Level 5 adds Hunger of Hadar and Sending, level 7 Evard's Black Tentacles and Summon Aberration, level 9 Rary's Telepathic Bond and Telekinesis. They don't count against your prepared spells."),
  (3, "Telepathic Speech", "Bonus Action: link minds with a creature you can see within 30 ft. You can talk telepathically while within a number of miles equal to your Charisma modifier (minimum 1), for minutes equal to your Sorcerer level, using a language you both know. Linking someone new ends the old link."),
  (6, "Psionic Sorcery", "You can cast your level 1+ Psionic Spells by spending Sorcery Points equal to the spell's level instead of a slot. Cast this way they need no Verbal or Somatic components, and no Material components unless the material is consumed or has a cost."),
  (6, "Psychic Defenses", "Resistance to Psychic damage, and Advantage on saves to avoid or end the Charmed or Frightened conditions."),
  (14, "Revelation in Flesh", "Bonus Action: spend 1 or more Sorcery Points to transform for 10 minutes, gaining one benefit per point: swim speed of twice your Speed and water breathing; fly speed equal to your Speed with hover; see Invisible creatures within 60 ft; or squeeze through 1-inch gaps and spend 5 ft of movement to escape non-magical restraints or a grapple."),
  (18, "Warping Implosion", "Magic action: teleport up to 120 ft to a space you can see. Each creature within 30 ft of where you left makes a Strength save against your spell DC: 3d10 Force and pulled towards your old space on a fail, half damage only on a success. Once per Long Rest, or spend 5 Sorcery Points to use it again."),
 ],
 "Assassin": [
  (3, "Assassin's Tools", "You gain a Disguise Kit and a Poisoner's Kit and proficiency with both."),
  (3, "Assassinate", "Advantage on Initiative rolls. In the first round of combat you have Advantage on attacks against any creature that hasn't taken a turn yet, and a Sneak Attack hit that round deals extra damage equal to your Rogue level."),
  (9, "Infiltration Expertise", "After an hour studying someone you can perfectly mimic their speech, handwriting or both. Steady Aim no longer drops your Speed to 0."),
  (13, "Envenom Weapons", "When you use the Poison option of Cunning Strike, a target that fails the save also takes 2d6 Poison damage, ignoring Poison Resistance."),
  (17, "Death Strike", "When your Sneak Attack hits in the first round of combat, the target makes a Constitution save (DC 8 + Dex modifier + Proficiency Bonus) or the attack's damage is doubled."),
 ],
}

SPECIES = {
 "Tabaxi": [
  ("Cat's Claws", "Your claws count as unarmed strikes that deal 1d6 Slashing (the rules use Strength; this sheet records bronze magic claws at +8, 1d6+5)."),
  ("Cat's Talent", "Proficiency in Perception and Stealth."),
  ("Darkvision", "See in dim light within 60 ft as if bright, and in darkness as if dim (shades of grey)."),
  ("Feline Agility", "When you move on your turn in combat you can double your Speed until the end of the turn. You can't do it again until you spend a turn moving 0 ft."),
  ("Climbing", "Climb Speed equal to your walking Speed."),
 ],
 "Changeling": [
  ("Fey", "Your creature type is Fey."),
  ("Changeling Instincts", "Proficiency in two of Deception, Insight, Intimidation, Performance or Persuasion."),
  ("Shapechanger", "Action: change your appearance and voice (colouring, hair, sex, height between Medium and Small, even another species). You can't copy someone you've never seen and must keep the same limb layout. Clothing doesn't change. Lasts until you revert with an action or die."),
 ],
}

FEATS = {
 "Tough": "Your Hit Point maximum rises by twice your character level, and by 2 more each time you gain a level.",
 "Resilient": "+1 to one ability score (to a maximum of 20) and proficiency in saving throws with that ability.",
 "Speedy": "+1 to Dexterity or Constitution (max 20). Your Speed increases by 10 ft. When you Dash, Difficult Terrain costs no extra movement that turn. Opportunity Attacks against you have Disadvantage.",
 "Mark of Warding": "Warder's Intuition: add 1d4 to Intelligence (Investigation) checks and checks using Thieves' Tools. Wards and Seals: Alarm and Mage Armor are always prepared and each can be cast once per Long Rest without a slot; from character level 3 the same applies to Arcane Lock. Spells of the Mark: Armor of Agathys, Sanctuary, Knock, Nystul's Magic Aura, Glyph of Warding, Magic Circle, Leomund's Secret Chest, Mordenkainen's Faithful Hound and Antilife Shell join your Sorcerer spell list.",
 "Rustic Hospitality": "(Folk Hero background, 2014 rules.) Ordinary folk will shelter and hide you, short of risking their lives.",
}
