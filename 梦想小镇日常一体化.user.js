// ==UserScript==
// @name         梦想小镇日常一体化 v3.32
// @namespace    http://tampermonkey.net/
// @version      3.32
// @description  全自动日常 + 任务穷举调度器：签到/许愿/吃饭/设施/食神/市场/食材券/礼包/餐厅/系统邮箱/宝箱/食谱/守护者/季节签到/扭蛋
// @author       yaguyagu
// @match        https://xx.xlu233.com/xz/*
// @updateURL    https://raw.githubusercontent.com/SeptYagu/dreamtown-helper/main/%E6%A2%A6%E6%83%B3%E5%B0%8F%E9%95%87%E6%97%A5%E5%B8%B8%E4%B8%80%E4%BD%93%E5%8C%96.meta.js
// @downloadURL  https://raw.githubusercontent.com/SeptYagu/dreamtown-helper/main/%E6%A2%A6%E6%83%B3%E5%B0%8F%E9%95%87%E6%97%A5%E5%B8%B8%E4%B8%80%E4%BD%93%E5%8C%96.user.js
// @homepageURL  https://github.com/SeptYagu/dreamtown-helper
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

/*
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
 *   5. 按钮位置见 <LOCAL_HANDOFF>
 */

(function () {
  'use strict';

  if (window.__DXZXX_LOADED__) return;
  window.__DXZXX_LOADED__ = true;

  const NS = 'dxzxx_';
  const SCRIPT_VERSION = '3.32';
  const MIN_STEP_MS = 600;
  const REFRESH_HOUR = 7;       // 服务器日重置时间（原脚本统一为 7:30 ± 15min）
  const REFRESH_MIN = 30;
  const REFRESH_RAND = 15;

  // ==================== 工具层 ====================
  const Utils = {
    log(m) { console.log(`%c[一体化]%c ${m}`, 'color:#4fe;font-weight:bold', 'color:inherit'); },
    warn(m) { console.warn(`[一体化] ${m}`); },

    click(el) {
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
  // schedule: daily(每日7:30±15min) | hourly(整点) | restaurant(17-45min随机) | guardian(24h硬定时)
  //  | recipe(24h硬定时) | meal(每日3期) | facility(智能:剩余+1h)
  // 默认开关：与日常强相关且安全的默认开，付费/风险操作默认关
  const MODULE_DEFS = [
    // —— 面板主模块 ——
    { id: 'signIn',     label: '1. 每日签到',     default: true,  schedule: 'daily' },
    { id: 'wish',       label: '2. 许愿树(免费)', default: true,  schedule: 'daily' },
    { id: 'god',        label: '3. 食神拜访',     default: true,  schedule: 'daily' },
    { id: 'box',        label: '4. 免费宝箱',     default: true,  schedule: 'daily' },
    { id: 'season',     label: '5. 季节签到',     default: true,  schedule: 'daily' },
    { id: 'egg',        label: '6. 免费扭蛋',     default: true,  schedule: 'daily' },
    { id: 'foodCoupon', label: '7. 食材券',       default: true,  schedule: 'daily' },  // 用旧 propId + 新页面适配
    { id: 'energy',     label: '8. 吃饭/体力',    default: true,  schedule: 'meal' },
    { id: 'restaurant', label: '9. 餐厅添油',     default: true,  schedule: 'restaurant' },  // 翻柜/打蟑默认关
    { id: 'facility',   label: '10. 设施安装',    default: true,  schedule: 'facility' },
    { id: 'bag',        label: '11. 礼包开启',    default: true,  schedule: 'daily' },
    { id: 'recipe',     label: '12. 食谱升级',    default: true,  schedule: 'recipe' },    // 默认开；目标等级/学习开关可调
    { id: 'guardian',   label: '13. 守护者(爆裂)', default: true, schedule: 'guardian' },
    { id: 'dailyFriend', label: '每日好友项目', default: true, schedule: 'daily-project', hidden: true },
    { id: 'dailyBar',    label: '每日酒吧项目', default: true, schedule: 'daily-project', hidden: true },
    { id: 'extraWish',   label: '额外许愿项目', default: true, schedule: 'daily-project', hidden: true },
    { id: 'vitality',    label: '今日活跃领奖', default: true, schedule: 'reward-twice' },
    // —— 付费模块：在 PLAN 内，但默认关闭 ——
    { id: 'market',     label: '食材采购(整点)', default: false, schedule: 'hourly' },  // 花钱
  ];

  // 初始化 GM 默认值
  MODULE_DEFS.forEach(m => {
    if (Utils.gget(`mod_${m.id}_enabled`, null) === null) Utils.gset(`mod_${m.id}_enabled`, m.default);
  });

  const isEnabled = (id) => {
    if (['dailyFriend', 'dailyBar', 'extraWish'].includes(id)) {
      return DAILY_PROJECT_DEFS.some(p => p.module === id && projectEnabled(p.id) && projectTarget(p.id) > 0);
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
    { id: 'wenjie', label: '拜访雯姐（推荐1次）', recommended: 1, module: 'dailyBar' },
    { id: 'extraWish', label: '额外许愿果（常驻推荐0次）', recommended: 0, module: 'extraWish' },
  ];
  DAILY_PROJECT_DEFS.forEach(p => {
    if (Utils.gget(`project_${p.id}_enabled`, null) === null) Utils.gset(`project_${p.id}_enabled`, p.recommended > 0);
    if (Utils.gget(`project_${p.id}_count`, null) === null) Utils.gset(`project_${p.id}_count`, p.recommended);
  });
  const projectEnabled = (id) => !!Utils.gget(`project_${id}_enabled`, false);
  const projectTarget = (id) => Math.max(0, Math.min(500, parseInt(Utils.gget(`project_${id}_count`, 0), 10) || 0));
  const gameDayKey = (date = Utils.getServerTime()) => {
    const shifted = new Date(date.getTime() - 6 * 3600000);
    return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-${String(shifted.getDate()).padStart(2, '0')}`;
  };

  // 餐厅子开关
  const RESTAURANT_SUB_DEFAULTS = {
    restaurant_cockroach: false,
    restaurant_oil: true,
    restaurant_dig: false,
    restaurant_mailbox: true,
  };
  Object.entries(RESTAURANT_SUB_DEFAULTS).forEach(([k, d]) => {
    if (Utils.gget(k, null) === null) Utils.gset(k, d);
  });

  // v3.9 迁移救援：旧版本可能已在餐厅翻柜失败页形成完整刷新死循环
  if (!Utils.gget('v39_restaurant_rescue_done', false) && location.pathname.startsWith('/xz/restaurant')) {
    Utils.gset('v39_restaurant_rescue_done', true);
    Utils.gset('mod_restaurant_enabled', false);
    Utils.gset('restaurant_dig', false);
    Utils.gset('restaurant_dig_attempts', 0);
    Utils.gset('restaurant_remaining_floors', []);
    Utils.gset('autopilot_state', { enabled: false });
    Utils.gset('autopilot_session', null);
    Utils.gset('autopilot_emergency_stop', false);
  }
  if (!Utils.gget('v310_restaurant_rescue_done', false) && location.pathname.startsWith('/xz/restaurant')) {
    Utils.gset('v310_restaurant_rescue_done', true);
    Utils.gset('mod_restaurant_enabled', false);
    Utils.gset('restaurant_cockroach', false);
    Utils.gset('restaurant_dig', false);
    Utils.gset('restaurant_roach_attempts', 0);
    Utils.gset('restaurant_dig_attempts', 0);
    Utils.gset('restaurant_remaining_floors', []);
    Utils.gset('autopilot_state', { enabled: false });
    Utils.gset('autopilot_session', null);
    Utils.gset('autopilot_emergency_stop', false);
  }

  // ==================== 控制面板 ====================
  const Panel = {
    create() {
      if (document.getElementById('dxzxx-panel')) return;
      GM_addStyle(`
        #dxzxx-panel{position:fixed;top:10px;right:10px;z-index:99999;background:rgba(255,255,255,.97);border:1px solid #ccc;border-radius:8px;padding:6px;box-shadow:0 4px 16px rgba(0,0,0,.15);font-size:12px;line-height:1.25;width:560px;box-sizing:border-box;font-family:Arial,sans-serif;max-height:calc(100vh - 20px);overflow-y:auto;}
        #dxzxx-panel h3{margin:0 0 3px;font-size:15px;line-height:1.2;border-bottom:1px solid #eee;padding-bottom:3px;color:#333;}
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
        #dxzxx-panel select{width:100%;padding:3px;margin:3px 0;border:1px solid #ccc;border-radius:4px;font-size:12px;}
        #dxzxx-panel .project-count{width:40px;padding:1px 2px;border:1px solid #bbb;border-radius:3px;font-size:11px;text-align:center;margin:0 2px;}
        #dxzxx-panel .project-row label{font-size:11px;line-height:1.15;}
        #dxzxx-panel .label{font-size:11px;color:#555;margin-top:2px;}
        #dxzxx-rows,#dxzxx-project-rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px;}
        #dxzxx-panel .panel-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start;}
        #dxzxx-panel .panel-column{min-width:0;}
        #dxzxx-panel .panel-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 6px;}
        #dxzxx-panel .single-run{width:auto;padding:1px 7px;margin:0;background:#4CAF50;color:#fff;font-size:11px;font-weight:normal;flex:0 0 auto;}
        #dxzxx-panel #dxzxx-rows .row.current{background:#FFE082;border-radius:3px;font-weight:bold;}
        #dxzxx-sched-wrap>div{line-height:1.25;}
        #dxzxx-sched-status{max-height:110px;overflow-y:auto;}
        #dxzxx-sched-list{display:none;}
        @media (max-width:620px){#dxzxx-panel{left:10px;right:10px;width:auto;}#dxzxx-panel .panel-columns,#dxzxx-rows,#dxzxx-project-rows{grid-template-columns:1fr;}}
        #dxzxx-fab{position:fixed;top:10px;right:10px;z-index:99999;background:#4fe;color:#000;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:16px;}
      `);

      const panel = document.createElement('div');
      panel.id = 'dxzxx-panel';
      panel.innerHTML = `<h3>🦌 梦想小镇日常 v${SCRIPT_VERSION}</h3>
        <div class="panel-columns">
          <div class="panel-column">
            <details open>
              <summary>餐厅子开关</summary>
              <div class="row sub"><label>🪳 自动打蟑螂</label><span class="toggle ${Utils.gget('restaurant_cockroach', false) ? 'on' : 'off'}" data-sub="restaurant_cockroach">${Utils.gget('restaurant_cockroach', false) ? '开' : '关'}</span></div>
              <div class="row sub"><label>⛽ 自动添油</label><span class="toggle ${Utils.gget('restaurant_oil', true) ? 'on' : 'off'}" data-sub="restaurant_oil">${Utils.gget('restaurant_oil', true) ? '开' : '关'}</span></div>
              <div class="row sub"><label>📦 自动翻橱柜</label><span class="toggle ${Utils.gget('restaurant_dig', false) ? 'on' : 'off'}" data-sub="restaurant_dig">${Utils.gget('restaurant_dig', false) ? '开' : '关'}</span></div>
              <div class="row sub"><label>📬 餐厅后领取系统邮件</label><span class="toggle ${Utils.gget('restaurant_mailbox', true) ? 'on' : 'off'}" data-sub="restaurant_mailbox">${Utils.gget('restaurant_mailbox', true) ? '开' : '关'}</span></div>
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
              <div class="row sub"><label>📖 自动学习新食谱</label><span class="toggle ${Utils.gget('recipe_learn', true) ? 'on' : 'off'}" data-sub="recipe_learn">${Utils.gget('recipe_learn', true) ? '开' : '关'}</span></div>
            </details>
            <div class="panel-actions">
              <button class="run-btn" id="dxzxx-run">▶ 立即执行本页</button>
              <button class="run-btn" id="dxzxx-autopilot" style="background:#FF9800;color:#000;">🚀 立即跑一轮全套</button>
              <button class="run-btn" id="dxzxx-stop" style="background:#f44;color:#fff;display:none;">⏹ 立即停止（Esc）</button>
            </div>
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
          </div>
        </div>
        <details open>
          <summary>每日项目（早饭后执行）</summary>
          <div id="dxzxx-project-rows"></div>
          <div class="label">按服务器06:00重置；次数按成功动作记账。搬家不执行。</div>
        </details>
        <details open id="dxzxx-module-switches">
          <summary>自动驾驶功能开关（按${AutoPilot.PLAN.length}步顺序）</summary>
          <div id="dxzxx-rows"></div>
        </details>
        <button class="hide-btn" id="dxzxx-hide">收起</button>`;
      document.body.appendChild(panel);

      const rows = panel.querySelector('#dxzxx-rows');
      const planOrder = new Map(AutoPilot.PLAN.map((step, index) => [step.module, index]));
      MODULE_DEFS.filter(m => !m.hidden).sort((a, b) => (planOrder.get(a.id) ?? 999) - (planOrder.get(b.id) ?? 999)).forEach(m => {
        const enabled = isEnabled(m.id);
        const row = document.createElement('div');
        row.className = 'row';
        row.dataset.module = m.id;
        const stepNumber = (planOrder.get(m.id) ?? -1) + 1;
        const label = m.label.replace(/^\d+\.\s*/, '');
        row.innerHTML = `<label>${stepNumber > 0 ? `${stepNumber}. ` : ''}${label}</label><button class="single-run" data-run-module="${m.id}">运行</button><span class="toggle ${enabled ? 'on' : 'off'}" data-id="${m.id}">${enabled ? '开' : '关'}</span>`;
        rows.appendChild(row);
      });

      const projectRows = panel.querySelector('#dxzxx-project-rows');
      DAILY_PROJECT_DEFS.forEach(p => {
        const enabled = projectEnabled(p.id);
        const row = document.createElement('div');
        row.className = 'row project-row';
        row.innerHTML = `<label>${p.label}</label><input class="project-count" type="number" min="0" max="500" value="${projectTarget(p.id)}" data-project-count="${p.id}"><span class="toggle ${enabled ? 'on' : 'off'}" data-project="${p.id}">${enabled ? '开' : '关'}</span>`;
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
            if (sub === 'restaurant_dig' && cur) Utils.gset('restaurant_dig_attempts', 0);
            if (sub === 'restaurant_cockroach' && cur) Utils.gset('restaurant_roach_attempts', 0);
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

      panel.querySelector('#dxzxx-run').addEventListener('click', () => Router.run());
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
      // Esc 紧急停止（同时停 AutoPilot 和 Scheduler）
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          Utils.gset('autopilot_emergency_stop', true);
          let stopped = false;
          if (AutoPilot.isOn()) { AutoPilot.stop('Esc 紧急停止', { resumeScheduler: false }); stopped = true; }
          if (Scheduler.isOn()) { Scheduler.stop('Esc 紧急停止'); stopped = true; }
          if (stopped) {
            Panel.refreshAutopilotUI();
            Panel.refreshSchedUI();
            Utils.showStatus('已停止', 'Esc 紧急停止触发', '#f44');
          }
        }
      });
      panel.querySelector('#dxzxx-sched-refresh').addEventListener('click', () => {
        Scheduler.computeAll();
        Scheduler.scheduleNext();
        Panel.refreshSchedUI();
      });
      panel.querySelector('#dxzxx-hide').addEventListener('click', () => Panel.hide());
      panel.querySelector('#dxzxx-stop').addEventListener('click', () => {
        Utils.gset('autopilot_emergency_stop', true);
        if (AutoPilot.isOn()) AutoPilot.stop('面板停止', { resumeScheduler: false });
        if (Scheduler.isOn()) Scheduler.stop('面板停止');
        Panel.refreshAutopilotUI();
        Panel.refreshSchedUI();
        Utils.showStatus('已停止', '面板停止按钮触发', '#f44');
      });

      // 初始显示调度器状态
      Panel.refreshSchedUI();
      Panel.refreshAutopilotUI();
      // 定时刷新状态显示
      setInterval(() => { Panel.refreshSchedUI(); Panel.refreshAutopilotUI(); }, 5000);
    },

    refreshAutopilotUI() {
      const btn = document.getElementById('dxzxx-autopilot');
      const stopBtn = document.getElementById('dxzxx-stop');
      if (!btn) return;
      const on = AutoPilot.isOn();
      if (on) {
        btn.textContent = '⏸ 停止自动驾驶';
        btn.style.background = '#f44';
        btn.style.color = '#fff';
        if (stopBtn) stopBtn.style.display = '';
        // 在面板标题下显示当前步骤
        const state = Utils.gget('autopilot_state', {});
        const stepIdx = state.stepIndex || 0;
        const step = AutoPilot.PLAN[stepIdx];
        const stepName = step ? step.module : '已完成';
        const h3 = document.querySelector('#dxzxx-panel h3');
        if (h3) h3.innerHTML = `🦌 梦想小镇日常 v${SCRIPT_VERSION} <span style="color:#FF9800;font-size:11px;">▶ ${stepIdx + 1}/${AutoPilot.PLAN.length} ${stepName}</span>`;
      } else {
        btn.textContent = '🚀 立即跑一轮全套';
        btn.style.background = '#FF9800';
        btn.style.color = '#000';
        if (stopBtn) stopBtn.style.display = 'none';
        const h3 = document.querySelector('#dxzxx-panel h3');
        if (h3) h3.innerHTML = `🦌 梦想小镇日常 v${SCRIPT_VERSION}`;
      }
      // 同步刷新 PLAN 列表
      Panel.refreshPlanList();
    },

    // 独立19步预览已合并进功能开关；运行时在对应开关行标出当前步骤。
    refreshPlanList() {
      const rows = document.querySelectorAll('#dxzxx-rows .row[data-module]');
      if (!rows.length || typeof AutoPilot === 'undefined') return;
      const state = Utils.gget('autopilot_state', {});
      const curStep = state.enabled ? (state.stepIndex || 0) : -1;
      const currentModule = curStep >= 0 ? AutoPilot.PLAN[curStep]?.module : null;
      rows.forEach(row => row.classList.toggle('current', row.dataset.module === currentModule));
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
        const all = ALL_ENTRIES().filter(e => e.nextRunAt && isEnabled(e.module));
        all.sort((a, b) => a.nextRunAt - b.nextRunAt);
        html += '<div style="margin-top:4px;border-top:1px solid #444;padding-top:4px;">';
        const top5 = all.slice(0, 6);
        top5.forEach(e => {
          const dt = new Date(e.nextRunAt);
          const hh = String(dt.getHours()).padStart(2, '0');
          const mm = String(dt.getMinutes()).padStart(2, '0');
          html += `<div>${hh}:${mm} <span style="color:#aaa;">${e.id}</span></div>`;
        });
        if (all.length > 6) html += `<div style="color:#888;">... 共 ${all.length} 项</div>`;
        html += '</div>';
        statusEl.innerHTML = html;
      } else {
        btn.textContent = '⏰ 启动调度器';
        btn.style.background = '#FF9800';
        const enabled = ALL_ENTRIES().filter(e => isEnabled(e.module));
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

  // ----- 4. 设施安装（智能调度）-----
  // 原脚本限定 3 项：广播/海报/老鼠夹（不放节油器/蟑螂药）
  // 只用长效，不用金牌/百分百/阿猫独家
  // 新版 URL: /xz/restaurant_facility（概览） + /xz/restaurant_facility_set_{1,2,4}_0（设置）
  // 流程：概览页找"未设置"的 3 项之一 → 点"设置" → 在设置页选对应长效道具"使用"
  // 库存不足时：购买长效设施（prop_13/14/40，需 3-4 星）
  MOD.facility = {
    match: (p) => /\/xz\/restaurant_facility($|_set_)/.test(p) || /\/xz\/prop_(13|14|40)$/.test(p),
    schedule: 'facility',
    TARGETS: [
      { name: '广播',   setHref: '/xz/restaurant_facility_set_1_0', setupText: '长效宣传广播', propId: 13, buyPage: '/xz/prop_13' },
      { name: '海报',   setHref: '/xz/restaurant_facility_set_2_0', setupText: '长效手绘海报', propId: 14, buyPage: '/xz/prop_14' },
      { name: '老鼠夹', setHref: '/xz/restaurant_facility_set_4_0', setupText: '长效老鼠夹',   propId: 40, buyPage: '/xz/prop_40' },
    ],
    MIN_COUNT: 5,  // 与旧脚本一致：库存低于 5 时补货
    recordMinRemaining() {
      let minMs = Number.MAX_SAFE_INTEGER;
      document.querySelectorAll('p').forEach(p => {
        const txt = p.textContent;
        const combined = txt.match(/剩余\s*(\d+)\s*天\s*(\d+)\s*小时/);
        const hourOnly = txt.match(/剩余\s*(\d+)\s*小时/);
        const minOnly = txt.match(/剩余\s*(\d+)\s*分钟/);
        const ms = combined ? (+combined[1] * 86400000 + +combined[2] * 3600000)
          : hourOnly ? +hourOnly[1] * 3600000
          : minOnly ? +minOnly[1] * 60000 : 0;
        if (ms > 0 && ms < minMs) minMs = ms;
      });
      Utils.gset('facility_min_remaining_ms', minMs < Number.MAX_SAFE_INTEGER ? minMs : 0);
      if (minMs < Number.MAX_SAFE_INTEGER) Utils.log(`设施: 最短剩余 ${Math.round(minMs / 3600000)}h`);
    },
    async run() {
      const path = location.pathname;

      // 4.1 概览页：仅处理 3 个目标中"未设置"的项
      if (path === '/xz/restaurant_facility') {
        this.recordMinRemaining();
        for (const t of this.TARGETS) {
          // 找包含 "t.name：未设置" 的 p 行 → 其内的"设置"链接
          const setLink = Array.from(document.querySelectorAll('a[href="' + t.setHref + '"]')).find(a => {
            const row = a.closest('p') || a.parentElement;
            return row && row.textContent.includes(t.name) && row.textContent.includes('未设置');
          });
          if (setLink) {
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(setLink);
            Utils.log(`设施: ${t.name} 未设置，进入设置`);
            return false;
          }
        }
        Utils.log('设施: 3 项目标设施全部已设置');
        return true;
      }

      // 4.2 设置页：用 setupText 精确匹配长效道具
      if (path.startsWith('/xz/restaurant_facility_set_')) {
        const target = this.TARGETS.find(t => path === t.setHref);
        if (!target) {
          Utils.log(`设施: ${path} 非目标，跳过`);
          return true;
        }
        // 找包含 setupText 的 p 行
        const itemRow = Array.from(document.querySelectorAll('p')).find(p =>
          p.textContent.includes(target.setupText)
        );
        if (itemRow) {
          // 解析库存：尝试多种格式 "× N" / "(N个)" / "拥有N个" / "剩余N"
          const countMatch = itemRow.textContent.match(/[×x]\s*(\d+)/) ||
                             itemRow.textContent.match(/[（(](\d+)\s*个?[）)]/) ||
                             itemRow.textContent.match(/拥有\s*(\d+)\s*个/) ||
                             itemRow.textContent.match(/剩余\s*(\d+)/);
          const have = countMatch ? +countMatch[1] : 0;
          Utils.log(`设施: ${target.setupText} 库存 ${have}`);

          // 库存 < MIN_COUNT 时优先去购买（即使有"使用"按钮也先补库存）
          if (have < this.MIN_COUNT) {
            const buyLink = Array.from(document.querySelectorAll('a')).find(a =>
              (a.getAttribute('href') || '') === target.buyPage
            );
            if (buyLink) {
              await Utils.sleep(Utils.randMs(1, 2));
              Utils.click(buyLink);
              Utils.log(`设施: 库存 ${have} < ${this.MIN_COUNT}，跳购买 ${target.buyPage}`);
              return false;
            }
            Utils.warn(`设施: 库存不足但未找到购买链接 ${target.buyPage}`);
            return true;
          }

          // 库存够 → 找"使用"按钮
          const useBtn = Array.from(itemRow.querySelectorAll('a')).find(a => a.textContent.trim() === '使用');
          if (useBtn) {
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(useBtn);
            Utils.log(`设施: 已使用 ${target.setupText} (库存 ${have})`);
            return false;
          }
          Utils.log(`设施: 库存 ${have} 充足但未找到使用按钮`);
          return true;
        }
        Utils.log(`设施: 未找到 ${target.setupText} 行`);
        return true;
      }

      // 4.3 购买页（prop_13/14/40）：买 10 个长效设施
      if (/^\/xz\/prop_(13|14|40)$/.test(path)) {
        const buy10 = Utils.findByText('a', '购买10个');
        if (buy10) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(buy10);
          Utils.log(`设施: 购买10个 ${path.split('_').pop()}`);
          return false;
        }
        // 备用：找其他购买链接
        const anyBuy = Array.from(document.querySelectorAll('a')).find(a =>
          (a.textContent || '').includes('购买') && (a.getAttribute('onclick') || '').match(/buy\(\s*0\s*,\s*\d+\s*,\s*\d+/)
        );
        if (anyBuy) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(anyBuy);
          Utils.log('设施: 备用购买链接已点击');
          return false;
        }
        Utils.warn('设施: 购买页未找到购买按钮');
        return true;
      }
      return true;
    },
  };

  // ----- 5. 食神拜访（v2: see() 而非 seeGod()）-----
  MOD.god = {
    match: (p) => p === '/xz/god',
    schedule: 'daily',
    async run() {
      // 实际按钮: a[onclick="see()"] 文本"拜访食神"
      const btn = document.querySelector('a[onclick="see()"]') ||
                  Utils.findByText('a', '拜访食神');
      if (!btn) {
        Utils.log('食神: 今日已拜访');
        Utils.showStatus('食神', '今日已完成');
        return true;
      }
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(btn);
      Utils.log('食神: 已点击拜访');
      return false;
    },
  };

  // ----- 6. 食材采购（特价 + 常驻菜补货）-----
  // 整合自原 v5.3 整点食材采购助手的关键逻辑：
  //   1) 特价（buyDiscountFood，6-23 整点刷新）— 全买
  //   2) 常驻菜（buyFood：input + 按钮）— 库存 < 950 时补到 950
  //      1 级：≤519金 → 强制补到 950
  //      2 级：≤2650金 → 强制补到 950；鸡肉/猪肉无视价格强制补
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
      FORCE_BUY_2: ['鸡肉', '猪肉'],  // 强制购买的 2 级菜（无视价格）
      BUY_CAP_PER_FIRE: 999,     // 单次 buyFood 输入框上限
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

      // 6.2 常驻菜补货：解析 [N级]菜名(M) 价格金 + input.s_input + a[onclick^="buyFood"]
      const staples = this.parseStapleFoods();
      if (staples.length === 0) {
        Utils.log('市场: 无常驻菜');
        return true;
      }
      const needBuy = staples.filter(f => this.shouldBuyStaple(f));
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
      const buyAmount = Math.min(foodToBuy.targetStock - foodToBuy.currentStock, this.CONFIG.BUY_CAP_PER_FIRE);
      if (buyAmount <= 0) return true;

      Utils.log(`市场: 准备补 ${foodToBuy.name} (${foodToBuy.level}级) ${foodToBuy.currentStock}→${foodToBuy.targetStock}, 本次买 ${buyAmount}`);

      // 设置数量并触发购买
      await this.fillBuyAmount(foodToBuy.input, buyAmount);
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(foodToBuy.buyButton);
      Utils.log(`市场: 已点击 buyFood(${foodToBuy.foodIndex}, ${foodToBuy.foodId})`);
      return false;
    },

    // 解析常驻菜：返回 { level, name, currentStock, price, input, buyButton, foodIndex, foodId, element }
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
        const buyBtn = p.querySelector("a[onclick^='buyFood']");
        if (!input || !buyBtn) continue;
        const onclick = buyBtn.getAttribute('onclick') || '';
        const fm = onclick.match(/buyFood\((\d+),(\d+)\)/);
        if (!fm) continue;
        out.push({
          level, name, currentStock, price,
          targetStock: level === 1 ? this.CONFIG.LEVEL1_TARGET : this.CONFIG.LEVEL2_TARGET,
          input, buyButton: buyBtn,
          foodIndex: +fm[1], foodId: +fm[2],
          element: p,
        });
      }
      return out;
    },

    // 是否应当触发补货
    shouldBuyStaple(f) {
      const C = this.CONFIG;
      if (f.level === 1) {
        return f.price <= C.LEVEL1_MAX_PRICE && f.currentStock < C.LEVEL1_TARGET;
      }
      if (f.level === 2) {
        const isForce = C.FORCE_BUY_2.includes(f.name);
        const priceOk = f.price <= C.LEVEL2_MAX_PRICE;
        return f.currentStock < C.LEVEL2_TARGET && (isForce || priceOk);
      }
      return false;
    },

    // 填入数量（多方式确保触发）
    async fillBuyAmount(input, amount) {
      input.value = String(amount);
      input.setAttribute('value', String(amount));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
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
    MAX_ROACH_ATTEMPTS: 20,
    MAX_DIG_ATTEMPTS: 120,

    // 9.1 概览页：添油 + 扫感染楼层 → 导航去第一层
    async processOverview() {
      if (await this.addOil()) return false;

      if (!Utils.gget('restaurant_cockroach', false)) {
        Utils.log('餐厅: 蟑螂开关关，跳过楼层扫描');
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

    // 9.2 楼层页：打蟑 + 翻柜 + 跳下一感染楼层（或回概览）
    async processFloor() {
      const resultText = document.body.textContent || '';
      if (Utils.gget('restaurant_cockroach', false)) {
        const attempts = Utils.gget('restaurant_roach_attempts', 0);
        if (/体力不足|打蟑螂失败|无法继续打/.test(resultText)) {
          Utils.warn('餐厅: 打蟑螂已停止（体力不足或操作失败）');
          Utils.gset('restaurant_cockroach', false);
        } else if (attempts >= this.MAX_ROACH_ATTEMPTS) {
          Utils.warn(`餐厅: 打蟑螂达到每轮 ${this.MAX_ROACH_ATTEMPTS} 次上限，自动关闭`);
          Utils.gset('restaurant_cockroach', false);
        } else {
          const roachBtns = Array.from(document.querySelectorAll("a[onclick^='killCockroach']"));
          if (roachBtns.length > 0) {
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.gset('restaurant_roach_attempts', attempts + 1);
            Utils.click(roachBtns[0]);
            Utils.log(`餐厅: 清除本页第一个蟑螂（本轮 ${attempts + 1}/${this.MAX_ROACH_ATTEMPTS}，本页共 ${roachBtns.length} 个）`);
            return false;
          }
          Utils.log('餐厅: 当前楼层无蟑螂');
        }
      }
      if (Utils.gget('restaurant_dig', false)) {
        if (/体力不足|翻橱柜失败|无法继续翻/.test(resultText)) {
          Utils.log('餐厅: 翻柜已停止（体力不足或操作失败）');
          Utils.gset('restaurant_dig', false);
        } else {
          const attempts = Utils.gget('restaurant_dig_attempts', 0);
          if (attempts >= this.MAX_DIG_ATTEMPTS) {
            Utils.warn(`餐厅: 翻柜达到每轮 ${this.MAX_DIG_ATTEMPTS} 次上限，自动关闭翻柜`);
            Utils.gset('restaurant_dig', false);
          } else {
            const digBtns = Array.from(document.querySelectorAll("a[onclick^='digOne']"));
            if (digBtns.length > 0) {
              const pick = digBtns[Math.floor(Math.random() * digBtns.length)];
              await Utils.sleep(Utils.randMs(1, 2));
              Utils.gset('restaurant_dig_attempts', attempts + 1);
              Utils.click(pick);
              Utils.log(`餐厅: 已翻柜（本轮 ${attempts + 1}/${this.MAX_DIG_ATTEMPTS}）`);
              return false;
            }
          }
        }
      }

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
      if (!Utils.gget('restaurant_oil', true)) {
        Utils.log('餐厅: 添油开关关');
        return false;
      }
      const oilText = Utils.findByTextIncludes('p', '油壶：')?.textContent || '';
      const m = oilText.match(/(\d+)\s*\/\s*(\d+)/);
      if (!m) return false;
      const cur = +m[1], max = +m[2];
      if (cur < 11000) {
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
      const cockroachImgs = document.querySelectorAll(
        'img[src*="cockroach"], img[alt*="蟑螂"], img[alt*="cockroach"], img[title*="蟑螂"]'
      );
      cockroachImgs.forEach(img => {
        const tryMatch = (el) => {
          while (el) {
            if (el.tagName === 'A' && /\/xz\/restaurant_\d+_\d+/.test(el.getAttribute('href') || '')) {
              const m = el.href.match(/_(\d+)$/);
              if (m) floors.add(+m[1]);
              return true;
            }
            el = el.previousElementSibling || el.nextElementSibling;
          }
          return false;
        };
        if (!tryMatch(img.previousElementSibling)) {
          tryMatch(img.nextElementSibling);
        }
      });

      // 备用：扫文本含"感染"/"蟑螂"的行
      if (floors.size === 0) {
        document.querySelectorAll('p, tr, div').forEach(row => {
          const txt = row.textContent;
          if ((txt.includes('感染') || txt.includes('蟑螂')) && txt.length < 200) {
            const link = row.querySelector('a[href*="/xz/restaurant_"]');
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
      const link = Array.from(document.querySelectorAll('a')).find(a => {
        const h = a.getAttribute('href') || '';
        return /\/xz\/restaurant_\d+_\d+/.test(h) && h.endsWith(`_${floor}`);
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
        return this.processOverview();
      }
      if (/\/xz\/restaurant_\d+_\d+/.test(path)) {
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
  //   recipe_learn: 是否自动学习（默认 true）
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
        learn: Utils.gget('recipe_learn', true),
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
          const cur = this.LEVEL_MAP[lvlText];
          if (cur === undefined) continue;
          if (cur >= targetValue) continue;
          const link = p.querySelector('a[href^="/xz/cook_"]');
          if (link && blocked.includes(link.getAttribute('href') || '')) continue;
          if (link) return { name: link.textContent.trim(), level: lvlText, link };
        }
      }
      return null;
    },

    // 找未学习项（无"已学习"或"可升级"标记）
    findLearnItem() {
      const sections = document.querySelectorAll('.gen_background_blue.s_room.s_font');
      for (const section of sections) {
        for (const p of section.querySelectorAll('p')) {
          const txt = p.textContent;
          if (/已学习|可升级|等级[:：]/.test(txt)) continue;
          const link = p.querySelector('a[href^="/xz/cook_"]');
          if (link) {
            return { name: link.textContent.trim(), link };
          }
        }
      }
      return null;
    },

    // 找下一页
    findNextPage(street) {
      return Array.from(document.querySelectorAll('a')).find(a => {
        const t = (a.textContent || '').trim();
        const href = a.getAttribute('href') || '';
        const sameUpgradableCategory = new RegExp(`^/xz/cookbook_${street}_3_\\d+$`).test(href);
        return sameUpgradableCategory && (t === '下一页' || t === '下一頁' || t === '>>' || t === 'Next');
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
      if (cfg.learn) {
        const learnBtn = Utils.findByText('a', '学习');
        if (learnBtn) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(learnBtn);
          Utils.log('食谱: 已点学习');
          return false;
        }
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
    async run() {
      if (location.pathname === '/xz/guardian') {
        // 检查爆裂飞弹库存
        const text = Array.from(document.querySelectorAll('p')).map(p => p.textContent).join(' ');
        const m = text.match(/\[爆裂飞弹\][\s\S]{0,30}?拥有(\d+)个/);
        const have = m ? +m[1] : 0;

        // 发射按钮: a[onclick="guardianLaunch(82, 1)"] 文本"发射"
        const launchBtn = Array.from(document.querySelectorAll('a')).find(a => {
          const oc = a.getAttribute('onclick') || '';
          return oc.includes('guardianLaunch') && oc.includes('82') && oc.includes(',1)');
        });
        if (!launchBtn) {
          Utils.log('守护者: 已被击败或按钮未找到');
          Utils.showStatus('守护者', '已完成');
          return true;
        }
        if (have > 0) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(launchBtn);
          Utils.log(`守护者: 发射爆裂 (库存 ${have})`);
          return false;
        } else {
          // 库存不足去商店
          const shopLink = Array.from(document.querySelectorAll('a')).find(a =>
            (a.getAttribute('href') || '') === '/xz/prop_82'
          );
          if (shopLink) {
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(shopLink);
            Utils.log('守护者: 库存不足去商店');
            return false;
          }
          Utils.warn('守护者: 库存不足且找不到爆裂飞弹商店入口');
          return true;
        }
      } else {
        // /xz/prop_82 商店页：与旧脚本一致，库存不足时补到约 300 个
        const text = document.body.textContent;
        const have = +(text.match(/(?:拥有|库存)\s*(\d+)\s*个/)?.[1] || 0);
        if (have >= 300) {
          const back = document.querySelector('a[onclick="backPage()"]') || Utils.findByText('a', '返回前页');
          if (back) {
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(back);
            Utils.log(`守护者: 飞弹库存 ${have}，返回继续攻击`);
            return false;
          }
          return true;
        }
        const input = document.getElementById('buy_num');
        const buy = document.querySelector('a[onclick="buyByActivity(0,82,0)"]');
        if (input && buy) {
          input.value = '300';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(buy);
          Utils.log('守护者: 已提交购买 300 个爆裂飞弹');
          return false;
        }
        Utils.warn('守护者: 商店页未找到数量框或购买按钮');
        return true;
      }
    },
  };

  // ==================== 可配置每日项目 ====================
  const DailyProjectState = {
    load(key) {
      const day = gameDayKey();
      const state = Utils.gget(`project_state_${key}`, null);
      if (!state || state.day !== day) {
        const fresh = { day, counts: {}, pending: null, visited: [], tried: [], page: 1 };
        Utils.gset(`project_state_${key}`, fresh);
        return fresh;
      }
      state.counts ||= {};
      state.visited ||= [];
      state.tried ||= [];
      return state;
    },
    save(key, state) { Utils.gset(`project_state_${key}`, state); },
    remaining(id, state) { return projectEnabled(id) ? Math.max(0, projectTarget(id) - (state.counts[id] || 0)) : 0; },
  };

  // 好友项目：逐个好友、逐层扫描；只在页面明确返回成功时增加进度。
  MOD.dailyFriend = {
    match: (p) => /^\/xz\/friend(?:_0_\d+)?$/.test(p) || /^\/xz\/restaurant_\d+_\d+$/.test(p),
    schedule: 'daily-project',
    requiresScheduled: true,
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
        Utils.warn('每日好友: 已扫描全部好友，未完成的项目留待明日/下轮');
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
          : `${type}:${uid}:${floor}:${button.getAttribute('onclick') || button.textContent.trim()}`) : '';
        if (button && !state.tried.includes(signature) && DailyProjectState.remaining(type, state) > 0) {
          state.pending = { type, uid, floor, signature };
          DailyProjectState.save('friend', state);
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(button);
          return false;
        }
      }

      const floorLinks = Array.from(document.querySelectorAll(`a[href^="/xz/restaurant_${uid}_"]`));
      const nextFloor = floorLinks.find(a => {
        const m = (a.getAttribute('href') || '').match(/_(\d+)$/);
        return m && +m[1] === floor + 1;
      });
      const markedRoachFloor = floorLinks.find(a =>
        a.nextElementSibling?.matches?.('img[src="/readImg/xz_cockroach"]')
      );
      // 翻柜仍需逐层；只剩蟑螂时直接跳到图标标记楼层，不再1→5盲扫。
      const floorToVisit = DailyProjectState.remaining('dig', state) > 0
        ? nextFloor
        : (DailyProjectState.remaining('roach', state) > 0 ? markedRoachFloor : null);
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

  // 酒吧项目：猜拳/猜杯按动作完成次数，猜数字遵守页面每日一次限制。
  MOD.dailyBar = {
    match: (p) => ['/xz/bar', '/xz/fist', '/xz/cup', '/xz/number'].includes(p),
    schedule: 'daily-project',
    requiresScheduled: true,
    async run() {
      const state = DailyProjectState.load('bar');
      const text = document.body.textContent || '';
      if (state.pending) {
        const type = state.pending;
        if (!/礼券不足|操作失败|无法参与/.test(text)) {
          state.counts[type] = (state.counts[type] || 0) + 1;
          Utils.log(`每日酒吧: ${type} ${state.counts[type]}/${projectTarget(type)}`);
        } else {
          Utils.warn(`每日酒吧: ${type} 失败，本次不计数`);
        }
        state.pending = null;
        DailyProjectState.save('bar', state);
      }
      if (['wenjie', 'fist', 'cup', 'number'].every(id => DailyProjectState.remaining(id, state) <= 0)) return true;

      const go = async (href) => {
        const link = document.querySelector(`a[href="${href}"]`);
        if (!link) return false;
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(link);
        return true;
      };

      if (location.pathname === '/xz/bar') {
        if (DailyProjectState.remaining('wenjie', state) > 0) {
          const visit = Array.from(document.querySelectorAll('a[onclick="see()"]'))
            .find(a => a.textContent.trim() === '拜访雯姐');
          if (visit) {
            state.pending = 'wenjie';
            DailyProjectState.save('bar', state);
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(visit);
            Utils.log('每日酒吧: 已点击拜访雯姐');
            return false;
          }
          // 每日按钮消失就是服务端的已完成态；兼容升级后本地尚无计数的情况。
          state.counts.wenjie = projectTarget('wenjie');
          DailyProjectState.save('bar', state);
          Utils.log('每日酒吧: 今日已拜访雯姐');
        }
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
        // 第一轮猜中后页面会诱导用3张券继续；日常只需次数，先领奖退出再开新的一局。
        const stop = Array.from(document.querySelectorAll("a[onclick^='stopCupGuessing']"))[0];
        if (stop) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(stop);
          return false;
        }
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

  MOD.extraWish = {
    match: (p) => p === '/xz/wish',
    schedule: 'daily-project',
    requiresScheduled: true,
    async run() {
      const state = DailyProjectState.load('wish');
      const text = document.body.textContent || '';
      if (state.pending) {
        if (!/许愿失败|许愿果不足|无法许愿/.test(text)) state.counts.extraWish = (state.counts.extraWish || 0) + 1;
        state.pending = null;
        DailyProjectState.save('wish', state);
      }
      if (DailyProjectState.remaining('extraWish', state) <= 0) return true;
      const btn = document.querySelector('a[onclick="makeWish(1)"]');
      if (!btn || /许愿果[^\d]*0/.test(text)) {
        Utils.warn('额外许愿: 无按钮或许愿果不足');
        return true;
      }
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
      const rows = Array.from(document.querySelectorAll('p')).map(p => p.textContent.replace(/\s+/g, ' ').trim());
      const readProgress = (label) => {
        const row = rows.find(t => t.includes(label));
        const m = row?.match(/(\d+)\s*\/\s*(\d+)/);
        return m ? +m[1] : 0;
      };
      const friend = DailyProjectState.load('friend');
      friend.counts.like = Math.max(friend.counts.like || 0, readProgress('点赞/被赞'));
      friend.counts.dig = Math.max(friend.counts.dig || 0, readProgress('翻橱柜'));
      friend.counts.roach = Math.max(friend.counts.roach || 0, readProgress('打蟑螂'));
      DailyProjectState.save('friend', friend);
      const bar = DailyProjectState.load('bar');
      const combined = readProgress('酒吧猜拳/猜酒杯');
      const fistFromPage = Math.min(projectTarget('fist'), combined);
      bar.counts.fist = Math.max(bar.counts.fist || 0, fistFromPage);
      bar.counts.cup = Math.max(bar.counts.cup || 0, Math.max(0, combined - fistFromPage));
      bar.counts.number = Math.max(bar.counts.number || 0, readProgress('酒吧猜数字'));
      DailyProjectState.save('bar', bar);

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

  // ----- 14. 扭蛋（每日任务 + 实际扭）-----
  MOD.egg = {
    match: (p) => p === '/xz/activity_egg',
    schedule: 'daily',
    async run() {
      // 14.1 任务领奖: getEggTicket(0) — 在任务行末尾 "领取[扭蛋券]×1"
      // 注意: 页面上有装饰性 emoji <a onclick="getEggAward(N)"> 不要误用
      const ticketBtns = Array.from(document.querySelectorAll("a[onclick^='getEggTicket']"));
      // 排除已领取（已领取的任务行不会显示领取链接），未达成的也不会显示
      if (ticketBtns.length > 0) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(ticketBtns[0]);
        Utils.log(`扭蛋: 领取本页第一张任务券（共 ${ticketBtns.length} 张）`);
        return false;
      }

      // 14.2 实际扭蛋: getEgg() 文本"扭蛋"
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
    { id: 'god',     module: 'god',     target: '/xz/god',             nav: '食神',             slot: '7:30',  jitterMin: 0,   jitterMax: 15, runOnce: true, runMs: 5000 },
    { id: 'box',     module: 'box',     target: '/xz/box',             nav: '酒吧', route: [{ text: '酒吧', href: '/xz/bar' }, { text: '开宝箱', href: '/xz/box' }], slot: '7:30', jitterMin: 0, jitterMax: 15, runOnce: true, runMs: 8000 },
    { id: 'foodCoupon', module: 'foodCoupon', target: '/xz/warehouse', nav: '仓库', slot: '7:30', jitterMin: 0, jitterMax: 15, runOnce: true, runMs: 30000 },
    { id: 'bag',     module: 'bag',     target: '/xz/warehouse_2_0',   nav: '仓库', route: [{ text: '仓库', href: '/xz/warehouse' }, { text: '礼包', href: '/xz/warehouse_2_0' }], slot: '7:30', jitterMin: 0, jitterMax: 15, runOnce: true, runMs: 8000 },

    // 早饭后每日项目。资源项目用独立面板开关/次数控制，搬家不纳入。
    { id: 'vitalityProbe', module: 'vitality', target: '/xz/restaurant_vitality', nav: '今日活跃', slot: '7:40', jitterMin: 0, jitterMax: 0, runOnce: true, runMs: 5000 },
    { id: 'dailyFriend', module: 'dailyFriend', target: '/xz/friend', nav: '好友', route: [{ text: '好友', href: '/xz/friend' }], slot: '7:50', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 180000 },
    { id: 'dailyBar', module: 'dailyBar', target: '/xz/bar', nav: '广场', route: [{ text: '广场', href: '/xz/square' }, { text: '酒吧', href: '/xz/bar' }], slot: '7:50', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 180000 },
    { id: 'extraWish', module: 'extraWish', target: '/xz/wish', nav: '许愿', slot: '7:50', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 60000 },

    // 早饭项目完成后领奖；晚饭后只复查领奖。临时活动入口消失时 optional 跳过。
    { id: 'vitalityMorning', module: 'vitality', target: '/xz/restaurant_vitality', nav: '今日活跃', slot: '8:30', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 10000 },
    { id: 'seasonMorning', module: 'season', target: '/xz/activity_season', nav: '>>夏日签到活动<<', slot: '8:30', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 10000, optional: true },
    { id: 'eggMorning', module: 'egg', target: '/xz/activity_egg', nav: '>>小镇扭蛋活动<<', slot: '8:30', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 30000, optional: true },
    { id: 'vitalityEvening', module: 'vitality', target: '/xz/restaurant_vitality', nav: '今日活跃', slot: '18:30', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 10000 },
    { id: 'seasonEvening', module: 'season', target: '/xz/activity_season', nav: '>>夏日签到活动<<', slot: '18:30', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 10000, optional: true },
    { id: 'eggEvening', module: 'egg', target: '/xz/activity_egg', nav: '>>小镇扭蛋活动<<', slot: '18:30', jitterMin: 0, jitterMax: 5, runOnce: true, runMs: 30000, optional: true },

    // 24h 独立硬定时（严格从上次跑完算起 24h）
    { id: 'guardian', module: 'guardian', target: '/xz/guardian', nav: '神殿', route: [{ text: '神殿', href: '/xz/temple' }, { text: '挑战守护者', href: '/xz/guardian' }], slot: '24h', jitterMin: 0, jitterMax: 0, runOnce: true, runMs: 10000 },
    { id: 'recipe', module: 'recipe', target: '/xz/cookbook', nav: '食谱', route: [{ text: '食谱', href: '/xz/cookbook' }, { text: '可升级', hrefPattern: '^/xz/cookbook_\\d+_3_1$' }], slot: '24h', jitterMin: 0, jitterMax: 0, runOnce: true, runMs: 30000 },
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

    // 餐厅：17-45min 随机循环（页面状态随机：蟑螂可能随时出，翻柜随机）
    {
      id: 'restaurant', module: 'restaurant', target: '/xz/restaurant', nav: '餐厅', route: [{ href: '/xz/restaurant' }], runMs: 30000,
      computeNext() {
        return Utils.getServerTime().getTime() + Utils.randMs(17 * 60, 45 * 60);  // 1020-2700s
      },
    },

    // 系统邮箱：餐厅收尾回首页后立即检查；平时跟随下一次餐厅，不独立抢跑。
    {
      id: 'mailboxAfterRestaurant', module: 'mailbox', target: '/xz/mailbox_0_1', nav: '系统邮箱', route: [{ href: '/xz/mailbox_0_1' }], runMs: 30000,
      computeNext() {
        const nowMs = Utils.getServerTime().getTime();
        const restaurantNext = Utils.gget('sched_restaurant_nextAt', 0);
        return restaurantNext > nowMs ? restaurantNext + 60000 : nowMs + 3600000;
      },
    },

    // 设施：智能调度 — 跟随最短剩余时间的设施 +1h 后重试
    // facility_min_remaining_ms 是"持续时间"（毫秒），不是时间戳
    {
      id: 'facility', module: 'facility', target: '/xz/restaurant_facility', nav: '设施', runMs: 25000,
      computeNext() {
        const remainingMs = Utils.gget('facility_min_remaining_ms', 0);
        const offsetMs = 3600000;  // +1h 缓冲
        const nowMs = Utils.getServerTime().getTime();
        // 剩余时间未知 → 1h 后首次执行
        if (!remainingMs) return nowMs + offsetMs;
        // 过期 + 偏移 → 触发时间 = now + 剩余 + 1h
        const trigger = nowMs + Math.min(remainingMs + offsetMs, 24 * 3600000);
        return trigger > nowMs ? trigger : nowMs + 60000;
      },
    },
  ];

  const ALL_ENTRIES = () => [...DAILY_SCHEDULE, ...DYNAMIC_SCHEDULE];

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

    start() {
      // 互斥：若 AutoPilot 在跑，先停它
      if (typeof AutoPilot !== 'undefined' && AutoPilot.isOn()) {
        AutoPilot.stop('调度器启动', { resumeScheduler: false });
      }
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
          .filter(entry => entry.nextRunAt && entry.nextRunAt <= nowMs && isEnabled(entry.module))
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
        const saved = Utils.gget(`sched_${e.id}_nextAt`, 0);
        // 已到点但尚未完成的计划必须保留；只有完成时 onReturnFromTarget 才清零。
        e.nextRunAt = saved > 0 ? saved : this.computeFixedNext(e, nowMs);
        Utils.gset(`sched_${e.id}_nextAt`, e.nextRunAt);
      });

      DYNAMIC_SCHEDULE.forEach(e => {
        const saved = Utils.gget(`sched_${e.id}_nextAt`, 0);
        e.nextRunAt = saved > 0 ? saved : e.computeNext();
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

      const enabled = ALL_ENTRIES().filter(e => e.nextRunAt && isEnabled(e.module));
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
      });
      if (entry.module === 'restaurant') {
        Utils.gset('restaurant_roach_attempts', 0);
        Utils.gset('restaurant_dig_attempts', 0);
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
      if (phase.id === 'energy') {
        const now = Utils.getServerTime();
        const h = now.getHours();
        const windows = [[7, 10], [12, 15], [18, 21]];
        for (let i = 0; i < windows.length; i++) {
          const [sH, eH] = windows[i];
          if (h >= sH && h < eH) {
            Utils.gset('sched_energy_lastWindow', i);
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
      { module: 'wish',       navSteps: [{ text: '许愿',                hrefMatch: '/xz/wish' }] },
      { module: 'god',        navSteps: [{ text: '食神',                hrefMatch: '/xz/god' }] },
      { module: 'box',        navSteps: [{ text: '酒吧',                hrefMatch: '/xz/bar' },
                                         { text: '开宝箱',              hrefMatch: '/xz/box' }] },
      { module: 'foodCoupon', navSteps: [{ text: '仓库',                hrefMatch: '/xz/warehouse' }] },
      { module: 'market',     navSteps: [{ text: '菜场',                hrefMatch: '/xz/market' }] },
      { module: 'dailyFriend', navSteps: [{ text: '好友',               hrefMatch: '/xz/friend' }] },
      { module: 'dailyBar',   navSteps: [{ text: '广场',                hrefMatch: '/xz/square' },
                                         { text: '酒吧',                hrefMatch: '/xz/bar' }] },
      { module: 'extraWish',  navSteps: [{ text: '许愿',                hrefMatch: '/xz/wish' }] },
      { module: 'vitality',   navSteps: [{ text: '今日活跃',            hrefMatch: '/xz/restaurant_vitality' }] },
      { module: 'season',     navSteps: [{ text: '>>夏日签到活动<<',    hrefMatch: '/xz/activity_season' }] },
      { module: 'egg',        navSteps: [{ text: '>>小镇扭蛋活动<<',    hrefMatch: '/xz/activity_egg' }] },
      { module: 'energy',     navSteps: [{ text: '吃饭活动',            hrefMatch: '/xz/activity_energy' }] },
      { module: 'restaurant', navSteps: [{ text: '餐厅',                hrefMatch: '/xz/restaurant' }] },
      { module: 'mailbox',    navSteps: [{ text: '',                    hrefMatch: '/xz/mailbox_0_1' }] },
      { module: 'facility',   navSteps: [{ text: '设施',                hrefMatch: '/xz/restaurant_facility' }] },
      { module: 'bag',        navSteps: [{ text: '仓库',                hrefMatch: '/xz/warehouse' },
                                         { text: '礼包',                hrefMatch: '/xz/warehouse_2_0' }] },
      { module: 'recipe',     navSteps: [{ text: '食谱',                hrefMatch: '/xz/cookbook' },
                                         { text: '可升级',              hrefPattern: '^/xz/cookbook_\\d+_3_1$' }] },
      { module: 'guardian',   navSteps: [{ text: '神殿',                hrefMatch: '/xz/temple' },
                                         { text: '守护者',              hrefMatch: '/xz/guardian' }] },
    ],
    stateKey: 'autopilot_state',

    isOn() { const s = Utils.gget(this.stateKey, null); return !!(s && s.enabled); },

    start() {
      // 互斥：若调度器在跑，先停它
      if (typeof Scheduler !== 'undefined' && Scheduler.isOn()) {
        Scheduler.stop('AutoPilot 启动');
      }
      Utils.gset('autopilot_emergency_stop', false);
      Utils.gset('restaurant_roach_attempts', 0);
      Utils.gset('restaurant_dig_attempts', 0);
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
      Utils.gset('autopilot_emergency_stop', false);
      Utils.gset('restaurant_roach_attempts', 0);
      Utils.gset('restaurant_dig_attempts', 0);
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

    stop(reason = '', { resumeScheduler = null } = {}) {
      const previousState = Utils.gget(this.stateKey, {});
      const shouldResumeScheduler = resumeScheduler === null
        ? (previousState.singleModule ? !!previousState.resumeSchedulerAfterSingle : true)
        : resumeScheduler;
      Utils.gset(this.stateKey, { enabled: false });
      Utils.gset('autopilot_session', null);
      Utils.log(`⏹ 自动计划停止${reason ? ': ' + reason : ''}`);
      Utils.showStatus('自动驾驶', '已停止', '#f44');
      if (shouldResumeScheduler && typeof Scheduler !== 'undefined' && !Scheduler.isOn()) {
        Utils.log(previousState.singleModule ? '单项运行: 已恢复原调度器状态' : '自动驾驶: 已交接长期循环调度器');
        Scheduler.start();
      }
    },

    async continue() {
      const state = Utils.gget(this.stateKey, null);
      if (!state || !state.enabled) return;

      // 紧急停止标志（外部 Esc/按钮可置位）
      if (Utils.gget('autopilot_emergency_stop', false)) {
        Utils.gset('autopilot_emergency_stop', false);
        this.stop('紧急停止', { resumeScheduler: false });
        return;
      }

      const session = Utils.gget('autopilot_session', null) || { iter: 0 };
      const path = location.pathname;
      session.iter = (session.iter || 0) + 1;
      // 守护者可能需要上百次单发，保留高上限防真死循环
      if (session.iter > 500) {
        Utils.warn(`自动驾驶: 单次会话迭代 ${session.iter} 次超限，强制停止`);
        this.stop('迭代超限保护');
        return;
      }
      Utils.gset('autopilot_session', session);

      const stepIdx = state.stepIndex || 0;
      const step = this.PLAN[stepIdx];

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
        Utils.log(`✓ 单项运行完成: ${state.singleModule}`);
        Utils.showStatus('单项运行', `${state.singleModule} 完成 ✓`, '#4CAF50');
        this.stop(`${state.singleModule} 单项完成`);
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
      const path = location.pathname;
      const activePhase = Scheduler.isOn() ? Utils.gget(PHASE_KEY, null) : null;
      Utils.log(`路由: ${path}`);
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
    Panel.create();
    if (Scheduler.isOn()) Scheduler.startWatchdog();
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
