# IP 游戏化项目数据结构

本目录保存“日本 IP 游戏化项目库”的网页数据。`projects.json` 是标准 JSON，`projects.js` 是允许网页在本机直接打开的同内容版本。

## projects

每个独立游戏项目一条记录，建议字段：

- `id`：稳定的项目键
- `productName`：游戏产品名称
- `ipName`：原作 IP
- `ipType`：动漫、漫画、轻小说、游戏、VTuber 等
- `genre`：游戏类型
- `developer`、`publisher`
- `announcementDate`：首次正式公布日期
- `latestUpdateDate`、`latestUpdateLabel`：最近一次可核验的官网、新闻稿或媒体动态及其类型
- `status`：announced、testing、preregister、upcoming、launched、delayed、cancelled、ended
- `summary`：项目内容简介
- `sourceUrl`、`verifiedAt`

## releases

每条记录代表一个“项目 × 地区 × 平台/商店”版本：

- `id`、`projectId`
- `platform`：ios、android、steam、windows、switch、playstation、xbox、web、wechat_minigame、douyin_minigame；正式公布但平台尚未确认时使用 `unannounced`
- `region`：CN、HK、TW、JP、KR、SEA、US；仅有跨地区公告时使用 GLOBAL 或 ASIA，并在页面明确标为公告范围
- `store`、`storeId`、`storeUrl`；移动端另保存商店原始产品名与 iOS `bundleId`
- `plannedLaunchDate`：计划上线日期或时间窗口
- `appleExpectedLaunchDate`：Apple App Store 预约页当前显示的预计发布日期；仅用于计划日期，不等同于正式开服证据
- `plannedLaunchDateSource`、`plannedLaunchDateSourceUrl`、`plannedLaunchDateVerifiedAt`：计划日期的来源与核验时间
- `actualLaunchDate`：实际上线日期
- `testStartDate`、`preregisterDate`、`serviceEndDate`
- `status`、`sourceUrl`、`verifiedAt`

## rankSnapshots

每条记录保存一个平台原生指标，或一个明确标注汇总范围的跨平台估算：

- `releaseId`、`date`；跨平台汇总记录改用 `projectId`，并通过 `platforms` 和 `region` 保存适用范围
- `metricType`：free_rank、grossing_rank、top_seller_rank、download_rank、concurrent_users、average_concurrent_users、daily_active_users、active_users、unit_sales、estimated_sales、physical_sales、review_count、review_score、user_rating_5、estimated_downloads、estimated_revenue 等
- `rank`：榜单名次
- `value`：销量、在线人数或评价数值
- `display`：需要保留原始文本口径时使用，例如商店奖项或“Steam 历史同时在线峰值”
- `scope`：游戏榜、全品类榜、日本地区榜等口径
- `source`、`sourceUrl`
- `performanceLevel`：phenomenon、strong、good、ordinary、insufficient

不同平台的原始指标不直接混算。产品级表现应先在各平台内部标准化，再汇总为表现等级。

选择单一产品时，页面按平台生成独立时间图表：Steam 使用销量、日活 / 活跃 / 月均同时在线，并将全历史峰值单独展示；主机使用销量与用户好评率；iOS、Android 使用下载榜与畅销榜，并分别保留商店、地区和指标名称。`date` 表示该数据点对应的日期；累计值或历史峰值只有核验日期时，必须在 `display` / `scope` 中明确写明“生命周期”“历史峰值”或“截至日期”，不得解释为当日新增或当日日活。

Video Game Insights（Sensor Tower）的 `estimated_sales` 为平台级第三方模型累计销量估算，页面与官方披露的 `unit_sales`、实体周销量 `physical_sales` 分线显示。该估算不参与当前表现等级分布，也不可解释为发行商确认销量；脚本按核验日期保留历史快照，重复运行同一天只覆盖当天记录。

主机用户口碑统一保留官方商店 5 分制星级 `user_rating_5` 与评分人数 `review_count`，两者分图展示。PlayStation Store 页面明确标注为“全球玩家评分”，因此仅保存一条 `GLOBAL` 平台快照；Xbox Store 评分按对应商店地区保存。评分人数用于判断样本规模，不等同于销量；两种指标目前都不参与跨平台表现等级。

日本 iOS 当前榜单通过 Apple App Store RSS 的游戏畅销榜和免费游戏榜采集。公开接口实际返回 Top 100：榜内产品保存精确名次；未出现的产品只在覆盖元数据中记录“未入 Top 100”，不得写成第 101 名。接口不提供历史回溯，因此从首次采集日起按日累积；榜单名次目前不参与跨平台表现等级。

日本 Android 当前榜单通过 AppMagic 的 Google Play 游戏免费榜和畅销榜采集。每次快照保存榜单日期、小时与日本时区：榜内产品保存精确名次；未出现在 Top 200 的目标产品只保存“未入 Top 200”状态，不得写成第 201 名。实时榜页面不作为历史回溯接口，因此从首次采集日起按快照日累积；AppMagic 榜单名次目前不参与跨平台表现等级。

## regionChecks

每条记录代表一次“项目 × 平台 × 目标地区”的官方商店检查。`availability` 区分 `available`、`delisted_store_page`、`not_available_currently`、`not_listed_currently` 与 `check_failed`；后四者都不等同于游戏在所有平台从未发行。东南亚为复合地区，检查单一代表市场时必须写入 `representativeCountry` 并在页面披露样本范围。

已正式公布但尚无发售日期的版本仍建立 release，`plannedLaunchDate` 留空、状态设为 `announced`；只有年份或“上半年 / 下半年”等窗口时直接保存官方原文。未来项目统计必须同时包含精确日期、时间窗口和日期待定三类，不得因为商店或榜单尚未出现而漏记。

当前 Steam 历史同时在线峰值分级：≥100,000 为 phenomenon，≥20,000 为 strong，≥5,000 为 good，其余为 ordinary；该阈值不得套用于手游、主机销量或商店奖项。

当前 AppMagic 手游生命周期估算分级：收入 ≥US$50,000,000 为 phenomenon、≥US$20,000,000 为 strong、≥US$5,000,000 为 good，其余为 ordinary；下载量 ≥10,000,000 为 phenomenon、≥5,000,000 为 strong、≥1,000,000 为 good，其余为 ordinary。免费版只公开数值区间时，`value` 保存公开下限、`lowerBound` 设为 true，并在 `display` 中保留“>”标记；该口径仅用于同类手游规模分级。

未来项目发现不依赖榜单。Phase 25 起增加定向遗漏审计，Phase 26-27 继续以新闻检索结果和近期 IP 手游目录反查数据库遗漏：先使用发行商 / IP 官网、官方社交账号、PR TIMES、4Gamer、Famitsu 与新闻检索发现候选，再回到官网、新闻稿或官方商店核验。商店允许预载或出现“正式发布”版本说明，不自动等同于服务已经开服；例如《SAKAMOTO DAYS Mission: Rogue Dawn》在 2026-09-10 已可安装，但官方倒计时仍确认 9 月 11 日正式开服，因此 `actualLaunchDate` 在开服前保持为空。只有平台尚未公布的正式项目使用 `unannounced`，页面显示“平台待公布”，不得猜测平台。

Phase 28 起每日遍历数据库内全部带数字 App ID 的 iOS release，通过 Apple Lookup 核验预约页预计日期。数据库原本只有年份、时间窗口或空日期时，可用 Apple 预约页日期补精确 `plannedLaunchDate`；若已存在不同的官方精确日期，只记录冲突并进入人工核验队列，不覆盖官方日期。计划日期到达后仍未写入 `actualLaunchDate` 的 release 必须进入到期核验队列，只有取得官网、发行商/版权方公告或官方账号的正式开服/发售证据后才能改为 `launched`。

同一日更流程还会用 Apple 预约页索引与多组日文新闻检索生成新项目候选队列。候选结果不直接写入正式项目库；自动任务必须回到官网、发行商/版权方、官方账号、PR TIMES、4Gamer、Famitsu 或官方商店核验项目归属、平台、地区与日期，确认属于日本娱乐 IP 游戏化后再去重入库。

历史 Steam 批次分别查询美国与日本商店。商店接口当前无法核验的地区不建立 release，不根据其他地区日期反推；全历史同时在线峰值通过 SteamCharts 或 SteamDB 记录，并在 `scope` 中保留核验截至日期。

PlayStation 地区核验使用香港、台湾、韩国、新加坡官方商品页。同一产品在英文与中韩文商店使用不同 Product ID 时，按地区分别保存；上线日期直接采用当地商品页展示值。只有在版本包含基础游戏且与基础版同日上线时才允许使用版本页作为发行证据，扩展包或后续升级版不用于反推基础游戏上线日期。

Xbox 地区核验使用香港、台湾、韩国、新加坡官方商品页，并保存基础游戏 Product ID、商店原始标题及原始 `releaseDate`。有时间戳时按对应商店时区转换为当地日期；旧商品页未返回日期时只确认当前商品页可用，并标记“当地首发日期待核验”，不套用其他地区日期。东南亚仍以新加坡作为代表样本。

Nintendo Switch 地区核验使用任天堂香港、台湾、韩国官方软件目录与当地 eShop 商品页；东南亚使用 Nintendo 新加坡目录及新加坡 eShop 作为代表样本。Nintendo Switch 与 Nintendo Switch 2 若为同一产品、同一地区，合并为一条平台版本并保存全部 NSUID。香港、台湾、韩国新版目录中的 ISO 时间戳按页面展示的日期部分保存，不做时区换日；新加坡旧版目录采用其本地 `sdate`。台湾目录与新加坡 eShop 启用后重新上架的旧游戏，记录当地目录所示上架日，不反推全球或原始首发日。当前检索不到商品只标记“当前未上架 / 未检索到”，不等同于从未发行；韩国《进击的巨人 2》当前仅检索到包含本体的 Final Battle 版本，因此只确认当前可用，不以版本日期反推基础版首发。

中国大陆核验以国家新闻出版署游戏审批与变更公示为正式发行基础证据，并补充中国大陆 App Store、蒸汽平台、游戏官方国服网站及发行公告。国行主机版本只认国行审批与发行信息，不把海外版光盘、跨区账号或非国行商店计作大陆版本；国际 Steam 页面也不替代蒸汽平台。版号获批与实际上线分开记录。当前未找到同名产品只标记“当前未确认正式大陆版本”，不推断其从未发行，并保留本地化名称差异和后续上架的复核空间。

地区筛选固定采用 `meta.targetRegions` 中的七个核心市场。`GLOBAL` 与 `ASIA` 不作为可选地区：选择某一核心市场时，这两类记录只能以“公告覆盖、待逐区确认”的状态出现，且不得继承全球榜单或市场表现；存在同平台逐区记录时，逐区记录优先并去除公告范围重复项。
