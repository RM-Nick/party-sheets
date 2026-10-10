const SHEETS = {
amber: {
  id:'amber', v:1, kind:'pc', name:'Amber', aka:'', age:'24 years',
  cls:'Warlock', sub:'Celestial', subName:'Celestial Patron', species:'Human', bg:'(not recorded)', level:5,
  ab:{str:13,dex:14,con:14,int:20,wis:16,cha:11}, castAb:'int',
  saves:['int','wis','con'],
  skills:{arcana:1,history:1,investigation:1,nature:1,religion:1,insight:1,medicine:1,perception:1},
  hpMax:49, hp:49, temp:0, tough:true,
  ac:14, acNote:'Armour not recorded on the sheet', speed:'30 ft', size:'Medium', initAdv:false, initMisc:0,
  armour:'Light armour', weapons:'Simple weapons', tools:"Dredger's tools", languages:'Common, Elven, Halfling',
  spells:[
    {k:'eldritch blast',src:'class'},{k:'prestidigitation',src:'class'},{k:'chill touch',src:'class'},
    {k:'encode thoughts',src:'tome'},{k:'guidance',src:'tome'},{k:'mold earth',src:'tome'},
    {k:'comprehend languages',src:'tome'},{k:'identify',src:'tome'},
    {k:'counterspell',src:'class'},{k:'hex',src:'class'},{k:'darkness',src:'class'},
    {k:'hold person',src:'class'},{k:'dispel magic',src:'class'},{k:'remove curse',src:'class'}
  ],
  arcanum:{}, invocations:['Pact of the Tome','Agonizing Blast','Eldritch Spear',"Devil's Sight",'Repelling Blast'],
  invTargets:{'Agonizing Blast':'eldritch blast','Eldritch Spear':'eldritch blast','Repelling Blast':'eldritch blast'},
  metamagic:[], expertise:[],
  feats:[{n:'Tough',note:'Origin feat'},{n:'Skilled',note:'Human Versatile (origin feat)'},{n:'Resilient',note:'Constitution, level 4'}],
  attacks:[
    {n:'Eldritch Blast',sp:'eldritch blast',kind:'atk',ab:'spell',die:'1d10',scale:'beams',addMod:true,type:'Force',note:'Agonizing Blast adds INT to each beam. Repelling Blast: push a Large or smaller target 10 ft per hit.'},
    {n:'Chill Touch',sp:'chill touch',kind:'atk',ab:'spell',die:'1d10',scale:'cantrip',type:'Necrotic',rng:'Touch',note:'Target can\'t regain HP until the end of your next turn.'},
    {n:'Sacred Flame',sp:'sacred flame',kind:'save',save:'Dex',die:'1d8',scale:'cantrip',type:'Radiant',rng:'60 ft',note:'No benefit from cover.'},
    {n:'Dagger',kind:'atk',ab:'dex',die:'1d4',addMod:true,type:'Piercing',rng:'5 ft or thrown 20/60',note:'Finesse, Light, Thrown. Amber has no Weapon Mastery.',ref:'weapon|Dagger'}
  ],
  equipment:'Dagger\nMy box\nCoin pouch\nNotebook and pen\nSeven Star amulet\nTome (ancient, academic): "Musings on Stone"',
  coins:{cp:0,sp:0,ep:0,gp:75,pp:0},
  appearance:'', backstory:'',
  notes:'Dredgers: guild, day watch. Means, clean, easier.\nRolled scores: 18 15 14 13 13 11, then +2 / +1.\n(Faint margin notes, may be misread: "Spike Kerran", "cinnamon", "salt".)',
  flags:[
    'Pact Magic runs on Intelligence on this sheet. The 2024 Warlock uses Charisma, so this is presumably a table ruling. The app follows the sheet.',
    'Saving throws are marked for Intelligence and Wisdom (plus Constitution from Resilient). The 2024 Warlock is proficient in Wisdom and Charisma saves.',
    'HP 49 is one above the fixed-average figure with Tough (48). Kept as written.',
    'AC 14 has no armour listed. Studded leather plus Dex would give 14.'
  ],
  used:{}, history:[]
},
mausfanger: {
  id:'mausfanger', v:1, kind:'pc', name:'Mäusfänger', aka:'', age:'',
  cls:'Rogue', sub:'Assassin', subName:'Assassin', species:'Tabaxi', speciesNote:'"Cat?" on the sheet', bg:'Folk Hero', level:5,
  ab:{str:11,dex:20,con:16,int:13,wis:14,cha:14}, castAb:'wis',
  saves:['dex','int'],
  skills:{acrobatics:1,sleight:2,stealth:2,animal:1,insight:1,perception:1,survival:1,intimidation:1},
  hpMax:35, hp:35, temp:0, tough:false,
  ac:17, acNote:'Studded leather', speed:'40 ft, climb 40 ft', size:'Small', initAdv:true, initMisc:0,
  armour:'Light armour', weapons:'Simple weapons, martial weapons with Finesse or Light', tools:"Disguise kit, poisoner's kit, land vehicles, thieves' tools, weaver's tools", languages:"Common, Thieves' Cant, Cat",
  spells:[{k:'guidance',src:'mi'},{k:'thaumaturgy',src:'mi'},{k:'charm person',src:'mi'}],
  arcanum:{}, invocations:[], metamagic:[], expertise:['sleight','stealth'],
  masteries:[],
  feats:[{n:'Magic Initiate',note:'Cleric list, Wisdom. Origin feat'},{n:'Speedy',note:'Level 4'}],
  attacks:[
    {n:'Claws (magic)',kind:'atk',ab:'dex',die:'1d6',addMod:true,type:'Slashing',rng:'Melee',note:'Bronze claws and teeth, recorded on the sheet as +8 / 1d6+5.',ref:"species|Cat's Claws"},
    {n:'Sneak Attack',kind:'auto',die:'sneak',type:'same as weapon',ref:'cf|Sneak Attack',note:'Once per turn, with Advantage or an ally within 5 ft of the target. Finesse or ranged weapon. Cunning Strike: give up d6s for Poison, Trip or Withdraw.'}
  ],
  equipment:"Weaver's tools\nStudded leather\nFishing rod\nFancy outfit\nFur coat\nCase of brandy",
  coins:{cp:0,sp:0,ep:0,gp:110,pp:0},
  appearance:'Tabby cat wearing a cuff and boots.', backstory:'General nuisance.',
  notes:'Karmic debt: natural 1 or 20.',
  flags:[
    'Dexterity save is written as +11. With Dex +5 and proficiency +3 it should be +8.',
    'Initiative is written as +8. Dex +5 gives +5 (rolled with Advantage from Assassinate) unless something else adds 3.',
    'Charm Person is not on the 2024 Cleric list for Magic Initiate. Kept as written, presumably a table ruling.',
    'The spell page says "+5 spellcasting modifier". Magic Initiate here uses Wisdom (+2). DC 13 and +5 to hit on the sheet are correct.',
    'HP 35 is below the fixed-average figure (43). Fine if rolled.',
    'Weapon Mastery (two kinds of weapon) is not recorded. Pick them on the Features tab.'
  ],
  used:{}, history:[]
},
mamuk: {
  id:'mamuk', v:1, kind:'pc', name:'Mamuk', aka:'Nauvala, Godann. Above the name: "Sir … Carapol", "Kivegaarta" (handwriting unclear)', age:'',
  cls:'Sorcerer', sub:'Aberrant', subName:'Aberrant Sorcery', species:'Changeling', bg:'The Sentinel', level:5,
  ab:{str:11,dex:14,con:17,int:13,wis:13,cha:20}, castAb:'cha',
  saves:['con','cha'],
  skills:{arcana:1,investigation:1,insight:1,perception:1,stealth:1,deception:1,persuasion:1},
  hpMax:36, hp:36, temp:0, tough:false,
  ac:12, ac2:15, acNote:'15 with Mage Armor', speed:'30 ft', size:'Medium', initAdv:false, initMisc:0,
  armour:'None', weapons:'Simple weapons', tools:"Thieves' tools (Warder's Intuition applies)", languages:'(not recorded)',
  spells:[
    {k:'message',src:'class'},{k:'mending',src:'class'},{k:'friends',src:'class'},{k:'minor illusion',src:'class'},{k:'mage hand',src:'class'},
    {k:'shield',src:'class'},{k:'magic missile',src:'class'},{k:'mind spike',src:'class'},{k:'see invisibility',src:'class'},
    {k:'suggestion',src:'class'},{k:'clairvoyance',src:'class'},{k:'counterspell',src:'class'},{k:'sanctuary',src:'class'},{k:'knock',src:'class'},
    {k:'detect magic',src:'class',off:true},{k:'comprehend languages',src:'class',off:true}
  ],
  arcanum:{}, invocations:[], metamagic:['Subtle Spell','Heightened Spell'], expertise:[],
  feats:[{n:'Mark of Warding',note:'Origin feat (Eberron dragonmark), Charisma'}],
  attacks:[
    {n:'Mind Sliver',sp:'mind sliver',kind:'save',save:'Int',die:'1d6',scale:'cantrip',type:'Psychic',rng:'60 ft',note:'Target subtracts 1d4 from its next saving throw before the end of your next turn.'},
    {n:'Magic Missile',sp:'magic missile',kind:'auto',die:'1d4+1',type:'Force',rng:'120 ft',note:'Level 1 slot: three darts, each 1d4+1, always hit. +1 dart per slot level above 1.'},
    {n:'Quarterstaff',kind:'atk',ab:'str',die:'1d6',addMod:true,type:'Bludgeoning',rng:'5 ft',note:'Versatile (1d8). Mamuk has no Weapon Mastery.',ref:'weapon|Quarterstaff'}
  ],
  equipment:'Staff\nFine clothes\n+1 Cedric',
  coins:{cp:0,sp:0,ep:0,gp:45,pp:0},
  appearance:'', backstory:'',
  notes:'Gods (margin notes, transcribed from handwriting):\nSol: sun god\nMijo: the Mother\nHiso: the Son, the coolest hero\nCarabala: honour and lies\nAzul: sea and storm (Neptune)\nLesura: war and love\nLocis: 19th / 20th (unclear)\n\nCedric, Gamet (?), Gret: 10% … (unclear)\nKarmic debt: natural 20 or natural 1.',
  flags:[
    'No Metamagic options were recorded on the sheet. Subtle Spell and Heightened Spell were chosen on 10 Oct 2026.',
    'Detect Magic and Comprehend Languages are written but not marked. With Sanctuary and Knock marked you are at the 9 prepared spells allowed, so the app holds those two as not prepared.',
    'HP shows 36 with 38 crossed out. The app uses 36.',
    'The background is written as "The Sentinel". It is not a 2024 background, so it is kept as a name only.'
  ],
  used:{}, history:[]
},
mule: {
  id:'mule', v:1, kind:'vehicle', name:'Mule', size:'50 × 20 ft', ac:15, hpMax:300, hp:300, speed:'4 knots',
  sleeps:'4, more if they are willing to be uncomfortable',
  special:'Having consumed a 20 ft boat and digested it for 1 hour, Mule gains the benefit of a Long Rest.',
  cargo:'', notes:'"7000 trade goods" is crossed out on the card.', used:{}, history:[]
}
};
