-- MemeArena — content seed (cards, bosses, cosmetic frames).
-- The canonical, richly-typed content lives in /src/data/*. These rows back
-- server-side validation (card existence, base cost, boss HP, mode availability)
-- and joins. Keep ids in sync with /src/data.

insert into public.cards (id, name, slug, role, rarity, base_cost, image_path) values
  ('pepe_the_frog','Pepe the Frog','pepe-the-frog','Support','Legendary',3,'/cards/pepe-the-frog.png'),
  ('dogwifhat','Dogwifhat','dogwifhat','Damage','Epic',2,'/cards/dogwifhat.png'),
  ('mog_cat','Mog Cat','mog-cat','Crit','Epic',2,'/cards/mog-cat.png'),
  ('popcat','Popcat','popcat','Spam','Rare',1,'/cards/popcat.png'),
  ('peanut_the_squirrel','Peanut the Squirrel','peanut-the-squirrel','Economy','Rare',1,'/cards/peanut-the-squirrel.png'),
  ('moo_deng_hippo','Moo Deng Hippo','moo-deng-hippo','Tank','Epic',3,'/cards/moo-deng-hippo.png'),
  ('tung_tung_tung_sahur','Tung Tung Tung Sahur','tung-tung-tung-sahur','Tank','Rare',2,'/cards/tung-tung-tung-sahur.png'),
  ('gigachad','GigaChad','gigachad','Heavy Damage','Legendary',4,'/cards/gigachad.png'),
  ('ballerina_cappuccino','Ballerina Cappuccino','ballerina-cappuccino','Speed','Epic',2,'/cards/ballerina-cappuccino.png'),
  ('tralalero_tralala','Tralalero Tralala','tralalero-tralala','Chaos','Rare',2,'/cards/tralalero-tralala.png'),
  ('bombardino_crocodilo','Bombardino Crocodilo','bombardino-crocodilo','AoE','Epic',3,'/cards/bombardino-crocodilo.png'),
  ('wojak','Wojak','wojak','Sacrifice','Common',1,'/cards/wojak.png'),
  ('sigma_cat','Sigma Cat','sigma-cat','Support','Rare',2,'/cards/sigma-cat.png'),
  ('cappuccino_assassin','Cappuccino Assassin','cappuccino-assassin','Finisher','Rare',2,'/cards/cappuccino-assassin.png')
on conflict (id) do nothing;

insert into public.bosses (id, name, slug, difficulty, max_hp, mode_availability, image_path) values
  ('rug_pull_goblin','Rug Pull Goblin','rug-pull-goblin',1,45,'{boss_rush}','/bosses/rug-pull-goblin.png'),
  ('bot_swarm','Bot Swarm','bot-swarm',2,60,'{boss_rush}','/bosses/bot-swarm.png'),
  ('jeet_dragon','Jeet Dragon','jeet-dragon',3,75,'{boss_rush}','/bosses/jeet-dragon.png'),
  ('whale_lord','Whale Lord','whale-lord',4,120,'{boss_rush}','/bosses/whale-lord.png'),
  ('market_maker','Market Maker','market-maker',5,150,'{boss_rush}','/bosses/market-maker.png'),
  ('pepe_the_ancient','Pepe the Ancient','pepe-the-ancient',6,110,'{boss_rush}','/bosses/pepe-the-ancient.png'),
  ('moo_deng_rampage','Moo Deng Rampage','moo-deng-rampage',7,130,'{daily_boss}','/bosses/moo-deng-rampage.png'),
  ('liquidity_vampire','Liquidity Vampire','liquidity-vampire',8,100,'{limited_event}','/bosses/liquidity-vampire.png')
on conflict (id) do nothing;

insert into public.cosmetic_frames (id, name, rarity, cost_gems, style_config) values
  ('frame_default','Standard','Common',0,'{}'::jsonb),
  ('frame_lime_pulse','Lime Pulse','Rare',40,'{}'::jsonb),
  ('frame_magenta_haze','Magenta Haze','Epic',80,'{}'::jsonb),
  ('frame_golden_god','Golden God','Legendary',150,'{}'::jsonb)
on conflict (id) do nothing;
