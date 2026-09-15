(() => {
  "use strict";

  // Only established or source-verified Chinese names belong here. Missing
  // entries deliberately fall back to the original Japanese/English title.
  const productByKey = Object.freeze({
    compass: "战斗天赋解析系统",
    afk_arena: "剑与远征",
    afk_journey: "剑与远征：启程",
    ace_racer: "王牌竞速",
    arena_of_valor: "传说对决",
    ash_tale: "风之大陆",
    brawl_stars: "荒野乱斗",
    cod_mobile: "使命召唤手游",
    cookie_run_kingdom: "冲呀！饼干人：王国",
    cookie_run_ovenbreak: "跑跑姜饼人：烤箱大逃亡",
    dragonheir: "龙息：神寂",
    d2_megaten: "D×2 真·女神转生 解放",
    eggy_party: "蛋仔派对",
    ffbe_wotv: "最终幻想BE：幻影战争",
    ffbe: "最终幻想：勇气启示录",
    honor_of_kings: "王者荣耀",
    identity_v: "第五人格",
    monster_hunter_now: "怪物猎人 Now",
    nikke: "胜利女神：妮姬",
    one_piece_treasure_cruise: "航海王：秘宝寻航",
    reverse_1999: "重返未来：1999",
    seven_knights_2: "七骑士2",
    seven_knights_idle: "七骑士：放置冒险",
    shadowverse: "影之诗",
    sky_children_of_light: "光·遇",
    kof_allstar: "拳皇全明星",
    tower_of_fantasy: "幻塔",
    tower_of_god_new_world: "神之塔：新世界",
    battle_cats: "猫咪大战争",
    puyo_puyo_quest: "魔法气泡!! Quest",
    shiny_colors_song_for_prism: "偶像大师 闪耀色彩 Song for Prism",
    astral_party: "星引擎 Party",
    azur_lane: "碧蓝航线",
    ash_arms: "灰烬战线",
    another_eden: "另一个伊甸：超越时空的猫",
    alice_gear: "机战少女 Alice",
    arknights: "明日方舟",
    eversoul: "永恒灵魂",
    epic_seven: "第七史诗",
    elemental_story: "元素物语",
    aether_gazer: "深空之眼",
    orient_arcadia: "三国志幻想大陆",
    alternative_girls: "妃十三学园",
    counterside: "异界事务所",
    guardian_tales: "坎公骑冠剑",
    captain_tsubasa_dream_team: "队长小翼：最强十一人",
    crash_fever: "粉碎狂热",
    crystal_of_atlan: "晶核",
    gran_saga: "格兰骑士团",
    grand_summoners: "大召唤师",
    granblue_fantasy: "碧蓝幻想",
    summoners_war: "魔灵召唤",
    the_ants: "小小蚁国",
    sega_mj: "SEGA NET 麻将 MJ",
    chain_chronicle: "锁链战记",
    duel_masters_plays: "决斗大师 PLAY'S",
    toram_online: "托拉姆物语",
    dragon_girls_symphony: "龙与少女交响曲",
    dragon_quest_walk: "勇者斗恶龙 WALK",
    girls_frontline_2: "少女前线2：追放",
    girls_frontline: "少女前线",
    neural_cloud: "少女前线：云图计划",
    bang_dream: "BanG Dream! 少女乐团派对！",
    puzzle_dragons: "智龙迷城",
    punishing_gray_raven: "战双帕弥什",
    phantom_of_kill: "幻影纹章",
    brown_dust_2: "棕色尘埃2",
    blue_archive: "蔚蓝档案",
    project_sekai: "世界计划 彩色舞台 feat. 初音未来",
    heaven_burns_red: "炽焰天穹",
    pocoron_dungeons: "波可龙迷宫",
    mafia_city: "黑道风云",
    maplestory_m: "冒险岛M",
    merc_storia: "梅露可物语",
    mobile_legends: "决胜巅峰",
    monster_strike: "怪物弹珠",
    lifeafter: "明日之后",
    ragnarok_masters: "仙境传说RO：守护永恒的爱",
    last_origin: "最后的起源",
    last_cloudia: "最后的克劳迪亚",
    last_period: "最后的休止符",
    langrisser_mobile: "梦幻模拟战",
    racing_master: "巅峰极速",
    lord_of_heroes: "英雄之王",
    lords_mobile: "王国纪元",
    world_flipper: "世界弹射物语",
    valkyrie_connect: "神域召唤",
    grand_cross: "七人传奇：光与暗之交战",
    sangokushi_true: "三国志·战略版",
    hokuto_revive: "北斗神拳 LEGENDS ReVIVE",
    merchant_master: "叫我大掌柜",
    subway_surfers_cn: "地铁跑酷",
    yokai_puni: "妖怪手表 Puni Puni",
    girls_wars: "少女战争",
    honkai_impact_3: "崩坏3",
    honkai_star_rail: "崩坏：星穹铁道",
    idle_maiden: "放置少女",
    tokyo_revengers_unlimited: "东京复仇者 UNLIMITED",
    neko_dragon: "猫与龙",
    isekai_slow_life: "异世界慢生活",
    alchemy_stars: "白夜极光",
    shironeko: "白猫计划",
    kamihime_project: "神姬PROJECT",
    knives_out: "荒野行动",
    alchemist_code: "为了谁的炼金术师",
    slime_isekai_memories: "关于我转生变成史莱姆这档事：魔王与龙的建国谭",
    reverse_othellonia: "逆转奥赛罗尼亚",
    kagemasu: "我想成为影之强者！庭园大师",
    onmyoji: "阴阳师",
    mahjong_soul: "雀魂麻将",
  });

  const projectById = Object.freeze({
    "classroom-of-the-elite-merge-puzzle": "欢迎来到实力至上主义教室：合并拼图特别考试",
    "code-geass-genesic-re-code": "Code Geass Genesic Re;CODE",
    "attack-on-titan-wings-of-freedom": "进击的巨人",
    "attack-on-titan-2": "进击的巨人2",
    "attack-on-titan-3": "进击的巨人3",
    "bleach-rebirth-of-souls": "BLEACH 魂魄觉醒",
    "cardcaptor-sakura-memory-key-jp": "魔卡少女樱：回忆钥匙",
    "date-a-live-love-limit-break": "约会大作战：Love Limit Break",
    "demon-slayer-hinokami-chronicles": "鬼灭之刃 火之神血风谭",
    "demon-slayer-hinokami-chronicles-2": "鬼灭之刃 火之神血风谭2",
    "dragon-ball-fighterz": "龙珠斗士Z",
    "dragon-ball-sparking-zero": "龙珠 电光炸裂！ZERO",
    "dragon-ball-xenoverse-3": "龙珠 超宇宙3",
    "dragon-ball-z-kakarot": "龙珠Z 卡卡罗特",
    "fairy-tail-2": "妖精的尾巴2",
    "jojo-all-star-battle-r": "JOJO的奇妙冒险 群星之战 重制版",
    "hunter-x-hunter-nen-impact": "全职猎人 NEN×IMPACT",
    "jujutsu-kaisen-cursed-clash": "咒术回战 双华乱舞",
    "kaiju-no-8-the-game": "怪兽8号 THE GAME",
    "kingdom-hearts-iv": "王国之心 IV",
    "madoka-magia-exedra": "魔法少女小圆 Magia Exedra",
    "naruto-storm-connections": "火影忍者 终极风暴羁绊",
    "one-piece-odyssey": "海贼王：时光旅诗",
    "one-piece-world-seeker": "海贼王：寻秘世界",
    "persona-5-the-phantom-x": "女神异闻录：夜幕魅影",
    "pokemon-champions": "宝可梦 Champions",
    "professor-layton-new-world-of-steam": "雷顿教授与蒸汽新世界",
    "sand-land": "沙漠大冒险",
    "suikoden-star-leap": "幻想水浒传 STAR LEAP",
    "tokyo-revengers-unlimited": "东京复仇者 UNLIMITED",
  });

  const ipAliases = new Map(Object.entries({
    "100日間生きたワニ": "活了100天的鳄鱼",
    "2.5次元の誘惑": "2.5次元的诱惑",
    "BLACK LAGOON": "黑礁",
    "BLEACH": "死神",
    "DEATH NOTE": "死亡笔记",
    "Devil May Cry": "鬼泣",
    "Dr.STONE": "石纪元",
    "Dr.スランプ アラレちゃん": "阿拉蕾",
    "FAIRY TAIL": "妖精的尾巴",
    "FINAL FANTASY": "最终幻想",
    "FINAL FANTASY I": "最终幻想I",
    "FINAL FANTASY IV": "最终幻想IV",
    "FINAL FANTASY V": "最终幻想V",
    "FINAL FANTASY VI": "最终幻想VI",
    "FINAL FANTASY VII REMAKE": "最终幻想VII 重制版",
    "FINAL FANTASY VIII": "最终幻想VIII",
    "FINAL FANTASY IX": "最终幻想IX",
    "FINAL FANTASY X": "最终幻想X",
    "FINAL FANTASY XIII": "最终幻想XIII",
    "FINAL FANTASY XIV": "最终幻想XIV",
    "FINAL FANTASY XV": "最终幻想XV",
    "FINAL FANTASY TACTICS": "最终幻想战略版",
    "GOD EATER": "噬神者",
    "GRIDMAN UNIVERSE": "古立特宇宙",
    "GUILTY GEAR": "罪恶装备",
    "HUNTER×HUNTER": "全职猎人",
    "Hello Kitty": "凯蒂猫",
    "MFゴースト": "极速车魂",
    "NARUTO -ナルト-": "火影忍者",
    "NieR:Automata": "尼尔：机械纪元",
    "ONE PIECE": "海贼王",
    "PSYCHO-PASS": "心理测量者",
    "Persona 系列": "女神异闻录系列",
    "Persona 5 Royal": "女神异闻录5 皇家版",
    "Re:ゼロから始める異世界生活": "Re：从零开始的异世界生活",
    "SHAMAN KING": "通灵王",
    "SPY×FAMILY": "间谍过家家",
    "THE KING OF FIGHTERS": "拳皇",
    "TIGER & BUNNY": "老虎和兔子",
    "WIND BREAKER": "防风少年",
    "ZOIDS": "索斯机械兽",
    "〈物語〉シリーズ": "物语系列",
    "【推しの子】": "我推的孩子",
    "あしたのジョー": "明日之丈",
    "あたしンち": "我们这一家",
    "あらいぐまラスカル": "浣熊拉斯卡尔",
    "アグレッシブ烈子": "冲吧烈子",
    "ありふれた職業で世界最強": "平凡职业造就世界最强",
    "うる星やつら": "福星小子",
    "おそ松さん": "阿松",
    "おじゃる丸": "丸少爷",
    "おでかけ子ザメ": "出门的鲨鱼仔",
    "おジャ魔女どれみ": "小魔女DoReMi",
    "かいけつゾロリ": "怪杰佐罗力",
    "かぐや様は告らせたい": "辉夜大小姐想让我告白",
    "くにおくんシリーズ": "热血系列",
    "けいおん！": "轻音少女",
    "この素晴らしい世界に祝福を！": "为美好的世界献上祝福！",
    "ご注文はうさぎですか？": "请问您今天要来点兔子吗？",
    "すみっコぐらし": "角落小伙伴",
    "たまごっち": "拓麻歌子",
    "ちびまる子ちゃん": "樱桃小丸子",
    "とある科学の超電磁砲": "某科学的超电磁炮",
    "とっとこハム太郎": "哈姆太郎",
    "にじさんじ": "彩虹社",
    "にゃんこ大戦争": "猫咪大战争",
    "ぬきたし": "拔作岛",
    "のだめカンタービレ": "交响情人梦",
    "はたらく細胞": "工作细胞",
    "ぼのぼの": "暖暖日记",
    "ひぐらしのなく頃に": "寒蝉鸣泣之时",
    "ぼっち・ざ・ろっく！": "孤独摇滚！",
    "らんま1/2": "乱马1/2",
    "るろうに剣心": "浪客剑心",
    "アイドルマスター": "偶像大师",
    "アイドルマスター 765PRO ALLSTARS": "偶像大师 765PRO ALLSTARS",
    "アイドルマスター シンデレラガールズ": "偶像大师 灰姑娘女孩",
    "アトリエシリーズ": "炼金工房系列",
    "アルプスの少女ハイジ": "阿尔卑斯山的少女",
    "ウルトラマンシリーズ": "奥特曼系列",
    "エヴァンゲリオン": "新世纪福音战士",
    "オーバーロード": "不死者之王",
    "カードキャプターさくら": "魔卡少女樱",
    "ガチアクタ": "废渊战鬼",
    "キテレツ大百科": "奇天烈大百科",
    "キューティーハニー": "甜心战士",
    "キズナアイ": "绊爱",
    "キルラキル": "斩服少女",
    "キングダム": "王者天下",
    "クレヨンしんちゃん": "蜡笔小新",
    "クロノ・クロス": "穿越时空",
    "ケロロ軍曹": "Keroro军曹",
    "コウペンちゃん": "正能量企鹅",
    "コンフィデンスマンJP": "行骗天下JP",
    "ゴジラ": "哥斯拉",
    "ゲゲゲの鬼太郎": "鬼太郎",
    "コードギアス 反逆のルルーシュ": "反叛的鲁路修",
    "ゴブリンスレイヤー": "哥布林杀手",
    "ゴールデンカムイ": "黄金神威",
    "サクラ大戦": "樱花大战",
    "サムライスピリッツ": "侍魂",
    "サンリオキャラクターズ": "三丽鸥角色",
    "ザ・ファブル": "杀手寓言",
    "シティーハンター": "城市猎人",
    "シャングリラ・フロンティア": "香格里拉边境",
    "ジョジョの奇妙な冒険": "JOJO的奇妙冒险",
    "ストリートファイター": "街头霸王",
    "ストライクウィッチーズ": "强袭魔女",
    "スレイヤーズ": "秀逗魔导士",
    "ゼノギアス": "异度装甲",
    "ソニック・ザ・ヘッジホッグ": "刺猬索尼克",
    "ソードアート・オンライン": "刀剑神域",
    "ゾンビランドサガ": "佐贺偶像是传奇",
    "ダンまち": "在地下城寻求邂逅是否搞错了什么",
    "ダンジョン飯": "迷宫饭",
    "ダンダダン": "胆大党",
    "チェンソーマン": "链锯人",
    "デジモンアドベンチャー": "数码宝贝大冒险",
    "デジモンシリーズ": "数码宝贝系列",
    "テイルズ オブ シリーズ": "传说系列",
    "デュエル・マスターズ": "决斗大师",
    "デート・ア・ライブ": "约会大作战",
    "ドラえもん": "哆啦A梦",
    "ドラゴンクエスト ダイの大冒険": "勇者斗恶龙：达伊的大冒险",
    "ドラゴンズドグマ": "龙之信条",
    "ハイキュー!!": "排球少年!!",
    "バイオハザード": "生化危机",
    "ビックリマン": "仙魔大战",
    "パックマン": "吃豆人",
    "フルーツバスケット": "水果篮子",
    "ブラック★ロックシューター": "黑岩射手",
    "ブラック・ジャック": "怪医黑杰克",
    "ブルーロック": "蓝色监狱",
    "プリキュアシリーズ": "光之美少女系列",
    "プロメア": "普罗米亚",
    "ベルサイユのばら": "凡尔赛玫瑰",
    "ベルセルク": "剑风传奇",
    "ボボボーボ・ボーボボ": "鼻毛真拳",
    "ポプテピピック": "POP TEAM EPIC",
    "マクロスF": "超时空要塞F",
    "マクロスシリーズ": "超时空要塞系列",
    "マジンガーZ": "魔神Z",
    "モブサイコ100": "灵能百分百",
    "モンスターハンター": "怪物猎人",
    "モンスターストライク": "怪物弹珠",
    "モンスターファーム2": "怪兽农场2",
    "ライザのアトリエ": "莱莎的炼金工房",
    "ライザのアトリエ2": "莱莎的炼金工房2",
    "リコリス・リコイル": "莉可丽丝",
    "リラックマ": "轻松熊",
    "ルパン三世": "鲁邦三世",
    "ロックマン": "洛克人",
    "ロックマンエグゼ": "洛克人EXE",
    "ロードス島戦記": "罗德斯岛战记",
    "ワンパンマン": "一拳超人",
    "ワールドトリガー": "境界触发者",
    "カナヘイの小動物": "卡娜赫拉的小动物",
    "カピバラさん": "水豚君",
    "くまモン": "熊本熊",
    "ヤッターマン": "小双侠",
    "七つの大罪": "七大罪",
    "五等分の花嫁": "五等分的新娘",
    "仮面ライダー": "假面骑士",
    "伊藤潤二『コレクション』": "伊藤润二惊选集",
    "僕のヒーローアカデミア": "我的英雄学院",
    "初音ミク": "初音未来",
    "北斗の拳": "北斗神拳",
    "半妖の夜叉姫": "半妖的夜叉姬",
    "名探偵コナン": "名侦探柯南",
    "名探偵コナン／真・侍伝YAIBA": "名侦探柯南／真·侍传YAIBA",
    "呪術廻戦": "咒术回战",
    "嘆きの亡霊は引退したい": "叹气的亡灵想隐退",
    "地獄楽": "地狱乐",
    "夏目友人帳": "夏目友人帐",
    "天元突破グレンラガン": "天元突破红莲螺岩",
    "小林さんちのメイドラゴン": "小林家的龙女仆",
    "幽☆遊☆白書": "幽游白书",
    "彼女、お借りします": "租借女友",
    "怪獣8号": "怪兽8号",
    "攻殻機動隊": "攻壳机动队",
    "攻殻機動隊 SAC_2045": "攻壳机动队 SAC_2045",
    "文豪ストレイドッグス": "文豪野犬",
    "忍たま乱太郎": "忍者乱太郎",
    "新テニスの王子様": "新网球王子",
    "暗殺教室": "暗杀教室",
    "東京リベンジャーズ": "东京复仇者",
    "東京喰種": "东京喰种",
    "極主夫道": "极主夫道",
    "機動戦士ガンダムSEED FREEDOM": "机动战士高达SEED FREEDOM",
    "機動戦士ガンダムシリーズ": "机动战士高达系列",
    "涼宮ハルヒの憂鬱": "凉宫春日的忧郁",
    "炎炎ノ消防隊": "炎炎消防队",
    "温泉むすめ": "温泉女孩",
    "無職転生": "无职转生",
    "無職転生 ～異世界行ったら本気だす～": "无职转生～到了异世界就拿出真本事～",
    "犬夜叉": "犬夜叉",
    "甲鉄城のカバネリ": "甲铁城的卡巴内瑞",
    "痛いのは嫌なので防御力に極振りしたいと思います。": "因为太怕痛就全点防御力了",
    "痛いのは嫌なので防御力に極振りしたいと思います。2": "因为太怕痛就全点防御力了2",
    "盾の勇者の成り上がり": "盾之勇者成名录",
    "真・女神転生III": "真·女神转生III",
    "範馬刃牙": "范马刃牙",
    "約束のネバーランド": "约定的梦幻岛",
    "終末のワルキューレ": "终末的女武神",
    "結城友奈は勇者である": "结城友奈是勇者",
    "美少女戦士セーラームーン": "美少女战士",
    "聖闘士星矢": "圣斗士星矢",
    "花より男子": "花样男子",
    "葬送のフリーレン": "葬送的芙莉莲",
    "薬屋のひとりごと": "药屋少女的呢喃",
    "転生したらスライムだった件": "关于我转生变成史莱姆这档事",
    "進撃の巨人": "进击的巨人",
    "遊☆戯☆王": "游戏王",
    "鉄拳": "铁拳",
    "銀魂": "银魂",
    "鋼の錬金術師": "钢之炼金术师",
    "閃乱カグラ": "闪乱神乐",
    "鬼滅の刃": "鬼灭之刃",
    "魔法少女にあこがれて": "梦想成为魔法少女",
    "魔法少女まどか☆マギカ": "魔法少女小圆",
    "魔法少女ノ魔女裁判": "魔法少女的魔女审判",
    "魔法少女リリカルなのは": "魔法少女奈叶",
    "魔法科高校の劣等生": "魔法科高中的劣等生",
    "魔法騎士レイアース": "魔法骑士雷阿斯",
    "魔王学院の不適合者": "魔王学院的不适任者",
    "魔界戦記ディスガイア": "魔界战记Disgaea",
    "魔神英雄伝ワタル": "魔神英雄传",
    "魔術士オーフェン": "魔术士欧菲",
    "魔都精兵のスレイブ": "魔都精兵的奴隶",
    "黄泉のツガイ": "黄泉使者",
    "黒執事": "黑执事",
    "龍が如く": "如龙",
    "実況パワフルプロ野球": "实况力量棒球",
    "科学忍者隊ガッチャマン": "科学小飞侠",
    "フランダースの犬": "佛兰德斯的狗",
    "メジャーセカンド": "棒球大联盟2nd",
    "DEAD OR ALIVE Xtreme Venus Vacation": "死或生：沙滩排球 维纳斯假期",
    "聖剣伝説シリーズ": "圣剑传说系列",
    "真・中華一番！": "厨神小当家",
    "Fate/kaleid liner プリズマ☆イリヤ": "魔法少女伊莉雅",
    "富士見ファンタジア文庫": "富士见Fantasia文库",
    "週刊少年マガジン": "周刊少年Magazine",
    "週刊少年チャンピオン": "周刊少年Champion",
    "週刊少年サンデー": "周刊少年Sunday",
    "釣りバカ日誌": "钓鱼迷日记",
    "宇宙海賊キャプテンハーロック": "宇宙海贼哈洛克",
    "NEEDY GIRL OVERDOSE": "主播女孩重度依赖",
    "タイガーマスク": "虎面人",
    "モノノ怪": "怪化猫",
    "ルパン三世VSキャッツ・アイ": "鲁邦三世VS猫眼三姐妹",
    "タマ＆フレンズ": "猫狗宠物街",
    "フレームアームズ・ガール": "机甲少女 FRAME ARMS GIRL",
    "天才バカボン": "天才傻鹏",
    "真・三國無双8 Empires": "真·三国无双8 帝国",
    "未来少年コナン": "未来少年柯南",
    "勇者ライディーン": "勇者莱汀",
    "ホロライブ": "hololive",
    "ホロライブゲーマーズ": "hololive Gamers",
    "GATE 自衛隊 彼の地にて、斯く戦えり": "GATE 奇幻自卫队",
    "DAVE THE DIVER": "潜水员戴夫",
    "メダロット": "徽章战士",
    "夜桜さんちの大作戦": "夜樱家的大作战",
    "東方Project": "东方Project",
    "Stellar Blade": "剑星",
    "機動戦士Gundam GQuuuuuuX": "机动战士高达GQuuuuuuX",
    "ガメラ": "加美拉",
    "Attack on Titan": "进击的巨人",
    "The Apothecary Diaries": "药屋少女的呢喃",
    "Captain Tsubasa": "足球小将",
    "Cardcaptor Sakura": "魔卡少女樱",
    "Chainsaw Man": "链锯人",
    "Chiikawa": "吉伊卡哇",
    "Code Geass": "反叛的鲁路修",
    "Classroom of the Elite": "欢迎来到实力至上主义教室",
    "Crayon Shin-chan": "蜡笔小新",
    "DATE A LIVE": "约会大作战",
    "Demon Slayer: Kimetsu no Yaiba": "鬼灭之刃",
    "Digimon": "数码宝贝",
    "DRAGON BALL": "龙珠",
    "DRAGON BALL Z": "龙珠Z",
    "Dragon Quest": "勇者斗恶龙",
    "Sword Art Online": "刀剑神域",
    "The Eminence in Shadow": "想要成为影之实力者",
    "Expelled from Paradise": "乐园追放",
    "GACHIAKUTA": "废渊战鬼",
    "Gintama": "银魂",
    "Mobile Suit Gundam": "机动战士高达",
    "Haikyu!!": "排球少年!!",
    "Hatsune Miku": "初音未来",
    "Hell's Paradise": "地狱乐",
    "High School DxD": "恶魔高校D×D",
    "Highschool of the Dead": "学园默示录",
    "Hyakka Ryoran": "百花缭乱",
    "Inazuma Eleven": "闪电十一人",
    "Farming Life in Another World": "异世界悠闲农家",
    "In Another World with My Smartphone": "带着智慧型手机闯荡异世界",
    "JoJo's Bizarre Adventure": "JOJO的奇妙冒险",
    "Jujutsu Kaisen": "咒术回战",
    "KAIJU NO. 8": "怪兽8号",
    "Sgt. Frog": "Keroro军曹",
    "KONOSUBA": "为美好的世界献上祝福！",
    "Puella Magi Madoka Magica": "魔法少女小圆",
    "Miss Kobayashi's Dragon Maid": "小林家的龙女仆",
    "Mushoku Tensei": "无职转生",
    "My Hero Academia": "我的英雄学院",
    "NARUTO / BORUTO": "火影忍者 / 博人传",
    "Oshi no Ko": "我推的孩子",
    "Persona 5": "女神异闻录5",
    "Pokémon": "宝可梦",
    "Professor Layton": "雷顿教授",
    "SAKAMOTO DAYS": "坂本日常",
    "Sakuna: Of Rice and Ruin": "天穗之咲稻姬",
    "SAND LAND": "沙漠大冒险",
    "Senran Kagura": "闪乱神乐",
    "Shakugan no Shana": "灼眼的夏娜",
    "Shangri-La Frontier": "香格里拉边境",
    "Skeleton Knight in Another World": "骸骨骑士大人异世界冒险中",
    "Suikoden": "幻想水浒传",
    "Tokyo Revengers": "东京复仇者",
    "Tougen Anki": "桃源暗鬼",
    "Yowamushi Pedal": "飙速宅男",
  }));

  const kanaPattern = /[\u3040-\u30ff\u31f0-\u31ff]/u;
  const hangulPattern = /[\uac00-\ud7af]/u;
  const hanPattern = /[\u3400-\u9fff]/u;

  function clean(value) {
    return String(value || "").trim();
  }

  function isChineseCandidate(value) {
    const text = clean(value).replace(/^[\s:：·—–-]+|[\s:：·—–-]+$/g, "");
    return text.length >= 2 && hanPattern.test(text) && !kanaPattern.test(text) && !hangulPattern.test(text);
  }

  function explicitChinese(value) {
    const text = clean(value);
    if (!text) return "";
    const candidates = [];
    const slashParts = text.split(/\s+\/\s+/);
    if (slashParts.length > 1) candidates.push(...slashParts.slice().reverse());
    for (const match of text.matchAll(/[（(]([^（）()]+)[）)]/g)) candidates.push(match[1]);
    const dashParts = text.split(/\s+[—–-]\s+/);
    if (dashParts.length > 1) candidates.push(...dashParts);
    const prefix = text.split(/[（(]/, 1)[0];
    if (prefix !== text) candidates.push(prefix);
    if (!/[A-Za-z]/.test(text)) candidates.push(text);
    return clean(candidates.find(isChineseCandidate));
  }

  function localizedProduct(value, key = "") {
    return productByKey[key] || projectById[key] || explicitChinese(value) || clean(value);
  }

  function localizedIp(value) {
    const text = clean(value);
    if (!text) return text;
    if (ipAliases.has(text)) return ipAliases.get(text);
    const parenthetical = text.match(/^(.+?)[（(]([^（）()]+)[）)]$/);
    if (parenthetical && ipAliases.has(clean(parenthetical[1]))) {
      return `${ipAliases.get(clean(parenthetical[1]))}（${clean(parenthetical[2])}）`;
    }
    for (const segment of text.split(/\s+\/\s+/)) {
      if (ipAliases.has(clean(segment))) return ipAliases.get(clean(segment));
    }
    return explicitChinese(text) || text;
  }

  const NAME_LANGUAGE_STORAGE_KEY = "ipbi-name-language";
  const nameLanguageModes = Object.freeze(["zh", "original", "bilingual"]);

  function normalizeNameLanguage(value) {
    return nameLanguageModes.includes(value) ? value : "zh";
  }

  function getNameLanguage() {
    try {
      return normalizeNameLanguage(window.localStorage.getItem(NAME_LANGUAGE_STORAGE_KEY));
    } catch {
      return "zh";
    }
  }

  function setNameLanguage(value) {
    const mode = normalizeNameLanguage(value);
    try {
      window.localStorage.setItem(NAME_LANGUAGE_STORAGE_KEY, mode);
    } catch {
      // Storage can be unavailable in hardened/private browser contexts. The
      // current page still applies the selected mode without persistence.
    }
    return mode;
  }

  function comparableName(value) {
    return clean(value).normalize("NFKC").toLocaleLowerCase().replace(/[\s·・:：_—–\-/／|()（）]+/g, "");
  }

  function bilingualName(localized, original) {
    const chinese = clean(localized);
    const source = clean(original);
    if (!chinese) return source;
    if (!source || comparableName(chinese) === comparableName(source)) return chinese;

    // Some source fields already contain English/Japanese and Chinese aliases.
    // Keep Chinese first while removing an exact duplicate Chinese segment.
    const sourceSegments = source.split(/\s*(?:\/|／|\|)\s*/)
      .map(clean)
      .filter(Boolean)
      .filter((segment) => comparableName(segment) !== comparableName(chinese));
    if (!sourceSegments.length) return chinese;
    return [chinese, ...sourceSegments].join(" / ");
  }

  function displayName(localized, original, mode = getNameLanguage()) {
    const normalizedMode = normalizeNameLanguage(mode);
    if (normalizedMode === "original") return clean(original) || clean(localized);
    if (normalizedMode === "bilingual") return bilingualName(localized, original);
    return clean(localized) || clean(original);
  }

  window.IPBINameLocalization = Object.freeze({
    product: localizedProduct,
    ip: localizedIp,
    display: displayName,
    getMode: getNameLanguage,
    setMode: setNameLanguage,
    storageKey: NAME_LANGUAGE_STORAGE_KEY,
    modes: nameLanguageModes,
  });
})();
