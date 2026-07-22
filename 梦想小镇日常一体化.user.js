// ==UserScript==
// @name         梦想小镇日常一体化 v3.80
// @namespace    http://tampermonkey.net/
// @version      3.80
// @description  全自动日常 + 任务穷举调度器：签到/许愿/吃饭/设施/食神/市场/食材预定/食材券/礼包/餐厅/系统邮箱/宝箱/食谱/守护者/季节签到/扭蛋/成就
// @author       yaguyagu
// @match        https://xx.xlu233.com/xz/*
// @updateURL    https://raw.githubusercontent.com/SeptYagu/dreamtown-helper/main/%E6%A2%A6%E6%83%B3%E5%B0%8F%E9%95%87%E6%97%A5%E5%B8%B8%E4%B8%80%E4%BD%93%E5%8C%96.meta.js
// @downloadURL  https://raw.githubusercontent.com/SeptYagu/dreamtown-helper/main/%E6%A2%A6%E6%83%B3%E5%B0%8F%E9%95%87%E6%97%A5%E5%B8%B8%E4%B8%80%E4%BD%93%E5%8C%96.user.js
// @homepageURL  https://github.com/SeptYagu/dreamtown-helper
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

/*
 * v3.80 变更（2026-07-22 扭蛋累积奖励）
 * - 扭蛋模块新增累积次数奖励领取，精确点击“累积N次”行内的真实getEggAward(N)领取链接
 * - 每次只领第一项并刷新继续，领完所有已达成档位后再继续扭蛋或正常结束
 *
 * v3.79 变更（2026-07-22 本地加载桥端到端验证）
 * - 不改动功能逻辑；仅更新发布文件，验证页面重载可直接读取新版且无需再次安装加载桥
 *
 * v3.78 变更（2026-07-22 本地跟踪发布验证）
 * - 不改动功能逻辑；验证通过固定本地发布文件自动更新Tampermonkey，同时继续提交并推送GitHub
 *
 * v3.77 变更（2026-07-22 全局路由互斥）
 * - Router增加单页互斥，阻止初始化与页面恢复看门狗并发执行同一动作、重复记账或完成后拉回旧页面
 * - 升级时一次性重开当天14点服务器校准与酒吧补跑，用服务器43/45纠正旧并发造成的虚高后补齐
 *
 * v3.76 变更（2026-07-22 服务器进度校准）
 * - 今日活跃页的好友与酒吧次数改为服务器权威值，不再用Math.max保留旧版本虚高的本地计数
 * - 酒吧合计次数按已知猜杯进度优先保留、其余分配给猜拳，确保合计缺口会继续触发补跑
 * - 每日14:00/18:00/22:00 +0至3分钟只读复核活跃进度，为后续好友/酒吧补跑提供新鲜完成判定
 *
 * v3.75 变更（2026-07-22 每日累计补跑）
 * - 点赞与酒吧次数明确按服务器06:00重置的每日累计目标执行；单轮超时不再意味着当天没有后续机会
 * - 酒吧保留10:05首轮并增加14:12/18:12/22:12 +0至8分钟补跑；好友午饭后主轮外增加16:12/20:12/23:12 +0至8分钟补跑
 * - 补跑只在目标尚有缺口时进入时刻表；好友补跑同时推进点赞/翻柜/蟑螂，酒吧补跑只处理猜拳/猜杯
 * - 好友与酒吧跨页寿命分别延长到20/15分钟；高次数自动驾驶按配置动态放宽迭代保护
 *
 * v3.74 变更（2026-07-22 面板预定区压缩）
 * - 删除两个食材预定下拉上方重复的“预定位1/2”小字，缩短左栏高度
 * - 本页执行、全套运行、总停止三个全局按钮移到右栏调度器下方，利用空位并保持按钮固定排列
 *
 * v3.73 变更（2026-07-22 食材自动预定）
 * - 新增独立“食材预定”模块：领取两个到货槽位后，固定以数量1补满两个预定
 * - 面板提供两个食材偏好下拉；自动模式按库存升序、同库存等级降序选择，并排除另一槽已预定食材
 * - 逐页真实点击2至5级库存分类，读取页面实际预计/剩余时间；长期调度按最早到货再加1至5分钟执行
 *
 * v3.72 变更（2026-07-22 守护者续战、菜场保底与到访礼物）
 * - 守护者补货未确认或按钮暂缺时保持当前阶段并复核，只有页面明确显示挑战完成才结束
 * - 普通2级菜价格高于2650但库存低于100时紧急购买300个；原限价补到950及鸡肉/猪肉规则保留
 * - 沾光模块每小时先检查阿鹿/阿呆到访自己餐厅，存在时领取真实金宝箱，再继续检查别人餐厅沾光
 *
 * v3.71 变更（2026-07-19 手动浏览隔离）
 * - 免费宝箱模块增加调度门禁，普通手动进入酒吧时不再被自动跳转到开宝箱页
 *
 * v3.70 变更（2026-07-19 日常分时与状态机修复）
 * - 好友每日项目改为午饭完成后、食材合成前执行；酒吧每日项目改为10:05后随机延迟0-3分钟
 * - 猜酒杯在最后一次中奖达到目标时仍优先点击真实领奖/停止按钮，再结束本轮
 * - 好友翻柜按“好友+柜子”去重，不再把相同柜子换楼层当新动作；楼层跳转只服务蟑螂图标
 * - 设施设置页识别本轮已使用状态，商店按保存的明确目标页返回，避免广播商店偶发循环
 *
 * v3.69 变更（2026-07-19 成就领取）
 * - 新增默认开启的成就领取：只点击红色可领取卡片中的真实“领取”按钮，并按“当前页 → 二级星号 → 一级星号”顺序扫完
 * - 每日09:10后随机延迟0-40分钟执行一次，加入自动驾驶最后一步和面板单项运行
 * - 增加15分钟/100次上限、同一成就失败防重试，以及页面结构异常时的一次成就总览复核
 *
 * v3.68 变更（2026-07-19 守护者补货返回）
 * - 补货验证成功后固定进入真实守护者页，不再依赖物品页“返回前页”的浏览历史，避免补货后回首页却未继续战斗
 *
 * v3.67 变更（2026-07-19 守护者补货）
 * - 爆裂飞弹库存低于200时购买300个，并保留购买后返回战斗、继续打完本轮的逻辑
 *
 * v3.66 变更（2026-07-19 守护者十连与整轮超时）
 * - 战斗页精确读取爆裂飞弹所在行库存及守护者血量；血量>1000使用十连，≤1000改为单发
 * - 守护者跨页整轮寿命延长到20分钟，修复单发刷新约60秒后打一半被调度器提前收尾
 *
 * v3.65 变更（2026-07-18 守护者与食谱固定日程）
 * - 守护者改为每日06:05后随机延迟0-10分钟，食谱升级改为每日08:10后随机延迟0-10分钟
 * - 两项均按服务器自然日执行一次，错过时当天补跑，不再随上次完成时刻逐日漂移
 *
 * v3.64 变更（2026-07-18 食谱学习并入升级）
 * - 删除重复且会卡在食谱根页的“自动学习新食谱”子开关与独立运行入口
 * - 食谱升级统一扫描真实“可升级”分类；遇到未学习项先学习，再继续按目标等级升级
 *
 * v3.63 变更（2026-07-18 面板对齐与调度列表去重）
 * - 餐厅/邮箱合并行去掉小字；每日项目调整说明/运行/总开关顺序，并把重置说明移到标题右侧
 * - 长期调度器列表不再重复显示上方已经突出展示的下一项或正在运行项
 *
 * v3.62 变更（2026-07-15 自动驾驶合并运行）
 * - 面板把餐厅管理与餐厅后系统邮箱合并为一步，合并运行会依次执行两者
 * - 每日项目合并行恢复“运行”按钮，一键执行上方当前开启且次数大于0的所有项目
 *
 * v3.61 变更（2026-07-15 沾光服务器进度强制复核）
 * - 沾光成功返回来访页后强制刷新一次，避免浏览器后退缓存把点击前2/3误当成最新进度
 * - 升级时立即复查当前小时，已达3/3会马上停排到次日10:31
 *
 * v3.60 变更（2026-07-15 沾光动态整点调度）
 * - 沾光改为每日10:31-21:31逐小时检查，错过时只补当前小时，不再把多个旧时段挤到同一批餐厅
 * - 唯一完成标准改为来访页真实显示“今日已沾光：3 / 3次”；本地动作计数不再提前宣告完成
 *
 * v3.59 变更（2026-07-15 餐厅来访沾光）
 * - 新增“沾光（推荐3次）”，只跟随来访记录中当前正在做客的阿鹿/阿呆餐厅并点击真实沾光按钮
 * - 同步服务端“今日已沾光 N/3”，每个餐厅每日只尝试一次，明确成功后才计数
 * - 长期调度器固定在 10:31、11:31 检查两轮，优先覆盖最早两批小时来访
 *
 * v3.58 变更（2026-07-15 许愿果库存作用域修复）
 * - 额外许愿只解析真实按钮旁“拥有N个”，不再让面板“推荐0次”污染库存判断
 *
 * v3.57 变更（2026-07-15 每日细项跨页会话修复）
 * - 每日项目单项运行使用独立持久会话保存目标与本次成功数，跨页不再退回全天计数判定
 * - AutoPilot结束、总停止或异常残留时同步清理细项会话，避免影响正常每日调度
 *
 * v3.56 变更（2026-07-15 独立运行显式进度修复）
 * - 可重复每日项目改用本次运行的显式成功计数，不再依赖全天累计差值
 * - 单项运行严格执行面板设置次数：配置0次就不执行，配置N次则本次执行N次
 *
 * v3.55 变更（2026-07-15 每日项目独立运行基准修复）
 * - 可重复每日项目的独立运行按本次启动基准计数，今日已经达标后仍能再次执行
 * - 额外许愿果配置为0时点击“运行”仍明确执行1次，不清空长期调度的每日累计
 *
 * v3.54 变更（2026-07-15 NPC跨区域真实路由修复）
 * - NPC路线按visited从首页选择下一站，食神/菜场后先回首页，找不到链接不再误报完成
 *
 * v3.53 变更（2026-07-15 协会安妮拜访）
 * - “拜访NPC”一轮新增协会安妮，经广场往返后继续酒吧雯姐
 *
 * v3.52 变更（2026-07-15 广场阿鹿拜访）
 * - “拜访NPC”一轮新增广场阿鹿，四位NPC全部处理后才算完成
 *
 * v3.51 变更（2026-07-15 饭后食材合成）
 * - 每次早午晚饭任务完成后，进入橱柜首个1级食材并只点击一次“全部合成”
 * - 自动驾驶把食材合成紧跟吃饭/体力；餐厅自动添油阈值提高到14000
 *
 * v3.50 变更（2026-07-15 自动驾驶连续编号与领奖收尾）
 * - 自动驾驶列表补齐邮箱引用行，并把食神、菜园姐、雯姐统一纳入“拜访NPC”一轮
 * - 每日项目合并为一个显示步骤，面板按16项连续编号；今日活跃领奖最后收尾
 *
 * v3.49 变更（2026-07-15 自动驾驶餐厅提前）
 * - 餐厅管理由第15步提前到第2步，餐厅后系统邮箱继续紧随其后作为第3步
 * - 原第2至14步顺次后移，面板编号自动跟随真实AutoPilot顺序
 * - 今日活跃领奖移到第20步，所有日常项目执行后再进行最终领奖
 *
 * v3.48 变更（2026-07-15 餐厅蟑螂开关持久化）
 * - 自家餐厅自动打蟑螂改为默认开启，并一次性修复旧版误关的现有配置
 * - 体力不足、操作失败、单轮上限或调度超时只停止当前轮次，不再永久关闭用户开关
 *
 * v3.47 变更（2026-07-15 爆裂飞弹正式安全补货）
 * - 正式规则改为库存低于100时单次购买300个
 * - 购买接口同页更新时主动等待并验证库存增长，成功后立即返回，避免长期调度卡在running
 * - 守护者页与飞弹商店仅在调度/自动驾驶/单项阶段运行，普通手动浏览不再被脚本接管刷新
 *
 * v3.46 变更（2026-07-15 爆裂飞弹真实输入框兼容）
 * - 真实商店数量框ID为buyNum，同时兼容旧版buy_num；继续保留700/3小额测试规则
 *
 * v3.45 变更（2026-07-15 爆裂飞弹安全补货测试版）
 * - 爆裂飞弹库存低于700时单次购买3个，用于真实商店小额验收
 * - 精确读取商店“拥有数量”，解析失败安全停止，购买后验证库存确实增长
 * - 持久记录购买尝试，失败响应或刷新异常不会连续重复提交购买
 *
 * v3.44 变更（2026-07-15 标题显示自己餐厅ID）
 * - 面板标题右侧常驻显示自己餐厅ID获取状态，自动驾驶刷新标题时仍保留
 *
 * v3.43 变更（2026-07-15 自己/好友餐厅隔离）
 * - 自己餐厅概览自动从“IDxxxx”和真实楼层链接交叉学习餐厅ID
 * - restaurant_<uid>_<floor> 只有uid等于已记录自己的ID时才执行餐厅管理
 * - 餐厅管理增加运行阶段隔离，普通浏览好友餐厅不再打蟑螂、切楼或刷新
 *
 * v3.42 变更（2026-07-14 设施续期与安全补货）
 * - 设施流程改为每12小时执行：未设置则继续安装，已设置则每轮各续期一次
 * - 安装/续期完成后依次进入三个真实商店，明确读取“拥有数量”后才判断库存
 * - 库存低于5时只点击一次“购买10个”，验证库存确实增加；读取失败立即安全停止
 * - 手动打开三种设施商店也会按同一阈值即时补货；用购买前库存记账杜绝失败时连续购买
 *
 * v3.41 变更（2026-07-14 全面细项运行）
 * - 删除Esc键监听，总停止仅接受面板鼠标点击
 * - 餐厅子项、食谱学习与8个每日项目全部增加独立运行键
 * - 组合模块新增跨页actionScope，独立运行只执行所点细项且不改长期开关
 *
 * v3.40 变更（2026-07-14 常驻总停止）
 * - “停止当前操作”按钮永久占位，不再因AutoPilot启动而插入并推动布局
 * - 总停止会中止AutoPilot/Scheduler、清当前phase并锁住后续脚本点击
 * - 仅在明确启动调度器、全套、单项或执行本页时解除停止锁
 *
 * v3.39 变更（2026-07-14 面板按钮位置稳定）
 * - 面板显示前先计算完整调度列表，禁止状态内容晚到后推动按钮
 * - 调度状态区固定110px高度；运行中/空闲/列表刷新时控制按钮位置不变
 *
 * v3.38 变更（2026-07-14 面板首屏稳定）
 * - userscript提前到document-start注册，减少页面加载后面板延迟出现
 * - 面板先隐藏完成状态填充，强制展开长期调度器后一次性显示，消除折叠闪动
 *
 * v3.37 变更（2026-07-14 自家餐厅动作修复）
 * - 第15项改名“餐厅管理（总开关）”，明确其与左上角子开关的主从关系
 * - 删除自家餐厅不存在的翻柜功能；好友翻柜仍由独立“每日好友项目”负责
 * - 自家餐厅先直接点击当前楼层的 killCockroachOne，再扫描带标记的其它楼层
 *
 * v3.36 变更（2026-07-14 餐厅死循环与调度自救）
 * - 修复蟑螂图标邻接查找在两个兄弟元素间往返，导致餐厅总览主线程永久卡死
 * - 调度阶段增加绝对超时；过期餐厅任务先关闭高风险动作并返回首页，避免重开后续跑旧 running
 *
 * v3.35 变更（2026-07-15 邮箱真实入口修复）
 * - 餐厅后邮箱改走首页真实 /xz/mailbox 入口；该页本身就是系统第一页
 * - 删除首页不存在的 /xz/mailbox_0_1 首跳，结束每5分钟失败重试造成的调度空转
 *
 * v3.34 变更（2026-07-15 NPC轮次语义修复）
 * - “拜访NPC”按完整轮次计数：菜园姐与雯姐都处理完才完成1轮
 * - 推荐次数改为1轮，并迁移v3.33可能在首位NPC后提前完成的状态
 *
 * v3.33 变更（2026-07-15 菜场、NPC 与链式邮箱修复）
 * - 菜场兼容当前每日菜场 buyDayFood(区块,索引,id)，恢复按旧阈值补足1级菜及指定2级菜
 * - 菜园姐与雯姐合并为独立“拜访NPC（推荐2次）”每日项目，不受付费菜场采购开关影响
 * - 系统邮箱改为只在餐厅实际完成后触发，清除残留的独立邮箱倒计时与空转
 *
 * v3.26 变更（2026-07-14 调度器休眠恢复）
 * - 新增60秒看门狗及focus/visibility唤醒，恢复浏览器后台冻结后遗失的定时器/Promise
 * - 自动续跑停滞phase、立即触发主页过期任务，并把无phase子页带回首页
 *
 * v3.25 变更（2026-07-14 食谱长期目标与轮次分离）
 * - 食谱扫描完成后保留面板目标等级，仅结束当前轮次
 * - Scheduler每24小时及AutoPilot每轮到达食谱前自动开启全新扫描轮次
 *
 * v3.24 变更（2026-07-14 食谱可升级分类修复）
 * - 食谱只在动态街道的 cookbook_<街道>_3_<页码>“可升级”分类扫描与翻页
 * - 详情页保存并返回原可升级分页，禁止误入 cookbook_<街道>_0_<页码>“全部”分类
 *
 * v3.23 变更（2026-07-14 食谱全量升级扫描）
 * - 材料不足或条件不满足的食谱仅在本轮跳过，继续升级其它符合目标的菜品
 * - 扫描全部分页并处理完所有可行项后才关闭目标，避免单个受阻食谱反复进入
 *
 * v3.22 变更（2026-07-14 酒吧拜访、好友蟑螂导航与调度交接）
 * - 每日酒吧项目新增“拜访雯姐”，按真实 see() 按钮存在/消失判断每日完成
 * - 好友蟑螂按列表和楼层的真实图标导航，不再无差别遍历所有好友全部楼层
 * - AutoPilot 正常完成或单独停止后自动恢复长期调度器；紧急停止仍同时停止两者
 *
 * v3.21 变更（2026-07-14 餐厅真实入口与版本显示修复）
 * - 餐厅调度按真实 /xz/restaurant href 导航，不依赖首页动态用户名/“我的餐厅”文字
 * - 面板创建与状态刷新统一使用单一版本常量，避免刷新后标题回退到旧版本
 *
 * v3.20 变更（2026-07-14 自动驾驶纳入市场后的完成状态修复）
 * - 市场无后续购买、冷却或资源不足时显式返回完成，避免调度器永久保持 running
 * - 市场点击购买后显式保持未完成，刷新后继续检查；面板标题同步当前版本
 *
 * v3.19 变更（2026-07-14 自动驾驶与调度时钟修复）
 * - 自动驾驶补齐每日好友、每日酒吧、额外许愿、今日活跃领奖和食材采购
 * - 页面“家园报时”只作时钟校准，之后按实际经过时间推进，避免5分钟重试永久停在同一分钟
 *
 * v3.18 变更（2026-07-14 项目次数保存）
 * - 次数输入同时监听 input/change，编辑后立即持久化，跨页不再恢复推荐值
 *
 * v3.17 变更（2026-07-14 每日固定任务补跑）
 * - 当天已过计划时刻但尚未完成时，启动调度器立即补跑，不再直接跳到明天
 *
 * v3.16 变更（2026-07-14 每日项目与领奖解耦）
 * - 新增可配置每日项目：点赞、翻柜、打蟑螂、猜拳、猜酒杯、猜数字、额外许愿
 * - 常驻活跃/季节/扭蛋只负责领奖；早饭后执行项目并领奖，晚饭后复查领奖
 * - 项目次数按服务器06:00游戏日持久化；搬家按用户要求不纳入
 *
 * v3.15 变更（2026-07-14 服务器时间兼容）
 * - 当前站点“驯鹿报时”已改名“家园报时”，同时兼容两种服务器时间标签
 * - 重置 v3.14 用本地时区误算的 nextAt，并把历史 lastRun 迁移到服务器时间轴
 *
 * v3.14 变更（2026-07-14 长期调度修复）
 * - 到期任务保留在队列中逐个执行，不再因其他任务占用而跳到下一周期
 * - 食材券加入每日调度；市场修复 23 点跨日并支持当前小时补跑
 * - 守护者/食谱恢复精确 24 小时周期，不再累计正向抖动
 * - 食谱按页面真实“可升级”链接导航，配置名称统一为“中品”
 *
 * v3.13 变更（2026-07-14 食谱目标等级修复）
 * - 恢复详情页当前等级解析，达到目标立即返回列表，不再升级到材料不足
 * - 兼容当前站点“中品”等级名称（与旧配置“特色”同级），解析失败时安全停止
 *
 * v3.12 变更（2026-07-14 市场活动领取）
 * - 市场出现周二日常活动时，先领取免费食材预定券，再刷新续跑采购
 * - 非计划模块明确返回 false 时不提前写完成标志，保证调度器跨刷新续跑
 *
 * v3.11 变更（2026-07-14 全功能实测修复）
 * - 删除旧市场脚本从未包含的“每日菜场”自动购买，避免完整刷新后重复购买第一行
 * - 食谱扫描完成关闭目标等级时，同步刷新面板下拉框
 *
 * v3.10 变更（2026-07-14 餐厅安全修复）
 * - 打蟑螂也增加体力不足退出和每轮 20 次硬上限，避免失败后重复刷新
 * - 首次升级救援同时关闭餐厅、打蟑螂和翻柜，确保当前失控页立即停止
 *
 * v3.9 变更（2026-07-14 餐厅安全修复）
 * - 餐厅翻柜增加每轮 120 次硬上限；失败或超限会自动关闭翻柜子开关
 * - 首次升级若正困在餐厅页，自动停止 AutoPilot 并关闭餐厅，确保立即脱困
 *
 * v3.8 变更（2026-07-14 全功能实测修复）
 * - 餐厅翻柜恢复旧脚本“体力不足/翻柜失败即停止”退出条件，避免 digOne 无限刷新
 *
 * v3.7 变更（2026-07-14 全功能实测修复）
 * - 食材券匹配当前 /xz/prop_food_random_* 页面，按实际剩余数量点击“全部兑换”
 * - 兑换至 0 后返回仓库继续下一种，直到白名单券全部消失才完成
 *
 * v3.6 变更（2026-07-13 实测修复）
 * - AutoPilot 启动时清旧紧急停止标志；首页 advance 主动续跑连续关闭模块
 * - Scheduler.start 删除不存在的 init() 调用，直接计算并安排全部任务
 *
 * v3.5 变更（2026-07-14）
 * - 跨页任务统一改为“每页只执行第一个动作；关键动作消失才完成”
 * - AutoPilot 独占计划模块，取消 Router 双执行与同页误 advance
 * - 修复仓库食材券入口/ID、礼包循环、守护者连续攻击、多级真实导航
 * - Scheduler 持久化全部计划时间，固定任务 jitter 每日只生成一次
 * - 恢复旧脚本默认/阈值：特价只买 666、设施库存 5、食谱默认关闭、餐厅添油子开关
 *
 * v3.4 变更（2026-07-13 27h+）
 * - 【食谱】彻底禁用万能食材升级：删除 processUniversal 方法、useUniversal 配置、面板开关
 *   findUpgradeButton 重命名为 findNormalUpgradeButton（语义清晰）
 *   /xz/cook_universal_* 页检测到直接 returnToList，不进入不操作
 * - 清理无用变量 checkConditions 中的 hasGreen
 *
 * v3.3 变更（2026-07-13 27h+）
 * - AutoPilot.PLAN 扩展到 13 步，纳入食材券 + 食谱升级
 * - 食材券模块重写：综合旧 v2.4 脚本的 8 种 propId（244/21-25/245/224）+ 新页面 fallback
 *   新增 /xz/food_random_<level> 页面的 random(level, 1000) 一键兑换
 *   兑换完自动返回仓库；找不到任何可用券直接结束（不卡死）
 * - 食谱升级模块重写：综合旧 v4.0 脚本的完整功能
 *   - 等级映射 0-13（普通/特色/上品/极品/金牌1-10级）
 *   - 目标等级 + 自动学习 + 万能食材兜底 三项配置（面板新加「食谱升级配置」区块）
 *   - 条件检查：含 × / 拥有 / 街道 / 升级至 的关键块，红字或"未达"判失败
 *   - 升级失败标记检测（gen_background_yellow 容器）
 *   - 翻页支持（"下一页"链接）
 * - 面板新增「自动驾驶流程（13 步）」预览块：实时显示顺序、当前步、启用状态
 *
 * v3.2 变更（2026-07-13 26h+）
 * - 市场新增常驻菜补货：符合价格条件时将 1/2 级菜补到 950
 * - 2 级鸡肉、猪肉不受单价限制，库存不足时强制补货
 * - 市场金币不足后进入 24h 冷却，并支持跨刷新续购
 * - 接入 GitHub 元数据地址，支持 Tampermonkey 自动检查更新
 *
 * v3.0 变更（2026-07-13 24h+ 反馈）
 * - 新增任务穷举表 DAILY_SCHEDULE（9 项）+ DYNAMIC_SCHEDULE（4 项：market/energy/restaurant/facility）
 * - 新增调度器 Scheduler：算最近的下次 → setTimeout → 触发 → 算下次
 *   替代原"按模块 schedule 类型计算延迟"的简单版本
 * - 单一 tick 循环，处理所有定时类型：daily / meal(3 期) / hourly(6-23) / 24h / 动态
 * - 模块完成时写 mod_<id>_done 标志，Scheduler.onPageLoad 据此判断返回主页时机
 * - 调度器与 AutoPilot 互斥（同一时刻只能跑一种）
 * - 面板新增 ⏰ 调度器区块：状态显示 + 下次任务 + 启动/停止/重算按钮
 * - 模块开关变化时自动重算 schedule
 *
 * v2.1 变更（基于 2026-07-13 用户反馈）
 * - 新增 AutoPilot 全自动模式：一键启动后自动跳转每项日常并执行
 * - 设施限定 3 项（广播/海报/老鼠夹）+ 仅用长效，不用金牌
 * - 许愿连点 4 次直到按钮变灰
 * - 扭蛋领奖改用 getEggTicket(0)（getEggAward 是装饰 emoji）
 *
 * v2.0 变更（基于 2026-07-13 全页探查）
 * - 食神: seeGod() → see()
 * - 设施: /xz/facility → /xz/restaurant_facility（5 项全未设置，需走设置页安装）
 * - 食材券: 旧 propId 失效 → 模块禁用
 * - 守护者: 3 种飞弹，只处理爆裂(prop_82)
 * - 食谱: 升级 onclick 是 study(id, level)
 * - 扭蛋: 7 任务 + 实际扭蛋
 * - 季节签到: getSeasonAward(0)
 *
 * 定时策略：
 *   每日 7:30 ± 15min  ：签到/许愿/食神/宝箱/食材券/礼包/季节/扭蛋
 *   精确 24h 硬定时   ：守护者/食谱
 *   每日 3 期          ：吃饭（7-10→12, 12-15→18, 18-21→次日7）
 *   整点 6-23          ：市场
 *   17-45min 随机      ：餐厅管理
 *   智能（剩余+1h）    ：设施
 *
 * 硬约束（封号红线）：
 *   1. 模拟真实点击（mousedown/mouseup/click）
 *   2. 每步 ≥ 600ms 间隔
 *   3. 不并发多页面
 *   4. 不构造链接 / 不直接 API（Scheduler / AutoPilot 仅通过点击真实 <a> 元素的 href 跳转）
 *   5. 按钮位置见本机 handoff 文档（不提交公开仓库）
 */

(function () {
  'use strict';

  if (window.__DXZXX_LOADED__) return;
  window.__DXZXX_LOADED__ = true;

  const NS = 'dxzxx_';
  const SCRIPT_VERSION = '3.80';
  const MIN_STEP_MS = 600;
  const REFRESH_HOUR = 7;       // 服务器日重置时间（原脚本统一为 7:30 ± 15min）
  const REFRESH_MIN = 30;
  const REFRESH_RAND = 15;

  // ==================== 工具层 ====================
  const Utils = {
    log(m) { console.log(`%c[一体化]%c ${m}`, 'color:#4fe;font-weight:bold', 'color:inherit'); },
    warn(m) { console.warn(`[一体化] ${m}`); },

    click(el) {
      if (Utils.gget('operation_stopped', false)) {
        Utils.warn('总停止锁已启用，阻止脚本继续点击');
        return false;
      }
      if (!el || !el.dispatchEvent) return false;
      ['mousedown', 'mouseup', 'click'].forEach(t => {
        el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: el.ownerDocument.defaultView }));
      });
      return true;
    },

    sleep(ms) { return new Promise(r => setTimeout(r, Math.max(ms, MIN_STEP_MS))); },
    randMs(minS, maxS) { return Math.floor(minS * 1000 + Math.random() * (maxS - minS) * 1000); },

    gget(k, d) { try { const v = GM_getValue(NS + k, d); return v; } catch (e) { return d; } },
    gset(k, v) { try { GM_setValue(NS + k, v); } catch (e) {} },

    _serverClockStamp: null,
    _serverClockBaseMs: 0,
    _serverClockCapturedAt: 0,

    getServerTime() {
      const localNow = Date.now();
      try {
        const ps = Array.from(document.querySelectorAll('p'));
        const el = ps.find(p => /(?:驯鹿|家园)报时[：:]/.test(p.textContent));
        if (el) {
          const m = el.textContent.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
          if (m) {
            // 页面报时是服务器渲染时的静态文本，不能每次原样返回，否则页面停留期间时间永远不走。
            // 仅在首次读取或页面给出新时间样本时重新校准，样本之间用本地经过时间推进。
            const stamp = m[0];
            if (this._serverClockStamp !== stamp || !this._serverClockBaseMs) {
              this._serverClockStamp = stamp;
              this._serverClockBaseMs = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
              this._serverClockCapturedAt = localNow;
            }
            return new Date(this._serverClockBaseMs + Math.max(0, localNow - this._serverClockCapturedAt));
          }
        }
      } catch (e) {}
      return new Date(localNow);
    },

    nextDaily(serverTime, hour = REFRESH_HOUR, min = REFRESH_MIN, rand = REFRESH_RAND) {
      const next = new Date(serverTime);
      next.setDate(next.getDate() + 1);
      next.setHours(hour, min + Math.floor(Math.random() * rand), 0, 0);
      if (next.getTime() <= serverTime.getTime()) next.setDate(next.getDate() + 1);
      return next;
    },

    findByText(sel, text) {
      return Array.from(document.querySelectorAll(sel)).find(el => el.textContent.trim() === text);
    },

    findAllByText(sel, text) {
      return Array.from(document.querySelectorAll(sel)).filter(el => el.textContent.trim() === text);
    },

    findByTextIncludes(sel, text) {
      return Array.from(document.querySelectorAll(sel)).find(el => el.textContent.includes(text));
    },

    findAllByTextIncludes(sel, text) {
      return Array.from(document.querySelectorAll(sel)).filter(el => el.textContent.includes(text));
    },

    showStatus(module, msg, color = '#4fe') {
      let box = document.getElementById('dxzxx-status');
      if (!box) {
        box = document.createElement('div');
        box.id = 'dxzxx-status';
        box.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:8px 16px;background:rgba(0,0,0,0.85);color:#fff;border-radius:20px;font-size:13px;z-index:99999;font-weight:bold;box-shadow:0 2px 10px rgba(0,0,0,0.3);max-width:90%;text-align:center;';
        document.body.appendChild(box);
      }
      box.innerHTML = `<span style="color:${color}">${module}：</span>${msg}`;
    },

    async clickAll(buttons, moduleLabel = '') {
      for (let i = 0; i < buttons.length; i++) {
        await this.sleep(this.randMs(1.2, 2.5));
        if (this.click(buttons[i])) {
          this.log(`${moduleLabel} 点击[${i + 1}/${buttons.length}]: ${(buttons[i].textContent || '').trim().slice(0, 30)}`);
        } else {
          this.warn(`${moduleLabel} 点击失败: ${buttons[i]?.outerHTML?.slice(0, 80)}`);
        }
      }
    },

    back() {
      const back = Array.from(document.querySelectorAll('a')).find(a =>
        a.textContent.includes('返回前页') ||
        a.textContent.trim() === '返回' ||
        (a.getAttribute('onclick') || '').includes('backPage')
      );
      if (back) this.click(back);
    },
  };

  // ==================== 模块注册表 ====================
  // 这里定义面板主开关；AutoPilot.PLAN 在后文另行定义完整执行顺序，并包含隐藏的每日项目模块。
  // schedule: daily(每日固定时段) | hourly(整点) | restaurant(17-45min随机)
  //  | guardian/recipe(每日固定时段) | meal(每日3期) | facility(每12h)
  // 默认开关：与日常强相关且安全的默认开，付费/风险操作默认关
  const MODULE_DEFS = [
    // —— 面板主模块 ——
    { id: 'signIn',     label: '1. 每日签到',     default: true,  schedule: 'daily' },
    { id: 'wish',       label: '2. 许愿树(免费)', default: true,  schedule: 'daily' },
    { id: 'box',        label: '4. 免费宝箱',     default: true,  schedule: 'daily' },
    { id: 'season',     label: '5. 季节签到',     default: true,  schedule: 'daily' },
    { id: 'egg',        label: '6. 免费扭蛋',     default: true,  schedule: 'daily' },
    { id: 'foodCoupon', label: '7. 食材券',       default: true,  schedule: 'daily' },  // 用旧 propId + 新页面适配
    { id: 'energy',     label: '8. 吃饭/体力',    default: true,  schedule: 'meal' },
    { id: 'foodCompound', label: '饭后食材合成', default: true, schedule: 'meal-chained' },
    { id: 'restaurant', label: '9. 餐厅管理（总开关）', default: true, schedule: 'restaurant' },
    { id: 'facility',   label: '10. 设施安装',    default: true,  schedule: 'facility' },
    { id: 'bag',        label: '11. 礼包开启',    default: true,  schedule: 'daily' },
    { id: 'recipe',     label: '12. 食谱升级',    default: true,  schedule: 'recipe' },    // 默认开；目标等级可调，未学习项自动先学习
    { id: 'guardian',   label: '13. 守护者(爆裂)', default: true, schedule: 'guardian' },
    { id: 'dailyFriend', label: '每日好友项目', default: true, schedule: 'daily-project', hidden: true },
    { id: 'dailyBar',    label: '每日酒吧项目', default: true, schedule: 'daily-project', hidden: true },
    { id: 'dailyProgress', label: '每日项目进度校准', default: true, schedule: 'daily-project', hidden: true },
    { id: 'dailyNpc',    label: '每日NPC拜访', default: true, schedule: 'daily-project', hidden: true },
    { id: 'dailyLuck',   label: '每日餐厅沾光', default: true, schedule: 'daily-project', hidden: true },
    { id: 'extraWish',   label: '额外许愿项目', default: true, schedule: 'daily-project', hidden: true },
    { id: 'vitality',    label: '今日活跃领奖', default: true, schedule: 'reward-twice' },
    { id: 'achievement', label: '成就领取', default: true, schedule: 'daily' },
    { id: 'marketReserve', label: '食材预定', default: true, schedule: 'reservation' },
    // —— 付费模块：在 PLAN 内，但默认关闭 ——
    { id: 'market',     label: '食材采购(整点)', default: false, schedule: 'hourly' },  // 花钱
  ];

  // 初始化 GM 默认值
  MODULE_DEFS.forEach(m => {
    if (Utils.gget(`mod_${m.id}_enabled`, null) === null) Utils.gset(`mod_${m.id}_enabled`, m.default);
  });
  if (Utils.gget('mod_dailyProjects_enabled', null) === null) Utils.gset('mod_dailyProjects_enabled', true);
  if (Utils.gget('food_reserve_pref_1', null) === null) Utils.gset('food_reserve_pref_1', 'auto');
  if (Utils.gget('food_reserve_pref_2', null) === null) Utils.gset('food_reserve_pref_2', 'auto');

  const isEnabled = (id) => {
    if (id === 'dailyProgress') {
      return Utils.gget('mod_dailyProjects_enabled', true) &&
        DAILY_PROJECT_DEFS.some(p => projectEnabled(p.id) && projectTarget(p.id) > 0);
    }
    if (['dailyFriend', 'dailyBar', 'dailyNpc', 'dailyLuck', 'extraWish'].includes(id)) {
      return Utils.gget('mod_dailyProjects_enabled', true) &&
        DAILY_PROJECT_DEFS.some(p => p.module === id && projectEnabled(p.id) && projectTarget(p.id) > 0);
    }
    if (id === 'mailbox') {
      return Utils.gget('mod_restaurant_enabled', true) && Utils.gget('restaurant_mailbox', true);
    }
    return Utils.gget(`mod_${id}_enabled`, true);
  };

  // 每日项目次数来自“今日活跃”常驻上限；额外许愿不消耗许愿果时推荐0次。
  // 搬家不属于长期日常，按用户要求不纳入。
  const DAILY_PROJECT_DEFS = [
    { id: 'like', label: '点赞/被赞（推荐5次）', recommended: 5, module: 'dailyFriend' },
    { id: 'dig', label: '翻橱柜（推荐20次）', recommended: 20, module: 'dailyFriend' },
    { id: 'roach', label: '打蟑螂（推荐15次）', recommended: 15, module: 'dailyFriend' },
    { id: 'fist', label: '猜拳（与猜杯合计推荐20次）', recommended: 10, module: 'dailyBar' },
    { id: 'cup', label: '猜酒杯（与猜拳合计推荐20次）', recommended: 10, module: 'dailyBar' },
    { id: 'number', label: '猜数字（推荐1次）', recommended: 1, module: 'dailyBar' },
    { id: 'npc', label: '拜访NPC（推荐1轮）', recommended: 1, module: 'dailyNpc' },
    { id: 'luck', label: '沾光与到访礼物（沾光推荐3次）', recommended: 3, module: 'dailyLuck' },
    { id: 'extraWish', label: '额外许愿果（常驻推荐0次）', recommended: 0, module: 'extraWish' },
  ];
  // 从 v3.32 的“拜访雯姐”开关迁移；一轮现统一处理食神、菜园姐、阿鹿、安妮与雯姐。
  if (Utils.gget('project_npc_enabled', null) === null && Utils.gget('project_wenjie_enabled', null) !== null) {
    Utils.gset('project_npc_enabled', !!Utils.gget('project_wenjie_enabled', true));
  }
  if (!Utils.gget('v334_npc_round_migrated', false)) {
    Utils.gset('project_npc_count', 1);
    Utils.gset('v334_npc_round_migrated', true);
  }
  // v3.53可能在食神页找不到菜场链接后误报整轮完成；升级时仅一次清当天本地NPC进度以便重新核验。
  if (!Utils.gget('v354_npc_route_reset', false)) {
    Utils.gset('project_state_npc', null);
    Utils.gset('v354_npc_route_reset', true);
  }
  DAILY_PROJECT_DEFS.forEach(p => {
    if (Utils.gget(`project_${p.id}_enabled`, null) === null) Utils.gset(`project_${p.id}_enabled`, p.recommended > 0);
    if (Utils.gget(`project_${p.id}_count`, null) === null) Utils.gset(`project_${p.id}_count`, p.recommended);
  });
  const projectEnabled = (id) => !!Utils.gget(`project_${id}_enabled`, false);
  const projectTarget = (id) => {
    const cap = id === 'npc' ? 1 : id === 'luck' ? 3 : 500;
    return Math.max(0, Math.min(cap, parseInt(Utils.gget(`project_${id}_count`, 0), 10) || 0));
  };
  const gameDayKey = (date = Utils.getServerTime()) => {
    const shifted = new Date(date.getTime() - 6 * 3600000);
    return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-${String(shifted.getDate()).padStart(2, '0')}`;
  };

  // 面板细项的独立运行定义。actionScope跨页面保存在AutoPilot状态中，父模块据此只执行目标细项。
  const ACTION_RUN_DEFS = {
    restaurant_cockroach: { module: 'restaurant', navSteps: [{ text: '餐厅', hrefMatch: '/xz/restaurant' }] },
    restaurant_oil: { module: 'restaurant', navSteps: [{ text: '餐厅', hrefMatch: '/xz/restaurant' }] },
    restaurant_mailbox: { module: 'mailbox', navSteps: [{ text: '邮箱', hrefMatch: '/xz/mailbox' }] },
    project_like: { module: 'dailyFriend', navSteps: [{ text: '好友', hrefMatch: '/xz/friend' }] },
    project_dig: { module: 'dailyFriend', navSteps: [{ text: '好友', hrefMatch: '/xz/friend' }] },
    project_roach: { module: 'dailyFriend', navSteps: [{ text: '好友', hrefMatch: '/xz/friend' }] },
    project_fist: { module: 'dailyBar', navSteps: [{ text: '广场', hrefMatch: '/xz/square' }, { text: '酒吧', hrefMatch: '/xz/bar' }] },
    project_cup: { module: 'dailyBar', navSteps: [{ text: '广场', hrefMatch: '/xz/square' }, { text: '酒吧', hrefMatch: '/xz/bar' }] },
    project_number: { module: 'dailyBar', navSteps: [{ text: '广场', hrefMatch: '/xz/square' }, { text: '酒吧', hrefMatch: '/xz/bar' }] },
    project_npc: { module: 'dailyNpc', navSteps: [{ text: '食神', hrefMatch: '/xz/god' }] },
    project_luck: { module: 'dailyLuck', navSteps: [{ text: '来访', hrefMatch: '/xz/come_log' }] },
    project_extraWish: { module: 'extraWish', navSteps: [{ text: '许愿', hrefMatch: '/xz/wish' }] },
  };
  const GROUP_RUN_DEFS = {
    restaurantAndMailbox: { label: '餐厅管理与系统邮箱', modules: ['restaurant', 'mailbox'] },
    dailyProjects: { label: '每日项目', modules: ['dailyNpc', 'dailyFriend', 'dailyBar', 'dailyLuck', 'extraWish'] },
  };
  const activeActionScope = (moduleId = null) => {
    const state = Utils.gget('autopilot_state', null);
    if (!state?.enabled || !state.actionScope) return null;
    if (moduleId && state.singleModule !== moduleId) return null;
    return state.actionScope;
  };
  const actionEnabled = (moduleId, actionId, normalEnabled) => {
    const scope = activeActionScope(moduleId);
    return scope ? scope === actionId : normalEnabled;
  };
  const PROJECT_ACTION_RUN_KEY = 'project_action_run';
  const recordScopedProjectSuccess = (projectId) => {
    const actionState = Utils.gget('autopilot_state', null);
    const run = Utils.gget(PROJECT_ACTION_RUN_KEY, null);
    if (!actionState?.enabled || !run?.active || run.projectId !== projectId) return;
    const target = Math.max(0, Number(run.target) || 0);
    run.completed = Math.min(target, Math.max(0, Number(run.completed) || 0) + 1);
    Utils.gset(PROJECT_ACTION_RUN_KEY, run);
    Utils.log(`细项运行: ${projectId} 本次成功 ${run.completed}/${target}`);
  };

  // 餐厅子开关
  const RESTAURANT_SUB_DEFAULTS = {
    restaurant_cockroach: true,
    restaurant_oil: true,
    restaurant_mailbox: true,
  };
  Object.entries(RESTAURANT_SUB_DEFAULTS).forEach(([k, d]) => {
    if (Utils.gget(k, null) === null) Utils.gset(k, d);
  });

  // v3.48：旧版在失败/上限/超时时会误改永久开关；升级时仅一次恢复为开启。
  // 迁移完成后不再强制写入，用户以后手动关闭仍会持久保留。
  if (!Utils.gget('v348_restaurant_cockroach_default_on', false)) {
    Utils.gset('restaurant_cockroach', true);
    Utils.gset('restaurant_roach_attempts', 0);
    Utils.gset('restaurant_roach_cycle_blocked', false);
    Utils.gset('v348_restaurant_cockroach_default_on', true);
  }

  // v3.37：自家餐厅没有翻柜动作，清理旧版本可能残留的开关/计数。
  if (!Utils.gget('v337_restaurant_dig_removed', false)) {
    Utils.gset('restaurant_dig', false);
    Utils.gset('restaurant_dig_attempts', 0);
    Utils.gset('v337_restaurant_dig_removed', true);
  }

  // ==================== 控制面板 ====================
  const Panel = {
    titleHtml(stepHtml = '') {
      const selfId = String(Utils.gget('self_restaurant_id', '') || '').replace(/\D/g, '');
      const idText = selfId ? `自己餐厅id已获取：${selfId}` : '自己餐厅id未获取';
      return `🦌 梦想小镇日常 v${SCRIPT_VERSION}${stepHtml}<span class="self-restaurant-id">${idText}</span>`;
    },

    reserveOptionsHtml(selected = 'auto') {
      const esc = (value) => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
      const catalog = Utils.gget('food_reserve_catalog', []);
      const foods = Array.isArray(catalog) ? catalog.slice().sort((a, b) =>
        Number(a.level) - Number(b.level) || String(a.name).localeCompare(String(b.name), 'zh-CN')
      ) : [];
      const options = [`<option value="auto"${selected === 'auto' ? ' selected' : ''}>不指定（自动：库存低优先）</option>`];
      foods.forEach(food => {
        const value = String(food.id);
        options.push(`<option value="${esc(value)}"${String(selected) === value ? ' selected' : ''}>[${Number(food.level)}级]${esc(food.name)}（库存${Number(food.stock)}）</option>`);
      });
      return options.join('');
    },

    create() {
      if (document.getElementById('dxzxx-panel')) return;
      GM_addStyle(`
        #dxzxx-panel{position:fixed;top:10px;right:10px;z-index:99999;background:rgba(255,255,255,.97);border:1px solid #ccc;border-radius:8px;padding:6px;box-shadow:0 4px 16px rgba(0,0,0,.15);font-size:12px;line-height:1.25;width:560px;box-sizing:border-box;font-family:Arial,sans-serif;max-height:calc(100vh - 20px);overflow-y:auto;}
        #dxzxx-panel h3{display:flex;align-items:center;gap:6px;margin:0 0 3px;font-size:15px;line-height:1.2;border-bottom:1px solid #eee;padding-bottom:3px;color:#333;}
        #dxzxx-panel h3 .self-restaurant-id{margin-left:auto;font-size:11px;font-weight:normal;color:#2e7d32;white-space:nowrap;}
        #dxzxx-panel .row{display:flex;justify-content:space-between;align-items:center;gap:4px;padding:1px 0;min-width:0;font-size:12px;line-height:1.2;}
        #dxzxx-panel .row label{cursor:pointer;flex:1;}
        #dxzxx-panel .toggle{padding:1px 7px;border-radius:10px;font-size:11px;cursor:pointer;user-select:none;border:1px solid transparent;flex:0 0 auto;}
        #dxzxx-panel .toggle.on{background:#d4f7d4;color:#1a7a1a;border-color:#1a7a1a;}
        #dxzxx-panel .toggle.off{background:#f7d4d4;color:#a71a1a;border-color:#a71a1a;}
        #dxzxx-panel button{width:100%;padding:5px;margin-top:3px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;line-height:1.2;}
        #dxzxx-panel .run-btn{background:#4CAF50;color:white;}
        #dxzxx-panel .hide-btn{background:#eee;color:#666;margin-top:4px;}
        #dxzxx-panel .sub{padding-left:8px;font-size:11px;color:#666;}
        #dxzxx-panel details{margin-top:2px;padding-top:2px;border-top:1px solid #eee;font-size:12px;line-height:1.25;}
        #dxzxx-panel summary{cursor:pointer;font-weight:bold;line-height:1.25;}
        #dxzxx-panel .summary-note{float:right;font-size:10px;font-weight:normal;color:#888;margin-right:2px;}
        #dxzxx-panel select{width:100%;padding:3px;margin:3px 0;border:1px solid #ccc;border-radius:4px;font-size:12px;}
        #dxzxx-panel .project-count{width:40px;padding:1px 2px;border:1px solid #bbb;border-radius:3px;font-size:11px;text-align:center;margin:0 2px;}
        #dxzxx-panel .project-row label{font-size:11px;line-height:1.15;}
        #dxzxx-panel .label{font-size:11px;color:#555;margin-top:2px;}
        #dxzxx-rows,#dxzxx-project-rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px;}
        #dxzxx-panel .panel-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start;}
        #dxzxx-panel .panel-column{min-width:0;}
        #dxzxx-panel .panel-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 6px;}
        #dxzxx-stop{grid-column:1/-1;}
        #dxzxx-panel .action-run{width:auto;padding:1px 5px;margin:0;background:#4CAF50;color:#fff;font-size:11px;font-weight:normal;flex:0 0 auto;}
        #dxzxx-panel .single-run,#dxzxx-panel .group-run{width:auto;padding:1px 7px;margin:0;background:#4CAF50;color:#fff;font-size:11px;font-weight:normal;flex:0 0 auto;}
        #dxzxx-panel .panel-icon{width:14px;height:14px;object-fit:contain;vertical-align:-3px;margin-right:3px;}
        #dxzxx-panel .plan-ref{font-size:10px;color:#888;white-space:nowrap;flex:0 0 auto;}
        #dxzxx-panel .plan-reference{background:rgba(255,255,255,.035);border-radius:3px;}
        #dxzxx-panel #dxzxx-rows .row.current{background:#FFE082;border-radius:3px;font-weight:bold;}
        #dxzxx-sched-wrap>div{line-height:1.25;}
        #dxzxx-sched-status{height:110px;max-height:110px;overflow-y:auto;box-sizing:border-box;}
        #dxzxx-sched-list{display:none;}
        @media (max-width:620px){#dxzxx-panel{left:10px;right:10px;width:auto;}#dxzxx-panel .panel-columns,#dxzxx-rows,#dxzxx-project-rows{grid-template-columns:1fr;}}
        #dxzxx-fab{position:fixed;top:10px;right:10px;z-index:99999;background:#4fe;color:#000;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:16px;}
      `);

      const panel = document.createElement('div');
      panel.id = 'dxzxx-panel';
      // 先在不可见状态完成动态行与调度状态填充，避免浏览器绘制半初始化面板。
      panel.style.visibility = 'hidden';
      panel.innerHTML = `<h3>${this.titleHtml()}</h3>
        <div class="panel-columns">
          <div class="panel-column">
            <details open>
              <summary>餐厅子开关</summary>
              <div class="row sub"><label><img class="panel-icon" src="/readImg/xz_cockroach" alt="蟑螂">自动打蟑螂</label><button class="action-run" data-run-action="restaurant_cockroach">运行</button><span class="toggle ${Utils.gget('restaurant_cockroach', true) ? 'on' : 'off'}" data-sub="restaurant_cockroach">${Utils.gget('restaurant_cockroach', true) ? '开' : '关'}</span></div>
              <div class="row sub"><label>⛽ 自动添油</label><button class="action-run" data-run-action="restaurant_oil">运行</button><span class="toggle ${Utils.gget('restaurant_oil', true) ? 'on' : 'off'}" data-sub="restaurant_oil">${Utils.gget('restaurant_oil', true) ? '开' : '关'}</span></div>
              <div class="row sub"><label>📬 餐厅后领取系统邮件</label><button class="action-run" data-run-action="restaurant_mailbox">运行</button><span class="toggle ${Utils.gget('restaurant_mailbox', true) ? 'on' : 'off'}" data-sub="restaurant_mailbox">${Utils.gget('restaurant_mailbox', true) ? '开' : '关'}</span></div>
            </details>
            <details open>
              <summary>食谱升级配置</summary>
              <select id="dxzxx-recipe-level">
                <option value="off">关闭升级</option>
                <option value="中品">升级到中品</option>
                <option value="上品">升级到上品</option>
                <option value="极品">升级到极品</option>
                <option value="金牌">升级到金牌</option>
                <option value="金牌2级">升级到金牌2级</option>
                <option value="金牌3级">升级到金牌3级</option>
                <option value="金牌4级">升级到金牌4级</option>
                <option value="金牌5级">升级到金牌5级</option>
              </select>
            </details>
            <details open id="dxzxx-reserve-config">
              <summary>食材预定配置<span class="summary-note">固定数量1；自动按库存低、等级高</span></summary>
              <select id="dxzxx-reserve-pref-1">${this.reserveOptionsHtml(String(Utils.gget('food_reserve_pref_1', 'auto')))}</select>
              <select id="dxzxx-reserve-pref-2">${this.reserveOptionsHtml(String(Utils.gget('food_reserve_pref_2', 'auto')))}</select>
            </details>
          </div>
          <div class="panel-column">
            <details open id="dxzxx-sched-wrap">
              <summary style="cursor:pointer;color:#fff;font-size:13px;padding:4px;background:rgba(255,152,0,0.25);border-radius:4px;">⏰ 长期循环调度器</summary>
              <div style="padding:4px;background:rgba(0,0,0,0.15);border-radius:4px;margin-top:3px;">
                <div id="dxzxx-sched-status" style="font-size:11px;color:#fff;margin-bottom:3px;line-height:1.3;">⏸ 未启动</div>
                <div id="dxzxx-sched-list"></div>
                <div class="panel-actions">
                  <button class="run-btn" id="dxzxx-sched" style="background:#FF9800;color:#000;">⏰ 启动调度器</button>
                  <button class="run-btn" id="dxzxx-sched-refresh" style="background:#666;color:#fff;">🔄 立即重算</button>
                </div>
              </div>
            </details>
            <div class="panel-actions" id="dxzxx-global-actions">
              <button class="run-btn" id="dxzxx-run">▶ 立即执行本页</button>
              <button class="run-btn" id="dxzxx-autopilot" style="background:#FF9800;color:#000;">🚀 立即跑一轮全套</button>
              <button class="run-btn" id="dxzxx-stop" style="background:#f44;color:#fff;">⏹ 停止当前操作</button>
            </div>
          </div>
        </div>
        <details open>
          <summary>每日项目（分时执行）<span class="summary-note">06:00重置；酒吧10:05；好友午饭后；搬家不执行</span></summary>
          <div id="dxzxx-project-rows"></div>
        </details>
        <details open id="dxzxx-module-switches">
          <summary>自动驾驶功能开关（按执行顺序）</summary>
          <div id="dxzxx-rows"></div>
        </details>
        <button class="hide-btn" id="dxzxx-hide">收起</button>`;
      const schedWrap = panel.querySelector('#dxzxx-sched-wrap');
      if (schedWrap) schedWrap.open = true;
      document.body.appendChild(panel);

      const rows = panel.querySelector('#dxzxx-rows');
      const dailyProjectModules = GROUP_RUN_DEFS.dailyProjects.modules;
      let displayStep = 0;
      AutoPilot.PLAN.forEach((step, index) => {
        const m = MODULE_DEFS.find(def => def.id === step.module);
        if (step.module === 'mailbox') return;
        if (step.module === 'restaurant') {
          displayStep++;
          const row = document.createElement('div');
          const enabled = isEnabled('restaurant');
          row.className = 'row';
          row.dataset.modules = GROUP_RUN_DEFS.restaurantAndMailbox.modules.join(',');
          row.innerHTML = `<label>${displayStep}. 餐厅管理与系统邮箱</label><button class="group-run" data-run-group="restaurantAndMailbox">运行</button><span class="toggle ${enabled ? 'on' : 'off'}" data-id="restaurant">${enabled ? '开' : '关'}</span>`;
          rows.appendChild(row);
          return;
        }
        if (dailyProjectModules.includes(step.module)) {
          if (step.module !== dailyProjectModules[0]) return;
          displayStep++;
          const row = document.createElement('div');
          const enabled = Utils.gget('mod_dailyProjects_enabled', true);
          row.className = 'row plan-reference';
          row.dataset.modules = dailyProjectModules.join(',');
          row.innerHTML = `<label>${displayStep}. 每日项目</label><span class="plan-ref">见上方每日项目配置</span><button class="group-run" data-run-group="dailyProjects">运行</button><span class="toggle ${enabled ? 'on' : 'off'}" data-id="dailyProjects">${enabled ? '开' : '关'}</span>`;
          rows.appendChild(row);
          return;
        }
        displayStep++;
        if (!m || m.hidden) {
          const row = document.createElement('div');
          row.className = 'row plan-reference';
          row.dataset.module = step.module;
          const label = m?.label || step.module;
          const reference = '见上方配置';
          row.innerHTML = `<label>${displayStep}. ${label}</label><span class="plan-ref">${reference}</span>`;
          rows.appendChild(row);
          return;
        }
        const enabled = isEnabled(m.id);
        const row = document.createElement('div');
        row.className = 'row';
        row.dataset.module = m.id;
        const label = m.label.replace(/^\d+\.\s*/, '');
        row.innerHTML = `<label>${displayStep}. ${label}</label><button class="single-run" data-run-module="${m.id}">运行</button><span class="toggle ${enabled ? 'on' : 'off'}" data-id="${m.id}">${enabled ? '开' : '关'}</span>`;
        rows.appendChild(row);
      });

      const projectRows = panel.querySelector('#dxzxx-project-rows');
      DAILY_PROJECT_DEFS.forEach(p => {
        const enabled = projectEnabled(p.id);
        const row = document.createElement('div');
        row.className = 'row project-row';
        row.innerHTML = `<label>${p.label}</label><input class="project-count" type="number" min="0" max="${p.id === 'npc' ? 1 : p.id === 'luck' ? 3 : 500}" value="${projectTarget(p.id)}" data-project-count="${p.id}"><button class="action-run" data-run-action="project_${p.id}">运行</button><span class="toggle ${enabled ? 'on' : 'off'}" data-project="${p.id}">${enabled ? '开' : '关'}</span>`;
        projectRows.appendChild(row);
      });

      panel.querySelectorAll('.toggle').forEach(t => {
        t.addEventListener('click', () => {
          const id = t.dataset.id;
          const sub = t.dataset.sub;
          const project = t.dataset.project;
          if (id) {
            const cur = t.classList.contains('on');
            Utils.gset(`mod_${id}_enabled`, !cur);
            t.classList.toggle('on');
            t.classList.toggle('off');
            t.textContent = !cur ? '开' : '关';
            // 模块开关变化 → 如果调度器在跑，重算 schedule
            if (Scheduler.isOn()) {
              Scheduler.computeAll();
              Scheduler.scheduleNext();
            }
            // 同步刷新 PLAN 列表显示
            Panel.refreshPlanList();
          } else if (project) {
            const cur = t.classList.contains('on');
            Utils.gset(`project_${project}_enabled`, !cur);
            t.classList.toggle('on');
            t.classList.toggle('off');
            t.textContent = !cur ? '开' : '关';
            if (Scheduler.isOn()) { Scheduler.computeAll(); Scheduler.scheduleNext(); }
          } else if (sub) {
            const cur = t.classList.contains('on');
            Utils.gset(sub, !cur);
            if (sub === 'restaurant_cockroach' && !cur) {
              Utils.gset('restaurant_roach_attempts', 0);
              Utils.gset('restaurant_roach_cycle_blocked', false);
            }
            t.classList.toggle('on');
            t.classList.toggle('off');
            t.textContent = !cur ? '开' : '关';
            if (sub === 'restaurant_mailbox' && Scheduler.isOn()) {
              Utils.gset('sched_mailboxAfterRestaurant_nextAt', 0);
              Scheduler.computeAll();
              Scheduler.scheduleNext();
            }
          }
        });
      });
      panel.querySelectorAll('[data-project-count]').forEach(input => {
        const saveProjectCount = () => {
          const value = Math.max(0, Math.min(500, parseInt(input.value, 10) || 0));
          input.value = String(value);
          Utils.gset(`project_${input.dataset.projectCount}_count`, value);
          if (Scheduler.isOn()) { Scheduler.computeAll(); Scheduler.scheduleNext(); }
        };
        input.addEventListener('input', saveProjectCount);
        input.addEventListener('change', saveProjectCount);
      });
      panel.querySelectorAll('[data-run-module]').forEach(button => {
        button.addEventListener('click', () => {
          AutoPilot.startSingle(button.dataset.runModule);
          Panel.refreshAutopilotUI();
        });
      });
      panel.querySelectorAll('[data-run-group]').forEach(button => {
        button.addEventListener('click', () => {
          AutoPilot.startGroup(button.dataset.runGroup);
          Panel.refreshAutopilotUI();
        });
      });
      panel.querySelectorAll('[data-run-action]').forEach(button => {
        button.addEventListener('click', () => {
          AutoPilot.startAction(button.dataset.runAction);
          Panel.refreshAutopilotUI();
        });
      });

      // 食谱等级下拉
      const recipeLevel = panel.querySelector('#dxzxx-recipe-level');
      if (recipeLevel) {
        const cur = Utils.gget('recipe_target_level', 'off');
        recipeLevel.value = cur;
        recipeLevel.addEventListener('change', () => {
          Utils.gset('recipe_target_level', recipeLevel.value);
          Utils.gset('recipe_scan_state', recipeLevel.value === 'off' ? null : {
            targetLevel: recipeLevel.value,
            blocked: [],
            active: true,
            source: 'manual',
            startedAt: Date.now(),
          });
          Utils.showStatus('食谱', `目标等级 → ${recipeLevel.value}`, '#4CAF50');
        });
      }

      // 食材预定偏好：两个位置不能同时指定同一种；冲突时保留刚改的项，另一项退回自动。
      [1, 2].forEach(slot => {
        const select = panel.querySelector(`#dxzxx-reserve-pref-${slot}`);
        if (!select) return;
        select.addEventListener('change', () => {
          const otherSlot = slot === 1 ? 2 : 1;
          const other = panel.querySelector(`#dxzxx-reserve-pref-${otherSlot}`);
          Utils.gset(`food_reserve_pref_${slot}`, select.value);
          if (select.value !== 'auto' && other?.value === select.value) {
            other.value = 'auto';
            Utils.gset(`food_reserve_pref_${otherSlot}`, 'auto');
            Utils.showStatus('食材预定', `预定位${otherSlot}已改为自动，避免重复`, '#FF9800');
          } else {
            Utils.showStatus('食材预定', `预定位${slot}偏好已保存`, '#4CAF50');
          }
          Utils.gset('sched_marketReserve_nextAt', 0);
          if (Scheduler.isOn()) { Scheduler.computeAll(); Scheduler.scheduleNext(); }
        });
      });

      panel.querySelector('#dxzxx-run').addEventListener('click', () => {
        Utils.gset('operation_stopped', false);
        Utils.gset('autopilot_emergency_stop', false);
        Router.run();
      });
      panel.querySelector('#dxzxx-autopilot').addEventListener('click', () => {
        if (AutoPilot.isOn()) {
          AutoPilot.stop('手动停止');
        } else {
          AutoPilot.start();
          // 启动后立即 continue 一次
          setTimeout(() => AutoPilot.continue(), 500);
        }
        Panel.refreshAutopilotUI();
      });
      panel.querySelector('#dxzxx-sched').addEventListener('click', () => {
        if (Scheduler.isOn()) {
          Scheduler.stop('手动停止');
        } else {
          Scheduler.start();
        }
        Panel.refreshSchedUI();
      });
      panel.querySelector('#dxzxx-sched-refresh').addEventListener('click', () => {
        Scheduler.computeAll();
        Scheduler.scheduleNext();
        Panel.refreshSchedUI();
      });
      panel.querySelector('#dxzxx-hide').addEventListener('click', () => Panel.hide());
      panel.querySelector('#dxzxx-stop').addEventListener('click', () => Panel.stopCurrentOperation('面板停止'));

      // 初始显示调度器状态
      Panel.refreshSchedUI();
      Panel.refreshAutopilotUI();
      // 下一绘制帧才整体显示；再次写open防止站点初始化样式影响原生details首帧。
      requestAnimationFrame(() => {
        if (!panel.isConnected) return;
        if (schedWrap) schedWrap.open = true;
        panel.style.visibility = 'visible';
      });
      // 定时刷新状态显示
      setInterval(() => { Panel.refreshSchedUI(); Panel.refreshAutopilotUI(); }, 5000);
    },

    stopCurrentOperation(reason = '总停止') {
      // 先上锁：已经在sleep中的动作醒来后也会被Utils.click拦截。
      Utils.gset('operation_stopped', true);
      Utils.gset('autopilot_emergency_stop', true);
      if (AutoPilot.isOn()) AutoPilot.stop(reason, { resumeScheduler: false });
      if (Scheduler.isOn()) Scheduler.stop(reason);
      Utils.gset(PHASE_KEY, null);
      Utils.gset('autopilot_session', null);
      Utils.gset('restaurant_remaining_floors', []);
      Panel.refreshAutopilotUI();
      Panel.refreshSchedUI();
      Utils.showStatus('已停止', `${reason}：当前操作及后续点击已中止`, '#f44');
    },

    refreshAutopilotUI() {
      const btn = document.getElementById('dxzxx-autopilot');
      if (!btn) return;
      const on = AutoPilot.isOn();
      if (on) {
        btn.textContent = '⏸ 停止自动驾驶';
        btn.style.background = '#f44';
        btn.style.color = '#fff';
        // 在面板标题下显示当前步骤
        const state = Utils.gget('autopilot_state', {});
        const stepIdx = state.stepIndex || 0;
        const step = AutoPilot.PLAN[stepIdx];
        const stepName = step ? step.module : '已完成';
        const h3 = document.querySelector('#dxzxx-panel h3');
        if (h3) h3.innerHTML = Panel.titleHtml(` <span style="color:#FF9800;font-size:11px;">▶ ${stepIdx + 1}/${AutoPilot.PLAN.length} ${stepName}</span>`);
      } else {
        btn.textContent = '🚀 立即跑一轮全套';
        btn.style.background = '#FF9800';
        btn.style.color = '#000';
        const h3 = document.querySelector('#dxzxx-panel h3');
        if (h3) h3.innerHTML = Panel.titleHtml();
      }
      // 同步刷新 PLAN 列表
      Panel.refreshPlanList();
    },

    // 自动驾驶预览已合并进功能开关；运行时在对应显示行标出当前步骤。
    refreshPlanList() {
      const rows = document.querySelectorAll('#dxzxx-rows .row[data-module], #dxzxx-rows .row[data-modules]');
      if (!rows.length || typeof AutoPilot === 'undefined') return;
      const state = Utils.gget('autopilot_state', {});
      const curStep = state.enabled ? (state.stepIndex || 0) : -1;
      const currentModule = curStep >= 0 ? AutoPilot.PLAN[curStep]?.module : null;
      rows.forEach(row => {
        const modules = row.dataset.modules ? row.dataset.modules.split(',') : [row.dataset.module];
        row.classList.toggle('current', modules.includes(currentModule));
      });
    },

    refreshSchedUI() {
      const statusEl = document.getElementById('dxzxx-sched-status');
      const listEl = document.getElementById('dxzxx-sched-list');
      const btn = document.getElementById('dxzxx-sched');
      if (!statusEl || !listEl || !btn) return;

      const on = Scheduler.isOn();
      const next = Utils.gget('sched_next', null);
      const phase = Utils.gget('sched_phase', null);

      if (on) {
        btn.textContent = '⏸ 停止调度器';
        btn.style.background = '#f44';
        let html = '';
        if (phase && phase.state === 'running') {
          html += `<div style="color:#FF9800;">▶ 正在跑: ${phase.id} → ${phase.target}</div>`;
        } else if (next) {
          const dt = new Date(next.at);
          const mins = Math.max(0, Math.round((next.at - Utils.getServerTime().getTime()) / 60000));
          const hh = String(dt.getHours()).padStart(2, '0');
          const mm = String(dt.getMinutes()).padStart(2, '0');
          html += `<div style="color:#4fe;">下次: <b>${next.id}</b> @ ${hh}:${mm} (${mins}min 后)</div>`;
        }
        // 列出所有启用模块的下次时间
        const all = ALL_ENTRIES().filter(e => e.nextRunAt && entryIsEnabled(e));
        all.sort((a, b) => a.nextRunAt - b.nextRunAt);
        const highlightedId = phase?.state === 'running' ? phase.id : next?.id;
        const highlightedAt = phase?.state === 'running' ? null : next?.at;
        const upcoming = all.filter(e => e.id !== highlightedId || (highlightedAt !== null && e.nextRunAt !== highlightedAt));
        html += '<div style="margin-top:4px;border-top:1px solid #444;padding-top:4px;">';
        const top5 = upcoming.slice(0, 6);
        top5.forEach(e => {
          const dt = new Date(e.nextRunAt);
          const hh = String(dt.getHours()).padStart(2, '0');
          const mm = String(dt.getMinutes()).padStart(2, '0');
          html += `<div>${hh}:${mm} <span style="color:#aaa;">${e.id}</span></div>`;
        });
        if (upcoming.length > 6) html += `<div style="color:#888;">... 共 ${all.length} 项</div>`;
        html += '</div>';
        statusEl.innerHTML = html;
      } else {
        btn.textContent = '⏰ 启动调度器';
        btn.style.background = '#FF9800';
        const enabled = ALL_ENTRIES().filter(e => entryIsEnabled(e));
        statusEl.innerHTML = `<div>⏸ 未启动（已配置 ${enabled.length} 项可调度任务）</div>`;
      }
    },

    hide() {
      const panel = document.getElementById('dxzxx-panel');
      if (panel) panel.style.display = 'none';
      if (document.getElementById('dxzxx-fab')) return;
      const fab = document.createElement('div');
      fab.id = 'dxzxx-fab';
      fab.textContent = '🦌';
      fab.title = '打开日常面板';
      fab.addEventListener('click', () => {
        panel.style.display = '';
        fab.remove();
      });
      document.body.appendChild(fab);
    },
  };

  // ==================== 模块实现 ====================
  const MOD = {};

  // ----- 1. 签到 -----
  MOD.signIn = {
    match: (p) => p === '/xz/sign_in',
    schedule: 'daily',
    async run() {
      const text = document.body.textContent;
      if (text.includes('今日已签到') || text.includes('已签到成功')) {
        Utils.log('签到: 今日已完成');
        Utils.showStatus('签到', '今日已完成');
        return true;
      }
      const btn = Array.from(document.querySelectorAll('a[href="/xz/sign_in"]')).find(a =>
        a.textContent.trim() === '签到' && !a.closest('.disabled')
      ) || Utils.findByText('a', '签到');
      if (btn) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(btn);
        Utils.log('签到: 已点击签到');
        return false;
      } else {
        Utils.warn('签到: 未找到按钮');
        return true;
      }
    },
  };

  // ----- 2. 许愿 -----
  // 免费许愿每日 4 次（基础）+ 食神の庇佑可能 + 额外次数；连点直到剩余 0 或按钮变灰
  MOD.wish = {
    match: (p) => p === '/xz/wish',
    schedule: 'daily',
    async run() {
      const freeBtn = document.querySelector('a[onclick="makeWish(0)"]');
      const statusSpan = freeBtn?.nextElementSibling;
      const isGreen = statusSpan?.classList?.contains('gen_green');
      if (!freeBtn || !isGreen) {
        Utils.log('许愿: 免费次数已用完');
        Utils.showStatus('许愿', '今日已完成');
        return true;
      }
      await Utils.sleep(Utils.randMs(1.5, 2.5));
      Utils.click(freeBtn);
      Utils.log('许愿: 点击本页第一个免费许愿，等待刷新后继续检测');
      return false;
    },
  };

  // ----- 3. 吃饭/体力（每日 3 期）-----
  MOD.energy = {
    match: (p) => p === '/xz/activity_energy',
    schedule: 'meal',
    async run() {
      // 当前期餐次按钮: getActivityEnergy(N) 或文本"我吃"
      const btn = Array.from(document.querySelectorAll('a')).find(a => {
        const oc = a.getAttribute('onclick') || '';
        return oc.startsWith('getActivityEnergy') || a.textContent.trim() === '我吃';
      });
      if (!btn) {
        Utils.log('体力: 当前期无可吃餐次');
        Utils.showStatus('体力', '无可吃');
        return true;
      }
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(btn);
      Utils.log('体力: 点击当前餐次，等待刷新确认');
      return false;
    },
  };

  // ----- 4. 饭后食材合成（每个吃饭窗口后只点击一次）-----
  MOD.foodCompound = {
    match: (p) => /^\/xz\/cupboard(?:_\d+_1)?$/.test(p) || /^\/xz\/food_compound_\d+$/.test(p),
    schedule: 'meal-chained',
    requiresScheduled: true,
    STATE_KEY: 'food_compound_attempt',

    contextToken() {
      const phase = Utils.gget('sched_phase', null);
      if (phase?.module === 'foodCompound' && ['navigating', 'running'].includes(phase.state)) {
        // 同一餐后任务即使页面异常中断后重建phase，也必须沿用同一token，防止再次点击。
        return `scheduler-energy:${Utils.gget('sched_energy_lastRun', 0)}`;
      }
      const autopilot = Utils.gget('autopilot_state', null);
      if (autopilot?.enabled) return `autopilot:${autopilot.startedAt || 0}:${autopilot.stepIndex || 0}`;
      return null;
    },

    async run() {
      const token = this.contextToken();
      if (!token) {
        Utils.log('食材合成: 非调度/自动驾驶阶段，不接管手动浏览');
        return true;
      }

      if (/^\/xz\/cupboard(?:_\d+_1)?$/.test(location.pathname)) {
        const firstFood = Array.from(document.querySelectorAll('a[href^="/xz/food_compound_"]'))
          .find(a => /^\/xz\/food_compound_\d+$/.test(a.getAttribute('href') || ''));
        if (!firstFood) {
          Utils.log('食材合成: 1级橱柜没有可合成食材，本轮结束');
          return true;
        }
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(firstFood);
        Utils.log(`食材合成: 进入页面首个1级食材 ${firstFood.getAttribute('href')}`);
        return false;
      }

      const prior = Utils.gget(this.STATE_KEY, null);
      if (prior?.token === token && prior.attempted) {
        Utils.log('食材合成: 本轮已经点击过“全部合成”，不因结果重试');
        return true;
      }
      const allButton = Array.from(document.querySelectorAll('a[onclick]')).find(a => {
        const onclick = a.getAttribute('onclick') || '';
        return a.textContent.trim() === '全部合成' && /^doFoodCompound\(\d+,50\)$/.test(onclick);
      });
      if (!allButton) {
        Utils.log('食材合成: 当前食材没有“全部合成”按钮，本轮结束');
        return true;
      }

      // 点击前先记账；无论服务器返回成功或失败，本轮都绝不再次点击。
      Utils.gset(this.STATE_KEY, { token, attempted: true, attemptedAt: Date.now() });
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(allButton);
      Utils.log(`食材合成: 已点击一次 ${allButton.getAttribute('onclick')}，本轮结束`);
      Utils.showStatus('饭后合成', '已点击一次全部合成');
      return true;
    },
  };

  // ----- 5. 设施安装/续期（每 12 小时）-----
  // 原脚本限定 3 项：广播/海报/老鼠夹（不放节油器/蟑螂药）
  // 只用长效，不用金牌/百分百/阿猫独家
  // 新版 URL: /xz/restaurant_facility（概览） + /xz/restaurant_facility_set_{1,2,4}_0（设置）
  // 流程：补齐未设置设施 → 已设置设施每轮续期一次 → 逐一点击设施名进入商店核库存
  // 商店必须明确读到“拥有数量”；低于 5 时只买一次 10 个并验证结果，任何解析失败都安全停止
  MOD.facility = {
    match: (p) => /\/xz\/restaurant_facility($|_set_)/.test(p) || /\/xz\/prop_(13|14|40)$/.test(p),
    schedule: 'facility',
    STATE_KEY: 'facility_cycle_state',
    TARGETS: [
      { name: '广播', slot: 1, setHref: '/xz/restaurant_facility_set_1_0', setupText: '长效宣传广播', propId: 13, buyPage: '/xz/prop_13' },
      { name: '海报', slot: 2, setHref: '/xz/restaurant_facility_set_2_0', setupText: '长效手绘海报', propId: 14, buyPage: '/xz/prop_14' },
      { name: '老鼠夹', slot: 4, setHref: '/xz/restaurant_facility_set_4_0', setupText: '长效老鼠夹',   propId: 40, buyPage: '/xz/prop_40' },
    ],
    MIN_COUNT: 5,
    BUY_COUNT: 10,

    contextToken() {
      const phase = Utils.gget('sched_phase', null);
      if (phase?.module === 'facility' && ['navigating', 'running'].includes(phase.state)) {
        return `scheduler:${phase.startedAt || phase.firedAt || 0}`;
      }
      const autopilot = Utils.gget('autopilot_state', null);
      if (autopilot?.enabled) return `autopilot:${autopilot.startedAt || 0}`;
      return null;
    },

    loadState() {
      const token = this.contextToken();
      if (!token) return null;
      let state = Utils.gget(this.STATE_KEY, null);
      const stale = !state?.startedAt || Date.now() - state.startedAt > 10 * 60000;
      if (!state?.active || state.token !== token || stale) {
        state = {
          active: true,
          token,
          startedAt: Date.now(),
          renewed: [],
          checked: [],
          purchases: {},
          currentPropId: null,
          returnPath: null,
          inventoryCheck: false,
        };
        Utils.gset(this.STATE_KEY, state);
        Utils.log('设施: 开始本轮安装/续期及三项库存检查');
      }
      state.renewed ||= [];
      state.checked ||= [];
      state.purchases ||= {};
      return state;
    },

    saveState(state) {
      Utils.gset(this.STATE_KEY, state);
    },

    failClosed(state, message) {
      state.active = false;
      state.error = message;
      this.saveState(state);
      Utils.warn(`设施: ${message}，本轮安全停止（未继续购买）`);
      Utils.showStatus('设施', '安全停止');
      return true;
    },

    parseSetupInventory(row) {
      const text = row?.textContent || '';
      const match = text.match(/[×x]\s*(\d+)/) ||
                    text.match(/[（(](\d+)\s*个?[）)]/) ||
                    text.match(/拥有(?:数量)?\s*[：:]?\s*(\d+)\s*个?/) ||
                    text.match(/剩余\s*(\d+)/);
      return match ? Number(match[1]) : null;
    },

    parseStoreInventory() {
      const text = document.body?.innerText || document.body?.textContent || '';
      const match = text.match(/拥有数量\s*[：:]\s*(\d+)/);
      return match ? Number(match[1]) : null;
    },

    async returnFromStore(state, target) {
      const returnPath = state.returnPath || '/xz/restaurant_facility';
      const allowedReturnPaths = ['/xz/restaurant_facility', ...this.TARGETS.map(t => t.setHref)];
      if (!allowedReturnPaths.includes(returnPath)) {
        return this.failClosed(state, `${target.name} 商店返回目标 ${returnPath} 非法`);
      }
      state.currentPropId = null;
      state.returnPath = null;
      state.inventoryCheck = false;
      this.saveState(state);
      Utils.log(`设施: ${target.name} 商店检查完成，返回 ${returnPath}`);
      await Utils.sleep(Utils.randMs(1, 2));
      // 商店购买会在同一路径刷新，history.back() 的落点不稳定；使用本轮进入商店前保存的明确目标。
      location.assign(returnPath);
      return false;
    },

    async run() {
      const path = location.pathname;
      const state = this.loadState();
      if (!state) {
        // 手动进入三种设施商店也应即时补货；只是不启动安装/续期流程。
        const propMatch = path.match(/^\/xz\/prop_(13|14|40)$/);
        if (propMatch) {
          const propId = Number(propMatch[1]);
          const target = this.TARGETS.find(t => t.propId === propId);
          const have = this.parseStoreInventory();
          if (have === null) {
            Utils.warn(`设施: 手动打开 ${target.name} 商店，但无法读取“拥有数量”，不购买`);
            return true;
          }
          const attemptKey = `facility_manual_purchase_${propId}`;
          const attempt = Utils.gget(attemptKey, null);
          if (attempt && have >= attempt.before + this.BUY_COUNT) Utils.gset(attemptKey, null);
          if (have >= this.MIN_COUNT) {
            Utils.log(`设施: ${target.name} 手动商店库存 ${have}，无需补货`);
            return true;
          }
          if (attempt && Date.now() - attempt.clickedAt < 10 * 60000) {
            Utils.warn(`设施: ${target.name} 最近已尝试购买但库存仍为 ${have}，不重复购买`);
            return true;
          }
          const expectedOnclick = `buy(0,${propId},${this.BUY_COUNT},0)`;
          const buy10 = Array.from(document.querySelectorAll('a')).find(a =>
            a.textContent.trim() === `购买${this.BUY_COUNT}个` && (a.getAttribute('onclick') || '').replace(/\s/g, '') === expectedOnclick
          );
          if (!buy10) {
            Utils.warn(`设施: ${target.name} 商店未找到精确的“购买10个”按钮，不购买`);
            return true;
          }
          Utils.gset(attemptKey, { before: have, clickedAt: Date.now() });
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(buy10);
          Utils.log(`设施: ${target.name} 手动商店库存 ${have} < ${this.MIN_COUNT}，购买一次 ${this.BUY_COUNT} 个`);
          return false;
        }
        Utils.log(`设施: 手动浏览 ${path}，没有设施轮次，仅检查不安装/续期`);
        return true;
      }

      // 4.1 概览页：先补齐未设置项，再给已设置项每轮各续期一次。
      if (path === '/xz/restaurant_facility') {
        for (const t of this.TARGETS) {
          const facilityLink = document.querySelector(`a[href="${t.buyPage}"]`);
          const row = facilityLink?.closest('p') || Array.from(document.querySelectorAll('p')).find(p => p.textContent.includes(t.name));
          const setLink = Array.from(document.querySelectorAll('a[href="' + t.setHref + '"]')).find(a => {
            const setRow = a.closest('p') || a.parentElement;
            return setRow && setRow.textContent.includes(t.name) && setRow.textContent.includes('未设置');
          });
          if (setLink) {
            // “使用”点击前已经记账；服务器若仍返回旧概览，不可再次进入设置/购买循环。
            if (state.renewed.includes(t.propId)) {
              Utils.warn(`设施: ${t.name} 本轮已执行设置，但概览仍显示未设置；本轮不重复使用`);
              continue;
            }
            state.currentPropId = t.propId;
            this.saveState(state);
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(setLink);
            Utils.log(`设施: ${t.name} 未设置，进入设置`);
            return false;
          }

          if (!state.renewed.includes(t.propId)) {
            const renew = row?.querySelector(`a[onclick="addFacility(${t.slot})"]`) ||
              Array.from(row?.querySelectorAll('a') || []).find(a => a.textContent.trim() === '续期');
            // 先记账再点击，防止刷新/响应异常造成同一轮重复续期。
            state.renewed.push(t.propId);
            this.saveState(state);
            if (!renew) {
              Utils.warn(`设施: ${t.name} 已设置，但未找到续期按钮，本轮跳过该按钮`);
              continue;
            }
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(renew);
            Utils.log(`设施: ${t.name} 已点击一次续期`);
            return false;
          }
        }

        // 安装/续期处理完毕后，必须真实点击三个设施名逐一进入对应商店。
        const next = this.TARGETS.find(t => !state.checked.includes(t.propId));
        if (next) {
          const shopLink = document.querySelector(`a[href="${next.buyPage}"]`);
          if (!shopLink) return this.failClosed(state, `概览页找不到 ${next.name} 的真实商店链接`);
          state.currentPropId = next.propId;
          state.returnPath = '/xz/restaurant_facility';
          state.inventoryCheck = true;
          this.saveState(state);
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(shopLink);
          Utils.log(`设施: 点击 ${next.name} 名称进入商店检查库存`);
          return false;
        }

        state.active = false;
        state.completedAt = Date.now();
        this.saveState(state);
        Utils.log('设施: 安装/续期完成，三个商店库存均已检查，本轮完成');
        Utils.showStatus('设施', '三项库存已检查');
        return true;
      }

      // 4.2 设置页：用 setupText 精确匹配长效道具
      if (path.startsWith('/xz/restaurant_facility_set_')) {
        const target = this.TARGETS.find(t => path === t.setHref);
        if (!target) {
          Utils.log(`设施: ${path} 非目标，跳过`);
          return true;
        }
        // setFacilityProp有时仍停在设置页。点击前已把propId写入renewed，命中时直接回概览，
        // 不能因使用后库存下降再次进入同一宣传广播商店。
        if (state.renewed.includes(target.propId)) {
          const overview = document.querySelector('a[href="/xz/restaurant_facility"]');
          Utils.log(`设施: ${target.name} 本轮已使用，离开残留设置页`);
          await Utils.sleep(Utils.randMs(1, 2));
          if (overview) Utils.click(overview);
          else location.assign('/xz/restaurant_facility');
          return false;
        }
        // 找包含 setupText 的 p 行
        const itemRow = Array.from(document.querySelectorAll('p')).find(p =>
          p.textContent.includes(target.setupText)
        );
        if (itemRow) {
          const have = this.parseSetupInventory(itemRow);
          if (have === null) return this.failClosed(state, `设置页无法读取 ${target.setupText} 库存`);
          Utils.log(`设施: 设置页读取 ${target.setupText} 库存 ${have}`);

          // 未设置且库存不足时，先由真实道具链接进入商店安全补货，再回来安装。
          if (have < this.MIN_COUNT) {
            const buyLink = itemRow.querySelector(`a[href="${target.buyPage}"]`) || document.querySelector(`a[href="${target.buyPage}"]`);
            if (!buyLink) return this.failClosed(state, `库存 ${have} 但找不到 ${target.name} 商店链接`);
            state.currentPropId = target.propId;
            state.returnPath = target.setHref;
            state.inventoryCheck = false;
            this.saveState(state);
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(buyLink);
            Utils.log(`设施: 设置前库存 ${have} < ${this.MIN_COUNT}，进入商店补 10 个`);
            return false;
          }

          const useBtn = Array.from(itemRow.querySelectorAll('a')).find(a => a.textContent.trim() === '使用');
          if (useBtn) {
            if (!state.renewed.includes(target.propId)) state.renewed.push(target.propId);
            state.currentPropId = null;
            this.saveState(state);
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(useBtn);
            Utils.log(`设施: 已使用 ${target.setupText} (库存 ${have})`);
            return false;
          }
          return this.failClosed(state, `库存 ${have} 充足但未找到 ${target.setupText} 使用按钮`);
        }
        return this.failClosed(state, `未找到 ${target.setupText} 行`);
      }

      // 4.3 商店页：必须有本轮指定目标且明确读到库存；低于 5 时仅买一次 10 个。
      if (/^\/xz\/prop_(13|14|40)$/.test(path)) {
        const propId = Number(path.match(/prop_(\d+)$/)?.[1]);
        const target = this.TARGETS.find(t => t.propId === propId);
        if (!target || state.currentPropId !== propId) {
          return this.failClosed(state, `商店 ${path} 与本轮目标不一致`);
        }

        const have = this.parseStoreInventory();
        if (have === null) return this.failClosed(state, `${target.name} 商店无法读取“拥有数量”`);
        const attempt = state.purchases[String(propId)];
        Utils.log(`设施: ${target.name} 商店拥有数量 ${have}`);

        if (attempt && have < attempt.before + this.BUY_COUNT) {
          return this.failClosed(state, `${target.name} 已尝试购买但库存未增加 10（${attempt.before} → ${have}）`);
        }

        if (have < this.MIN_COUNT) {
          if (attempt) return this.failClosed(state, `${target.name} 本轮购买后库存仍低于 ${this.MIN_COUNT}`);
          const expectedOnclick = `buy(0,${propId},${this.BUY_COUNT},0)`;
          const buy10 = Array.from(document.querySelectorAll('a')).find(a =>
            a.textContent.trim() === `购买${this.BUY_COUNT}个` && (a.getAttribute('onclick') || '').replace(/\s/g, '') === expectedOnclick
          );
          if (!buy10) return this.failClosed(state, `${target.name} 商店未找到精确的“购买10个”按钮`);
          state.purchases[String(propId)] = { before: have, clickedAt: Date.now() };
          this.saveState(state);
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(buy10);
          Utils.log(`设施: ${target.name} 库存 ${have} < ${this.MIN_COUNT}，仅购买一次 ${this.BUY_COUNT} 个`);
          return false;
        }

        if (state.inventoryCheck && !state.checked.includes(propId)) state.checked.push(propId);
        this.saveState(state);
        return this.returnFromStore(state, target);
      }
      return this.failClosed(state, `进入了未识别页面 ${path}`);
    },
  };

  // ----- 5. 食材采购（特价 + 常驻菜补货）-----
  // 整合自原 v5.3 整点食材采购助手的关键逻辑：
  //   1) 特价（buyDiscountFood，6-23 整点刷新）— 全买
  //   2) 每日菜场（当前 buyDayFood；兼容旧 buyFood）— 限价内库存 < 950 时补到 950
  //      1 级：≤519金 → 强制补到 950
  //      2 级：≤2650金 → 强制补到 950；鸡肉/猪肉无视价格强制补；其它高价菜低于100时买300
  //   3) 金币不足 → 24h 冷却（GM 持久化），避免反复失败
  // 持久化字段：
  //   market_cooldown_until: ms 时间戳（0 或小于 now 表示可买）
  //   market_last_processed: 上次处理的菜（跨刷新续购）
  MOD.market = {
    match: (p) => p === '/xz/market',
    schedule: 'hourly',

    CONFIG: {
      LEVEL1_TARGET: 950,        // 1 级菜目标库存
      LEVEL1_MAX_PRICE: 519,     // 1 级菜触发补货的最高单价
      LEVEL2_TARGET: 950,        // 2 级菜目标库存
      LEVEL2_MAX_PRICE: 2650,    // 2 级菜触发补货的最高单价
      LEVEL2_EMERGENCY_BELOW: 100, // 普通高价 2 级菜紧急补货阈值
      LEVEL2_EMERGENCY_BUY: 300, // 普通高价 2 级菜每次固定购买量
      FORCE_BUY_2: ['鸡肉', '猪肉'],  // 强制购买的 2 级菜（无视价格）
      BUY_CAP_PER_FIRE: 999,     // 单次购买输入框上限
      DISCOUNT_PRICE: 666,       // 与旧脚本一致：特价仅买 666 金币
    },

    async run() {
      // 周二日常活动：免费领取食材预定券；领取会刷新页面，下一页再继续采购
      const reserveClaim = document.querySelector("a[onclick^='getEverydayReserve']");
      if (reserveClaim) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(reserveClaim);
        Utils.log('市场: 已领取周二日常食材预定券');
        return false;
      }

      // 6.0 冷却检查
      const cooldownUntil = Utils.gget('market_cooldown_until', 0);
      if (cooldownUntil > Date.now()) {
        const hours = Math.ceil((cooldownUntil - Date.now()) / 3600000);
        Utils.log(`市场: 金币不足冷却中（${hours}h 后恢复），跳本次`);
        return true;
      }

      // 6.0b 检测页面是否提示金币不足
      if (Array.from(document.querySelectorAll('.gen_red, .gen_background_yellow'))
            .some(el => el.textContent.includes('金币不足'))) {
        Utils.warn('市场: 检测到金币不足，启动 24h 冷却');
        Utils.gset('market_cooldown_until', Date.now() + 24 * 3600000);
        Utils.gset('market_last_processed', '');
        return true;
      }

      // 6.1 特价食材（整点 6-22 刷新）：恢复旧脚本的 666 严格过滤和同小时去重
      const now = Utils.getServerTime();
      const hourKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
      if (Utils.gget('market_last_discount_hour', '') !== hourKey) {
        const discountBtns = Array.from(document.querySelectorAll("a[onclick^='buyDiscountFood']")).filter(btn => {
          const row = btn.closest('p') || btn.parentElement;
          const price = +(row?.textContent.match(/(\d+)金币/)?.[1] || 0);
          return price === this.CONFIG.DISCOUNT_PRICE;
        });
        if (discountBtns.length > 0) {
          await Utils.clickAll(discountBtns, '市场-666特价');
          Utils.gset('market_last_discount_hour', hourKey);
        }
      }

      // 6.2 每日菜场补货：当前页面使用 buyDayFood(section,index,id)，兼容旧 buyFood(index,id)
      const staples = this.parseStapleFoods();
      if (staples.length === 0) {
        Utils.log('市场: 无常驻菜');
        return true;
      }
      const needBuy = staples.map(f => {
        const plan = this.planStaplePurchase(f);
        return plan ? { ...f, ...plan } : null;
      }).filter(Boolean);
      if (needBuy.length === 0) {
        Utils.log('市场: 常驻菜全部达标');
        Utils.gset('market_last_processed', '');
        return true;
      }

      // 跨刷新续购：先看上次是否还在 needBuy 列表里
      const lastProcessed = Utils.gget('market_last_processed', '');
      let foodToBuy = null;
      if (lastProcessed) {
        const idx = needBuy.findIndex(f => `${f.level}级${f.name}` === lastProcessed);
        if (idx !== -1) foodToBuy = needBuy[idx];
      }
      if (!foodToBuy) foodToBuy = needBuy[0];

      // 写入本次处理的菜（供下一次刷新续购）
      Utils.gset('market_last_processed', `${foodToBuy.level}级${foodToBuy.name}`);

      // 计算购买数量（补到目标）
      const buyAmount = Math.min(foodToBuy.buyAmount, this.CONFIG.BUY_CAP_PER_FIRE);
      if (buyAmount <= 0) return true;

      Utils.log(`市场: ${foodToBuy.reason} ${foodToBuy.name} (${foodToBuy.level}级) ${foodToBuy.currentStock}→${foodToBuy.targetStock}, 本次买 ${buyAmount}`);

      // 设置数量并触发购买
      await this.fillBuyAmount(foodToBuy.input, buyAmount);
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(foodToBuy.buyButton);
      Utils.log(`市场: 已点击 ${foodToBuy.action}，购买 ${buyAmount} 个 ${foodToBuy.name}`);
      return false;
    },

    // 解析每日菜场：返回当前 buyDayFood 或旧 buyFood 的真实购买按钮。
    parseStapleFoods() {
      const out = [];
      const pAll = document.querySelectorAll('.m_room p');
      for (const p of pAll) {
        const text = p.textContent.trim();
        // [1级]菠菜(589)  528金币  或  [2级]鸡肉(120)  2650金币
        const m = text.match(/\[(\d+)级\](.+?)\((\d+)\)\s+(\d+)金币/);
        if (!m) continue;
        const level = +m[1], name = m[2].trim(), currentStock = +m[3], price = +m[4];
        const input = p.querySelector('input.s_input, input[class="s_input"]');
        const buyBtn = p.querySelector("a[onclick^='buyDayFood'], a[onclick^='buyFood']");
        if (!input || !buyBtn) continue;
        const onclick = buyBtn.getAttribute('onclick') || '';
        const dayMatch = onclick.match(/buyDayFood\((\d+),(\d+),(\d+)\)/);
        const legacyMatch = onclick.match(/buyFood\((\d+),(\d+)\)/);
        if (!dayMatch && !legacyMatch) continue;
        const foodIndex = +(dayMatch ? dayMatch[2] : legacyMatch[1]);
        const foodId = +(dayMatch ? dayMatch[3] : legacyMatch[2]);
        out.push({
          level, name, currentStock, price,
          targetStock: level === 1 ? this.CONFIG.LEVEL1_TARGET : this.CONFIG.LEVEL2_TARGET,
          input, buyButton: buyBtn,
          foodIndex, foodId, action: onclick.replace(/;$/, ''),
          element: p,
        });
      }
      return out;
    },

    // 返回本轮购买计划；高价普通2级菜只做一次300个紧急补货，不追到950。
    planStaplePurchase(f) {
      const C = this.CONFIG;
      if (f.level === 1) {
        if (f.price <= C.LEVEL1_MAX_PRICE && f.currentStock < C.LEVEL1_TARGET) {
          return {
            targetStock: C.LEVEL1_TARGET,
            buyAmount: C.LEVEL1_TARGET - f.currentStock,
            reason: '限价补货',
          };
        }
        return null;
      }
      if (f.level === 2) {
        const isForce = C.FORCE_BUY_2.includes(f.name);
        const priceOk = f.price <= C.LEVEL2_MAX_PRICE;
        if (f.currentStock < C.LEVEL2_TARGET && (isForce || priceOk)) {
          return {
            targetStock: C.LEVEL2_TARGET,
            buyAmount: C.LEVEL2_TARGET - f.currentStock,
            reason: isForce && !priceOk ? '指定食材强制补货' : '限价补货',
          };
        }
        if (!isForce && !priceOk && f.currentStock < C.LEVEL2_EMERGENCY_BELOW) {
          return {
            targetStock: f.currentStock + C.LEVEL2_EMERGENCY_BUY,
            buyAmount: C.LEVEL2_EMERGENCY_BUY,
            reason: '高价低库存紧急补货',
          };
        }
        return null;
      }
      return null;
    },

    // 填入数量（多方式确保触发）
    async fillBuyAmount(input, amount) {
      input.value = String(amount);
      input.setAttribute('value', String(amount));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
  };

  // ----- 6. 食材预定（两个逻辑槽；数量固定1；最早到货动态调度）-----
  // 游戏领取后会把剩余记录向前压缩，因此不能把DOM顺序当固定槽号。
  // assignments持久记录“逻辑槽 → 食材ID”，到货领取后只释放对应槽。
  MOD.marketReserve = {
    match: (p) => p === '/xz/market' || /^\/xz\/food_reserve(?:_\d+_\d+_\d+)?$/.test(p),
    schedule: 'reservation',
    requiresScheduled: true,
    maxPhaseAgeMs: 5 * 60000,
    SCAN_KEY: 'food_reserve_scan_state',
    ASSIGN_KEY: 'food_reserve_assignments',

    parseReservations() {
      return Array.from(document.querySelectorAll('p')).map(p => {
        const action = p.querySelector("a[onclick^='getFoodReserve'], a[onclick^='showDeleteReserve']");
        if (!action) return null;
        const text = (p.textContent || '').replace(/\s+/g, ' ').trim();
        const food = text.match(/\[(\d+)级\](.+?)×(\d+)/);
        const id = Number((action.getAttribute('onclick') || '').match(/\((\d+)\)/)?.[1] || 0);
        if (!food || !id) return null;
        const arrived = (action.getAttribute('onclick') || '').startsWith('getFoodReserve');
        return {
          id,
          level: Number(food[1]),
          name: food[2].trim(),
          quantity: Number(food[3]),
          arrived,
          remainingMs: arrived ? 0 : this.parseDurationMs(text),
          action,
        };
      }).filter(Boolean);
    },

    parseDurationMs(text) {
      const source = String(text || '');
      const day = Number(source.match(/(\d+)天/)?.[1] || 0);
      const hour = Number(source.match(/(\d+)小时/)?.[1] || 0);
      const minute = Number(source.match(/(\d+)分/)?.[1] || 0);
      const second = Number(source.match(/(\d+)秒/)?.[1] || 0);
      const total = (((day * 24 + hour) * 60 + minute) * 60 + second) * 1000;
      return total > 0 ? total : null;
    },

    reconcileAssignments(activeIds) {
      const raw = Utils.gget(this.ASSIGN_KEY, {});
      const assignments = raw && typeof raw === 'object' ? { ...raw } : {};
      [1, 2].forEach(slot => {
        const id = Number(assignments[String(slot)] || 0);
        if (!id || !activeIds.includes(id)) delete assignments[String(slot)];
      });

      const assigned = new Set(Object.values(assignments).map(Number));
      // 对升级前已经存在的预定，先按显式偏好认领，再按页面顺序填剩余逻辑槽。
      activeIds.filter(id => !assigned.has(id)).forEach(id => {
        const preferredSlot = [1, 2].find(slot =>
          !assignments[String(slot)] && String(Utils.gget(`food_reserve_pref_${slot}`, 'auto')) === String(id)
        );
        const freeSlot = preferredSlot || [1, 2].find(slot => !assignments[String(slot)]);
        if (freeSlot) assignments[String(freeSlot)] = id;
      });
      Utils.gset(this.ASSIGN_KEY, assignments);
      return assignments;
    },

    updateNextFromReservations(reservations) {
      const nowMs = Utils.getServerTime().getTime();
      const waits = reservations.filter(r => !r.arrived && r.remainingMs !== null);
      if (waits.length === 0) {
        Utils.gset('food_reserve_next_at', nowMs + 5000);
        Utils.gset('food_reserve_earliest_due', 0);
        return nowMs + 5000;
      }
      const earliestDue = Math.min(...waits.map(r => nowMs + r.remainingMs));
      const previousDue = Number(Utils.gget('food_reserve_earliest_due', 0) || 0);
      let nextAt = Number(Utils.gget('food_reserve_next_at', 0) || 0);
      // 同一倒计时每次刷新会自然缩短，允许60秒误差；不能每次重抽抖动而不断漂移。
      if (!nextAt || Math.abs(previousDue - earliestDue) > 60000) {
        nextAt = earliestDue + Utils.randMs(60, 300);
      }
      Utils.gset('food_reserve_earliest_due', earliestDue);
      Utils.gset('food_reserve_next_at', nextAt);
      return nextAt;
    },

    parseCatalogLevel(level) {
      const pattern = new RegExp(`^/xz/food_reserve_${level}_(\\d+)_1$`);
      return Array.from(document.querySelectorAll('a[href]')).map(a => {
        const href = a.getAttribute('href') || '';
        const route = href.match(pattern);
        const label = (a.textContent || '').trim().match(/^(.+)\((\d+)\)$/);
        // “选择经常预定”会带[等级]前缀，不属于当前分类库存清单。
        if (!route || !label || label[1].startsWith('[')) return null;
        return { id: Number(route[1]), level, name: label[1].trim(), stock: Number(label[2]), href };
      }).filter(Boolean);
    },

    findCategoryLink(level) {
      const pattern = new RegExp(`^/xz/food_reserve_${level}_\\d+_1$`);
      return Array.from(document.querySelectorAll('a[href]')).find(a =>
        (a.textContent || '').trim() === `${level}级` && pattern.test(a.getAttribute('href') || '')
      );
    },

    chooseFood(catalog, state) {
      const excluded = new Set((state.activeIds || []).map(Number));
      const available = catalog.filter(food => !excluded.has(Number(food.id)));
      const preferred = String(Utils.gget(`food_reserve_pref_${state.targetSlot}`, 'auto'));
      if (preferred !== 'auto') {
        const exact = available.find(food => String(food.id) === preferred);
        if (exact) return exact;
        Utils.warn(`食材预定: 预定位${state.targetSlot}指定食材不可用或与另一槽重复，改用自动选择`);
      }
      return available.sort((a, b) =>
        Number(a.stock) - Number(b.stock) ||
        Number(b.level) - Number(a.level) ||
        Number(a.id) - Number(b.id)
      )[0] || null;
    },

    async run() {
      const path = location.pathname;
      if (path === '/xz/market') {
        const reservations = this.parseReservations();
        const activeIds = reservations.map(r => r.id);
        const assignments = this.reconcileAssignments(activeIds);

        const arrived = reservations.find(r => r.arrived);
        if (arrived) {
          Utils.gset('food_reserve_next_at', Utils.getServerTime().getTime() + 5000);
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(arrived.action);
          Utils.log(`食材预定: 已领取 [${arrived.level}级]${arrived.name}×${arrived.quantity}`);
          return false;
        }

        if (reservations.length >= 2) {
          const nextAt = this.updateNextFromReservations(reservations);
          Utils.gset(this.SCAN_KEY, null);
          Utils.log(`食材预定: 两个位置均在途中，下次 ${new Date(nextAt).toLocaleTimeString()} 复查`);
          return true;
        }

        const targetSlot = [1, 2].find(slot => !assignments[String(slot)]);
        const reserveLink = Array.from(document.querySelectorAll('a[href="/xz/food_reserve"]')).find(a =>
          /立即预定|食材预定/.test((a.textContent || '').trim())
        );
        if (!targetSlot || !reserveLink) {
          Utils.warn('食材预定: 有空位但未找到真实“立即预定”入口，5分钟后复查');
          Utils.gset('food_reserve_next_at', Utils.getServerTime().getTime() + 5 * 60000);
          return true;
        }
        Utils.gset(this.SCAN_KEY, {
          active: true,
          targetSlot,
          activeIds,
          catalog: {},
          selectedId: null,
          startedAt: Date.now(),
        });
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(reserveLink);
        Utils.log(`食材预定: 预定位${targetSlot}空闲，进入真实预定页扫描库存`);
        return false;
      }

      let state = Utils.gget(this.SCAN_KEY, null);
      if (!state?.active || Date.now() - Number(state.startedAt || 0) > 4 * 60000) {
        Utils.warn('食材预定: 扫描状态缺失或过期，返回菜场重新确认两个位置');
        Utils.gset(this.SCAN_KEY, null);
        const back = document.querySelector('a[href="/xz/market"]');
        if (back) { await Utils.sleep(Utils.randMs(1, 2)); Utils.click(back); return false; }
        return true;
      }

      const currentLevel = Number(path.match(/^\/xz\/food_reserve_(\d+)_/)?.[1] || 2);
      this.parseCatalogLevel(currentLevel).forEach(food => { state.catalog[String(food.id)] = food; });

      if (state.selectedId) {
        const selectedId = Number(state.selectedId);
        const confirm = Array.from(document.querySelectorAll("a[onclick^='reserve']")).find(a =>
          (a.getAttribute('onclick') || '').replace(/\s/g, '') === `reserve(${selectedId},1)`
        );
        if (confirm) {
          const selected = state.catalog[String(selectedId)];
          const expectedMs = this.parseDurationMs(document.body.textContent || '');
          const assignments = Utils.gget(this.ASSIGN_KEY, {}) || {};
          assignments[String(state.targetSlot)] = selectedId;
          Utils.gset(this.ASSIGN_KEY, assignments);
          if (expectedMs) {
            Utils.gset('food_reserve_next_at', Utils.getServerTime().getTime() + expectedMs + Utils.randMs(60, 300));
          }
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(confirm);
          Utils.log(`食材预定: 预定位${state.targetSlot}确认 [${selected?.level || '?'}级]${selected?.name || selectedId}×1，预计时长 ${expectedMs ? Math.round(expectedMs / 60000) + '分钟' : '待菜场页校准'}`);
          return false;
        }

        const selected = state.catalog[String(selectedId)];
        const selectedLink = selected && document.querySelector(`a[href="${selected.href}"]`);
        if (selectedLink) {
          Utils.gset(this.SCAN_KEY, state);
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(selectedLink);
          Utils.log(`食材预定: 点击真实食材链接 [${selected.level}级]${selected.name}`);
          return false;
        }
        if (selected) {
          const category = this.findCategoryLink(selected.level);
          if (category) {
            Utils.gset(this.SCAN_KEY, state);
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(category);
            Utils.log(`食材预定: 切换到${selected.level}级查找指定食材`);
            return false;
          }
        }
        Utils.warn('食材预定: 已选食材的真实链接消失，5分钟后重新扫描');
        Utils.gset(this.SCAN_KEY, null);
        Utils.gset('food_reserve_next_at', Utils.getServerTime().getTime() + 5 * 60000);
        return true;
      }

      if (currentLevel < 5) {
        const nextCategory = this.findCategoryLink(currentLevel + 1);
        if (!nextCategory) {
          Utils.warn(`食材预定: 找不到真实${currentLevel + 1}级分类入口，5分钟后重试`);
          Utils.gset('food_reserve_next_at', Utils.getServerTime().getTime() + 5 * 60000);
          return true;
        }
        Utils.gset(this.SCAN_KEY, state);
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(nextCategory);
        Utils.log(`食材预定: ${currentLevel}级库存已读取，真实点击${currentLevel + 1}级`);
        return false;
      }

      const catalog = Object.values(state.catalog).filter(food => food && food.id);
      Utils.gset('food_reserve_catalog', catalog);
      const chosen = this.chooseFood(catalog, state);
      if (!chosen) {
        Utils.warn('食材预定: 没有可用且不重复的食材，30分钟后复查');
        Utils.gset(this.SCAN_KEY, null);
        Utils.gset('food_reserve_next_at', Utils.getServerTime().getTime() + 30 * 60000);
        return true;
      }
      state.selectedId = chosen.id;
      Utils.gset(this.SCAN_KEY, state);
      const chosenLink = document.querySelector(`a[href="${chosen.href}"]`);
      if (chosenLink) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(chosenLink);
        Utils.log(`食材预定: 自动选择 [${chosen.level}级]${chosen.name}(库存${chosen.stock})`);
        return false;
      }
      const chosenCategory = this.findCategoryLink(chosen.level);
      if (chosenCategory) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(chosenCategory);
        Utils.log(`食材预定: 全局选择 [${chosen.level}级]${chosen.name}，切回对应分类`);
        return false;
      }
      Utils.warn('食材预定: 全局候选存在但找不到真实分类链接，5分钟后重试');
      Utils.gset(this.SCAN_KEY, null);
      Utils.gset('food_reserve_next_at', Utils.getServerTime().getTime() + 5 * 60000);
      return true;
    },
  };

  // ----- 7. 食材券（旧脚本白名单 + 当前 /xz/warehouse 结构）-----
  // 旧脚本自动处理 8 种食材券（propId 244/21-25/245/224）：
  //   1) 仓库页 (warehouse_1_0) 点 usePropUrl(1, propId) → 跳到 /xz/food_random_<level>
  //   2) 食材随机页点 random(level, 1000) → 兑换
  //   3) 兑换完自动返回仓库
  // 新页面 (v3.x) warehouse_1_0 的 propUrl 选择器保持兼容（onclick="usePropUrl(1,N)"）
  // 适配要点：
  //   - propIds 合并旧 8 种 + 新页面常见的"食材/调料"类
  //   - 找不到任何 propUrl 时直接返回（无券可领），不再死循环
  //   - /xz/food_random_<level> 处理完成后自动点"返回仓库"
  MOD.foodCoupon = {
    match: (p) => p === '/xz/warehouse' || p === '/xz/warehouse_1_0' || /\/xz\/(?:prop_)?food_random_/.test(p),
    schedule: 'daily',
    CONFIG: {
      // 仅保留旧脚本确认过的 8 种；严禁把小喇叭/礼券/体力卡等加入候选
      PROP_IDS: [244, 21, 22, 23, 24, 25, 245, 224],
    },
    async run() {
      const path = location.pathname;

      // 7.1 食材随机页（当前 /xz/prop_food_random_<level>，兼容旧路径）
      if (/\/xz\/(?:prop_)?food_random_/.test(path)) {
        const level = path.split('_').pop().replace(/\D/g, '') || path.split('_').pop();
        const allBtns = Array.from(document.querySelectorAll('a'));
        const quantityText = Array.from(document.querySelectorAll('p')).map(p => p.textContent || '')
          .find(text => /当前拥有[\s\S]*×\s*\d+/.test(text)) || '';
        const quantityMatch = quantityText.match(/×\s*(\d+)/);
        const remaining = quantityMatch ? parseInt(quantityMatch[1], 10) : null;
        if (remaining === 0) {
          Utils.log(`食材券: level=${level} 已归零，回仓库`);
          return this.returnToWarehouse() ? false : true;
        }
        // 优先找 random(level, 1000) 这种"全部兑换"
        let exchangeBtn = allBtns.find(a => {
          const oc = a.getAttribute('onclick') || '';
          return oc.includes(`random(${level},1000)`) || oc.includes(`random(${parseInt(level, 10)},1000)`);
        });
        // 退化：找任何 random(level, N) 按钮
        if (!exchangeBtn) {
          exchangeBtn = allBtns.find(a => {
            const oc = a.getAttribute('onclick') || '';
            return /random\(\s*\d+\s*,\s*\d+\s*\)/.test(oc);
          });
        }
        if (exchangeBtn && remaining !== 0) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(exchangeBtn);
          Utils.log(`食材券: 全部兑换 level=${level}, remaining=${remaining ?? 'unknown'}`);
          return false;
        }
        // 没有兑换按钮 → 直接返回
        Utils.log(`食材券: 兑换页无 random() 按钮，回仓库`);
        return this.returnToWarehouse() ? false : true;
      }

      // 7.2 仓库页（/xz/warehouse_1_0）：找"食材券"类 usePropUrl → 点击
      const card = this.findUsableCard();
      if (card) {
        const oc = card.getAttribute('onclick') || '';
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(card);
        Utils.log(`食材券: 使用 ${oc}`);
        return false;
      }
      Utils.log('食材券: 仓库无可用券');
      return true;
    },

    // 查找可用的食材券卡片
    findUsableCard() {
      // 优先精确匹配 propIds
      const exact = Array.from(document.querySelectorAll('a[onclick^="usePropUrl(1,"]')).find(a => {
        const m = (a.getAttribute('onclick') || '').match(/usePropUrl\(1,(\d+)\)/);
        return m && this.CONFIG.PROP_IDS.includes(+m[1]);
      });
      if (exact) return exact;
      return null;
    },

    // 返回食材券仓库页
    returnToWarehouse() {
      const backLink = Array.from(document.querySelectorAll('a')).find(a => {
        const t = (a.textContent || '').trim();
        const h = a.getAttribute('href') || '';
        return t === '返回仓库' || t === '返回' || t === '返回前页' ||
               h === '/xz/warehouse_1_0' || h === '/xz/warehouse' ||
               /食材|仓库/.test(t);
      });
      if (backLink) {
        Utils.sleep(Utils.randMs(1, 2)).then(() => Utils.click(backLink));
        return true;
      }
      Utils.warn('食材券: 找不到返回仓库链接');
      return false;
    },
  };

  // ----- 8. 礼包开启 -----
  MOD.bag = {
    match: (p) => p === '/xz/warehouse_2_0' || /\/xz\/(?:prop|open)_bag_/.test(p),
    schedule: 'daily',
    async run() {
      if (/\/xz\/(?:prop|open)_bag_/.test(location.pathname)) {
        const back = Array.from(document.querySelectorAll('a')).find(a => {
          const text = (a.textContent || '').trim();
          const href = a.getAttribute('href') || '';
          return href === '/xz/warehouse_2_0' || text === '返回礼包' || text === '返回仓库' || text === '返回前页';
        });
        if (!back) {
          Utils.warn('礼包: 结果页找不到返回礼包仓库链接');
          return true;
        }
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(back);
        Utils.log('礼包: 返回礼包仓库继续检测');
        return false;
      }
      const links = Array.from(document.querySelectorAll('a[onclick^="usePropUrl(2,"]'));
      if (links.length === 0) {
        Utils.log('礼包: 无可用');
        Utils.showStatus('礼包', '已全部开启');
        return true;
      }
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(links[0]);
      Utils.log(`礼包: 只开启本页第一个（当前共 ${links.length} 个），等待结果页返回后继续`);
      return false;
    },
  };

  // ----- 9. 餐厅管理（17-45min 随机循环）-----
  // 关键修复：原实现把剩余楼层存在 sched_phase，会与 Scheduler 状态冲突
  // 现改用 restaurant_remaining_floors 独立 GM 字段，避免共享状态
  MOD.restaurant = {
    match: (p) => p === '/xz/restaurant' || /\/xz\/restaurant_\d+_\d+/.test(p),
    schedule: 'restaurant',
    requiresScheduled: true,
    SELF_ID_KEY: 'self_restaurant_id',
    MAX_ROACH_ATTEMPTS: 20,

    // 自家概览同时提供“IDxxxx”标题和 restaurant_<uid>_<floor> 楼层链接。
    // 两种来源一致才保存，避免从好友链接或异常页面误学ID。
    learnSelfId() {
      if (location.pathname !== '/xz/restaurant') return null;
      const bodyText = document.body?.textContent || '';
      const titleId = bodyText.match(/(?:^|\s)ID\s*(\d+)(?:\s|$)/)?.[1] || null;
      const floorIds = new Set(Array.from(document.querySelectorAll('a[href^="/xz/restaurant_"]')).flatMap(a => {
        const match = (a.getAttribute('href') || '').match(/^\/xz\/restaurant_(\d+)_([2-9]\d*)$/);
        return match ? [match[1]] : [];
      }));
      const floorId = floorIds.size === 1 ? Array.from(floorIds)[0] : null;
      if (!titleId || !floorId || titleId !== floorId) {
        Utils.warn(`餐厅: 自己ID交叉验证失败（标题=${titleId || '无'}，楼层=${floorId || (floorIds.size > 1 ? '冲突' : '无')}），不更新记录`);
        return null;
      }
      const previous = String(Utils.gget(this.SELF_ID_KEY, '') || '');
      if (previous !== titleId) {
        Utils.gset(this.SELF_ID_KEY, titleId);
        Utils.log(`餐厅: 已学习自己的餐厅ID ${titleId}${previous ? `（原 ${previous}）` : ''}`);
        if (document.getElementById('dxzxx-panel')) Panel.refreshAutopilotUI();
      }
      return titleId;
    },

    getSelfId() {
      return String(Utils.gget(this.SELF_ID_KEY, '') || '');
    },

    parseFloorPath(path = location.pathname) {
      const match = path.match(/^\/xz\/restaurant_(\d+)_(\d+)$/);
      return match ? { uid: match[1], floor: Number(match[2]) } : null;
    },

    isSelfFloor(path = location.pathname) {
      const info = this.parseFloorPath(path);
      const selfId = this.getSelfId();
      return !!(info && selfId && info.uid === selfId);
    },

    // 每页先处理直接显示的蟑螂；当前自家1楼就是 /xz/restaurant，而不是 restaurant_<uid>_1。
    async killCurrentRoach() {
      if (!actionEnabled('restaurant', 'restaurant_cockroach', Utils.gget('restaurant_cockroach', true))) return false;
      if (Utils.gget('restaurant_roach_cycle_blocked', false)) return false;
      const resultText = document.body.textContent || '';
      const attempts = Utils.gget('restaurant_roach_attempts', 0);
      if (/体力不足|打蟑螂失败|无法继续打/.test(resultText)) {
        Utils.warn('餐厅: 本轮打蟑螂已停止（体力不足或操作失败），永久开关保持开启');
        Utils.gset('restaurant_roach_cycle_blocked', true);
        Utils.gset('restaurant_remaining_floors', []);
        return false;
      }
      if (attempts >= this.MAX_ROACH_ATTEMPTS) {
        Utils.warn(`餐厅: 打蟑螂达到每轮 ${this.MAX_ROACH_ATTEMPTS} 次上限，只停止本轮，永久开关保持开启`);
        Utils.gset('restaurant_roach_cycle_blocked', true);
        Utils.gset('restaurant_remaining_floors', []);
        return false;
      }
      const roachBtns = Array.from(document.querySelectorAll("a[onclick^='killCockroach']"));
      if (roachBtns.length === 0) return false;
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.gset('restaurant_roach_attempts', attempts + 1);
      Utils.click(roachBtns[0]);
      Utils.log(`餐厅: 清除当前楼层第一个蟑螂（本轮 ${attempts + 1}/${this.MAX_ROACH_ATTEMPTS}，本页共 ${roachBtns.length} 个）`);
      return true;
    },

    // 9.1 概览页：添油 + 清当前1楼蟑螂 + 扫感染楼层 → 导航去第一层
    async processOverview() {
      if (await this.addOil()) return false;

      if (await this.killCurrentRoach()) return false;

      if (!actionEnabled('restaurant', 'restaurant_cockroach', Utils.gget('restaurant_cockroach', true)) ||
          Utils.gget('restaurant_roach_cycle_blocked', false)) {
        Utils.log(Utils.gget('restaurant_roach_cycle_blocked', false)
          ? '餐厅: 本轮打蟑螂已停止，跳过楼层扫描'
          : '餐厅: 蟑螂开关关，跳过楼层扫描');
        Utils.gset('restaurant_remaining_floors', []);
        return true;
      }

      const infected = this.detectInfectedFloors();
      if (infected.length === 0) {
        Utils.log('餐厅: 无感染楼层');
        Utils.gset('restaurant_remaining_floors', []);
        return true;
      }

      const [first, ...rest] = infected;
      Utils.gset('restaurant_remaining_floors', rest);
      Utils.log(`餐厅: ${infected.length} 层感染 (${infected.join(',')})，先去 ${first} 楼`);
      return (await this.navigateToFloor(first)) ? false : true;
    },

    // 9.2 楼层页：打蟑螂 + 跳下一感染楼层（或回概览）
    async processFloor() {
      if (await this.killCurrentRoach()) return false;
      Utils.log('餐厅: 当前楼层无蟑螂');

      const remaining = Utils.gget('restaurant_remaining_floors', []);
      if (remaining.length > 0) {
        const [next, ...rest] = remaining;
        Utils.gset('restaurant_remaining_floors', rest);
        Utils.log(`餐厅: 剩余 ${rest.length + 1} 层，去 ${next} 楼`);
        return (await this.navigateToFloor(next)) ? false : true;
      } else {
        Utils.log('餐厅: 全部处理完，回概览');
        return (await this.navigateToOverview()) ? false : true;
      }
    },

    // 添油
    async addOil() {
      if (!actionEnabled('restaurant', 'restaurant_oil', Utils.gget('restaurant_oil', true))) {
        Utils.log('餐厅: 添油开关关');
        return false;
      }
      const oilText = Utils.findByTextIncludes('p', '油壶：')?.textContent || '';
      const m = oilText.match(/(\d+)\s*\/\s*(\d+)/);
      if (!m) return false;
      const cur = +m[1], max = +m[2];
      if (cur < 14000) {
        const addOil = document.querySelector("a[onclick^='addFullOil']");
        if (addOil) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(addOil);
          Utils.log(`餐厅: 添油 ${cur} → ${max}`);
          return true;
        }
      } else {
        Utils.log(`餐厅: 油量充足 ${cur}/${max}`);
      }
      return false;
    },

    // 检测感染楼层：找 cockroach 图标邻近的 restaurant 链接
    detectInfectedFloors() {
      const floors = new Set();
      const selfId = this.getSelfId();
      const cockroachImgs = document.querySelectorAll(
        'img[src*="cockroach"], img[alt*="蟑螂"], img[alt*="cockroach"], img[title*="蟑螂"]'
      );
      cockroachImgs.forEach(img => {
        const tryMatch = (node) => {
          if (!node) return false;
          const el = node.matches?.('a[href*="/xz/restaurant_"]')
            ? node
            : node.querySelector?.('a[href*="/xz/restaurant_"]');
          if (!el) return false;
          const href = el.getAttribute('href') || '';
          const own = href.match(/^\/xz\/restaurant_(\d+)_(\d+)$/);
          if (!own || !selfId || own[1] !== selfId) return false;
          const m = href.match(/_(\d+)$/);
          if (m) floors.add(+m[1]);
          return !!m;
        };
        // 站点结构是“楼层链接 + 蟑螂图标”。只检查有限邻接节点，禁止兄弟节点来回游走。
        [img.closest?.('a[href*="/xz/restaurant_"]'), img.previousElementSibling, img.nextElementSibling]
          .some(tryMatch);
      });

      // 备用：扫文本含"感染"/"蟑螂"的行
      if (floors.size === 0) {
        document.querySelectorAll('p, tr, div').forEach(row => {
          const txt = row.textContent;
          if ((txt.includes('感染') || txt.includes('蟑螂')) && txt.length < 200) {
            const link = Array.from(row.querySelectorAll('a[href^="/xz/restaurant_"]')).find(a => {
              const own = (a.getAttribute('href') || '').match(/^\/xz\/restaurant_(\d+)_(\d+)$/);
              return own && selfId && own[1] === selfId;
            });
            if (link) {
              const m = link.href.match(/_(\d+)$/);
              if (m) floors.add(+m[1]);
            }
          }
        });
      }

      const arr = Array.from(floors).sort((a, b) => a - b);
      if (arr.length > 0) Utils.log(`餐厅: 检测到感染楼层 [${arr.join(',')}]`);
      return arr;
    },

    // 导航到指定楼层
    async navigateToFloor(floor) {
      const selfId = this.getSelfId();
      if (!selfId) {
        Utils.warn('餐厅: 尚未学习自己的餐厅ID，拒绝进入楼层');
        return false;
      }
      const link = Array.from(document.querySelectorAll('a')).find(a => {
        const h = a.getAttribute('href') || '';
        return h === `/xz/restaurant_${selfId}_${floor}`;
      });
      if (link) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(link);
        return true;
      } else {
        Utils.warn(`餐厅: 找不到 ${floor} 楼链接，清空剩余楼层`);
        Utils.gset('restaurant_remaining_floors', []);
        return false;
      }
    },

    // 导航回概览
    async navigateToOverview() {
      // 优先用"返回"链接
      const backLink = Array.from(document.querySelectorAll('a')).find(a => {
        const t = (a.textContent || '').trim();
        return t === '返回' || t === '返回前页' || t === '返回餐厅' || t === '我的餐厅';
      });
      const link = backLink || Array.from(document.querySelectorAll('a')).find(a =>
        (a.getAttribute('href') || '') === '/xz/restaurant'
      );
      if (link) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(link);
        return true;
      }
      Utils.warn('餐厅: 找不到概览链接');
      return false;
    },

    async run() {
      const path = location.pathname;
      if (path === '/xz/restaurant') {
        if (!this.learnSelfId()) {
          Utils.warn('餐厅: 无法确认自己的餐厅ID，本轮安全停止');
          return true;
        }
        return this.processOverview();
      }
      const floorInfo = this.parseFloorPath(path);
      if (floorInfo) {
        if (!this.isSelfFloor(path)) {
          Utils.log(`餐厅: ${floorInfo.uid} 不是自己的餐厅 ${this.getSelfId() || '（尚未学习）'}，保持只读`);
          return true;
        }
        return this.processFloor();
      }
      return true;
    },
  };

  // ----- 9.1 餐厅后系统邮箱礼物 -----
  // 只检查系统邮箱第一页：新邮件位于顶部，历史分页不应在每轮餐厅后重复扫描。
  MOD.mailbox = {
    match: (p) => p === '/xz/mailbox' || p === '/xz/mailbox_0_1',
    schedule: 'after-restaurant',
    async run() {
      if (!Utils.gget('restaurant_mailbox', true)) {
        Utils.log('邮箱: 餐厅后领取开关关');
        return true;
      }

      const claim = Array.from(document.querySelectorAll('a')).find(a => {
        const text = (a.textContent || '').trim();
        const onclick = (a.getAttribute('onclick') || '').trim();
        return text === '领取' && /^getMailProp\(\d+,\s*0\);?$/.test(onclick);
      });
      if (!claim) {
        Utils.log('邮箱: 系统首页没有可领取礼物');
        Utils.showStatus('邮箱', '系统礼物已检查');
        return true;
      }

      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(claim);
      Utils.log('邮箱: 领取第一份系统礼物，刷新后继续检查');
      return false;
    },
  };

  // ----- 10. 免费宝箱 + 神话级宝箱 -----
  // 同时匹配 /xz/box 与 /xz/bar（酒吧含开宝箱页面）— 防止 AutoPilot 导航到 /xz/bar 后没有模块接管
  MOD.box = {
    match: (p) => p === '/xz/box' || p === '/xz/bar',
    schedule: 'daily',
    requiresScheduled: true,
    async run() {
      // /xz/bar 是中转页：尝试点 "开宝箱" 跳到 /xz/box 再处理
      if (location.pathname === '/xz/bar') {
        const boxLink = Array.from(document.querySelectorAll('a')).find(a =>
          (a.textContent || '').includes('开宝箱') || (a.getAttribute('href') || '') === '/xz/box'
        );
        if (boxLink) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(boxLink);
          Utils.log('宝箱: 从酒吧跳转到开宝箱');
          return false;
        }
        Utils.log('宝箱: 酒吧页无开宝箱链接，跳过');
        return true;
      }

      // 神话级宝箱优先（200 进度满）
      const mythText = Array.from(document.querySelectorAll('.m_room p')).find(p =>
        p.textContent.includes('神话级宝箱') && p.textContent.includes('进度')
      );
      if (mythText) {
        const pm = mythText.textContent.match(/(\d+)\s*\/\s*(\d+)/);
        if (pm && +pm[1] >= +pm[2]) {
          const mythBtn = Utils.findByText('a', '开启') &&
                           Array.from(document.querySelectorAll('a')).find(a =>
                             (a.getAttribute('onclick') || '').includes('openMythBox')
                           );
          if (mythBtn) {
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(mythBtn);
            Utils.log('宝箱: 已开启神话级');
            return false;
          }
        }
      }
      // 免费宝箱
      const freeText = Array.from(document.querySelectorAll('.m_room p')).find(p =>
        p.textContent.includes('免费宝箱') && p.textContent.includes('剩余')
      );
      if (freeText) {
        const cm = freeText.textContent.match(/剩余(\d+)次/);
        if (cm && +cm[1] > 0) {
          const freeBtn = Array.from(document.querySelectorAll('a')).find(a =>
            (a.getAttribute('onclick') || '') === 'openBox(0,1)'
          );
          if (freeBtn) {
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(freeBtn);
            Utils.log('宝箱: 已开启免费');
            return false;
          }
        }
      }
      Utils.log('宝箱: 今日已开完或条件未满');
      return true;
    },
  };

  // ----- 12. 食谱升级（24h 硬定时）-----
  // 综合旧 v4.0 脚本 + 新页面适配：
  //   - 列表页（cookbook_*）：扫描 .gen_background_blue.s_room.s_font 找"可升级"项进入详情
  //   - 详情页（cook_<id>）：学习 → 升级（仅普通食材，禁用万能食材）
  //   - 条件检查：食材条件（绿/红）+ 街道条件（其他街道未达金牌会失败）
  //   - 升级按钮：text='升级'，onclick 包含 study(，href 不含 universal
  //   - 失败检测：含"食谱学习失败"或"未达成"的容器存在则跳过
  //   - 翻页：找"下一页"链接
  // 配置（GM 持久化）：
  //   recipe_target_level: 目标等级（'off'/'中品'/'上品'/'极品'/'金牌'/'金牌1-10级'）
  MOD.recipe = {
    match: (p) => /^\/xz\/cook_\d+/.test(p) || /\/xz\/cookbook_/.test(p) || /\/xz\/cook_universal_/.test(p),
    schedule: 'recipe',
    scanStateKey: 'recipe_scan_state',

    // 等级映射：旧脚本 v4.0 完整保留
    LEVEL_MAP: {
      '普通': 0, '中品': 1, '特色': 1, '上品': 2, '极品': 3, '金牌': 4,
      '金牌1级': 4, '金牌2级': 5, '金牌3级': 6, '金牌4级': 7, '金牌5级': 8,
      '金牌6级': 9, '金牌7级': 10, '金牌8级': 11, '金牌9级': 12, '金牌10级': 13,
    },

    // 读取配置
    getConfig() {
      return {
        targetLevel: Utils.gget('recipe_target_level', 'off'),
      };
    },

    loadScanState(targetLevel) {
      let state = Utils.gget(this.scanStateKey, null);
      if (!state || state.targetLevel !== targetLevel) {
        state = { targetLevel, blocked: [], active: false, startedAt: 0 };
        Utils.gset(this.scanStateKey, state);
      }
      state.blocked ||= [];
      state.active = state.active === true;
      return state;
    },

    startScan(source) {
      const { targetLevel } = this.getConfig();
      if (targetLevel === 'off') {
        Utils.gset(this.scanStateKey, null);
        Utils.log(`食谱: ${source}触发，但长期目标为关闭`);
        return false;
      }
      Utils.gset(this.scanStateKey, {
        targetLevel,
        blocked: [],
        active: true,
        source,
        startedAt: Date.now(),
      });
      Utils.log(`食谱: ${source}开启新一轮扫描（长期目标=${targetLevel}）`);
      return true;
    },

    parseCookbookPath(path = location.pathname) {
      const match = path.match(/^\/xz\/cookbook_(\d+)_(\d+)_(\d+)$/);
      return match ? { street: Number(match[1]), category: Number(match[2]), page: Number(match[3]) } : null;
    },

    findUpgradableCategoryLink(street = null) {
      return Array.from(document.querySelectorAll('a')).find(a => {
        const text = (a.textContent || '').trim();
        const href = a.getAttribute('href') || '';
        const match = href.match(/^\/xz\/cookbook_(\d+)_3_1$/);
        return text === '可升级' && match && (street == null || Number(match[1]) === street);
      }) || null;
    },

    blockCurrentItem(reason) {
      const cfg = this.getConfig();
      const state = this.loadScanState(cfg.targetLevel);
      const itemPath = location.pathname.match(/^\/xz\/cook_\d+/)?.[0];
      if (itemPath && !state.blocked.includes(itemPath)) state.blocked.push(itemPath);
      Utils.gset(this.scanStateKey, state);
      Utils.log(`食谱: 本轮跳过 ${itemPath || '当前详情'}（${reason}），继续扫描其它菜品`);
    },

    // 主入口
    async run() {
      const path = location.pathname;
      const cfg = this.getConfig();
      if (cfg.targetLevel === 'off') {
        Utils.log('食谱: 长期目标为关闭，不自动扫描/学习');
        return true;
      }
      const scanState = this.loadScanState(cfg.targetLevel);
      if (!scanState.active) {
        Utils.log(`食谱: ${cfg.targetLevel}本轮已完成，等待下次调度开启新轮次`);
        return true;
      }
      // 详情页：学习 / 升级
      if (/^\/xz\/cook_\d+/.test(path)) {
        return this.processDetail();
      }
      // 列表页：找可升级项
      if (/cookbook_/.test(path)) {
        return this.processCookbook();
      }
      // 万能食材升级页（/xz/cook_universal_*）：禁用！不进入，不操作
      if (/\/xz\/cook_universal_/.test(path)) {
        Utils.log('食谱: 万能食材升级已禁用，跳过该页');
        return this.returnToList() ? false : true;
      }
      return true;
    },

    // 12.1 列表页（cookbook_*）
    async processCookbook() {
      const cfg = this.getConfig();
      if (cfg.targetLevel === 'off') {
        Utils.log('食谱: 目标等级为关闭，不自动扫描/学习');
        return true;
      }
      const targetValue = this.LEVEL_MAP[cfg.targetLevel] ?? 4;
      const scanState = this.loadScanState(cfg.targetLevel);
      const pageInfo = this.parseCookbookPath();

      // 旧v4.0脚本只匹配 cookbook_*_3_*。“全部”(分类0)只能用于展示，
      // 不能据此判断可实际升级；若意外落入其它分类，必须点击页面真实“可升级”入口纠正。
      if (!pageInfo || pageInfo.category !== 3) {
        const upgradableLink = this.findUpgradableCategoryLink(pageInfo?.street ?? scanState.street ?? null);
        if (upgradableLink) {
          Utils.log('食谱: 当前不是可升级分类，切回页面真实“可升级”入口');
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(upgradableLink);
          return false;
        }
        Utils.warn('食谱: 当前不是可升级分类，且找不到真实“可升级”入口');
        return false;
      }

      // 详情页结束后必须回到本街道、分类3、原页码，不能取任意 cookbook_* 链接。
      scanState.street = pageInfo.street;
      scanState.listPath = location.pathname;
      Utils.gset(this.scanStateKey, scanState);

      // 12.1.1 找"可升级"项：旧选择器（.gen_background_blue.s_room.s_font → p 含 .gen_grey + .gen_red 含"可升级"）
      const upgradeItem = this.findUpgradeItem(targetValue, scanState.blocked);
      if (upgradeItem) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(upgradeItem.link);
        Utils.log(`食谱: 进入 ${upgradeItem.name} (${upgradeItem.level} → ${cfg.targetLevel})`);
        return false;
      }

      // 当前页处理完 → 翻页（不从列表猜测“未学习项”）
      const nextPage = this.findNextPage(pageInfo.street);
      if (nextPage) {
        Utils.log('食谱: 翻到下一页');
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(nextPage);
        return false;
      }
      Utils.log('食谱: 当前可升级分类已扫完，本轮完成');
      scanState.active = false;
      scanState.completedAt = Date.now();
      Utils.gset(this.scanStateKey, scanState);
      Utils.showStatus('食谱', `本轮完成，长期目标保留为${cfg.targetLevel}`);
      return true;
    },

    // 找可升级项
    findUpgradeItem(targetValue, blocked = []) {
      const sections = document.querySelectorAll('.gen_background_blue.s_room.s_font');
      for (const section of sections) {
        for (const p of section.querySelectorAll('p')) {
          const grey = p.querySelector('.gen_grey');
          const red = p.querySelector('.gen_red');
          if (!grey || !red) continue;
          if (!red.textContent.includes('可升级')) continue;
          const lvlText = grey.textContent.trim();
          const isUnlearned = /未学习|尚未学习|未学/.test(lvlText);
          const cur = isUnlearned ? -1 : this.LEVEL_MAP[lvlText];
          if (cur === undefined) continue;
          if (cur >= targetValue) continue;
          const link = p.querySelector('a[href^="/xz/cook_"]');
          if (link && blocked.includes(link.getAttribute('href') || '')) continue;
          if (link) return { name: link.textContent.trim(), level: lvlText, link };
        }
      }
      return null;
    },

    // 找下一页
    findNextPage(street) {
      return this.findNextPageByCategory(street, 3);
    },

    findNextPageByCategory(street, category) {
      return Array.from(document.querySelectorAll('a')).find(a => {
        const t = (a.textContent || '').trim();
        const href = a.getAttribute('href') || '';
        const sameCategory = new RegExp(`^/xz/cookbook_${street}_${category}_\\d+$`).test(href);
        return sameCategory && (t === '下一页' || t === '下一頁' || t === '>>' || t === 'Next');
      }) || null;
    },

    // 获取详情页当前等级；当前站点是纯文本“食谱等级：中品”，旧页面可能把等级包在 span 内
    getCurrentLevel() {
      const levelPara = Array.from(document.querySelectorAll('p')).find(p =>
        /食谱等级[:：]/.test(p.textContent || '')
      );
      if (!levelPara) return null;
      const levelText = (levelPara.textContent || '').replace(/\s+/g, ' ').trim();
      const match = levelText.match(/食谱等级[:：]\s*(金牌(?:\d+级)?|极品|上品|中品|特色|普通)/);
      return match ? match[1] : null;
    },

    // 12.2 详情页（cook_<id>）
    async processDetail() {
      const cfg = this.getConfig();

      // 12.2.0 先检测升级失败标记
      if (this.checkUpgradeFailure()) {
        Utils.log('食谱: 检测到升级失败标记，跳过详情');
        this.blockCurrentItem('升级失败');
        return this.returnToList() ? false : true;
      }

      // 12.2.1 学习：未学习时显示"学习"按钮
      const learnBtn = Utils.findByText('a', '学习');
      if (learnBtn) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(learnBtn);
        Utils.log('食谱: 可升级分类发现未学习食谱，已先点学习');
        return false;
      }

      // 每次刷新都重新读取当前等级；达到目标必须立即返回，绝不能继续消耗食材
      const currentLevelText = this.getCurrentLevel();
      const currentLevel = currentLevelText == null ? undefined : this.LEVEL_MAP[currentLevelText];
      const targetLevel = this.LEVEL_MAP[cfg.targetLevel];
      if (currentLevel === undefined || targetLevel === undefined) {
        Utils.warn(`食谱: 无法解析等级（当前=${currentLevelText || '未知'}，目标=${cfg.targetLevel}），安全停止当前详情`);
        Utils.showStatus('食谱', '等级解析失败，已跳过');
        this.blockCurrentItem('等级解析失败');
        return this.returnToList() ? false : true;
      }
      if (currentLevel >= targetLevel) {
        Utils.log(`食谱: 当前${currentLevelText}已达到目标${cfg.targetLevel}，返回列表`);
        return this.returnToList() ? false : true;
      }

      // 12.2.2 升级按钮（仅普通食材升级，不点万能食材）
      const upgradeBtn = this.findNormalUpgradeButton();
      if (upgradeBtn && this.checkConditions()) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(upgradeBtn);
        Utils.log('食谱: 已点升级（普通食材）');
        return false;
      }

      // 12.2.3 无可执行动作 → 返回列表（不点万能食材）
      Utils.log('食谱: 条件不满足或已达目标，返回列表');
      this.blockCurrentItem(upgradeBtn ? '材料或条件不足' : '无普通食材升级按钮');
      return this.returnToList() ? false : true;
    },

    // 找普通升级按钮（text='升级'，onclick 含 study(，href 不含 universal）
    findNormalUpgradeButton() {
      return Array.from(document.querySelectorAll('a')).find(a => {
        const t = (a.textContent || '').trim();
        const oc = a.getAttribute('onclick') || '';
        const h = a.getAttribute('href') || '';
        return t === '升级' && /study\(/.test(oc) && !/universal/.test(h);
      }) || null;
    },

    // 条件检查：旧 v4.0 完整保留 + 简化
    checkConditions() {
      // 1) 升级到XX条件：找条件标题
      const conditionTitle = Array.from(document.querySelectorAll('.s_room p')).find(p =>
        p.textContent.includes('升级到') && p.textContent.includes('条件：')
      );
      if (!conditionTitle) {
        return false;
      }
      // 2) 条件区域：紧邻的 .gen_background_blue 容器
      let conditionContainer = null;
      const ownRoom = conditionTitle.closest('.s_room');
      if (ownRoom) {
        let el = conditionTitle.nextElementSibling;
        while (el && !el.classList.contains('gen_background_blue')) {
          el = el.nextElementSibling;
        }
        if (el) conditionContainer = el;
        if (!conditionContainer && ownRoom.nextElementSibling &&
            ownRoom.nextElementSibling.classList.contains('gen_background_blue')) {
          conditionContainer = ownRoom.nextElementSibling;
        }
      }
      if (!conditionContainer) {
        conditionContainer = document.querySelector('.gen_background_blue');
      }
      if (!conditionContainer) return false;

      // 3) 检查所有条件块
      const blocks = conditionContainer.querySelectorAll('p');
      for (const block of blocks) {
        const text = block.textContent.trim();
        if (!text) continue;
        // 关键条件：含"×"（食材数量）、"拥有"、"街道"、或"金牌"
        const isKey = /[×x]|拥有|街道|金牌|升级至/.test(text);
        if (!isKey) continue;
        const hasRed = block.querySelector('.gen_red') !== null;
        if (hasRed) {
          Utils.log(`食谱: 条件未达 → ${text.slice(0, 40)}`);
          return false;
        }
        if (!block.querySelector('.gen_green') && /未达|不足|缺少/.test(text)) {
          Utils.log(`食谱: 条件未达 → ${text.slice(0, 40)}`);
          return false;
        }
      }
      return true;
    },

    // 升级失败标记检测
    checkUpgradeFailure() {
      const failContainers = document.querySelectorAll('.gen_background_yellow.s_room.s_font');
      for (const c of failContainers) {
        if (/食谱学习失败|当前街道未全部升级至金牌/.test(c.textContent)) {
          return true;
        }
      }
      return false;
    },

    // 返回食谱列表
    returnToList() {
      const cfg = this.getConfig();
      const state = this.loadScanState(cfg.targetLevel);
      const listPath = state.listPath;
      const back = listPath ? Array.from(document.querySelectorAll('a')).find(a =>
        (a.getAttribute('href') || '') === listPath
      ) : null;
      if (back) {
        Utils.sleep(Utils.randMs(1, 2)).then(() => Utils.click(back));
        return true;
      }
      // 参考旧v4.0：详情页普通“返回食谱”会落入分类0，不能点击；
      // 使用浏览器历史返回进入详情前保存的分类3原分页。
      if (history.length > 1) {
        Utils.log(`食谱: 返回原可升级分页 ${listPath || '（浏览器历史）'}`);
        Utils.sleep(Utils.randMs(1, 2)).then(() => history.back());
        return true;
      }
      Utils.warn('食谱: 无法返回原可升级分页');
      return false;
    },
  };

  // ----- 12. 守护者（爆裂飞弹，24h 硬定时）-----
  MOD.guardian = {
    match: (p) => p === '/xz/guardian' || p === '/xz/prop_82',
    schedule: 'guardian',
    requiresScheduled: true,
    PURCHASE_KEY: 'guardian_missile_purchase',
    REPLENISH_BELOW: 200,
    BUY_COUNT: 300,
    FAILED_RETRY_MS: 12 * 3600000,
    VERIFIED_GRACE_MS: 12 * 3600000,
    RETRY_RELOAD_MS: 3000,
    maxPhaseAgeMs: 20 * 60000,

    loadPurchase() {
      const purchase = Utils.gget(this.PURCHASE_KEY, null);
      if (!purchase) return null;
      if (purchase.threshold !== this.REPLENISH_BELOW || purchase.buyCount !== this.BUY_COUNT) {
        Utils.gset(this.PURCHASE_KEY, null);
        return null;
      }
      if (purchase.verifiedAt && Date.now() - purchase.verifiedAt >= this.VERIFIED_GRACE_MS) {
        Utils.gset(this.PURCHASE_KEY, null);
        return null;
      }
      return purchase;
    },

    parseGuardianInventory() {
      const row = Array.from(document.querySelectorAll('p')).find(p =>
        p.querySelector('a[href="/xz/prop_82"]') && /\[爆裂飞弹\]/.test(p.textContent || '')
      );
      const match = (row?.textContent || '').match(/拥有\s*(\d+)\s*个/);
      return match ? Number(match[1]) : null;
    },

    parseGuardianHp() {
      const row = Array.from(document.querySelectorAll('p')).find(p =>
        /守护者剩余血量[：:]/.test(p.textContent || '')
      );
      const match = (row?.textContent || '').match(/守护者剩余血量[：:]\s*(\d+)/);
      return match ? Number(match[1]) : null;
    },

    findLaunchButton(count) {
      return Array.from(document.querySelectorAll('a')).find(a =>
        (a.getAttribute('onclick') || '').replace(/\s+/g, '') === `guardianLaunch(82,${count})`
      ) || null;
    },

    parseStoreInventory() {
      const text = document.body?.innerText || document.body?.textContent || '';
      const match = text.match(/拥有数量\s*[：:]\s*(\d+)/);
      return match ? Number(match[1]) : null;
    },

    isExplicitlyComplete() {
      const text = document.body?.innerText || document.body?.textContent || '';
      return /今日已挑战守护者|明天再来|击败了守护者|守护者(?:已被击败|挑战完成)/.test(text);
    },

    retryCurrentPage(reason, delayMs = this.RETRY_RELOAD_MS) {
      Utils.warn(`守护者: ${reason}，${Math.round(delayMs / 1000)}秒后刷新复核；本轮不记完成`);
      Utils.showStatus('守护者', '等待页面复核');
      setTimeout(() => location.reload(), delayMs);
      return false;
    },

    async returnFromStore(have, reason) {
      await Utils.sleep(Utils.randMs(1, 2));
      // 物品页购买可能新增/替换同路径历史记录，“返回前页”不能保证落回守护者。
      // 固定进入真实守护者地址，让AutoPilot/Scheduler在同一guardian phase内继续攻击。
      Utils.log(`守护者: ${reason}（库存 ${have}），进入守护者页继续攻击`);
      location.assign('/xz/guardian');
      return false;
    },

    async run() {
      if (location.pathname === '/xz/guardian') {
        const singleLaunchBtn = this.findLaunchButton(1);
        if (!singleLaunchBtn) {
          if (this.isExplicitlyComplete()) {
            Utils.gset(this.PURCHASE_KEY, null);
            Utils.log('守护者: 页面已明确确认今日挑战完成');
            Utils.showStatus('守护者', '已完成');
            return true;
          }
          return this.retryCurrentPage('未找到单发按钮且页面没有明确完成文字');
        }

        const have = this.parseGuardianInventory();
        if (have === null) {
          return this.retryCurrentPage('无法读取爆裂飞弹库存（不购买、不发射）');
        }

        const hp = this.parseGuardianHp();
        if (hp === null) {
          return this.retryCurrentPage('无法读取剩余血量（不购买、不发射）');
        }

        let purchase = this.loadPurchase();
        // 已验证补货记录只保护同一次购买响应；战斗消耗后库存下降，必须允许下一轮低库存再次补货。
        if (purchase?.verifiedAt && have < purchase.after) {
          Utils.gset(this.PURCHASE_KEY, null);
          purchase = null;
        }
        if (have >= this.REPLENISH_BELOW) {
          const launchCount = hp > 1000 ? 10 : 1;
          const launchBtn = launchCount === 10 ? this.findLaunchButton(10) : singleLaunchBtn;
          if (!launchBtn) {
            return this.retryCurrentPage(`血量 ${hp} 应发射${launchCount}次，但找不到对应真实按钮`);
          }
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(launchBtn);
          Utils.log(`守护者: 血量 ${hp}，发射爆裂${launchCount}次（库存 ${have}）`);
          return false;
        }

        const shopLink = Array.from(document.querySelectorAll('a')).find(a =>
          (a.getAttribute('href') || '') === '/xz/prop_82'
        );
        if (!shopLink) {
          return this.retryCurrentPage(`库存 ${have} < ${this.REPLENISH_BELOW}，但找不到爆裂飞弹商店入口`);
        }
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(shopLink);
        Utils.log(`守护者: 库存 ${have} < ${this.REPLENISH_BELOW}，进入商店补货`);
        return false;
      } else {
        // /xz/prop_82 商店页：必须明确读取库存，且每次提交后验证增长。
        const have = this.parseStoreInventory();
        if (have === null) {
          return this.retryCurrentPage('商店无法读取“拥有数量”（未购买）');
        }

        let purchase = this.loadPurchase();
        if (purchase?.verifiedAt && have < purchase.after) {
          const previousAfter = purchase.after;
          Utils.gset(this.PURCHASE_KEY, null);
          purchase = null;
          Utils.log(`守护者: 已验证补货库存已由 ${previousAfter} 消耗至 ${have}，允许再次按阈值补货`);
        }
        if (purchase?.clickedAt && !purchase.verifiedAt) {
          if (have >= purchase.before + this.BUY_COUNT) {
            purchase = { ...purchase, after: have, verifiedAt: Date.now() };
            Utils.gset(this.PURCHASE_KEY, purchase);
            Utils.log(`守护者: 购买验证成功，库存 ${purchase.before} → ${have}`);
            return this.returnFromStore(have, `已确认购买 ${this.BUY_COUNT} 个爆裂飞弹成功`);
          }
          // 即使页面没有呈现精确+300，只要已达到战斗阈值，也应回去继续打，不能误记整轮完成。
          if (have >= this.REPLENISH_BELOW) {
            purchase = { ...purchase, after: have, verifiedAt: Date.now(), thresholdVerified: true };
            Utils.gset(this.PURCHASE_KEY, purchase);
            Utils.log(`守护者: 购买后库存已达到战斗阈值 ${have}，返回继续攻击`);
            return this.returnFromStore(have, '库存已达到战斗阈值');
          }
          if (Date.now() - purchase.clickedAt < this.FAILED_RETRY_MS) {
            return this.retryCurrentPage(`已提交购买但库存尚未确认增长（${purchase.before} → ${have}），保持阶段且不重复购买`);
          }
          Utils.gset(this.PURCHASE_KEY, null);
          purchase = null;
        }

        if (have >= this.REPLENISH_BELOW || purchase?.verifiedAt) {
          return this.returnFromStore(have, have >= this.REPLENISH_BELOW ? '库存充足' : '本轮补货已经验证');
        }

        const input = document.getElementById('buyNum') || document.getElementById('buy_num');
        const buy = document.querySelector('a[onclick="buyByActivity(0,82,0)"]');
        if (input && buy) {
          input.value = String(this.BUY_COUNT);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          Utils.gset(this.PURCHASE_KEY, {
            threshold: this.REPLENISH_BELOW,
            buyCount: this.BUY_COUNT,
            before: have,
            clickedAt: Date.now(),
          });
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(buy);
          Utils.log(`守护者: 库存 ${have} < ${this.REPLENISH_BELOW}，已提交一次购买 ${this.BUY_COUNT} 个爆裂飞弹`);

          // buyByActivity 当前是同页更新，不一定触发页面重载；主动轮询验证，
          // 让Router/Scheduler也能完成本轮，而不只依赖AutoPilot的3秒续跑。
          for (let i = 0; i < 30; i++) {
            await Utils.sleep(500);
            const after = this.parseStoreInventory();
            if (after !== null && after >= have + this.BUY_COUNT) {
              const verified = {
                threshold: this.REPLENISH_BELOW,
                buyCount: this.BUY_COUNT,
                before: have,
                clickedAt: Date.now(),
                after,
                verifiedAt: Date.now(),
              };
              Utils.gset(this.PURCHASE_KEY, verified);
              Utils.log(`守护者: 同页购买验证成功，库存 ${have} → ${after}`);
              return this.returnFromStore(after, `已确认购买 ${this.BUY_COUNT} 个爆裂飞弹成功`);
            }
            if (after !== null && after >= this.REPLENISH_BELOW) {
              const verified = {
                threshold: this.REPLENISH_BELOW,
                buyCount: this.BUY_COUNT,
                before: have,
                clickedAt: Date.now(),
                after,
                verifiedAt: Date.now(),
                thresholdVerified: true,
              };
              Utils.gset(this.PURCHASE_KEY, verified);
              Utils.log(`守护者: 同页库存已达到战斗阈值 ${have} → ${after}`);
              return this.returnFromStore(after, '库存已达到战斗阈值');
            }
          }
          return this.retryCurrentPage('购买后15秒内库存仍未确认增长，保持阶段并跨刷新复核');
        }
        return this.retryCurrentPage('商店页未找到数量框或购买按钮');
      }
    },
  };

  // ==================== 可配置每日项目 ====================
  const DailyProjectState = {
    load(key) {
      const day = gameDayKey();
      const state = Utils.gget(`project_state_${key}`, null);
      if (!state || state.day !== day) {
        const fresh = { day, counts: {}, pending: null, visited: [], tried: [], succeeded: [], page: 1 };
        Utils.gset(`project_state_${key}`, fresh);
        return fresh;
      }
      state.counts ||= {};
      state.visited ||= [];
      state.tried ||= [];
      // 旧状态无法区分成功与失败签名；升级当天保守视作已成功，次日06:00后自动使用精确记录。
      if (!Array.isArray(state.succeeded)) state.succeeded = [...state.tried];
      return state;
    },
    save(key, state) { Utils.gset(`project_state_${key}`, state); },
    remaining(id, state) {
      const actionState = Utils.gget('autopilot_state', null);
      const actionRun = actionState?.enabled ? Utils.gget(PROJECT_ACTION_RUN_KEY, null) : null;
      const scope = actionState?.enabled ? actionState.actionScope : null;
      const scopedProject = actionRun?.active
        ? actionRun.projectId
        : (scope?.startsWith('project_') ? scope.slice('project_'.length) : null);
      if (scopedProject) {
        if (scopedProject !== id) return 0;
        // 可重复项目的独立运行按“本次新增”计数；NPC/猜数字为服务端每日一次，保留全天语义。
        const target = actionRun?.projectId === id
          ? Math.max(0, Number(actionRun.target) || 0)
          : projectTarget(id);
        if (['npc', 'number'].includes(id)) return Math.max(0, target - (state.counts[id] || 0));
        const completed = actionRun?.projectId === id
          ? Math.max(0, Number(actionRun.completed) || 0)
          : 0;
        return Math.max(0, target - completed);
      }
      const scheduledPhase = !actionState?.enabled ? Utils.gget('sched_phase', null) : null;
      const scheduledScope = ['navigating', 'running'].includes(scheduledPhase?.state)
        ? scheduledPhase.projectScope
        : null;
      if (Array.isArray(scheduledScope) && scheduledScope.length > 0) {
        if (!scheduledScope.includes(id)) return 0;
        return projectEnabled(id) ? Math.max(0, projectTarget(id) - (state.counts[id] || 0)) : 0;
      }
      return projectEnabled(id) ? Math.max(0, projectTarget(id) - (state.counts[id] || 0)) : 0;
    },
  };

  const DAILY_PROJECT_STATE_KEYS = {
    like: 'friend', dig: 'friend', roach: 'friend',
    fist: 'bar', cup: 'bar', number: 'bar',
    npc: 'npc', luck: 'luck', extraWish: 'wish',
  };
  const hasDailyProjectRemaining = (ids) => ids.some(id => {
    if (!projectEnabled(id) || projectTarget(id) <= 0) return false;
    const stateKey = DAILY_PROJECT_STATE_KEYS[id];
    if (!stateKey) return false;
    const state = DailyProjectState.load(stateKey);
    return (state.counts[id] || 0) < projectTarget(id);
  });

  const syncDailyProgressFromVitality = () => {
    const rows = Array.from(document.querySelectorAll('p')).map(p => p.textContent.replace(/\s+/g, ' ').trim());
    const readProgress = (label) => {
      const row = rows.find(t => t.includes(label));
      const match = row?.match(/(\d+)\s*\/\s*(\d+)/);
      return match ? Number(match[1]) : null;
    };

    const friend = DailyProjectState.load('friend');
    const friendProgress = {
      like: readProgress('点赞/被赞'),
      dig: readProgress('翻橱柜'),
      roach: readProgress('打蟑螂'),
    };
    Object.entries(friendProgress).forEach(([id, value]) => {
      if (value !== null) friend.counts[id] = value;
    });
    DailyProjectState.save('friend', friend);

    const bar = DailyProjectState.load('bar');
    const combined = readProgress('酒吧猜拳/猜酒杯');
    if (combined !== null) {
      const fistTarget = projectTarget('fist');
      const cupTarget = projectTarget('cup');
      // 猜杯单项有独立本地成功记录，优先保留；其余服务器合计先分配给猜拳，再补猜杯。
      let cup = Math.min(cupTarget, Math.max(0, Number(bar.counts.cup) || 0), combined);
      let fist = Math.min(fistTarget, Math.max(0, Number(bar.counts.fist) || 0), Math.max(0, combined - cup));
      let unassigned = Math.max(0, combined - fist - cup);
      const addFist = Math.min(Math.max(0, fistTarget - fist), unassigned);
      fist += addFist;
      unassigned -= addFist;
      cup += Math.min(Math.max(0, cupTarget - cup), unassigned);
      bar.counts.fist = fist;
      bar.counts.cup = cup;
      bar.serverCombined = combined;
    }
    const number = readProgress('酒吧猜数字');
    if (number !== null) bar.counts.number = number;
    DailyProjectState.save('bar', bar);
    Utils.gset('daily_progress_server_synced_at', Utils.getServerTime().getTime());
    Utils.log(`每日进度校准: 赞${friend.counts.like || 0} 柜${friend.counts.dig || 0} 蟑${friend.counts.roach || 0} 酒吧${combined ?? '未知'}`);
    return { friendProgress, combined, number };
  };

  // 好友项目：逐个好友、逐层扫描；只在页面明确返回成功时增加进度。
  MOD.dailyFriend = {
    match: (p) => /^\/xz\/friend(?:_0_\d+)?$/.test(p) || /^\/xz\/restaurant_\d+_\d+$/.test(p),
    schedule: 'daily-project',
    requiresScheduled: true,
    // 高次数配置需要跨越大量好友页；总寿命仅防真正卡死，不再用3.5分钟截断正常遍历。
    maxPhaseAgeMs: 20 * 60 * 1000,
    async run() {
      const state = DailyProjectState.load('friend');
      const text = document.body.textContent || '';
      if (state.pending) {
        const { type, signature } = state.pending;
        const ok = type === 'like' ? /点赞成功|成功点赞|已点赞/.test(text)
          : type === 'dig' ? /翻橱柜成功|翻柜成功/.test(text)
          : /打蟑螂成功|清除蟑螂成功|消灭蟑螂/.test(text);
        if (ok) {
          state.counts[type] = (state.counts[type] || 0) + 1;
          if (signature && !state.succeeded.includes(signature)) state.succeeded.push(signature);
          recordScopedProjectSuccess(type);
          Utils.log(`每日好友: ${type} 成功 ${state.counts[type]}/${projectTarget(type)}`);
        } else {
          Utils.warn(`每日好友: ${type} 未检测到成功结果，本次不计数`);
        }
        if (signature && !state.tried.includes(signature)) state.tried.push(signature);
        state.pending = null;
        DailyProjectState.save('friend', state);
      }

      const needs = ['like', 'dig', 'roach'].some(id => DailyProjectState.remaining(id, state) > 0);
      if (!needs || /体力不足|无法继续翻|无法继续打/.test(text)) {
        Utils.log(`每日好友完成: 赞${state.counts.like || 0} 柜${state.counts.dig || 0} 蟑${state.counts.roach || 0}`);
        return true;
      }

      if (/^\/xz\/friend/.test(location.pathname)) {
        const remainingLike = DailyProjectState.remaining('like', state);
        const remainingDig = DailyProjectState.remaining('dig', state);
        const remainingRoach = DailyProjectState.remaining('roach', state);
        const links = Array.from(document.querySelectorAll('a[href^="/xz/restaurant_"]')).filter(a => {
          const m = (a.getAttribute('href') || '').match(/^\/xz\/restaurant_(\d+)_1$/);
          return m && !state.visited.includes(m[1]);
        });
        const hasRoachMark = (link) => {
          const prev = link.previousElementSibling;
          return prev?.matches?.('img[src="/readImg/xz_cockroach"]');
        };
        const marked = links.filter(hasRoachMark);
        // 点赞/翻柜需要普通好友时保留完整遍历；仅剩蟑螂时只进图标明确标记的好友。
        const candidate = marked[0] || ((remainingLike > 0 || remainingDig > 0 || remainingRoach <= 0) ? links[0] : null);
        if (candidate) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(candidate);
          return false;
        }
        const next = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === '下一页' && /^\/xz\/friend_0_\d+$/.test(a.getAttribute('href') || ''));
        if (next) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(next);
          return false;
        }
        Utils.warn('每日好友: 本轮已扫描全部好友；每日累计缺口保留，等待后续补跑或新候选');
        return true;
      }

      const match = location.pathname.match(/^\/xz\/restaurant_(\d+)_(\d+)$/);
      if (!match) return true;
      const uid = match[1], floor = +match[2];
      const actions = [
        ['like', Array.from(document.querySelectorAll("a[onclick^='addLikeOne']"))[0]],
        ['roach', Array.from(document.querySelectorAll("a[onclick^='killCockroach']"))[0]],
        ['dig', Array.from(document.querySelectorAll("a[onclick^='digOne']"))[0]],
      ];
      for (const [type, button] of actions) {
        const signature = button ? (type === 'like'
          ? `like:${uid}`
          : type === 'dig'
            // 同一好友各楼层重复显示完全相同的柜子按钮；柜子身份与楼层无关。
            ? `dig:${uid}:${button.getAttribute('onclick') || button.textContent.trim()}`
            : `roach:${uid}:${floor}:${button.getAttribute('onclick') || button.textContent.trim()}`) : '';
        if (button && !state.tried.includes(signature) && DailyProjectState.remaining(type, state) > 0) {
          state.pending = { type, uid, floor, signature };
          DailyProjectState.save('friend', state);
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(button);
          return false;
        }
      }

      const floorLinks = Array.from(document.querySelectorAll(`a[href^="/xz/restaurant_${uid}_"]`));
      const markedRoachFloor = floorLinks.find(a =>
        a.nextElementSibling?.matches?.('img[src="/readImg/xz_cockroach"]')
      );
      // 翻柜按钮在每层重复，不换楼；只有蟑螂任务才进入带真实图标的楼层。
      const floorToVisit = DailyProjectState.remaining('roach', state) > 0 ? markedRoachFloor : null;
      if (floorToVisit) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(floorToVisit);
        return false;
      }
      if (!state.visited.includes(uid)) state.visited.push(uid);
      DailyProjectState.save('friend', state);
      const back = Array.from(document.querySelectorAll('a')).find(a => /^\/xz\/friend_0_\d+$/.test(a.getAttribute('href') || '') && a.textContent.includes('好友'));
      if (back) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(back);
        return false;
      }
      Utils.warn('每日好友: 找不到好友列表返回链接');
      return true;
    },
  };

  // 每日 NPC：一轮内依次处理食神、菜场菜园姐、广场阿鹿、协会安妮、酒吧雯姐；五位都完成才记1轮。
  MOD.dailyNpc = {
    match: (p) => ['/xz/', '/xz/god', '/xz/market', '/xz/square', '/xz/association', '/xz/bar'].includes(p),
    schedule: 'daily-project',
    requiresScheduled: true,
    async run() {
      const state = DailyProjectState.load('npc');
      const text = document.body.textContent || '';
      const markVisited = (npcId, label) => {
        if (!state.visited.includes(npcId)) {
          state.visited.push(npcId);
          Utils.log(`每日NPC: ${label} 已处理`);
        }
      };
      const syncRound = () => {
        const complete = ['god', 'garden', 'deer', 'annie', 'wenjie'].every(id => state.visited.includes(id));
        // 修正旧版本只处理部分 NPC 后就把一次拜访误记成完成的状态。
        state.counts.npc = complete ? 1 : 0;
        if (complete) Utils.log('每日NPC: 食神、菜园姐、阿鹿、安妮与雯姐均已处理，本轮完成 1/1');
        return complete;
      };

      if (state.pending) {
        const { npcId, label } = state.pending;
        if (!/拜访失败|操作失败|今日无法拜访/.test(text)) markVisited(npcId, label);
        else Utils.warn(`每日NPC: ${label} 拜访失败，本次不计数`);
        state.pending = null;
        syncRound();
        DailyProjectState.save('npc', state);
      }
      // 即使没有pending，也修正v3.33遗留的不完整轮次计数。
      syncRound();
      DailyProjectState.save('npc', state);
      if (DailyProjectState.remaining('npc', state) <= 0) return true;

      const go = async (href) => {
        const link = document.querySelector(`a[href="${href}"]`);
        if (!link) {
          Utils.warn(`每日NPC: 当前 ${location.pathname} 找不到真实下一跳 ${href}，保持本轮未完成`);
          return false;
        }
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(link);
        return true;
      };
      const goRequired = async (href) => {
        await go(href);
        // 成功点击会换页；链接缺失时也必须保持false，绝不能误报整个模块完成。
        return false;
      };
      const visitHere = async (npcId, label) => {
        if (state.visited.includes(npcId) || DailyProjectState.remaining('npc', state) <= 0) return false;
        const button = Array.from(document.querySelectorAll('a[onclick="see()"]'))
          .find(a => a.textContent.trim() === `拜访${label}`);
        if (!button) {
          // 拜访按钮消失是服务端的每日已完成态；同步本地进度后继续下一位 NPC。
          markVisited(npcId, label);
          syncRound();
          DailyProjectState.save('npc', state);
          return false;
        }
        state.pending = { npcId, label };
        DailyProjectState.save('npc', state);
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(button);
        Utils.log(`每日NPC: 已点击拜访${label}`);
        return true;
      };

      if (location.pathname === '/xz/') {
        if (!state.visited.includes('god')) return goRequired('/xz/god');
        if (!state.visited.includes('garden')) return goRequired('/xz/market');
        if (['deer', 'annie', 'wenjie'].some(id => !state.visited.includes(id))) return goRequired('/xz/square');
        syncRound();
        DailyProjectState.save('npc', state);
        return DailyProjectState.remaining('npc', state) <= 0;
      }
      if (location.pathname === '/xz/god') {
        if (await visitHere('god', '食神')) return false;
        if (DailyProjectState.remaining('npc', state) <= 0) return true;
        return goRequired('/xz/');
      }
      if (location.pathname === '/xz/market') {
        if (await visitHere('garden', '菜园姐')) return false;
        if (DailyProjectState.remaining('npc', state) <= 0) return true;
        return goRequired('/xz/');
      }
      if (location.pathname === '/xz/square') {
        if (await visitHere('deer', '阿鹿')) return false;
        if (DailyProjectState.remaining('npc', state) <= 0) return true;
        if (!state.visited.includes('annie')) return goRequired('/xz/association');
        if (!state.visited.includes('wenjie')) return goRequired('/xz/bar');
        return goRequired('/xz/');
      }
      if (location.pathname === '/xz/association') {
        if (await visitHere('annie', '安妮')) return false;
        if (DailyProjectState.remaining('npc', state) <= 0) return true;
        return goRequired('/xz/square');
      }
      if (location.pathname === '/xz/bar') {
        if (await visitHere('wenjie', '雯姐')) return false;
        if (DailyProjectState.remaining('npc', state) <= 0) return true;
        return goRequired('/xz/');
      }
      Utils.warn(`每日NPC: 未识别路径 ${location.pathname}，保持本轮未完成`);
      return false;
    },
  };

  // 酒吧项目：猜拳/猜杯按动作完成次数，猜数字遵守页面每日一次限制。
  MOD.dailyBar = {
    match: (p) => ['/xz/bar', '/xz/fist', '/xz/cup', '/xz/number'].includes(p),
    schedule: 'daily-project',
    requiresScheduled: true,
    // 猜拳/猜杯每次都会刷新页面，高次数目标给足一轮正常完成时间。
    maxPhaseAgeMs: 15 * 60 * 1000,
    async run() {
      const state = DailyProjectState.load('bar');
      const text = document.body.textContent || '';
      let roundBlocked = false;
      // 清理 v3.32 可能遗留的旧雯姐 pending；NPC 现由独立模块负责。
      if (state.pending === 'wenjie') {
        state.pending = null;
        DailyProjectState.save('bar', state);
      }
      if (state.pending) {
        const type = state.pending;
        if (!/礼券不足|操作失败|无法参与/.test(text)) {
          state.counts[type] = (state.counts[type] || 0) + 1;
          recordScopedProjectSuccess(type);
          Utils.log(`每日酒吧: ${type} ${state.counts[type]}/${projectTarget(type)}`);
        } else {
          Utils.warn(`每日酒吧: ${type} 失败，本次不计数`);
          roundBlocked = /礼券不足|无法参与/.test(text);
        }
        state.pending = null;
        DailyProjectState.save('bar', state);
      }
      if (roundBlocked) {
        Utils.warn('每日酒吧: 本轮因礼券不足或暂时无法参与而结束，每日缺口保留给后续补跑');
        return true;
      }

      // 最后一猜若中奖，pending确认后remaining会立刻归零；领奖必须先于整轮完成判断。
      if (location.pathname === '/xz/cup') {
        const reward = Array.from(document.querySelectorAll("a[onclick^='stopCupGuessing']"))[0];
        if (reward) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(reward);
          Utils.log('每日酒吧: 已点击猜酒杯真实领奖/停止按钮');
          return false;
        }
      }
      if (['fist', 'cup', 'number'].every(id => DailyProjectState.remaining(id, state) <= 0)) return true;

      const go = async (href) => {
        const link = document.querySelector(`a[href="${href}"]`);
        if (!link) return false;
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(link);
        return true;
      };

      if (location.pathname === '/xz/bar') {
        if (DailyProjectState.remaining('number', state) > 0 && await go('/xz/number')) return false;
        if (DailyProjectState.remaining('fist', state) > 0 && await go('/xz/fist')) return false;
        if (DailyProjectState.remaining('cup', state) > 0 && await go('/xz/cup')) return false;
        return true;
      }

      if (location.pathname === '/xz/number') {
        const already = /本期选择数字|今日已参与|已经参与/.test(text);
        const confirm = Array.from(document.querySelectorAll('a[onclick]')).find(a => (a.getAttribute('onclick') || '') === 'guessNumber()');
        if (DailyProjectState.remaining('number', state) > 0 && confirm && !already) {
          state.pending = 'number';
          DailyProjectState.save('bar', state);
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(confirm);
          return false;
        }
        if (already && DailyProjectState.remaining('number', state) > 0) {
          state.counts.number = projectTarget('number');
          DailyProjectState.save('bar', state);
        }
        return (await go('/xz/bar')) ? false : true;
      }

      if (location.pathname === '/xz/fist') {
        const buttons = Array.from(document.querySelectorAll("a[onclick^='fingerGuessing']"));
        if (DailyProjectState.remaining('fist', state) > 0 && buttons.length > 0) {
          state.pending = 'fist';
          DailyProjectState.save('bar', state);
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(buttons[Math.floor(Math.random() * buttons.length)]);
          return false;
        }
        return (await go('/xz/bar')) ? false : true;
      }

      if (location.pathname === '/xz/cup') {
        // 中奖页的领奖/停止按钮已在完成判断前统一处理；这里仅开始/继续未完成次数。
        const buttons = Array.from(document.querySelectorAll("a[onclick^='cupGuessing']"));
        if (DailyProjectState.remaining('cup', state) > 0 && buttons.length > 0) {
          state.pending = 'cup';
          DailyProjectState.save('bar', state);
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(buttons[Math.floor(Math.random() * buttons.length)]);
          return false;
        }
        return (await go('/xz/bar')) ? false : true;
      }
      return true;
    },
  };

  // 餐厅来访：先领取阿鹿/阿呆到访自己餐厅的金宝箱，再处理当前正在做客的他人餐厅沾光。
  MOD.dailyLuck = {
    match: (p) => p === '/xz/' || p === '/xz/come' || p === '/xz/come_log' || /^\/xz\/restaurant_\d+_1$/.test(p),
    schedule: 'daily-project',
    requiresScheduled: true,

    findHomeVisitLink() {
      return Array.from(document.querySelectorAll('a[href="/xz/come"]')).find(a => {
        const rowText = a.parentElement?.textContent || a.textContent || '';
        return /阿鹿|阿呆/.test(rowText) && /来你家餐厅做客/.test(rowText);
      }) || null;
    },

    findGoldGift() {
      return Array.from(document.querySelectorAll('[onclick]')).find(el =>
        (el.getAttribute('onclick') || '').replace(/\s+/g, '') === 'getComeGift(0,0)' &&
        (el.textContent || '').trim() === '[金宝箱]'
      ) || null;
    },

    visitHourKey() {
      const now = Utils.getServerTime();
      return `${gameDayKey(now)}-${now.getHours()}`;
    },

    async goHomeFromVisit() {
      const home = Array.from(document.querySelectorAll('a[href]')).find(a => {
        const href = a.getAttribute('href') || '';
        const label = (a.textContent || '').trim();
        return href === '/xz/' && (label === '首页' || label === '返回首页');
      });
      if (!home) return this.retryVisitPage('到访页找不到真实首页链接');
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(home);
      return false;
    },

    retryVisitPage(reason) {
      Utils.warn(`每日沾光: ${reason}，3秒后刷新复核`);
      setTimeout(() => location.reload(), 3000);
      return false;
    },

    async run() {
      const state = DailyProjectState.load('luck');
      const text = document.body.textContent || '';
      const restaurantMatch = location.pathname.match(/^\/xz\/restaurant_(\d+)_1$/);

      if (location.pathname === '/xz/') {
        const phase = Utils.gget(PHASE_KEY, null);
        if (phase?.module === 'dailyLuck' && phase.state === 'returning') return true;

        const ownVisit = this.findHomeVisitLink();
        if (ownVisit && !state.selfGiftClaimed && state.selfGiftAttemptHour !== this.visitHourKey()) {
          Utils.log('每日沾光: 首页发现阿鹿/阿呆到访自己餐厅，先检查金宝箱');
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(ownVisit);
          return false;
        }

        const visitLog = Array.from(document.querySelectorAll('a[href="/xz/come_log"]'))[0];
        if (!visitLog) return this.retryVisitPage('首页找不到餐厅来访记录入口');
        Utils.log(ownVisit ? '每日沾光: 今日到访礼物已处理，继续检查他人餐厅' : '每日沾光: 首页当前没有自己被到访提示，继续检查他人餐厅');
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(visitLog);
        return false;
      }

      if (location.pathname === '/xz/come') {
        const goldGift = this.findGoldGift();
        if (state.selfGiftPending) {
          if (/领取成功/.test(text)) {
            state.selfGiftClaimed = true;
            state.selfGiftAttemptHour = this.visitHourKey();
            state.selfGiftPending = null;
            DailyProjectState.save('luck', state);
            Utils.log('每日沾光: 已确认自己餐厅到访金宝箱领取成功');
            return this.goHomeFromVisit();
          }
          if (goldGift) {
            state.selfGiftAttemptHour = this.visitHourKey();
            state.selfGiftPending = null;
            DailyProjectState.save('luck', state);
            Utils.warn('每日沾光: 点击金宝箱后控件仍存在，本次不重复点击');
            return this.goHomeFromVisit();
          }
          state.selfGiftClaimed = true;
          state.selfGiftAttemptHour = this.visitHourKey();
          state.selfGiftPending = null;
          DailyProjectState.save('luck', state);
          Utils.log('每日沾光: 金宝箱控件已消失，按服务器已领取状态继续');
          return this.goHomeFromVisit();
        }

        if (goldGift && !state.selfGiftClaimed && state.selfGiftAttemptHour !== this.visitHourKey()) {
          state.selfGiftPending = { clickedAt: Date.now(), onclick: 'getComeGift(0,0)' };
          state.selfGiftAttemptHour = this.visitHourKey();
          DailyProjectState.save('luck', state);
          Utils.log('每日沾光: 点击自己餐厅到访的真实[金宝箱]');
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(goldGift);
          // getComeGift可能整页跳转，也可能只更新当前页；后者主动刷新以便Scheduler继续验证。
          setTimeout(() => {
            if (location.pathname === '/xz/come') location.reload();
          }, 3000);
          return false;
        }

        if (!goldGift) {
          state.selfGiftClaimed = true;
          state.selfGiftAttemptHour = this.visitHourKey();
          DailyProjectState.save('luck', state);
          Utils.log('每日沾光: 到访页没有可领取金宝箱，按本次已检查处理');
        }
        return this.goHomeFromVisit();
      }

      // 点击沾光会刷新当前餐厅页；先读取明确结果，再决定是否计数。
      if (state.pending) {
        const restaurantId = String(state.pending.restaurantId || '');
        const succeeded = /沾光成功/.test(text);
        if (succeeded) {
          state.counts.luck = Math.min(3, (state.counts.luck || 0) + 1);
          recordScopedProjectSuccess('luck');
          Utils.log(`每日沾光: 餐厅 ${restaurantId} 成功，今日 ${state.counts.luck}/3`);
        } else {
          Utils.warn(`每日沾光: 餐厅 ${restaurantId} 未检测到“沾光成功”，本次不计数且不重复点击`);
        }
        if (restaurantId && !state.tried.includes(restaurantId)) state.tried.push(restaurantId);
        state.verifyFresh = succeeded;
        state.pending = null;
        DailyProjectState.save('luck', state);
      }

      if (location.pathname === '/xz/come_log') {
        // history.back()可能恢复点击前的bfcache页面；成功动作后必须重新向服务器取一次N/3。
        if (state.verifyFresh) {
          state.verifyFresh = false;
          DailyProjectState.save('luck', state);
          Utils.log('每日沾光: 成功后返回页可能来自缓存，刷新一次复核服务器N/3');
          location.reload();
          return false;
        }
        const serverProgress = text.match(/今日已沾光[：:\s]*(\d+)\s*\/\s*3/);
        if (serverProgress) {
          const serverCount = Math.min(3, Number(serverProgress[1]));
          state.counts.luck = serverCount;
          DailyProjectState.save('luck', state);
          if (serverCount >= 3) {
            Utils.gset('luck_verified_day', gameDayKey());
            Utils.log('每日沾光: 来访页已验证“今日已沾光：3 / 3次”，今日任务完成');
            return true;
          }
          Utils.log(`每日沾光: 来访页服务器进度 ${serverCount}/3，继续检查当前来访餐厅`);
        } else {
          Utils.warn('每日沾光: 来访页未读取到“今日已沾光 N / 3次”，不得宣告今日完成');
        }
        // 面板独立运行仍忠实执行用户设置的本次数；这不等于把当天任务误报为3/3。
        if (activeActionScope('dailyLuck') === 'project_luck' && DailyProjectState.remaining('luck', state) <= 0) {
          Utils.log('每日沾光: 单项运行已达到本次设置次数，结束本次操作；全天完成仍以来访页3/3为准');
          return true;
        }

        const candidates = [];
        const seen = new Set();
        for (const link of document.querySelectorAll('a[href^="/xz/restaurant_"]')) {
          const href = link.getAttribute('href') || '';
          const match = href.match(/^\/xz\/restaurant_(\d+)_1$/);
          const rowText = link.parentElement?.textContent || '';
          if (!match || !/正在/.test(rowText) || !/阿鹿|阿呆/.test(rowText)) continue;
          const restaurantId = match[1];
          if (seen.has(restaurantId) || state.tried.includes(restaurantId)) continue;
          seen.add(restaurantId);
          candidates.push({ link, restaurantId });
        }
        if (!candidates.length) {
          Utils.log('每日沾光: 当前来访记录没有尚未尝试的阿鹿/阿呆餐厅，本轮检查结束');
          return true;
        }
        Utils.log(`每日沾光: 进入当前来访餐厅 ${candidates[0].restaurantId}`);
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(candidates[0].link);
        return false;
      }

      if (restaurantMatch) {
        const restaurantId = restaurantMatch[1];
        const button = Array.from(document.querySelectorAll('a[onclick]')).find(a =>
          (a.getAttribute('onclick') || '') === `addLuck("${restaurantId}")` && a.textContent.trim() === '沾光');
        if (button && !state.tried.includes(restaurantId)) {
          state.pending = { restaurantId };
          DailyProjectState.save('luck', state);
          Utils.log(`每日沾光: 点击餐厅 ${restaurantId} 的真实“沾光”按钮`);
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(button);
          return false;
        }
        if (!state.tried.includes(restaurantId)) state.tried.push(restaurantId);
        DailyProjectState.save('luck', state);
        Utils.warn(`每日沾光: 餐厅 ${restaurantId} 没有可用沾光按钮，返回来访记录`);
        const logLink = Array.from(document.querySelectorAll('a[href]')).find(a => (a.getAttribute('href') || '') === '/xz/come_log');
        await Utils.sleep(Utils.randMs(1, 2));
        if (logLink) Utils.click(logLink);
        else window.history.back();
        return false;
      }

      return false;
    },
  };

  MOD.extraWish = {
    match: (p) => p === '/xz/wish',
    schedule: 'daily-project',
    requiresScheduled: true,
    async run() {
      const state = DailyProjectState.load('wish');
      const text = document.body.textContent || '';
      if (state.pending) {
        if (!/许愿失败|许愿果不足|无法许愿/.test(text)) {
          state.counts.extraWish = (state.counts.extraWish || 0) + 1;
          recordScopedProjectSuccess('extraWish');
        }
        state.pending = null;
        DailyProjectState.save('wish', state);
      }
      if (DailyProjectState.remaining('extraWish', state) <= 0) return true;
      const btn = document.querySelector('a[onclick="makeWish(1)"]');
      const stockText = btn?.nextElementSibling?.textContent?.trim() || '';
      const stockMatch = stockText.match(/拥有\s*(\d+)\s*个/);
      const stock = stockMatch ? Number(stockMatch[1]) : null;
      if (!btn || stock === null || stock <= 0) {
        Utils.warn(`额外许愿: 无按钮、库存无法识别或许愿果不足（${stockText || '无库存文本'}）`);
        return true;
      }
      Utils.log(`额外许愿: 当前许愿果 ${stock} 个，执行本次下一次`);
      state.pending = true;
      DailyProjectState.save('wish', state);
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(btn);
      return false;
    },
  };

  // 常驻今日活跃：只领取，不在此页做任务。
  MOD.vitality = {
    match: (p) => p === '/xz/restaurant_vitality',
    schedule: 'reward-twice',
    async run() {
      syncDailyProgressFromVitality();

      const phase = Utils.gget(PHASE_KEY, null);
      if (phase?.id === 'vitalityProbe') {
        Utils.log('今日活跃: 已同步真实项目进度（早饭前检查，不领奖）');
        return true;
      }
      const claim = Array.from(document.querySelectorAll("a[onclick^='addVitalityAward']"))[0];
      if (!claim) {
        Utils.log('今日活跃: 无可领取');
        return true;
      }
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(claim);
      Utils.log('今日活跃: 领取第一项，刷新后继续');
      return false;
    },
  };

  // 补跑前只读校准服务器次数，不领取活跃奖励；与奖励模块共用页面但由phase严格隔离。
  MOD.dailyProgress = {
    match: (p) => p === '/xz/restaurant_vitality',
    schedule: 'daily-project',
    requiresScheduled: true,
    async run() {
      syncDailyProgressFromVitality();
      Utils.log('每日进度校准: 只读检查完成，不领取奖励');
      return true;
    },
  };

  // ----- 13. 季节签到活动 -----
  MOD.season = {
    match: (p) => p === '/xz/activity_season',
    schedule: 'daily',
    async run() {
      // 所有 getSeasonAward(N) 链接 + 文本"领取"
      const claimBtns = Array.from(document.querySelectorAll('a')).filter(a => {
        const oc = a.getAttribute('onclick') || '';
        return oc.includes('getSeasonAward') || a.textContent.trim() === '领取';
      });
      // 排除"未达成"的
      const usable = claimBtns.filter(a => {
        const row = a.closest('p') || a.parentElement;
        return row && !row.textContent.includes('未达成');
      });
      if (usable.length === 0) {
        Utils.log('季节签到: 无可领取');
        return true;
      }
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(usable[0]);
      Utils.log(`季节签到: 领取本页第一项（共 ${usable.length} 项），刷新后继续`);
      return false;
    },
  };

  // ----- 14. 扭蛋（每日任务 + 累积奖励 + 实际扭）-----
  MOD.egg = {
    match: (p) => p === '/xz/activity_egg',
    schedule: 'daily',
    async run() {
      // 14.1 任务领奖: getEggTicket(0) — 在任务行末尾 "领取[扭蛋券]×1"
      const ticketBtns = Array.from(document.querySelectorAll("a[onclick^='getEggTicket']"));
      // 排除已领取（已领取的任务行不会显示领取链接），未达成的也不会显示
      if (ticketBtns.length > 0) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(ticketBtns[0]);
        Utils.log(`扭蛋: 领取本页第一张任务券（共 ${ticketBtns.length} 张）`);
        return false;
      }

      // 14.2 累积奖励: 只点“累积N次”行内文字为“领取”的真实getEggAward(N)链接。
      // 历史页面曾把相同函数用于装饰元素，因此同时约束文本、父行和onclick格式。
      const cumulativeBtns = Array.from(document.querySelectorAll("a[onclick^='getEggAward']")).filter(a => {
        const onclick = (a.getAttribute('onclick') || '').trim();
        const rowText = a.closest('p')?.textContent || '';
        return a.textContent.trim() === '领取'
          && /累积\s*\d+\s*次/.test(rowText)
          && /^getEggAward\(\d+\);?$/.test(onclick);
      });
      if (cumulativeBtns.length > 0) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(cumulativeBtns[0]);
        Utils.log(`扭蛋: 领取本页第一项累积奖励（共 ${cumulativeBtns.length} 项）`);
        return false;
      }

      // 14.3 实际扭蛋: getEgg() 文本"扭蛋"
      const spinBtn = Array.from(document.querySelectorAll('a')).find(a =>
        (a.getAttribute('onclick') || '') === 'getEgg()'
      );
      // 检查是否有扭蛋券（页面 body 含 "当前拥有[扭蛋券]：N"）
      const ticketMatch = document.body.textContent.match(/当前拥有\[扭蛋券\]：\s*(\d+)/);
      const tickets = ticketMatch ? +ticketMatch[1] : 0;
      if (spinBtn && tickets > 0) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(spinBtn);
        Utils.log(`扭蛋: 已扭 (${tickets} 张券)`);
        return false;
      } else {
        Utils.log(`扭蛋: 券不足或无按钮 (${tickets} 张)`);
        return true;
      }
    },
  };

  // ----- 成就领取（每日 09:10 + 0-40min）-----
  // 页面有三级导航：一级分组、二级分类、领取状态。星号只负责提示范围，
  // 实际领取必须同时满足“红色卡片 + 真实领取链接”，绝不构造领奖调用。
  MOD.achievement = {
    match: (p) => p === '/xz/achievement' || /^\/xz\/achievement_\d+_2$/.test(p),
    schedule: 'daily',
    requiresScheduled: true,
    STATE_KEY: 'achievement_claim_state',
    MAX_CLAIMS: 100,
    MAX_RUN_MS: 15 * 60000,
    maxPhaseAgeMs: 15 * 60000,

    contextToken() {
      const phase = Utils.gget('sched_phase', null);
      if (phase?.module === 'achievement' && ['navigating', 'running'].includes(phase.state)) {
        return `scheduler:${phase.startedAt || phase.firedAt || 0}`;
      }
      const autopilot = Utils.gget('autopilot_state', null);
      if (autopilot?.enabled) return `autopilot:${autopilot.startedAt || 0}`;
      return null;
    },

    loadState() {
      const token = this.contextToken();
      if (!token) return null;
      let state = Utils.gget(this.STATE_KEY, null);
      if (!state || state.token !== token || !state.startedAt) {
        state = {
          token,
          startedAt: Date.now(),
          claims: 0,
          clicks: 0,
          blocked: [],
          pending: null,
          rootFallbackUsed: false,
        };
        Utils.gset(this.STATE_KEY, state);
        Utils.log('成就: 开始新一轮真实页面扫描');
      }
      return state;
    },

    saveState(state) {
      Utils.gset(this.STATE_KEY, state);
    },

    finish(state, message, color = '#4CAF50') {
      Utils.gset(this.STATE_KEY, null);
      Utils.log(`成就: ${message}（本轮确认领取 ${state?.claims || 0} 项）`);
      Utils.showStatus('成就', message, color);
      return true;
    },

    claimLinks() {
      return Array.from(document.querySelectorAll('div.gen_background_red a[onclick]')).filter(a => {
        const onclick = (a.getAttribute('onclick') || '').replace(/\s+/g, '');
        return a.textContent.trim() === '领取' && /^getAchievement\(\d+,\d+,2\);?$/.test(onclick);
      });
    },

    signature(link) {
      return (link?.getAttribute('onclick') || '').replace(/\s+/g, '').replace(/;$/, '');
    },

    navRows() {
      return Array.from(document.querySelectorAll('p')).filter(p =>
        p.querySelector('a[href^="/xz/achievement_"]')
      );
    },

    topRow() {
      const rows = this.navRows();
      if (location.pathname === '/xz/achievement') {
        return rows.find(row => Array.from(row.querySelectorAll('a')).some(a =>
          /^\/xz\/achievement_\d+_2$/.test(a.getAttribute('href') || '') && a.textContent.trim().endsWith('*')
        )) || null;
      }
      return rows.find(row => row.querySelector('a[href="/xz/achievement_100_0"]')) || null;
    },

    starredLink(row) {
      if (!row) return null;
      return Array.from(row.querySelectorAll('a')).find(a =>
        /^\/xz\/achievement_\d+_2$/.test(a.getAttribute('href') || '') &&
        a.textContent.trim().endsWith('*')
      ) || null;
    },

    secondaryStarLink() {
      if (location.pathname === '/xz/achievement') return null;
      const top = this.topRow();
      return this.navRows()
        .filter(row => row !== top)
        .map(row => this.starredLink(row))
        .find(Boolean) || null;
    },

    topStarLink() {
      return this.starredLink(this.topRow());
    },

    hasStarMarker() {
      return this.navRows().some(row => /\*/.test(row.textContent || ''));
    },

    rootLink() {
      return Array.from(document.querySelectorAll('a[href="/xz/achievement"]')).find(a =>
        a.textContent.trim() === '成就'
      ) || document.querySelector('a[href="/xz/achievement"]');
    },

    async clickNavigation(link, label) {
      await Utils.sleep(Utils.randMs(1, 2));
      if (!Utils.click(link)) return false;
      Utils.log(`成就: ${label} → ${link.getAttribute('href')}`);
      return true;
    },

    async run() {
      const state = this.loadState();
      if (!state) {
        Utils.log('成就: 非调度/自动驾驶阶段，不接管手动浏览');
        return true;
      }
      if (Date.now() - state.startedAt >= this.MAX_RUN_MS) {
        return this.finish(state, '超过15分钟保护上限，本轮安全结束', '#f44');
      }

      const allClaims = this.claimLinks();
      if (state.pending) {
        const stillPresent = allClaims.some(link => this.signature(link) === state.pending.signature);
        if (stillPresent && Date.now() - state.pending.clickedAt < 5000) {
          Utils.log('成就: 上次领取点击仍在等待页面响应');
          return false;
        }
        if (stillPresent) {
          if (!state.blocked.includes(state.pending.signature)) state.blocked.push(state.pending.signature);
          Utils.warn(`成就: ${state.pending.signature} 点击后仍存在，本轮不再重试该成就`);
        } else {
          state.claims += 1;
          Utils.log(`成就: 已确认第 ${state.claims} 项领取成功`);
        }
        state.pending = null;
        this.saveState(state);
      }

      if (state.clicks >= this.MAX_CLAIMS) {
        return this.finish(state, '达到100次点击保护上限，本轮安全结束', '#f44');
      }

      const claim = this.claimLinks().find(link => !state.blocked.includes(this.signature(link)));
      if (claim) {
        const signature = this.signature(claim);
        state.clicks += 1;
        state.pending = { signature, clickedAt: Date.now(), path: location.pathname };
        this.saveState(state); // 点击前记账，刷新或失败都不会无保护重试。
        await Utils.sleep(Utils.randMs(1, 2));
        if (!Utils.click(claim)) {
          state.pending = null;
          if (!state.blocked.includes(signature)) state.blocked.push(signature);
          this.saveState(state);
          return this.finish(state, '真实领取按钮点击失败，本轮安全结束', '#f44');
        }
        Utils.log(`成就: 点击红色卡片中的真实领取按钮 ${signature}`);
        Utils.showStatus('成就', `正在领取第 ${state.claims + 1} 项…`, '#FF9800');
        return false;
      }

      // 页面仍有领取按钮但都曾失败：不能误判为空，更不能反复点击。
      if (this.claimLinks().length > 0) {
        return this.finish(state, '存在领取后未消失的成就，已防重复并安全结束', '#f44');
      }

      // 当前页清空后，先走同一一级分组中的二级星号，再走其它一级星号。
      const secondary = this.secondaryStarLink();
      if (secondary) {
        await this.clickNavigation(secondary, '进入下一个二级星号页');
        return false;
      }
      const top = this.topStarLink();
      if (top) {
        await this.clickNavigation(top, '进入下一个一级星号页');
        return false;
      }

      // 若页面还显示星号却没有可跟随的星号链接，只用真实“成就”链接回总览复核一次。
      if (this.hasStarMarker() && location.pathname !== '/xz/achievement' && !state.rootFallbackUsed) {
        const root = this.rootLink();
        state.rootFallbackUsed = true;
        this.saveState(state);
        if (root) {
          await this.clickNavigation(root, '页面结构异常，回成就总览复核一次');
          return false;
        }
        return this.finish(state, '页面仍有星号但缺少成就总览链接，本轮安全结束', '#f44');
      }

      return this.finish(state, '全部星号页已检查完成');
    },
  };

  // ==================== 任务穷举表 ====================
  // 把所有日常任务穷举出来，调度器只做"算下一个最近 → 触发 → 算下一个"
  //
  // DAILY_SCHEDULE：每天固定时刻触发。runOnce=true 表示每天只跑一次（已跑过跳到明天）
  // DYNAMIC_SCHEDULE：跑完后由模块本身计算下次时间
  //
  // 字段说明：
  //   id: 唯一标识（用于 GM 持久化）
  //   module: 对应 MOD 模块 ID
  //   target: 目标路径（用于 onPageLoad 验证）
  //   nav: 主页导航链接文本片段（用于找链接）
  //   slot: "HH:MM" 格式（24h 表示从 lastRun 起算 24h）
  //   jitterMin/jitterMax: 分钟偏移，可负
  //   runOnce: true=今天已跑过就跳过到明天
  //   runMs: 模块运行预计耗时（超时保护，到点强制回主页）

  const DAILY_SCHEDULE = [
    // 每日 7:30 ± 15min 一次性（runOnce）
    { id: 'signIn',  module: 'signIn',  target: '/xz/sign_in',         nav: '签到',             slot: '7:30',  jitterMin: 0,   jitterMax: 15, runOnce: true, runMs: 5000 },
    { id: 'wish',    module: 'wish',    target: '/xz/wish',            nav: '许愿',             slot: '7:30',  jitterMin: 0,   jitterMax: 15, runOnce: true, runMs: 15000 },
    { id: 'box',     module: 'box',     target: '/xz/box',             nav: '酒吧', route: [{ text: '酒吧', href: '/xz/bar' }, { text: '开宝箱', href: '/xz/box' }], slot: '7:30', jitterMin: 0, jitterMax: 15, runOnce: true, runMs: 8000 },
    { id: 'foodCoupon', module: 'foodCoupon', target: '/xz/warehouse', nav: '仓库', slot: '7:30', jitterMin: 0, jitterMax: 15, runOnce: true, runMs: 30000 },
    { id: 'bag',     module: 'bag',     target: '/xz/warehouse_2_0',   nav: '仓库', route: [{ text: '仓库', href: '/xz/warehouse' }, { text: '礼包', href: '/xz/warehouse_2_0' }], slot: '7:30', jitterMin: 0, jitterMax: 15, runOnce: true, runMs: 8000 },

    // 分时每日项目。好友改为午饭后链式执行；酒吧单独放到10:05；搬家不纳入。
    { id: 'vitalityProbe', module: 'vitality', target: '/xz/restaurant_vitality', nav: '今日活跃', slot: '7:40', jitterMin: 0, jitterMax: 0, runOnce: true, runMs: 5000 },
    { id: 'dailyProgressAudit1', module: 'dailyProgress', target: '/xz/restaurant_vitality', nav: '今日活跃', slot: '14:00', jitterMin: 0, jitterMax: 3, runOnce: true, runMs: 5000 },
    { id: 'dailyProgressAudit2', module: 'dailyProgress', target: '/xz/restaurant_vitality', nav: '今日活跃', slot: '18:00', jitterMin: 0, jitterMax: 3, runOnce: true, runMs: 5000 },
    { id: 'dailyProgressAudit3', module: 'dailyProgress', target: '/xz/restaurant_vitality', nav: '今日活跃', slot: '22:00', jitterMin: 0, jitterMax: 3, runOnce: true, runMs: 5000 },
    { id: 'dailyNpc', module: 'dailyNpc', target: '/xz/god', nav: '食神', route: [{ text: '食神', href: '/xz/god' }], slot: '7:50', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 45000 },
    { id: 'dailyBar', module: 'dailyBar', target: '/xz/bar', nav: '广场', route: [{ text: '广场', href: '/xz/square' }, { text: '酒吧', href: '/xz/bar' }], slot: '10:05', jitterMin: 0, jitterMax: 3, runOnce: true, runMs: 180000, condition: () => hasDailyProjectRemaining(['number', 'fist', 'cup']) },
    // 高次数无体力项目分散补跑：避开整点菜场与每小时31分沾光，完成后当天剩余轮次自动消失。
    { id: 'dailyBarCatchup1', module: 'dailyBar', target: '/xz/bar', nav: '广场', route: [{ text: '广场', href: '/xz/square' }, { text: '酒吧', href: '/xz/bar' }], slot: '14:12', jitterMin: 0, jitterMax: 8, runOnce: true, runMs: 180000, projectScope: ['fist', 'cup'], condition: () => hasDailyProjectRemaining(['fist', 'cup']) },
    { id: 'dailyBarCatchup2', module: 'dailyBar', target: '/xz/bar', nav: '广场', route: [{ text: '广场', href: '/xz/square' }, { text: '酒吧', href: '/xz/bar' }], slot: '18:12', jitterMin: 0, jitterMax: 8, runOnce: true, runMs: 180000, projectScope: ['fist', 'cup'], condition: () => hasDailyProjectRemaining(['fist', 'cup']) },
    { id: 'dailyBarCatchup3', module: 'dailyBar', target: '/xz/bar', nav: '广场', route: [{ text: '广场', href: '/xz/square' }, { text: '酒吧', href: '/xz/bar' }], slot: '22:12', jitterMin: 0, jitterMax: 8, runOnce: true, runMs: 180000, projectScope: ['fist', 'cup'], condition: () => hasDailyProjectRemaining(['fist', 'cup']) },
    { id: 'dailyFriendCatchup1', module: 'dailyFriend', target: '/xz/friend', nav: '好友', route: [{ text: '好友', href: '/xz/friend' }], slot: '16:12', jitterMin: 0, jitterMax: 8, runOnce: true, runMs: 300000, projectScope: ['like', 'dig', 'roach'], condition: () => hasDailyProjectRemaining(['like', 'dig', 'roach']) },
    { id: 'dailyFriendCatchup2', module: 'dailyFriend', target: '/xz/friend', nav: '好友', route: [{ text: '好友', href: '/xz/friend' }], slot: '20:12', jitterMin: 0, jitterMax: 8, runOnce: true, runMs: 300000, projectScope: ['like', 'dig', 'roach'], condition: () => hasDailyProjectRemaining(['like', 'dig', 'roach']) },
    { id: 'dailyFriendCatchup3', module: 'dailyFriend', target: '/xz/friend', nav: '好友', route: [{ text: '好友', href: '/xz/friend' }], slot: '23:12', jitterMin: 0, jitterMax: 8, runOnce: true, runMs: 300000, projectScope: ['like', 'dig', 'roach'], condition: () => hasDailyProjectRemaining(['like', 'dig', 'roach']) },
    { id: 'extraWish', module: 'extraWish', target: '/xz/wish', nav: '许愿', slot: '7:50', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 60000 },

    // 早饭项目完成后领奖；晚饭后只复查领奖。临时活动入口消失时 optional 跳过。
    { id: 'vitalityMorning', module: 'vitality', target: '/xz/restaurant_vitality', nav: '今日活跃', slot: '8:30', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 10000 },
    { id: 'seasonMorning', module: 'season', target: '/xz/activity_season', nav: '>>夏日签到活动<<', slot: '8:30', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 10000, optional: true },
    { id: 'eggMorning', module: 'egg', target: '/xz/activity_egg', nav: '>>小镇扭蛋活动<<', slot: '8:30', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 30000, optional: true },
    { id: 'vitalityEvening', module: 'vitality', target: '/xz/restaurant_vitality', nav: '今日活跃', slot: '18:30', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 10000 },
    { id: 'seasonEvening', module: 'season', target: '/xz/activity_season', nav: '>>夏日签到活动<<', slot: '18:30', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 10000, optional: true },
    { id: 'eggEvening', module: 'egg', target: '/xz/activity_egg', nav: '>>小镇扭蛋活动<<', slot: '18:30', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 30000, optional: true },

    // 每日固定任务：随机延迟只在当天固定基准后增加，错过则当天补跑。
    { id: 'guardian', module: 'guardian', target: '/xz/guardian', nav: '神殿', route: [{ text: '神殿', href: '/xz/temple' }, { text: '挑战守护者', href: '/xz/guardian' }], slot: '6:05', jitterMin: 0, jitterMax: 10, runOnce: true, runMs: 10000 },
    { id: 'recipe', module: 'recipe', target: '/xz/cookbook', nav: '食谱', route: [{ text: '食谱', href: '/xz/cookbook' }, { text: '可升级', hrefPattern: '^/xz/cookbook_\\d+_3_1$' }], slot: '8:10', jitterMin: 0, jitterMax: 10, runOnce: true, runMs: 30000 },
    { id: 'achievement', module: 'achievement', target: '/xz/achievement', nav: '成就', route: [{ text: '成就', href: '/xz/achievement' }], slot: '9:10', jitterMin: 0, jitterMax: 40, runOnce: true, runMs: 15000 },
  ];

  // 任务频次参考表（已迁移到 DYNAMIC_SCHEDULE，此处仅注释保留）
  // 吃饭 3 期：7-10 (energy-1 slot=8:30 ±90min), 12-15 (energy-2 slot=13:30 ±90min), 18-21 (energy-3 slot=19:30 ±90min)
  // market 整点：6, 7, 8, ..., 23（共 18 次，每次 +30-300s jitter）

  // DYNAMIC_SCHEDULE：跑完后由模块本身计算下次时间（computeNext）
  // 适用于：多频任务（每天多次触发，每次需重新计算 next）；状态依赖型（任务跑完状态变化，下次时间不能从固定表推出）
  // 字段：
  //   id: 唯一标识（用于 GM 持久化 sched_<id>_nextAt / sched_<id>_lastRun）
  //   module: 对应 MOD 模块 ID
  //   target/nav: 主页导航用
  //   runMs: 超时保护
  //   computeNext(): 必填，返回下次触发的 ms 时间戳

  const DYNAMIC_SCHEDULE = [
    // 餐厅来访：10:31-21:31逐小时从首页开始，先检查自己被到访金宝箱，再检查他人餐厅沾光。
    {
      id: 'dailyLuckHourly', module: 'dailyLuck', target: '/xz/', nav: '刷新', route: [{ text: '刷新', href: '/xz/' }], runMs: 60000,
      computeNext() {
        const now = Utils.getServerTime();
        const nowMs = now.getTime();
        const todayKey = gameDayKey(now);
        const nextDayStart = () => {
          const next = new Date(now);
          next.setDate(next.getDate() + 1);
          next.setHours(10, 31, 0, 0);
          return next.getTime();
        };
        const luckState = Utils.gget('project_state_luck', null);
        const ownGiftDone = luckState?.day === todayKey && !!luckState.selfGiftClaimed;
        if (Utils.gget('luck_verified_day', '') === todayKey && ownGiftDone) return nextDayStart();

        const hour = now.getHours();
        const minute = now.getMinutes();
        if (hour < 10 || (hour === 10 && minute < 31)) {
          const first = new Date(now);
          first.setHours(10, 31, 0, 0);
          return first.getTime();
        }
        if (hour > 21) return nextDayStart();

        const lastRun = Utils.gget('sched_dailyLuckHourly_lastRun', 0);
        const last = lastRun ? new Date(lastRun) : null;
        const ranThisHour = !!last &&
          last.getFullYear() === now.getFullYear() &&
          last.getMonth() === now.getMonth() &&
          last.getDate() === now.getDate() &&
          last.getHours() === hour;
        if (!ranThisHour) {
          const currentSlot = new Date(now);
          currentSlot.setMinutes(31, 0, 0);
          return currentSlot.getTime() > nowMs ? currentSlot.getTime() : nowMs + 5000;
        }
        if (hour >= 21) return nextDayStart();
        const nextHour = new Date(now);
        nextHour.setHours(hour + 1, 31, 0, 0);
        return nextHour.getTime();
      },
    },

    // 吃饭：3 期窗口（早 7-10、午 12-15、晚 18-21），每个窗口触发 1 次
    // sched_energy_lastWindow: 0=早餐已跑 / 1=午餐已跑 / 2=晚餐已跑 / null=今天未开始
    // sched_energy_lastResetDay: 上次重置的日期（YYYY-MM-DD），跨日时重置 lw
    // 关键：
    //   - computeNext 不修改 lw（只算下次时间）
    //   - onReturnFromTarget 在 fire 完成后写 lw（避免 LW 提前 set 导致同日永远不会重入窗口）
    {
      id: 'energy', module: 'energy', target: '/xz/activity_energy', nav: '吃饭活动', runMs: 8000,
      computeNext() {
        const now = Utils.getServerTime();
        const nowMs = now.getTime();
        const today = now.toDateString();
        const lastResetDay = Utils.gget('sched_energy_lastResetDay', null);
        if (lastResetDay !== today) {
          // 跨日 / 首次运行 → 重置 lw
          Utils.gset('sched_energy_lastWindow', null);
          Utils.gset('sched_energy_lastResetDay', today);
        }
        const windows = [[7, 10], [12, 15], [18, 21]];
        const lastWin = Utils.gget('sched_energy_lastWindow', null);
        for (let i = 0; i < windows.length; i++) {
          // 已跑过的窗口 / 已过去的窗口（lastWin >= i 表示已 mark，包括自动延续）
          if (lastWin !== null && lastWin >= i) continue;
          const [startH, endH] = windows[i];
          const startMs = new Date(now).setHours(startH, 0, 0, 0);
          const endMs = new Date(now).setHours(endH, 0, 0, 0);
          if (nowMs < startMs) {
            // 未到窗口：在 [startH, endH) 内随机抖动
            const jitterMs = Math.floor(Math.random() * (endH - startH) * 3600000);
            return startMs + jitterMs;
          }
          if (nowMs < endMs) {
            // 在窗口中：立即触发（5s 让阶段动作走完）
            return nowMs + 5000;
          }
          // 已过当前窗口但 lw 未 mark → mark（避免每次重算又回到这里）
          Utils.gset('sched_energy_lastWindow', i);
        }
        // 三窗口都过 → 明天 7:00 + 0-3h 随机
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(7, 0, 0, 0);
        return tomorrow.getTime() + Math.floor(Math.random() * 3 * 3600000);
      },
    },

    // 好友每日项目：只跟随午饭窗口完成；完成后再进入食材合成。
    {
      id: 'dailyFriendAfterLunch', module: 'dailyFriend', target: '/xz/friend', nav: '好友', route: [{ text: '好友', href: '/xz/friend' }], runMs: 180000, chainedOnly: true,
      condition: () => hasDailyProjectRemaining(['like', 'dig', 'roach']),
      computeNext() {
        const nowMs = Utils.getServerTime().getTime();
        const lunchLast = Utils.gget('sched_energy_lunch_lastRun', 0);
        const friendLast = Utils.gget('sched_dailyFriendAfterLunch_lastRun', 0);
        return lunchLast > friendLast ? Math.max(lunchLast, nowMs) : 0;
      },
    },

    // 饭后食材合成：只跟随最近一次吃饭完成，不生成独立周期。
    {
      id: 'foodCompoundAfterEnergy', module: 'foodCompound', target: '/xz/cupboard', nav: '橱柜', route: [{ text: '橱柜', href: '/xz/cupboard' }], runMs: 12000, chainedOnly: true,
      computeNext() {
        const nowMs = Utils.getServerTime().getTime();
        const energyLast = Utils.gget('sched_energy_lastRun', 0);
        const compoundLast = Utils.gget('sched_foodCompoundAfterEnergy_lastRun', 0);
        return energyLast > compoundLast ? Math.max(energyLast, nowMs) : 0;
      },
    },

    // 市场：6-23 整点 + 30-300s jitter（秒级抖动防踩踏）
    {
      id: 'market', module: 'market', target: '/xz/market', nav: '菜场', runMs: 12000,
      computeNext() {
        const now = Utils.getServerTime();
        const nowMs = now.getTime();
        const hour = now.getHours();
        const lastRun = Utils.gget('sched_market_lastRun', 0);
        const last = lastRun ? new Date(lastRun) : null;
        const ranThisHour = !!last &&
          last.getFullYear() === now.getFullYear() &&
          last.getMonth() === now.getMonth() &&
          last.getDate() === now.getDate() &&
          last.getHours() === hour;
        const withJitter = (date) => {
          date.setMinutes(0, 0, 0);
          date.setSeconds(30 + Math.floor(Math.random() * 270));
          return date;
        };

        // 凌晨：排当天 6 点，不能多加一天
        if (hour < 6) {
          const todaySix = new Date(now);
          todaySix.setHours(6, 0, 0, 0);
          return withJitter(todaySix).getTime();
        }

        // 6-23 点当前小时尚未完成：保留本小时，错过抖动点则 5 秒后补跑
        if (hour <= 23 && !ranThisHour) {
          const currentSlot = withJitter(new Date(now));
          return currentSlot.getTime() > nowMs ? currentSlot.getTime() : nowMs + 5000;
        }

        // 23 点已完成 → 次日 6 点；其余时段 → 下一整点
        if (hour >= 23) {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(6, 0, 0, 0);
          return withJitter(tomorrow).getTime();
        }
        const nextHour = new Date(now);
        nextHour.setHours(hour + 1, 0, 0, 0);
        return withJitter(nextHour).getTime();
      },
    },

    // 食材预定：按页面最早到货倒计时 + 1至5分钟复查；首次/过期时立即检查。
    {
      id: 'marketReserve', module: 'marketReserve', target: '/xz/market', nav: '菜场', route: [{ text: '菜场', href: '/xz/market' }], runMs: 300000,
      computeNext() {
        const nowMs = Utils.getServerTime().getTime();
        const stored = Number(Utils.gget('food_reserve_next_at', 0) || 0);
        return stored > nowMs ? stored : nowMs + 5000;
      },
    },

    // 餐厅：17-45min 随机循环（页面状态随机：蟑螂可能随时出，翻柜随机）
    {
      id: 'restaurant', module: 'restaurant', target: '/xz/restaurant', nav: '餐厅', route: [{ href: '/xz/restaurant' }], runMs: 30000,
      computeNext() {
        return Utils.getServerTime().getTime() + Utils.randMs(17 * 60, 45 * 60);  // 1020-2700s
      },
    },

    // 系统邮箱：餐厅收尾回首页后立即检查；平时跟随下一次餐厅，不独立抢跑。
    {
      id: 'mailboxAfterRestaurant', module: 'mailbox', target: '/xz/mailbox', nav: '邮箱', route: [{ text: '邮箱', href: '/xz/mailbox' }], runMs: 30000, chainedOnly: true,
      computeNext() {
        const nowMs = Utils.getServerTime().getTime();
        const restaurantLast = Utils.gget('sched_restaurant_lastRun', 0);
        const mailboxLast = Utils.gget('sched_mailboxAfterRestaurant_lastRun', 0);
        // 仅补偿“餐厅已完成但邮箱尚未完成”的中断现场；没有餐厅新完成就不生成计划。
        return restaurantLast > mailboxLast ? Math.max(restaurantLast, nowMs) : 0;
      },
    },

    // 设施：固定每 12 小时一轮；一轮包含安装/续期和三个商店库存检查。
    {
      id: 'facility', module: 'facility', target: '/xz/restaurant_facility', nav: '设施', runMs: 180000,
      computeNext() {
        const nowMs = Utils.getServerTime().getTime();
        const lastRun = Utils.gget('sched_facility_lastRun', 0);
        return lastRun > 0 ? Math.max(nowMs, lastRun + 12 * 3600000) : nowMs + 5000;
      },
    },
  ];

  const ALL_ENTRIES = () => [...DAILY_SCHEDULE, ...DYNAMIC_SCHEDULE];
  const entryConditionMet = (entry) => !entry?.condition || !!entry.condition();
  const entryIsEnabled = (entry) => !!entry && isEnabled(entry.module) && entryConditionMet(entry);

  // ==================== 调度器（穷举表 + 单一 tick） ====================
  // 核心循环：
  //   1. onPageLoad() 检查 PHASE_KEY 决定动作
  //   2. 主页无 phase → computeAll() 算所有 nextRunAt → scheduleNext() setTimeout
  //   3. 主页有 phase=returning → onReturnFromTarget() 标记完成 + 算下次 + tick
  //   4. 目标页 phase=running → 等模块完成 → 写 phase=returning → navigateHome
  //   5. 主页回到 step 2

  const PHASE_KEY = 'sched_phase';

  const Scheduler = {
    enabledKey: 'sched_enabled',
    timer: null,
    watchdogTimer: null,
    watchdogBusy: false,
    watchdogListenersBound: false,

    isOn() { return !!Utils.gget(this.enabledKey, false); },

    // 跨刷新 phase 必须有总寿命上限，不能仅靠每次页面内的 runMs 等待窗口。
    // 返回 true 表示已经接管本页，Router 不应再运行原模块。
    async recoverExpiredPhase(currentPath) {
      const phase = Utils.gget(PHASE_KEY, null);
      if (!phase || !['navigating', 'running'].includes(phase.state) || !phase.startedAt) return false;
      const moduleMaxAgeMs = phase.module ? MOD[phase.module]?.maxPhaseAgeMs : 0;
      const maxAgeMs = Math.max(60000, moduleMaxAgeMs || (phase.runMs || 10000) + 30000);
      if (Date.now() - phase.startedAt <= maxAgeMs) return false;

      Utils.warn(`调度器: ${phase.id}/${phase.state} 已超过 ${Math.round(maxAgeMs / 1000)} 秒，终止旧阶段并返回首页`);
      if (phase.module === 'guardian') {
        const retryAt = Utils.getServerTime().getTime() + 5 * 60000;
        Utils.gset(`sched_${phase.id}_nextAt`, retryAt);
        Utils.gset(PHASE_KEY, null);
        Utils.warn('守护者: 整轮超时只安排5分钟后重试，不写入今日完成');
        if (currentPath === '/xz/') {
          this.computeAll();
          this.scheduleNext();
        } else {
          await this.navigateHome();
        }
        return true;
      }
      if (phase.module === 'restaurant') {
        Utils.gset('restaurant_roach_cycle_blocked', true);
        Utils.gset('restaurant_roach_attempts', 0);
        Utils.gset('restaurant_remaining_floors', []);
        Utils.warn('餐厅: 超时自救只停止本轮打蟑螂；永久开关与添油开关保持不变');
      }
      const returning = { state: 'returning', id: phase.id, module: phase.module };
      Utils.gset(PHASE_KEY, returning);
      if (currentPath === '/xz/') this.onReturnFromTarget(returning);
      else await this.navigateHome();
      return true;
    },

    start() {
      // 互斥：若 AutoPilot 在跑，先停它
      if (typeof AutoPilot !== 'undefined' && AutoPilot.isOn()) {
        AutoPilot.stop('调度器启动', { resumeScheduler: false });
      }
      Utils.gset('operation_stopped', false);
      Utils.gset('autopilot_emergency_stop', false);
      Utils.gset(this.enabledKey, true);
      Utils.gset(PHASE_KEY, null);  // 清旧状态
      this.startWatchdog();
      Utils.log('⏰ 调度器: 启动');
      Utils.showStatus('调度器', '启动中…', '#FF9800');
      // 启动调度器不打断手动浏览；真正到点时才从当前页返回首页执行。
      this.computeAll();
      this.scheduleNext();
    },

    stop(reason = '') {
      Utils.gset(this.enabledKey, false);
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      if (this.watchdogTimer) { clearInterval(this.watchdogTimer); this.watchdogTimer = null; }
      // 不清 PHASE_KEY：让正在跑的任务能优雅结束
      Utils.log(`⏰ 调度器: 停止${reason ? ' - ' + reason : ''}`);
      Utils.showStatus('调度器', '已停止', '#f44');
    },

    startWatchdog() {
      if (this.watchdogTimer) clearInterval(this.watchdogTimer);
      this.watchdogTimer = setInterval(() => this.watchdogTick('60秒巡检'), 60000);
      if (!this.watchdogListenersBound) {
        this.watchdogListenersBound = true;
        window.addEventListener('focus', () => this.watchdogTick('窗口恢复'));
        window.addEventListener('pageshow', () => this.watchdogTick('页面恢复'));
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') this.watchdogTick('标签页恢复');
        });
      }
    },

    async watchdogTick(source = '巡检') {
      if (!this.isOn() || this.watchdogBusy || AutoPilot.isOn()) return;
      this.watchdogBusy = true;
      try {
        const path = location.pathname;
        const phase = Utils.gget(PHASE_KEY, null);
        if (phase) {
          Utils.log(`调度看门狗(${source}): 恢复 ${phase.id}/${phase.state} @ ${path}`);
          if (phase.state === 'returning' && path !== '/xz/') {
            await this.navigateHome();
          } else {
            // Router会先重跑当前phase对应模块，再由onPageLoad完成running/returning收尾。
            await Router.run();
          }
          return;
        }

        this.computeAll();
        const nowMs = Utils.getServerTime().getTime();
        const due = ALL_ENTRIES()
          .filter(entry => entry.nextRunAt && entry.nextRunAt <= nowMs && entryIsEnabled(entry))
          .sort((a, b) => a.nextRunAt - b.nextRunAt)[0];
        if (path !== '/xz/') {
          if (due) {
            if (this.timer) { clearTimeout(this.timer); this.timer = null; }
            Utils.log(`调度看门狗(${source}): ${due.id} 已到点，从 ${path} 返回首页执行`);
            await this.navigateHome();
          } else {
            Utils.log(`调度看门狗(${source}): 手动浏览 ${path}，无到点任务，不打断`);
            this.scheduleNext();
          }
          return;
        }
        if (due && !Utils.gget(PHASE_KEY, null)) {
          if (this.timer) { clearTimeout(this.timer); this.timer = null; }
          Utils.log(`调度看门狗(${source}): 立即触发过期任务 ${due.id}`);
          await this.fireToTarget(due);
        } else {
          this.scheduleNext();
        }
      } catch (error) {
        Utils.warn(`调度看门狗异常: ${error.message}`);
      } finally {
        this.watchdogBusy = false;
      }
    },

    // 每页加载都调一次
    async onPageLoad(currentPath) {
      if (!this.isOn()) return;
      let phase = Utils.gget(PHASE_KEY, null);

      // ---- 无 phase：任何页面都维持计时，但不主动离开手动浏览页 ----
      if (!phase) {
        this.computeAll();
        this.scheduleNext();
        return;
      }

      // ---- phase=navigating：按真实链接每页只走下一跳 ----
      if (phase.state === 'navigating') {
        if (phase.module && MOD[phase.module]?.match?.(currentPath)) {
          phase.state = 'running';
          Utils.gset(PHASE_KEY, phase);
          return this.onPageLoad(currentPath);
        }
        if (await this.navigatePhase(phase, currentPath)) return;
        const missingEntry = ALL_ENTRIES().find(e => e.id === phase.id);
        if (missingEntry?.optional) {
          Utils.log(`调度器: 可选入口 ${phase.id} 不存在，按本次已检查处理`);
          Utils.gset(PHASE_KEY, { state: 'returning', id: phase.id, module: phase.module });
          if (currentPath === '/xz/') this.onReturnFromTarget({ id: phase.id, module: phase.module });
          else await this.navigateHome();
          return;
        }
        Utils.warn(`调度器: ${phase.id} 无法从 ${currentPath} 继续导航，5min 后重试`);
        const retryAt = Utils.getServerTime().getTime() + 300000;
        Utils.gset(`sched_${phase.id}_nextAt`, retryAt);
        Utils.gset(PHASE_KEY, null);
        if (currentPath === '/xz/') {
          this.computeAll();
          this.scheduleNext();
        } else {
          await this.navigateHome();
        }
        return;
      }

      // ---- phase=running：在目标页，等模块完成 ----
      if (phase.state === 'running') {
        // 用模块的 match() 判断当前页是否是该模块负责的页
        // 这样能正确处理子页（如 restaurant_<uid>_<floor>、cook_<id>、facility_set_*）
        const isModulePage = phase.module && MOD[phase.module]?.match?.(currentPath);

        if (!isModulePage && currentPath !== '/xz/') {
          // 既不是模块页也不是主页 → 用户中途手动跳转
          Utils.warn(`调度器: phase=running 但路径不匹配 ${currentPath} (module=${phase.module})`);
          Utils.gset(PHASE_KEY, null);
          if (currentPath === '/xz/') this.scheduleNext();
          return;
        }

        // 在主页 + phase=running：模块已完成且自己回了主页 → 当 returning 处理
        if (currentPath === '/xz/' && !isModulePage) {
          this.onReturnFromTarget(phase);
          return;
        }

        // 模块可能已在 Router.run() 里跑完 → 立刻检测
        const doneAt = Utils.gget(`mod_${phase.module}_done`, 0);
        let finished = doneAt > phase.beforeAt;
        if (!finished) {
          // 还没完成 → 等
          finished = await this.waitForDone(phase.module, phase.beforeAt, phase.runMs);
        } else {
          Utils.log(`调度器: 模块 ${phase.module} 已在 Router 中完成`);
        }
        if (!finished) {
          Utils.log(`调度器: ${phase.module} 仍有关键动作，保持 running 等待刷新续跑`);
          return;
        }

        // 写回主页状态
        Utils.gset(PHASE_KEY, {
          state: 'returning',
          id: phase.id,
          module: phase.module,
        });

        // 导航回主页
        await this.navigateHome();
        return;
      }

      // ---- phase=returning：已回主页，处理收尾 ----
      if (phase.state === 'returning') {
        this.onReturnFromTarget(phase);
        return;
      }
    },

    async navigatePhase(phase, currentPath) {
      const entry = ALL_ENTRIES().find(e => e.id === phase.id);
      if (!entry) return false;
      const route = entry.route || [{ text: entry.nav, href: entry.target }];
      const matchesStep = (step, href) => step.href
        ? href === step.href
        : !!step.hrefPattern && new RegExp(step.hrefPattern).test(href);
      let nextIndex = 0;
      if (currentPath !== '/xz/') {
        const currentIndex = route.findIndex(step => matchesStep(step, currentPath));
        if (currentIndex < 0 || currentIndex >= route.length - 1) return false;
        nextIndex = currentIndex + 1;
      }
      const next = route[nextIndex];
      const link = Array.from(document.querySelectorAll('a')).find(a => {
        const text = (a.textContent || '').trim();
        const href = a.getAttribute('href') || '';
        return matchesStep(next, href) && (!next.text || text.includes(next.text));
      });
      if (!link) return false;
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(link);
      Utils.log(`调度器导航: ${currentPath} → ${next.href || next.hrefPattern}`);
      return true;
    },

    // 算所有 entry 的 nextRunAt
    computeAll() {
      const now = Utils.getServerTime();
      const nowMs = now.getTime();

      DAILY_SCHEDULE.forEach(e => {
        if (!entryConditionMet(e)) {
          e.nextRunAt = 0;
          Utils.gset(`sched_${e.id}_nextAt`, 0);
          return;
        }
        const saved = Utils.gget(`sched_${e.id}_nextAt`, 0);
        // 已到点但尚未完成的计划必须保留；只有完成时 onReturnFromTarget 才清零。
        e.nextRunAt = saved > 0 ? saved : this.computeFixedNext(e, nowMs);
        Utils.gset(`sched_${e.id}_nextAt`, e.nextRunAt);
      });

      DYNAMIC_SCHEDULE.forEach(e => {
        if (!entryConditionMet(e)) {
          e.nextRunAt = 0;
          Utils.gset(`sched_${e.id}_nextAt`, 0);
          return;
        }
        const saved = Utils.gget(`sched_${e.id}_nextAt`, 0);
        // 链式任务不能保存为独立周期；每次都由上游 lastRun 与自身 lastRun 重新判定。
        e.nextRunAt = e.chainedOnly ? e.computeNext() : (saved > 0 ? saved : e.computeNext());
        Utils.gset(`sched_${e.id}_nextAt`, e.nextRunAt);
      });
    },

    // 固定时段的 nextRunAt
    computeFixedNext(entry, nowMs) {
      const slot = entry.slot;

      // 24h 独立：从上次 lastRun 起算
      if (slot === '24h') {
        const lastRun = Utils.gget(`sched_${entry.id}_lastRun`, 0);
        let baseMs;
        if (lastRun > 0) {
          baseMs = lastRun + 86400000;  // 上次 + 24h
        } else {
          // 从未跑过 → 7:30 ± 60min（24h 模块首次跑也安排在 7:30 batch）
          const base = new Date(nowMs);
          base.setHours(REFRESH_HOUR, REFRESH_MIN, 0, 0);
          if (base.getTime() <= nowMs) base.setDate(base.getDate() + 1);
          baseMs = base.getTime();
        }
        // 24h 项当前配置为 0 jitter，保留通用字段方便以后显式配置
        const jitterMs = (Math.random() * (entry.jitterMax - entry.jitterMin) + entry.jitterMin) * 60000;
        let next = baseMs + jitterMs;
        if (next <= nowMs) next = nowMs + 60000;  // 已过 → 1min 后
        return next;
      }

      // 固定时刻 "HH:MM"
      const [h, m] = slot.split(':').map(Number);
      let next = new Date(nowMs);
      next.setHours(h, m, 0, 0);

      const jitterMs = (Math.random() * (entry.jitterMax - entry.jitterMin) + entry.jitterMin) * 60000;
      next = new Date(next.getTime() + jitterMs);

      // 固定每日任务：今天未跑且计划已过，必须立即补跑；今天已跑才排明天。
      if (entry.runOnce) {
        const lastRun = Utils.gget(`sched_${entry.id}_lastRun`, 0);
        const lastDay = lastRun ? new Date(lastRun).toDateString() : '';
        const today = new Date(nowMs).toDateString();
        if (lastDay !== today && next.getTime() <= nowMs) return nowMs + 5000;
        if (lastDay === today) {
          next = new Date(next.getTime() + 86400000);
        }
      } else if (next.getTime() <= nowMs) {
        next = new Date(next.getTime() + 86400000);
      }

      return next.getTime();
    },

    // 找最近的 entry，setTimeout
    scheduleNext() {
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }

      const enabled = ALL_ENTRIES().filter(e => e.nextRunAt && entryIsEnabled(e));
      if (enabled.length === 0) {
        Utils.showStatus('调度器', '无可调度任务', '#888');
        Utils.gset('sched_next', null);
        return;
      }

      enabled.sort((a, b) => a.nextRunAt - b.nextRunAt);
      const next = enabled[0];
      const nowMs = Utils.getServerTime().getTime();
      const delay = Math.max(0, next.nextRunAt - nowMs);

      // 持久化让面板知道下次任务
      Utils.gset('sched_next', {
        id: next.id,
        at: next.nextRunAt,
        module: next.module,
        target: next.target,
      });

      Utils.log(`调度器: 下次 [${next.id}] @ ${new Date(next.nextRunAt).toLocaleTimeString()} (${Math.round(delay / 60000)}min 后)`);
      Utils.showStatus('调度器', `下次 ${next.id} ${Math.round(delay / 60000)}min 后`, '#FF9800');

      this.timer = setTimeout(() => this.fireToTarget(next), delay);
    },

    // 触发：在主页点 nav 链接跳到目标页
    async fireToTarget(entry) {
      Utils.log(`调度器: 触发 ${entry.id} → ${entry.target}`);

      if (!entryIsEnabled(entry)) {
        entry.nextRunAt = 0;
        Utils.gset(`sched_${entry.id}_nextAt`, 0);
        Utils.log(`调度器: ${entry.id} 条件已满足或模块关闭，本轮取消`);
        this.computeAll();
        this.scheduleNext();
        return;
      }

      const existingPhase = Utils.gget(PHASE_KEY, null);
      if (existingPhase) {
        Utils.log(`调度器: 已有 ${existingPhase.id}/${existingPhase.state}，忽略重复触发 ${entry.id}`);
        return;
      }

      if (location.pathname !== '/xz/') {
        Utils.log(`调度器: ${entry.id} 已到点，从 ${location.pathname} 返回首页后立即执行`);
        // 保留原到点时间；主页加载后会以0延迟再次触发，不再人为推后1分钟。
        await this.navigateHome();
        return;
      }

      // 周期食谱在真正触发时重置受阻集合并开启新轮次；长期目标等级保持不变。
      if (entry.module === 'recipe') MOD.recipe.startScan('长期调度器');

      // 每个好友补跑轮次重新从好友列表扫描，但保留当天成功累计和已尝试动作，避免重复计数。
      if (entry.module === 'dailyFriend') {
        const friendState = DailyProjectState.load('friend');
        friendState.pending = null;
        friendState.visited = [];
        // 成功的点赞/柜子当天不重复；失败动作允许下一轮重试，蟑螂则始终以新一轮真实图标为准。
        friendState.tried = (friendState.succeeded || []).filter(signature => !signature.startsWith('roach:'));
        friendState.page = 1;
        DailyProjectState.save('friend', friendState);
      }
      if (entry.module === 'dailyBar') {
        const barState = DailyProjectState.load('bar');
        barState.pending = null;
        DailyProjectState.save('bar', barState);
      }

      // 记下当前 mod_<id>_done 值，waitForDone 据此判断"是否新完成"
      const beforeAt = Utils.gget(`mod_${entry.module}_done`, 0);

      Utils.gset(PHASE_KEY, {
        state: 'navigating',
        id: entry.id,
        module: entry.module,
        target: entry.target,
        nav: entry.nav,
        startedAt: Date.now(),
        runMs: entry.runMs || 10000,
        beforeAt,
        projectScope: Array.isArray(entry.projectScope) ? entry.projectScope : null,
      });
      if (entry.module === 'restaurant') {
        Utils.gset('restaurant_roach_attempts', 0);
        Utils.gset('restaurant_roach_cycle_blocked', false);
      }

      const phase = Utils.gget(PHASE_KEY, null);
      if (!await this.navigatePhase(phase, location.pathname)) {
        if (entry.optional) {
          Utils.log(`调度器: 可选入口 ${entry.id} 不存在，跳过本轮`);
          this.onReturnFromTarget({ id: entry.id, module: entry.module });
          return;
        }
        Utils.warn(`调度器: 找不到 ${entry.id} 的首跳真实链接，5min 后重试`);
        const retryAt = Utils.getServerTime().getTime() + 300000;
        entry.nextRunAt = retryAt;
        Utils.gset(`sched_${entry.id}_nextAt`, retryAt);
        Utils.gset(PHASE_KEY, null);
        this.scheduleNext();
      }
    },

    // 等模块完成（mod_<id>_done > beforeAt）
    async waitForDone(moduleId, beforeAt, timeoutMs) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs + 5000) {
        const doneAt = Utils.gget(`mod_${moduleId}_done`, 0);
        if (doneAt > beforeAt) return true;
        await new Promise(r => setTimeout(r, 300));
      }
      Utils.warn(`调度器: 模块 ${moduleId} 超时 ${timeoutMs}ms`);
      return false;
    },

    // 导航回主页
    async navigateHome() {
      if (location.pathname === '/xz/') return;
      const link = Array.from(document.querySelectorAll('a')).find(a => {
        const t = a.textContent.trim();
        const h = a.getAttribute('href') || '';
        return t === '返回首页' || t === '首页' || t === '刷新' || h === '/xz/' || h === '/xz';
      });
      if (link) {
        await Utils.sleep(1500);  // 等模块动作的响应稳定
        Utils.click(link);
        // 页面跳转后 onPageLoad() 处理 phase=returning
      } else {
        Utils.warn('调度器: 无返回首页链接');
      }
    },

    // 目标任务已完成回到主页
    onReturnFromTarget(phase) {
      Utils.log(`调度器: ${phase.id} 流程结束 ✓`);

      // Scheduler 的全部绝对时间统一使用页面服务器时间，避免本地时区与驯鹿报时错日。
      const completedAt = Utils.getServerTime().getTime();
      Utils.gset(`sched_${phase.id}_lastRun`, completedAt);
      Utils.gset(PHASE_KEY, null);

      // 吃饭模块：fire 后根据当前小时 mark 对应窗口（避免同日重入同一窗口）
      let energyWindow = null;
      if (phase.id === 'energy') {
        const now = Utils.getServerTime();
        const h = now.getHours();
        const windows = [[7, 10], [12, 15], [18, 21]];
        for (let i = 0; i < windows.length; i++) {
          const [sH, eH] = windows[i];
          if (h >= sH && h < eH) {
            energyWindow = i;
            Utils.gset('sched_energy_lastWindow', i);
            if (i === 1) Utils.gset('sched_energy_lunch_lastRun', completedAt);
            Utils.log(`调度器: energy mark 窗口 ${i} [${sH}-${eH}]`);
            break;
          }
        }
      }

      const entry = ALL_ENTRIES().find(e => e.id === phase.id);
      if (entry) {
        // 清本次计划；computeAll 会依据 lastRun 生成并持久化下一次
        Utils.gset(`sched_${entry.id}_nextAt`, 0);
      }

      if (this.isOn()) {
        this.computeAll();
        // 午饭后先执行耗时的好友项目；项目完成后再接食材合成。
        if (phase.id === 'energy' && energyWindow === 1 && isEnabled('dailyFriend')) {
          const friendEntry = ALL_ENTRIES().find(e => e.id === 'dailyFriendAfterLunch');
          if (friendEntry && entryConditionMet(friendEntry)) {
            friendEntry.nextRunAt = completedAt;
            Utils.gset('sched_dailyFriendAfterLunch_nextAt', completedAt);
            Utils.log('调度器: 午饭后先执行好友每日项目，完成后再合成');
            void this.fireToTarget(friendEntry);
            return;
          }
        }
        // 早/晚饭直接合成；午饭则等待好友项目收尾后再合成。
        const energyLast = Utils.gget('sched_energy_lastRun', 0);
        const compoundLast = Utils.gget('sched_foodCompoundAfterEnergy_lastRun', 0);
        const compoundStillPending = phase.id === 'energy' || energyLast > compoundLast;
        if ((phase.id === 'energy' || phase.id === 'dailyFriendAfterLunch') && compoundStillPending && isEnabled('foodCompound')) {
          const compoundEntry = ALL_ENTRIES().find(e => e.id === 'foodCompoundAfterEnergy');
          if (compoundEntry) {
            compoundEntry.nextRunAt = completedAt;
            Utils.gset('sched_foodCompoundAfterEnergy_nextAt', completedAt);
            Utils.log(phase.id === 'dailyFriendAfterLunch'
              ? '调度器: 好友每日项目完成，开始午饭后食材合成'
              : '调度器: 饭后立即执行一次食材全部合成');
            void this.fireToTarget(compoundEntry);
            return;
          }
        }
        // 餐厅已经回到首页：立即建立邮箱phase，确保其它积压任务不能插到两者之间。
        if (phase.id === 'restaurant' && isEnabled('mailbox')) {
          const mailboxEntry = ALL_ENTRIES().find(e => e.id === 'mailboxAfterRestaurant');
          if (mailboxEntry) {
            mailboxEntry.nextRunAt = completedAt;
            Utils.gset('sched_mailboxAfterRestaurant_nextAt', completedAt);
            Utils.log('调度器: 餐厅后立即检查系统邮箱');
            void this.fireToTarget(mailboxEntry);
            return;
          }
        }
        this.scheduleNext();
      } else {
        Utils.log('调度器已停止，不再 schedule');
      }
    },
  };

  // ==================== AutoPilot 全自动模式 ====================
  // 状态保存在 GM_setValue，跨页面持久
  // 每进入一页：continue() 检查是否到达目标路径，是则跑模块，否则导航
  const AutoPilot = {
    PLAN: [
      { module: 'signIn',     navSteps: [{ text: '签到',                hrefMatch: '/xz/sign_in' }] },
      { module: 'restaurant', navSteps: [{ text: '餐厅',                hrefMatch: '/xz/restaurant' }] },
      { module: 'mailbox',    navSteps: [{ text: '邮箱',                 hrefMatch: '/xz/mailbox' }] },
      { module: 'wish',       navSteps: [{ text: '许愿',                hrefMatch: '/xz/wish' }] },
      { module: 'box',        navSteps: [{ text: '酒吧',                hrefMatch: '/xz/bar' },
                                         { text: '开宝箱',              hrefMatch: '/xz/box' }] },
      { module: 'foodCoupon', navSteps: [{ text: '仓库',                hrefMatch: '/xz/warehouse' }] },
      { module: 'market',     navSteps: [{ text: '菜场',                hrefMatch: '/xz/market' }] },
      { module: 'marketReserve', navSteps: [{ text: '菜场',             hrefMatch: '/xz/market' }] },
      { module: 'dailyNpc',   navSteps: [{ text: '食神',                hrefMatch: '/xz/god' }] },
      { module: 'dailyFriend', navSteps: [{ text: '好友',               hrefMatch: '/xz/friend' }] },
      { module: 'dailyBar',   navSteps: [{ text: '广场',                hrefMatch: '/xz/square' },
                                         { text: '酒吧',                hrefMatch: '/xz/bar' }] },
      { module: 'dailyLuck',  navSteps: [{ text: '来访',                hrefMatch: '/xz/come_log' }] },
      { module: 'extraWish',  navSteps: [{ text: '许愿',                hrefMatch: '/xz/wish' }] },
      { module: 'energy',     navSteps: [{ text: '吃饭活动',            hrefMatch: '/xz/activity_energy' }] },
      { module: 'foodCompound', navSteps: [{ text: '橱柜',              hrefMatch: '/xz/cupboard' }] },
      { module: 'facility',   navSteps: [{ text: '设施',                hrefMatch: '/xz/restaurant_facility' }] },
      { module: 'bag',        navSteps: [{ text: '仓库',                hrefMatch: '/xz/warehouse' },
                                         { text: '礼包',                hrefMatch: '/xz/warehouse_2_0' }] },
      { module: 'recipe',     navSteps: [{ text: '食谱',                hrefMatch: '/xz/cookbook' },
                                         { text: '可升级',              hrefPattern: '^/xz/cookbook_\\d+_3_1$' }] },
      { module: 'guardian',   navSteps: [{ text: '神殿',                hrefMatch: '/xz/temple' },
                                         { text: '守护者',              hrefMatch: '/xz/guardian' }] },
      { module: 'season',     navSteps: [{ text: '>>夏日签到活动<<',    hrefMatch: '/xz/activity_season' }] },
      { module: 'egg',        navSteps: [{ text: '>>小镇扭蛋活动<<',    hrefMatch: '/xz/activity_egg' }] },
      { module: 'vitality',   navSteps: [{ text: '今日活跃',            hrefMatch: '/xz/restaurant_vitality' }] },
      { module: 'achievement', navSteps: [{ text: '成就',               hrefMatch: '/xz/achievement' }] },
    ],
    stateKey: 'autopilot_state',

    isOn() { const s = Utils.gget(this.stateKey, null); return !!(s && s.enabled); },

    start() {
      // 互斥：若调度器在跑，先停它
      if (typeof Scheduler !== 'undefined' && Scheduler.isOn()) {
        Scheduler.stop('AutoPilot 启动');
      }
      Utils.gset('operation_stopped', false);
      Utils.gset('autopilot_emergency_stop', false);
      Utils.gset('restaurant_roach_attempts', 0);
      Utils.gset('restaurant_roach_cycle_blocked', false);
      Utils.gset('autopilot_session', { id: Date.now(), iter: 0 });
      Utils.gset(this.stateKey, { enabled: true, stepIndex: 0, startedAt: Date.now() });
      Utils.log('▶▶ 自动计划启动');
      Utils.showStatus('自动驾驶', '启动中…', '#FF9800');
      // 若不在主页，先导航到主页
      if (location.pathname !== '/xz/') this.navigateToHome();
    },

    startSingle(moduleId) {
      const stepIndex = this.PLAN.findIndex(step => step.module === moduleId);
      if (stepIndex < 0) {
        Utils.warn(`单项运行: 未找到模块 ${moduleId}`);
        return false;
      }
      if (this.isOn()) {
        Utils.warn('单项运行: 自动驾驶已有任务正在执行，请先停止');
        Utils.showStatus('单项运行', '已有任务正在执行', '#f44');
        return false;
      }
      const schedulerWasOn = typeof Scheduler !== 'undefined' && Scheduler.isOn();
      if (schedulerWasOn) Scheduler.stop(`单项运行 ${moduleId}`);
      Utils.gset('operation_stopped', false);
      Utils.gset('autopilot_emergency_stop', false);
      Utils.gset('restaurant_roach_attempts', 0);
      if (moduleId === 'restaurant') Utils.gset('restaurant_roach_cycle_blocked', false);
      Utils.gset('autopilot_session', { id: Date.now(), iter: 0 });
      Utils.gset(this.stateKey, {
        enabled: true,
        stepIndex,
        startedAt: Date.now(),
        singleModule: moduleId,
        resumeSchedulerAfterSingle: schedulerWasOn,
      });
      Utils.log(`▶ 单项运行启动: ${moduleId}`);
      Utils.showStatus('单项运行', `${stepIndex + 1}. ${moduleId}`, '#4CAF50');
      setTimeout(() => this.continue(), 300);
      return true;
    },

    startGroup(groupId) {
      const def = GROUP_RUN_DEFS[groupId];
      if (!def) {
        Utils.warn(`合并运行: 未找到分组 ${groupId}`);
        return false;
      }
      if (this.isOn()) {
        Utils.warn('合并运行: 已有任务正在执行，请先停止');
        Utils.showStatus('合并运行', '已有任务正在执行', '#f44');
        return false;
      }
      const indices = def.modules.map(moduleId => this.PLAN.findIndex(step => step.module === moduleId));
      if (indices.some(index => index < 0) || indices.some((index, i) => i > 0 && index !== indices[i - 1] + 1)) {
        Utils.warn(`合并运行: ${groupId} 的模块不存在或不连续`);
        return false;
      }
      if (!def.modules.some(moduleId => isEnabled(moduleId))) {
        Utils.log(`合并运行: ${def.label} 没有已开启项目，本次不执行`);
        Utils.showStatus('合并运行', `${def.label} 无已开启项目`, '#888');
        return true;
      }
      const schedulerWasOn = typeof Scheduler !== 'undefined' && Scheduler.isOn();
      if (schedulerWasOn) Scheduler.stop(`合并运行 ${def.label}`);
      Utils.gset('operation_stopped', false);
      Utils.gset('autopilot_emergency_stop', false);
      Utils.gset('restaurant_roach_attempts', 0);
      if (def.modules.includes('restaurant')) Utils.gset('restaurant_roach_cycle_blocked', false);
      Utils.gset('autopilot_session', { id: Date.now(), iter: 0 });
      Utils.gset(this.stateKey, {
        enabled: true,
        stepIndex: indices[0],
        startedAt: Date.now(),
        singleGroup: groupId,
        singleEndStepIndex: indices[indices.length - 1],
        resumeSchedulerAfterSingle: schedulerWasOn,
      });
      Utils.log(`▶ 合并运行启动: ${def.label}`);
      Utils.showStatus('合并运行', def.label, '#4CAF50');
      setTimeout(() => this.continue(), 300);
      return true;
    },

    startAction(actionId) {
      const def = ACTION_RUN_DEFS[actionId];
      if (!def) {
        Utils.warn(`细项运行: 未找到动作 ${actionId}`);
        return false;
      }
      const stepIndex = this.PLAN.findIndex(step => step.module === def.module);
      if (stepIndex < 0 || this.isOn()) {
        Utils.warn(this.isOn() ? '细项运行: 已有任务正在执行，请先停止' : `细项运行: 未找到父模块 ${def.module}`);
        Utils.showStatus('细项运行', this.isOn() ? '已有任务正在执行' : '父模块不存在', '#f44');
        return false;
      }
      const projectId = actionId.startsWith('project_') ? actionId.slice('project_'.length) : null;
      if (projectId && projectTarget(projectId) <= 0) {
        Utils.gset(PROJECT_ACTION_RUN_KEY, null);
        Utils.log(`细项运行: ${projectId} 设置为0次，本次不执行`);
        Utils.showStatus('细项运行', `${projectId} 设置0次，不执行`, '#888');
        return true;
      }
      const schedulerWasOn = typeof Scheduler !== 'undefined' && Scheduler.isOn();
      if (schedulerWasOn) Scheduler.stop(`细项运行 ${actionId}`);
      let actionProjectId = null;
      let actionTarget = 0;
      const repeatableProjectStateKeys = {
        like: 'friend', dig: 'friend', roach: 'friend',
        fist: 'bar', cup: 'bar',
        luck: 'luck',
        extraWish: 'wish',
      };
      const projectStateKey = projectId ? repeatableProjectStateKeys[projectId] : null;
      if (projectStateKey) {
        const projectState = DailyProjectState.load(projectStateKey);
        actionProjectId = projectId;
        actionTarget = projectTarget(projectId);
        // 独立运行是一个新动作，不能把上次刷新前遗留的pending误算成本次成功。
        projectState.pending = null;
        DailyProjectState.save(projectStateKey, projectState);
      }
      if (projectId) {
        Utils.gset(PROJECT_ACTION_RUN_KEY, {
          active: true,
          projectId,
          target: projectTarget(projectId),
          completed: 0,
          startedAt: Date.now(),
        });
      } else {
        Utils.gset(PROJECT_ACTION_RUN_KEY, null);
      }
      if (def.module === 'dailyFriend') {
        const friendState = DailyProjectState.load('friend');
        friendState.pending = null;
        friendState.visited = [];
        friendState.tried = [];
        friendState.page = 1;
        DailyProjectState.save('friend', friendState);
      }
      if (def.module === 'restaurant') {
        Utils.gset('restaurant_remaining_floors', []);
        Utils.gset('restaurant_roach_cycle_blocked', false);
      }
      Utils.gset('operation_stopped', false);
      Utils.gset('autopilot_emergency_stop', false);
      Utils.gset('restaurant_roach_attempts', 0);
      Utils.gset('autopilot_session', { id: Date.now(), iter: 0 });
      Utils.gset(this.stateKey, {
        enabled: true,
        stepIndex,
        startedAt: Date.now(),
        singleModule: def.module,
        actionScope: actionId,
        actionProjectId,
        actionTarget,
        actionCompleted: 0,
        actionNavSteps: def.navSteps,
        resumeSchedulerAfterSingle: schedulerWasOn,
      });
      Utils.log(`▶ 细项运行启动: ${actionId} → ${def.module}`);
      Utils.showStatus('细项运行', actionId, '#4CAF50');
      setTimeout(() => this.continue(), 300);
      return true;
    },

    stop(reason = '', { resumeScheduler = null } = {}) {
      const previousState = Utils.gget(this.stateKey, {});
      const scopedRun = !!(previousState.singleModule || previousState.singleGroup);
      const shouldResumeScheduler = resumeScheduler === null
        ? (scopedRun ? !!previousState.resumeSchedulerAfterSingle : true)
        : resumeScheduler;
      Utils.gset(this.stateKey, { enabled: false });
      Utils.gset(PROJECT_ACTION_RUN_KEY, null);
      Utils.gset('autopilot_session', null);
      Utils.log(`⏹ 自动计划停止${reason ? ': ' + reason : ''}`);
      Utils.showStatus('自动驾驶', '已停止', '#f44');
      if (shouldResumeScheduler && typeof Scheduler !== 'undefined' && !Scheduler.isOn()) {
        Utils.log(scopedRun ? '单项/合并运行: 已恢复原调度器状态' : '自动驾驶: 已交接长期循环调度器');
        Scheduler.start();
      }
    },

    async continue() {
      const state = Utils.gget(this.stateKey, null);
      if (!state || !state.enabled) return;

      // 紧急停止标志（仅由面板鼠标总停止按钮置位）
      if (Utils.gget('autopilot_emergency_stop', false)) {
        Utils.gset('autopilot_emergency_stop', false);
        this.stop('紧急停止', { resumeScheduler: false });
        return;
      }

      const session = Utils.gget('autopilot_session', null) || { iter: 0 };
      const path = location.pathname;
      session.iter = (session.iter || 0) + 1;
      // 高次数每日项目每个成功动作都可能刷新一次；保护上限随用户配置增长，同时保留总封顶防真死循环。
      const configuredDailyActions = DAILY_PROJECT_DEFS.reduce((sum, item) =>
        sum + (projectEnabled(item.id) ? projectTarget(item.id) : 0), 0);
      const iterationLimit = Math.min(3000, Math.max(500, 200 + configuredDailyActions * 4));
      if (session.iter > iterationLimit) {
        Utils.warn(`自动驾驶: 单次会话迭代 ${session.iter}/${iterationLimit} 次超限，强制停止`);
        this.stop('迭代超限保护');
        return;
      }
      Utils.gset('autopilot_session', session);

      const stepIdx = state.stepIndex || 0;
      const baseStep = this.PLAN[stepIdx];
      const step = baseStep && state.actionNavSteps ? { ...baseStep, navSteps: state.actionNavSteps } : baseStep;

      if (!step) {
        // 全部跑完
        Utils.log('🎉 自动计划: 全部完成');
        Utils.showStatus('自动驾驶', '全部完成 ✓', '#4CAF50');
        this.stop('全部完成');
        return;
      }

      Utils.log(`自动驾驶: iter=${session.iter} step=${stepIdx + 1}/${this.PLAN.length} (${step.module}) path=${path}`);

      if (!state.singleModule && !isEnabled(step.module)) {
        Utils.log(`计划[${stepIdx + 1}/${this.PLAN.length}] ${step.module}: 已关闭，跳过`);
        this.advance();
        return;
      }

      // 同一次AutoPilot食谱步骤只准备一次；跨页面刷新不能反复清空blocked集合。
      if (step.module === 'recipe' && state.recipePreparedStep !== stepIdx) {
        MOD.recipe.startScan('自动驾驶');
        state.recipePreparedStep = stepIdx;
        Utils.gset(this.stateKey, state);
      }

      // 模块自己声明负责当前页：只由 AutoPilot 执行一次，Router 不再抢跑
      if (MOD[step.module]?.match?.(path)) {
        Utils.log(`计划[${stepIdx + 1}/${this.PLAN.length}] ▶ ${step.module} 开始`);
        Utils.showStatus('自动驾驶', `${stepIdx + 1}/${this.PLAN.length} ${step.module}`, '#FF9800');
        let completed = false;
        try {
          completed = await MOD[step.module].run();
        } catch (e) {
          Utils.warn(`${step.module} 异常: ${e.message}`);
          this.stop(`${step.module} 异常`);
          return;
        }
        if (completed === true) {
          Utils.gset(`mod_${step.module}_done`, Date.now());
          Utils.log(`计划[${stepIdx + 1}/${this.PLAN.length}] ✓ ${step.module} 关键动作已消失`);
          this.advance();
        } else {
          // 点击若是同页更新而非整页跳转，稍后在同一步重新检测；绝不 advance
          setTimeout(() => this.continue(), 3000);
        }
        return;
      }

      // 主页或合法中转页：每次页面只点下一跳，完整页面加载后再续跑
      const routed = await this.gotoStep(step);
      if (!routed) {
        Utils.log(`计划: 当前 ${path} 不是 ${step.module} 的合法路径，回主页重试`);
        await this.navigateToHome();
      }
    },

    async gotoStep(step) {
      const curPath = location.pathname;
      const matchesNav = (nav, href) => nav.hrefMatch
        ? href === nav.hrefMatch
        : !!nav.hrefPattern && new RegExp(nav.hrefPattern).test(href);
      let nextIndex = 0;
      if (curPath !== '/xz/') {
        const currentIndex = step.navSteps.findIndex(nav => matchesNav(nav, curPath));
        if (currentIndex < 0 || currentIndex >= step.navSteps.length - 1) return false;
        nextIndex = currentIndex + 1;
      }
      const nav = step.navSteps[nextIndex];
      const link = Array.from(document.querySelectorAll('a')).find(a => {
        const t = a.textContent.trim();
        const h = a.getAttribute('href') || '';
        return t.includes(nav.text) && matchesNav(nav, h);
      });
      if (!link) {
        Utils.warn(`导航: 找不到 "${nav.text}" → ${nav.hrefMatch || nav.hrefPattern}`);
        return false;
      }
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(link);
      Utils.log(`导航: ${curPath} → ${nav.hrefMatch || nav.hrefPattern}`);
      return true;
    },

    async navigateToHome() {
      if (location.pathname === '/xz/') return;
      const link = Array.from(document.querySelectorAll('a')).find(a => {
        const t = a.textContent.trim();
        const h = a.getAttribute('href') || '';
        return t === '返回首页' || t === '首页' || t === '刷新' || h === '/xz/' || h === '/xz';
      });
      if (link) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(link);
        await this.waitForPathChange(location.pathname, 5000);
      } else {
        Utils.warn('导航: 无返回首页链接，尝试 history.back()');
        window.history.back();
        await Utils.sleep(2000);
      }
    },

    async waitForPathChange(oldPath, timeout = 8000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (location.pathname !== oldPath) return location.pathname;
        await new Promise(r => setTimeout(r, 200));
      }
      return null;
    },

    advance() {
      const state = Utils.gget(this.stateKey, {});
      if (state.singleModule) {
        const label = state.actionScope || state.singleModule;
        Utils.log(`✓ 单项运行完成: ${label}`);
        Utils.showStatus(state.actionScope ? '细项运行' : '单项运行', `${label} 完成 ✓`, '#4CAF50');
        this.stop(`${label} 单项完成`);
        return;
      }
      if (state.singleGroup && (state.stepIndex || 0) >= state.singleEndStepIndex) {
        const label = GROUP_RUN_DEFS[state.singleGroup]?.label || state.singleGroup;
        Utils.log(`✓ 合并运行完成: ${label}`);
        Utils.showStatus('合并运行', `${label} 完成 ✓`, '#4CAF50');
        this.stop(`${label} 合并完成`);
        return;
      }
      state.stepIndex = (state.stepIndex || 0) + 1;
      Utils.gset(this.stateKey, state);
      if (location.pathname === '/xz/') {
        // 关闭模块可能在首页连续跳过；没有页面加载时必须主动续跑
        setTimeout(() => this.continue(), 700);
      } else {
        this.navigateToHome();
      }
    },

    scheduleNext() {
      const serverTime = Utils.getServerTime();
      const next = Utils.nextDaily(serverTime);
      const delay = next.getTime() - serverTime.getTime();
      const nextStr = next.toLocaleString();
      Utils.showStatus('自动驾驶', `下次 ${nextStr}`, '#4CAF50');
      Utils.log(`自动驾驶: 下次 ${nextStr} (${Math.round(delay / 3600000)}h 后)`);
      // 用 setTimeout 重新触发（refresh 当前页）
      setTimeout(() => location.reload(), delay);
    },
  };

  // ==================== 路由 ====================
  const Router = {
    async run() {
      if (this.busy) {
        Utils.log(`路由: 当前页面已有执行实例，跳过并发触发 @ ${location.pathname}`);
        return;
      }
      this.busy = true;
      try {
        return await this.runUnlocked();
      } finally {
        this.busy = false;
      }
    },

    busy: false,
    async runUnlocked() {
      if (Utils.gget('operation_stopped', false)) {
        Utils.log('路由: 总停止锁已启用，跳过所有自动动作');
        return;
      }
      const path = location.pathname;
      // 必须在运行页面模块之前处理过期 phase；否则旧餐厅 phase 会先再次触发问题动作。
      if (Scheduler.isOn() && await Scheduler.recoverExpiredPhase(path)) return;
      const activePhase = Scheduler.isOn() ? Utils.gget(PHASE_KEY, null) : null;
      Utils.log(`路由: ${path}`);
      // 读取自己餐厅ID是只读校准，普通手动浏览概览时也允许；餐厅动作仍受阶段隔离。
      if (path === '/xz/restaurant') MOD.restaurant.learnSelfId();
      let matched = 0;
      for (const [key, mod] of Object.entries(MOD)) {
        if (mod.match(path)) {
          matched++;
          if (mod.requiresScheduled && activePhase?.module !== key) {
            Utils.log(`↪ ${key} 仅在每日项目调度阶段运行`);
            continue;
          }
          if (activePhase && ['navigating', 'running'].includes(activePhase.state) && activePhase.module !== key) {
            Utils.log(`↪ ${key} 与当前调度阶段 ${activePhase.module} 隔离`);
            continue;
          }
          const inPlan = AutoPilot.PLAN.some(step => step.module === key);
          if (AutoPilot.isOn() && inPlan) {
            Utils.log(`↪ ${key} 由 AutoPilot 独占，Router 不重复执行`);
            continue;
          }
          if (isEnabled(key)) {
            Utils.log(`▶ ${key} 模块触发`);
            try {
              const completed = await mod.run();
              if (completed === true || (!inPlan && completed !== false)) {
                Utils.gset(`mod_${key}_done`, Date.now());
                Utils.log(`✓ ${key} 完成标志已写入`);
              } else {
                Utils.log(`… ${key} 仍有后续动作，不写完成标志`);
              }
            } catch (e) {
              Utils.warn(`${key} 异常: ${e.message}\n${e.stack}`);
            }
          } else {
            Utils.log(`⏸ ${key} 模块已关闭，跳过`);
          }
        }
      }
      if (matched === 0 && !AutoPilot.isOn()) {
        Utils.log('当前页面无匹配模块');
      }

      // AutoPilot 续跑（每页加载后都会执行）
      if (AutoPilot.isOn()) {
        await AutoPilot.continue();
      }

      // Scheduler 处理（主页初始化 / 目标页等完成 / 主页收尾）
      if (Scheduler.isOn()) {
        await Scheduler.onPageLoad(path);
      }
    },
  };

  // ==================== 启动 ====================
  function init() {
    // v3.14：站点已将旧一级名称“特色”改为“中品”，读取旧配置时一次性迁移。
    if (Utils.gget('recipe_target_level', 'off') === '特色') {
      Utils.gset('recipe_target_level', '中品');
    }
    // v3.15：旧版未识别“家园报时”，其 nextAt 均可能落在本地时区；全部清除后按服务器时间重算。
    if (Utils.gget('scheduler_schema_version', 1) < 3) {
      const serverOffset = Utils.getServerTime().getTime() - Date.now();
      ALL_ENTRIES().forEach(({ id }) => {
        const oldLastRun = Utils.gget(`sched_${id}_lastRun`, 0);
        if (oldLastRun > 0) Utils.gset(`sched_${id}_lastRun`, oldLastRun + serverOffset);
        Utils.gset(`sched_${id}_nextAt`, 0);
      });
      Utils.gset('sched_next', null);
      Utils.gset('sched_energy_lastWindow', null);
      Utils.gset('sched_energy_lastResetDay', null);
      Utils.gset('scheduler_schema_version', 3);
    }
    // v3.42：设施从“按剩余时间”切换为固定 12h，丢弃旧版计划和未完成轮次后重算。
    if (!Utils.gget('v342_facility_schedule_migrated', false)) {
      Utils.gset('sched_facility_nextAt', 0);
      Utils.gset('facility_cycle_state', null);
      Utils.gset('v342_facility_schedule_migrated', true);
    }
    // v3.60：两条固定沾光计划会在迟安装时同小时连续补跑；改为单一逐小时动态计划。
    if (!Utils.gget('v360_luck_schedule_migrated', false)) {
      for (const id of ['dailyLuck1031', 'dailyLuck1131', 'dailyLuckHourly']) {
        Utils.gset(`sched_${id}_nextAt`, 0);
      }
      Utils.gset('v360_luck_schedule_migrated', true);
    }
    // v3.61：立即复查v3.60可能因后退缓存漏记的服务器3/3，不等待下一个小时。
    if (!Utils.gget('v361_luck_fresh_verify_migrated', false)) {
      Utils.gset('sched_dailyLuckHourly_lastRun', 0);
      Utils.gset('sched_dailyLuckHourly_nextAt', 0);
      Utils.gset('v361_luck_fresh_verify_migrated', true);
    }
    // v3.65：守护者/食谱由“完成后24h”改为每日固定时段；保留lastRun防止当天重复，只清旧nextAt重算。
    if (!Utils.gget('v365_guardian_recipe_daily_migrated', false)) {
      Utils.gset('sched_guardian_nextAt', 0);
      Utils.gset('sched_recipe_nextAt', 0);
      Utils.gset('v365_guardian_recipe_daily_migrated', true);
    }
    // v3.66：v3.65可能把60秒超时的半场守护者误记为当天完成；清一次记录让更新后立即补打。
    if (!Utils.gget('v366_guardian_timeout_retry_migrated', false)) {
      Utils.gset('sched_guardian_lastRun', 0);
      Utils.gset('sched_guardian_nextAt', 0);
      Utils.gset('v366_guardian_timeout_retry_migrated', true);
    }
    // v3.70：好友改为午饭链式任务、酒吧改时段；同时清理可能处于旧广播商店循环的设施轮次。
    if (!Utils.gget('v370_daily_timing_facility_migrated', false)) {
      Utils.gset('sched_dailyFriend_nextAt', 0);
      Utils.gset('sched_dailyFriendAfterLunch_nextAt', 0);
      Utils.gset('sched_dailyBar_nextAt', 0);
      const lastWindow = Utils.gget('sched_energy_lastWindow', null);
      const energyLast = Utils.gget('sched_energy_lastRun', 0);
      if (lastWindow === 1 && energyLast > 0) Utils.gset('sched_energy_lunch_lastRun', energyLast);
      Utils.gset('facility_cycle_state', null);
      Utils.gset('v370_daily_timing_facility_migrated', true);
    }
    // v3.77：旧并发路由可能把酒吧本地次数记高；升级后重开一次服务器校准及其后的补跑。
    if (!Utils.gget('v377_router_mutex_repair', false)) {
      for (const id of ['dailyProgressAudit1', 'dailyBarCatchup1']) {
        Utils.gset(`sched_${id}_lastRun`, 0);
        Utils.gset(`sched_${id}_nextAt`, 0);
      }
      Utils.gset('v377_router_mutex_repair', true);
    }
    // 先填充全部nextRunAt，再创建/显示面板；否则调度列表晚到会推动右侧按钮位置。
    if (Scheduler.isOn()) {
      Scheduler.computeAll();
      Scheduler.startWatchdog();
    }
    Panel.create();
    if (!AutoPilot.isOn()) Utils.gset(PROJECT_ACTION_RUN_KEY, null);
    // 主页加载：若 AutoPilot 开着，显示状态
    if (AutoPilot.isOn()) {
      const state = Utils.gget('autopilot_state', {});
      Utils.showStatus('自动驾驶', `步骤 ${(state.stepIndex || 0) + 1}/${AutoPilot.PLAN.length}`, '#FF9800');
    }
    // 同步刷新面板按钮状态
    setTimeout(() => { Panel.refreshAutopilotUI(); }, 200);
    setTimeout(() => Router.run(), 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
