// ==UserScript==
// @name         梦想小镇日常一体化 v3.4
// @namespace    http://tampermonkey.net/
// @version      3.4
// @description  全自动日常 + 任务穷举调度器：签到/许愿/吃饭/设施/食神/市场/食材券/礼包/餐厅/宝箱/食谱/守护者/季节签到/扭蛋
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
 *   每日 24h 硬定时   ：守护者/食谱
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

    getServerTime() {
      try {
        const ps = Array.from(document.querySelectorAll('p'));
        const el = ps.find(p => p.textContent.includes('驯鹿报时：'));
        if (el) {
          const m = el.textContent.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
          if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
        }
      } catch (e) {}
      return new Date();
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
  // 顺序：与 AutoPilot.PLAN 完全一致；非 PLAN 项放末尾
  // schedule: daily(每日7:30±15min) | hourly(整点) | restaurant(17-45min随机) | guardian(24h硬定时)
  //  | recipe(24h硬定时) | meal(每日3期) | facility(智能:剩余+1h)
  // 默认开关：与日常强相关且安全的默认开，付费/风险操作默认关
  const MODULE_DEFS = [
    // —— AutoPilot PLAN 顺序（13 项，含 foodCoupon/recipe）——
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
    // —— 不在 PLAN 内，可单独运行 ——
    { id: 'market',     label: '食材采购(整点)', default: false, schedule: 'hourly' },  // 花钱
  ];

  // 初始化 GM 默认值
  MODULE_DEFS.forEach(m => {
    if (Utils.gget(`mod_${m.id}_enabled`, null) === null) Utils.gset(`mod_${m.id}_enabled`, m.default);
  });

  const isEnabled = (id) => Utils.gget(`mod_${id}_enabled`, true);

  // 餐厅子开关
  ['restaurant_cockroach', 'restaurant_dig'].forEach(k => {
    if (Utils.gget(k, null) === null) Utils.gset(k, false);
  });

  // ==================== 控制面板 ====================
  const Panel = {
    create() {
      if (document.getElementById('dxzxx-panel')) return;
      GM_addStyle(`
        #dxzxx-panel{position:fixed;top:10px;right:10px;z-index:99999;background:rgba(255,255,255,.97);border:1px solid #ccc;border-radius:8px;padding:10px;box-shadow:0 4px 16px rgba(0,0,0,.15);font-size:12px;width:260px;font-family:Arial,sans-serif;max-height:90vh;overflow-y:auto;}
        #dxzxx-panel h3{margin:0 0 8px;font-size:14px;border-bottom:1px solid #eee;padding-bottom:6px;color:#333;}
        #dxzxx-panel .row{display:flex;justify-content:space-between;align-items:center;padding:3px 0;}
        #dxzxx-panel .row label{cursor:pointer;flex:1;}
        #dxzxx-panel .toggle{padding:2px 8px;border-radius:10px;font-size:11px;cursor:pointer;user-select:none;border:1px solid transparent;}
        #dxzxx-panel .toggle.on{background:#d4f7d4;color:#1a7a1a;border-color:#1a7a1a;}
        #dxzxx-panel .toggle.off{background:#f7d4d4;color:#a71a1a;border-color:#a71a1a;}
        #dxzxx-panel button{width:100%;padding:6px;margin-top:6px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;}
        #dxzxx-panel .run-btn{background:#4CAF50;color:white;}
        #dxzxx-panel .hide-btn{background:#eee;color:#666;margin-top:4px;}
        #dxzxx-panel .sub{padding-left:14px;font-size:11px;color:#666;}
        #dxzxx-panel details{margin-top:8px;padding-top:6px;border-top:1px solid #eee;}
        #dxzxx-panel summary{cursor:pointer;font-weight:bold;}
        #dxzxx-panel select{width:100%;padding:4px;margin:4px 0;border:1px solid #ccc;border-radius:4px;font-size:12px;}
        #dxzxx-panel .label{font-size:11px;color:#555;margin-top:4px;}
        #dxzxx-panel .plan-list{font-size:11px;color:#333;padding:6px 4px;line-height:1.6;max-height:200px;overflow-y:auto;background:#f9f9f9;border-radius:4px;margin-top:4px;}
        #dxzxx-panel .plan-list .step{display:flex;justify-content:space-between;padding:1px 4px;}
        #dxzxx-panel .plan-list .step.current{background:#FFE082;font-weight:bold;border-radius:3px;}
        #dxzxx-panel .plan-list .step.disabled{color:#aaa;text-decoration:line-through;}
        #dxzxx-fab{position:fixed;top:10px;right:10px;z-index:99999;background:#4fe;color:#000;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:16px;}
      `);

      const panel = document.createElement('div');
      panel.id = 'dxzxx-panel';
      panel.innerHTML = `<h3>🦌 梦想小镇日常 v3.4</h3><div id="dxzxx-rows"></div>
        <details>
          <summary>餐厅子开关</summary>
          <div class="row sub"><label>🪳 自动打蟑螂</label><span class="toggle ${Utils.gget('restaurant_cockroach', false) ? 'on' : 'off'}" data-sub="restaurant_cockroach">${Utils.gget('restaurant_cockroach', false) ? '开' : '关'}</span></div>
          <div class="row sub"><label>📦 自动翻橱柜</label><span class="toggle ${Utils.gget('restaurant_dig', false) ? 'on' : 'off'}" data-sub="restaurant_dig">${Utils.gget('restaurant_dig', false) ? '开' : '关'}</span></div>
        </details>
        <details>
          <summary>食谱升级配置</summary>
          <div class="label">目标等级</div>
          <select id="dxzxx-recipe-level">
            <option value="off">关闭升级</option>
            <option value="特色">升级到特色</option>
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
        <details>
          <summary>自动驾驶流程（13 步）</summary>
          <div id="dxzxx-plan-list" class="plan-list"></div>
        </details>
        <button class="run-btn" id="dxzxx-run">▶ 立即执行本页</button>
        <button class="run-btn" id="dxzxx-autopilot" style="background:#FF9800;color:#000;">🚀 自动跑全套日常</button>
        <button class="run-btn" id="dxzxx-stop" style="background:#f44;color:#fff;display:none;">⏹ 立即停止（Esc）</button>
        <details id="dxzxx-sched-wrap" style="margin-top:6px;">
          <summary style="cursor:pointer;color:#fff;font-size:13px;padding:6px;background:rgba(255,152,0,0.25);border-radius:4px;">⏰ 调度器（穷举 + 定时）</summary>
          <div style="padding:6px;background:rgba(0,0,0,0.15);border-radius:4px;margin-top:4px;">
            <div id="dxzxx-sched-status" style="font-size:12px;color:#fff;margin-bottom:6px;line-height:1.5;">⏸ 未启动</div>
            <div id="dxzxx-sched-list" style="font-size:11px;color:#aaa;margin-bottom:6px;max-height:140px;overflow-y:auto;"></div>
            <button class="run-btn" id="dxzxx-sched" style="background:#FF9800;color:#000;">⏰ 启动调度器</button>
            <button class="run-btn" id="dxzxx-sched-refresh" style="background:#666;color:#fff;font-size:11px;padding:4px 8px;">🔄 立即重算</button>
          </div>
        </details>
        <button class="hide-btn" id="dxzxx-hide">收起</button>`;
      document.body.appendChild(panel);

      const rows = panel.querySelector('#dxzxx-rows');
      MODULE_DEFS.forEach(m => {
        const enabled = isEnabled(m.id);
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `<label>${m.label}</label><span class="toggle ${enabled ? 'on' : 'off'}" data-id="${m.id}">${enabled ? '开' : '关'}</span>`;
        rows.appendChild(row);
      });

      panel.querySelectorAll('.toggle').forEach(t => {
        t.addEventListener('click', () => {
          const id = t.dataset.id;
          const sub = t.dataset.sub;
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
          } else if (sub) {
            const cur = t.classList.contains('on');
            Utils.gset(sub, !cur);
            t.classList.toggle('on');
            t.classList.toggle('off');
            t.textContent = !cur ? '开' : '关';
          }
        });
      });

      // 食谱等级下拉
      const recipeLevel = panel.querySelector('#dxzxx-recipe-level');
      if (recipeLevel) {
        const cur = Utils.gget('recipe_target_level', '金牌');
        recipeLevel.value = cur;
        recipeLevel.addEventListener('change', () => {
          Utils.gset('recipe_target_level', recipeLevel.value);
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
          if (AutoPilot.isOn()) { AutoPilot.stop('Esc 紧急停止'); stopped = true; }
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
        if (AutoPilot.isOn()) AutoPilot.stop('面板停止');
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
        if (h3) h3.innerHTML = `🦌 梦想小镇日常 v3.4 <span style="color:#FF9800;font-size:11px;">▶ ${stepIdx + 1}/${AutoPilot.PLAN.length} ${stepName}</span>`;
      } else {
        btn.textContent = '🚀 自动跑全套日常';
        btn.style.background = '#FF9800';
        btn.style.color = '#000';
        if (stopBtn) stopBtn.style.display = 'none';
        const h3 = document.querySelector('#dxzxx-panel h3');
        if (h3) h3.innerHTML = `🦌 梦想小镇日常 v3.4`;
      }
      // 同步刷新 PLAN 列表
      Panel.refreshPlanList();
    },

    // 渲染 PLAN 顺序列表
    refreshPlanList() {
      const list = document.getElementById('dxzxx-plan-list');
      if (!list || typeof AutoPilot === 'undefined') return;
      const state = Utils.gget('autopilot_state', {});
      const curStep = state.enabled ? (state.stepIndex || 0) : -1;
      const html = AutoPilot.PLAN.map((s, i) => {
        const enabled = isEnabled(s.module);
        const cls = [];
        if (i === curStep) cls.push('current');
        if (!enabled) cls.push('disabled');
        return `<div class="step ${cls.join(' ')}"><span>${i + 1}. ${s.module}</span><span>${enabled ? '✅' : '⏸'}</span></div>`;
      }).join('');
      list.innerHTML = html;
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
        return;
      }
      const btn = Array.from(document.querySelectorAll('a[href="/xz/sign_in"]')).find(a =>
        a.textContent.trim() === '签到' && !a.closest('.disabled')
      ) || Utils.findByText('a', '签到');
      if (btn) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(btn);
        Utils.log('签到: 已点击签到');
      } else {
        Utils.warn('签到: 未找到按钮');
      }
    },
  };

  // ----- 2. 许愿 -----
  // 免费许愿每日 4 次（基础）+ 食神の庇佑可能 + 额外次数；连点直到剩余 0 或按钮变灰
  MOD.wish = {
    match: (p) => p === '/xz/wish',
    schedule: 'daily',
    async run() {
      const MAX_FREE_WISHES = 4;  // 默认每日 4 次免费
      let clicked = 0;

      for (let i = 0; i < MAX_FREE_WISHES; i++) {
        const freeBtn = document.querySelector('a[onclick="makeWish(0)"]');
        if (!freeBtn) {
          Utils.log('许愿: 按钮消失，停止');
          break;
        }
        const statusSpan = freeBtn.nextElementSibling;
        const isGreen = statusSpan && statusSpan.classList && statusSpan.classList.contains('gen_green');
        if (!isGreen) {
          Utils.log('许愿: 已用完（颜色变灰）');
          break;
        }
        await Utils.sleep(Utils.randMs(1.5, 2.5));
        Utils.click(freeBtn);
        clicked++;
        Utils.log(`许愿: 第 ${clicked} 次已点击`);
      }
      Utils.showStatus('许愿', `已点击 ${clicked} 次`);
    },
  };

  // ----- 3. 吃饭/体力（每日 3 期）-----
  MOD.energy = {
    match: (p) => p === '/xz/activity_energy',
    schedule: 'meal',
    async run() {
      // 当前期餐次按钮: getActivityEnergy(N) 或文本"我吃"
      const btns = Array.from(document.querySelectorAll('a')).filter(a => {
        const oc = a.getAttribute('onclick') || '';
        return oc.startsWith('getActivityEnergy') || a.textContent.trim() === '我吃';
      });
      if (btns.length === 0) {
        Utils.log('体力: 当前期无可吃餐次');
        Utils.showStatus('体力', '无可吃');
        return;
      }
      await Utils.clickAll(btns, '体力');
      Utils.showStatus('体力', `已点击 ${btns.length} 个`);
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
    MIN_COUNT: 10,  // 库存低于此值时自动补到 10+
    async run() {
      const path = location.pathname;

      // 4.1 概览页：仅处理 3 个目标中"未设置"的项
      if (path === '/xz/restaurant_facility') {
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
            return;
          }
        }
        Utils.log('设施: 3 项目标设施全部已设置');
        return;
      }

      // 4.2 设置页：用 setupText 精确匹配长效道具
      if (path.startsWith('/xz/restaurant_facility_set_')) {
        const target = this.TARGETS.find(t => path === t.setHref);
        if (!target) {
          Utils.log(`设施: ${path} 非目标，跳过`);
          return;
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
              return;
            }
            Utils.warn(`设施: 库存不足但未找到购买链接 ${target.buyPage}`);
            return;
          }

          // 库存够 → 找"使用"按钮
          const useBtn = Array.from(itemRow.querySelectorAll('a')).find(a => a.textContent.trim() === '使用');
          if (useBtn) {
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(useBtn);
            Utils.log(`设施: 已使用 ${target.setupText} (库存 ${have})`);
            return;
          }
          Utils.log(`设施: 库存 ${have} 充足但未找到使用按钮`);
          return;
        }
        Utils.log(`设施: 未找到 ${target.setupText} 行`);
        return;
      }

      // 4.3 购买页（prop_13/14/40）：买 10 个长效设施
      if (/^\/xz\/prop_(13|14|40)$/.test(path)) {
        const buy10 = Utils.findByText('a', '购买10个');
        if (buy10) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(buy10);
          Utils.log(`设施: 购买10个 ${path.split('_').pop()}`);
          return;
        }
        // 备用：找其他购买链接
        const anyBuy = Array.from(document.querySelectorAll('a')).find(a =>
          (a.textContent || '').includes('购买') && (a.getAttribute('onclick') || '').match(/buy\(\s*0\s*,\s*\d+\s*,\s*\d+/)
        );
        if (anyBuy) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(anyBuy);
          Utils.log('设施: 备用购买链接已点击');
        }
      }

      // 4.4 概览页/设置页：扫描剩余时间，写入 GM（供 Scheduler.computeNext 计算下次）
      if (path === '/xz/restaurant_facility' || path.startsWith('/xz/restaurant_facility_set_')) {
        let minMs = Number.MAX_SAFE_INTEGER;
        document.querySelectorAll('p').forEach(p => {
          const txt = p.textContent;
          // 匹配"剩余 2天 5小时"或"剩余 23小时"或"剩余 30分钟"
          const combined = txt.match(/剩余\s*(\d+)\s*天\s*(\d+)\s*小时/);
          const hourOnly = txt.match(/剩余\s*(\d+)\s*小时/);
          const minOnly = txt.match(/剩余\s*(\d+)\s*分钟/);
          let ms = 0;
          if (combined) {
            ms = +combined[1] * 86400000 + +combined[2] * 3600000;
          } else if (hourOnly) {
            ms = +hourOnly[1] * 3600000;
          } else if (minOnly) {
            ms = +minOnly[1] * 60000;
          }
          if (ms > 0 && ms < minMs) minMs = ms;
        });
        if (minMs < Number.MAX_SAFE_INTEGER) {
          Utils.gset('facility_min_remaining_ms', minMs);
          Utils.log(`设施: 最短剩余 ${Math.round(minMs / 3600000)}h`);
        } else {
          // 找不到 → 默认 1h 后重试（避免下次马上又跑）
          Utils.gset('facility_min_remaining_ms', 0);
        }
      }
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
        return;
      }
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(btn);
      Utils.log('食神: 已点击拜访');
    },
  };

  // ----- 6. 食材采购（特价 + 每日菜场 + 常驻菜补货）-----
  // 整合自原 v5.3 整点食材采购助手的关键逻辑：
  //   1) 特价（buyDiscountFood，6-23 整点刷新）— 全买
  //   2) 每日菜场（buyDayFood，6/12/18 刷新）— 仅买 1 级 ≤600金 / 2 级 ≤2800金
  //   3) 常驻菜（buyFood：input + 按钮）— 库存 < 950 时补到 950
  //      1 级：≤519金 → 强制补到 950
  //      2 级：≤2650金 → 强制补到 950；鸡肉/猪肉无视价格强制补
  //   4) 金币不足 → 24h 冷却（GM 持久化），避免反复失败
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
      DAY_LEVEL1_MAX: 600,       // 每日菜场 1 级阈值
      DAY_LEVEL2_MAX: 2800,      // 每日菜场 2 级阈值
      BUY_CAP_PER_FIRE: 999,     // 单次 buyFood 输入框上限
    },

    async run() {
      // 6.0 冷却检查
      const cooldownUntil = Utils.gget('market_cooldown_until', 0);
      if (cooldownUntil > Date.now()) {
        const hours = Math.ceil((cooldownUntil - Date.now()) / 3600000);
        Utils.log(`市场: 金币不足冷却中（${hours}h 后恢复），跳本次`);
        return;
      }

      // 6.0b 检测页面是否提示金币不足
      if (Array.from(document.querySelectorAll('.gen_red, .gen_background_yellow'))
            .some(el => el.textContent.includes('金币不足'))) {
        Utils.warn('市场: 检测到金币不足，启动 24h 冷却');
        Utils.gset('market_cooldown_until', Date.now() + 24 * 3600000);
        Utils.gset('market_last_processed', '');
        return;
      }

      // 6.1 特价食材（整点 6-22 刷新）
      const discountBtns = Array.from(document.querySelectorAll("a[onclick^='buyDiscountFood']"));
      for (const btn of discountBtns) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(btn);
        Utils.log(`市场: 特价 ${btn.getAttribute('onclick')}`);
      }

      // 6.2 每日菜场（buyDayFood，6/12/18 刷新）：阈值过滤
      const dayFoods = Array.from(document.querySelectorAll("a[onclick^='buyDayFood(0,']"));
      for (const btn of dayFoods) {
        const m = btn.getAttribute('onclick').match(/buyDayFood\(0,(\d+),(\d+)\)/);
        if (!m) continue;
        const row = btn.closest('p') || btn.parentElement;
        const txt = row.textContent;
        const levelMatch = txt.match(/\[(\d+)级\]/);
        const priceMatch = txt.match(/(\d+)金币/);
        if (!levelMatch || !priceMatch) continue;
        const level = +levelMatch[1], price = +priceMatch[1];
        const hit = (level === 1 && price <= this.CONFIG.DAY_LEVEL1_MAX) ||
                    (level === 2 && price <= this.CONFIG.DAY_LEVEL2_MAX);
        if (!hit) continue;
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(btn);
        Utils.log(`市场: 每日菜场 L${level} ${price}金 触发`);
      }

      // 6.3 常驻菜补货：解析 [N级]菜名(M) 价格金 + input.s_input + a[onclick^="buyFood"]
      const staples = this.parseStapleFoods();
      if (staples.length === 0) {
        Utils.log('市场: 无常驻菜');
        return;
      }
      const needBuy = staples.filter(f => this.shouldBuyStaple(f));
      if (needBuy.length === 0) {
        Utils.log('市场: 常驻菜全部达标');
        Utils.gset('market_last_processed', '');
        return;
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
      if (buyAmount <= 0) return;

      Utils.log(`市场: 准备补 ${foodToBuy.name} (${foodToBuy.level}级) ${foodToBuy.currentStock}→${foodToBuy.targetStock}, 本次买 ${buyAmount}`);

      // 设置数量并触发购买
      await this.fillBuyAmount(foodToBuy.input, buyAmount);
      await Utils.sleep(Utils.randMs(1, 2));
      Utils.click(foodToBuy.buyButton);
      Utils.log(`市场: 已点击 buyFood(${foodToBuy.foodIndex}, ${foodToBuy.foodId})`);
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

  // ----- 7. 食材券（综合旧脚本 + 新页面结构）-----
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
    match: (p) => p === '/xz/warehouse_1_0' || /\/xz\/food_random_/.test(p),
    schedule: 'daily',
    CONFIG: {
      // 旧脚本 8 种 + 新页面常见食材/调料券
      PROP_IDS: [244, 21, 22, 23, 24, 25, 245, 224, 1, 2, 3, 4, 6, 7, 71, 80, 114, 115, 116, 117, 133, 142, 215, 220],
    },
    async run() {
      const path = location.pathname;

      // 7.1 食材随机页（/xz/food_random_<level>）：点"兑换"按钮
      if (/\/xz\/food_random_/.test(path)) {
        const level = path.split('_').pop().replace(/\D/g, '') || path.split('_').pop();
        const allBtns = Array.from(document.querySelectorAll('a'));
        // 优先找 random(level, 1000) 这种"全部兑换"
        let exchangeBtn = allBtns.find(a => {
          const oc = a.getAttribute('onclick') || '';
          return oc.includes(`random(${level},1000)`) || oc.includes(`random(${parseInt(level)},1000)`);
        });
        // 退化：找任何 random(level, N) 按钮
        if (!exchangeBtn) {
          exchangeBtn = allBtns.find(a => {
            const oc = a.getAttribute('onclick') || '';
            return /random\(\s*\d+\s*,\s*\d+\s*\)/.test(oc);
          });
        }
        if (exchangeBtn) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(exchangeBtn);
          Utils.log(`食材券: 兑换 level=${level}`);
          // 兑换后稍等再决定回仓库
          await Utils.sleep(Utils.randMs(2, 3));
          this.returnToWarehouse();
          return;
        }
        // 没有兑换按钮 → 直接返回
        Utils.log(`食材券: 兑换页无 random() 按钮，回仓库`);
        this.returnToWarehouse();
        return;
      }

      // 7.2 仓库页（/xz/warehouse_1_0）：找"食材券"类 usePropUrl → 点击
      const card = this.findUsableCard();
      if (card) {
        const oc = card.getAttribute('onclick') || '';
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(card);
        Utils.log(`食材券: 使用 ${oc}`);
        return;
      }
      Utils.log('食材券: 仓库无可用券');
    },

    // 查找可用的食材券卡片
    findUsableCard() {
      // 优先精确匹配 propIds
      const exact = Array.from(document.querySelectorAll('a[onclick^="usePropUrl(1,"]')).find(a => {
        const m = (a.getAttribute('onclick') || '').match(/usePropUrl\(1,(\d+)\)/);
        return m && this.CONFIG.PROP_IDS.includes(+m[1]);
      });
      if (exact) return exact;
      // 退化：找任何 usePropUrl(1, N) — 名字含"食材"/"调料"/"随机"
      const fallback = Array.from(document.querySelectorAll('a[onclick^="usePropUrl(1,"]')).find(a => {
        const row = a.closest('p') || a.parentElement;
        return row && /食材|调料|随机/.test(row.textContent);
      });
      return fallback || null;
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
        return;
      }
      Utils.warn('食材券: 找不到返回仓库链接');
    },
  };

  // ----- 8. 礼包开启 -----
  MOD.bag = {
    match: (p) => p === '/xz/warehouse_2_0',
    schedule: 'daily',
    async run() {
      const links = Array.from(document.querySelectorAll('a[onclick^="usePropUrl(2,"]'));
      if (links.length === 0) {
        Utils.log('礼包: 无可用');
        return;
      }
      await Utils.clickAll(links, '礼包');
      Utils.showStatus('礼包', `已点击 ${links.length} 个`);
    },
  };

  // ----- 9. 餐厅管理（17-45min 随机循环）-----
  // 关键修复：原实现把剩余楼层存在 sched_phase，会与 Scheduler 状态冲突
  // 现改用 restaurant_remaining_floors 独立 GM 字段，避免共享状态
  MOD.restaurant = {
    match: (p) => p === '/xz/restaurant' || /\/xz\/restaurant_\d+_\d+/.test(p),
    schedule: 'restaurant',

    // 9.1 概览页：添油 + 扫感染楼层 → 导航去第一层
    async processOverview() {
      await this.addOil();

      if (!Utils.gget('restaurant_cockroach', false)) {
        Utils.log('餐厅: 蟑螂开关关，跳过楼层扫描');
        Utils.gset('restaurant_remaining_floors', []);
        return;
      }

      const infected = this.detectInfectedFloors();
      if (infected.length === 0) {
        Utils.log('餐厅: 无感染楼层');
        Utils.gset('restaurant_remaining_floors', []);
        return;
      }

      const [first, ...rest] = infected;
      Utils.gset('restaurant_remaining_floors', rest);
      Utils.log(`餐厅: ${infected.length} 层感染 (${infected.join(',')})，先去 ${first} 楼`);
      await this.navigateToFloor(first);
    },

    // 9.2 楼层页：打蟑 + 翻柜 + 跳下一感染楼层（或回概览）
    async processFloor() {
      if (Utils.gget('restaurant_cockroach', false)) {
        const roachBtns = Array.from(document.querySelectorAll("a[onclick^='killCockroach']"));
        if (roachBtns.length > 0) {
          await Utils.clickAll(roachBtns, '餐厅-打蟑');
        } else {
          Utils.log('餐厅: 当前楼层无蟑螂');
        }
      }
      if (Utils.gget('restaurant_dig', false)) {
        const digBtns = Array.from(document.querySelectorAll("a[onclick^='digOne']"));
        if (digBtns.length > 0) {
          const pick = digBtns[Math.floor(Math.random() * digBtns.length)];
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(pick);
          Utils.log('餐厅: 已翻柜');
        }
      }

      const remaining = Utils.gget('restaurant_remaining_floors', []);
      if (remaining.length > 0) {
        const [next, ...rest] = remaining;
        Utils.gset('restaurant_remaining_floors', rest);
        Utils.log(`餐厅: 剩余 ${rest.length + 1} 层，去 ${next} 楼`);
        await this.navigateToFloor(next);
      } else {
        Utils.log('餐厅: 全部处理完，回概览');
        await this.navigateToOverview();
      }
    },

    // 添油
    async addOil() {
      const oilText = Utils.findByTextIncludes('p', '油壶：')?.textContent || '';
      const m = oilText.match(/(\d+)\s*\/\s*(\d+)/);
      if (!m) return;
      const cur = +m[1], max = +m[2];
      if (cur < max * 0.7) {
        const addOil = document.querySelector("a[onclick^='addFullOil']");
        if (addOil) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(addOil);
          Utils.log(`餐厅: 添油 ${cur} → ${max}`);
        }
      } else {
        Utils.log(`餐厅: 油量充足 ${cur}/${max}`);
      }
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
      } else {
        Utils.warn(`餐厅: 找不到 ${floor} 楼链接，清空剩余楼层`);
        Utils.gset('restaurant_remaining_floors', []);
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
        return;
      }
      Utils.warn('餐厅: 找不到概览链接');
    },

    async run() {
      const path = location.pathname;
      if (path === '/xz/restaurant') {
        await this.processOverview();
        return;
      }
      if (/\/xz\/restaurant_\d+_\d+/.test(path)) {
        await this.processFloor();
      }
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
          return;
        }
        Utils.log('宝箱: 酒吧页无开宝箱链接，跳过');
        return;
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
            return;
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
            return;
          }
        }
      }
      Utils.log('宝箱: 今日已开完或条件未满');
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
  //   recipe_target_level: 目标等级（'off'/'特色'/'上品'/'极品'/'金牌'/'金牌1-10级'）
  //   recipe_learn: 是否自动学习（默认 true）
  MOD.recipe = {
    match: (p) => /\/xz\/cook_(\d+)?/.test(p) || /\/xz\/cookbook_/.test(p),
    schedule: 'recipe',

    // 等级映射：旧脚本 v4.0 完整保留
    LEVEL_MAP: {
      '普通': 0, '特色': 1, '上品': 2, '极品': 3, '金牌': 4,
      '金牌1级': 4, '金牌2级': 5, '金牌3级': 6, '金牌4级': 7, '金牌5级': 8,
      '金牌6级': 9, '金牌7级': 10, '金牌8级': 11, '金牌9级': 12, '金牌10级': 13,
    },

    // 读取配置
    getConfig() {
      return {
        targetLevel: Utils.gget('recipe_target_level', '金牌'),
        learn: Utils.gget('recipe_learn', true),
      };
    },

    // 主入口
    async run() {
      const path = location.pathname;
      // 详情页：学习 / 升级
      if (/^\/xz\/cook_\d+/.test(path)) {
        await this.processDetail();
        return;
      }
      // 列表页：找可升级项
      if (/cookbook_/.test(path)) {
        await this.processCookbook();
        return;
      }
      // 万能食材升级页（/xz/cook_universal_*）：禁用！不进入，不操作
      if (/\/xz\/cook_universal_/.test(path)) {
        Utils.log('食谱: 万能食材升级已禁用，跳过该页');
        this.returnToList();
        return;
      }
    },

    // 12.1 列表页（cookbook_*）
    async processCookbook() {
      const cfg = this.getConfig();
      const targetValue = this.LEVEL_MAP[cfg.targetLevel] ?? 4;

      // 12.1.1 找"可升级"项：旧选择器（.gen_background_blue.s_room.s_font → p 含 .gen_grey + .gen_red 含"可升级"）
      const upgradeItem = this.findUpgradeItem(targetValue);
      if (upgradeItem) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(upgradeItem.link);
        Utils.log(`食谱: 进入 ${upgradeItem.name} (${upgradeItem.level} → ${cfg.targetLevel})`);
        return;
      }

      // 12.1.2 找未学习项（如果学习开关开）
      if (cfg.learn) {
        const learnItem = this.findLearnItem();
        if (learnItem) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(learnItem.link);
          Utils.log(`食谱: 学习 ${learnItem.name}`);
          return;
        }
      }

      // 12.1.3 当前页处理完 → 翻页
      const nextPage = this.findNextPage();
      if (nextPage) {
        Utils.log('食谱: 翻到下一页');
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(nextPage);
        return;
      }
      Utils.log('食谱: 当前列表已扫完');
    },

    // 找可升级项
    findUpgradeItem(targetValue) {
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
    findNextPage() {
      return Array.from(document.querySelectorAll('a')).find(a => {
        const t = (a.textContent || '').trim();
        return t === '下一页' || t === '下一頁' || t === '>>' || t === 'Next';
      }) || null;
    },

    // 12.2 详情页（cook_<id>）
    async processDetail() {
      const cfg = this.getConfig();

      // 12.2.0 先检测升级失败标记
      if (this.checkUpgradeFailure()) {
        Utils.log('食谱: 检测到升级失败标记，跳过详情');
        this.returnToList();
        return;
      }

      // 12.2.1 学习：未学习时显示"学习"按钮
      if (cfg.learn) {
        const learnBtn = Utils.findByText('a', '学习');
        if (learnBtn) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(learnBtn);
          Utils.log('食谱: 已点学习');
          return;
        }
      }

      // 12.2.2 升级按钮（仅普通食材升级，不点万能食材）
      const upgradeBtn = this.findNormalUpgradeButton();
      if (upgradeBtn && this.checkConditions()) {
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(upgradeBtn);
        Utils.log('食谱: 已点升级（普通食材）');
        return;
      }

      // 12.2.3 无可执行动作 → 返回列表（不点万能食材）
      Utils.log('食谱: 条件不满足或已达目标，返回列表');
      this.returnToList();
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
      const back = Array.from(document.querySelectorAll('a')).find(a => {
        const t = (a.textContent || '').trim();
        const h = a.getAttribute('href') || '';
        return t === '返回食谱' || t === '返回前页' || t === '返回' ||
               /\/xz\/cookbook_/.test(h) || t === '<<' || t === 'Back';
      });
      if (back) {
        Utils.sleep(Utils.randMs(1, 2)).then(() => Utils.click(back));
        return;
      }
      Utils.warn('食谱: 找不到返回列表链接');
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
          return;
        }
        if (have > 0) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(launchBtn);
          Utils.log(`守护者: 发射爆裂 (库存 ${have})`);
        } else {
          // 库存不足去商店
          const shopLink = Array.from(document.querySelectorAll('a')).find(a =>
            (a.getAttribute('href') || '') === '/xz/prop_82'
          );
          if (shopLink) {
            await Utils.sleep(Utils.randMs(1, 2));
            Utils.click(shopLink);
            Utils.log('守护者: 库存不足去商店');
          }
        }
      } else {
        // /xz/prop_82 商店页：买 10 个爆裂
        const buy10 = Utils.findByText('a', '购买10个');
        if (buy10) {
          await Utils.sleep(Utils.randMs(1, 2));
          Utils.click(buy10);
          Utils.log('守护者: 已点击购买10个爆裂');
        }
      }
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
        return;
      }
      await Utils.clickAll(usable, '季节签到');
      Utils.showStatus('季节签到', `已领取 ${usable.length} 项`);
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
        await Utils.clickAll(ticketBtns, '扭蛋-领奖');
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
      } else {
        Utils.log(`扭蛋: 券不足或无按钮 (${tickets} 张)`);
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
    { id: 'box',     module: 'box',     target: '/xz/box',             nav: '酒吧',             slot: '7:30',  jitterMin: 0,   jitterMax: 15, runOnce: true, runMs: 8000 },
    { id: 'season',  module: 'season',  target: '/xz/activity_season', nav: '>>夏日签到活动<<', slot: '7:30',  jitterMin: 0,   jitterMax: 15, runOnce: true, runMs: 5000 },
    { id: 'egg',     module: 'egg',     target: '/xz/activity_egg',    nav: '>>小镇扭蛋活动<<', slot: '7:30',  jitterMin: 0,   jitterMax: 15, runOnce: true, runMs: 8000 },
    { id: 'bag',     module: 'bag',     target: '/xz/warehouse_2_0',   nav: '仓库',             slot: '7:30',  jitterMin: 0,   jitterMax: 15, runOnce: true, runMs: 8000 },

    // 24h 独立硬定时（从上次跑完算起 24h ± 60min jitter）
    { id: 'guardian', module: 'guardian', target: '/xz/guardian',       nav: '神殿',             slot: '24h',  jitterMin: 0,   jitterMax: 60, runOnce: true, runMs: 10000 },
    { id: 'recipe',   module: 'recipe',   target: '/xz/cookbook_6_3_1', nav: '食谱',             slot: '24h',  jitterMin: 0,   jitterMax: 60, runOnce: true, runMs: 30000 },
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
      id: 'market', module: 'market', target: '/xz/market', nav: '市场', runMs: 12000,
      computeNext() {
        const now = Utils.getServerTime();
        const nowMs = now.getTime();
        const next = new Date(now);
        next.setMinutes(0, 0, 0);
        next.setHours(next.getHours() + 1);
        next.setSeconds(30 + Math.floor(Math.random() * 270));
        // 超出 6-23 范围 → 明天 6:00 + jitter
        const hour = next.getHours();
        if (hour < 6 || hour >= 24) {
          next.setDate(next.getDate() + 1);
          next.setHours(6, 0, 0, 0);
          next.setSeconds(30 + Math.floor(Math.random() * 270));
        }
        if (next.getTime() <= nowMs) next = new Date(nowMs + 60000);
        return next.getTime();
      },
    },

    // 餐厅：17-45min 随机循环（页面状态随机：蟑螂可能随时出，翻柜随机）
    {
      id: 'restaurant', module: 'restaurant', target: '/xz/restaurant', nav: '我的餐厅', runMs: 30000,
      computeNext() {
        return Utils.getServerTime().getTime() + Utils.randMs(17 * 60, 45 * 60);  // 1020-2700s
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
        const trigger = nowMs + remainingMs + offsetMs;
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

    isOn() { return !!Utils.gget(this.enabledKey, false); },

    start() {
      // 互斥：若 AutoPilot 在跑，先停它
      if (typeof AutoPilot !== 'undefined' && AutoPilot.isOn()) {
        AutoPilot.stop('调度器启动');
      }
      Utils.gset(this.enabledKey, true);
      Utils.gset(PHASE_KEY, null);  // 清旧状态
      Utils.log('⏰ 调度器: 启动');
      Utils.showStatus('调度器', '启动中…', '#FF9800');
      this.init();
    },

    stop(reason = '') {
      Utils.gset(this.enabledKey, false);
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      // 不清 PHASE_KEY：让正在跑的任务能优雅结束
      Utils.log(`⏰ 调度器: 停止${reason ? ' - ' + reason : ''}`);
      Utils.showStatus('调度器', '已停止', '#f44');
    },

    // 每页加载都调一次
    async onPageLoad(currentPath) {
      if (!this.isOn()) return;
      const phase = Utils.gget(PHASE_KEY, null);

      // ---- 无 phase：仅主页初始化 ----
      if (!phase) {
        if (currentPath === '/xz/') {
          this.computeAll();
          this.scheduleNext();
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
        if (doneAt <= phase.beforeAt) {
          // 还没完成 → 等
          await this.waitForDone(phase.module, phase.beforeAt, phase.runMs);
        } else {
          Utils.log(`调度器: 模块 ${phase.module} 已在 Router 中完成`);
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

    // 算所有 entry 的 nextRunAt
    computeAll() {
      const now = Utils.getServerTime();
      const nowMs = now.getTime();

      DAILY_SCHEDULE.forEach(e => {
        e.nextRunAt = this.computeFixedNext(e, nowMs);
      });

      DYNAMIC_SCHEDULE.forEach(e => {
        const saved = Utils.gget(`sched_${e.id}_nextAt`, 0);
        e.nextRunAt = saved > nowMs ? saved : e.computeNext();
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
        // jitter
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

      if (next.getTime() <= nowMs) {
        next = new Date(next.getTime() + 86400000);
      }

      // runOnce + 今天已跑：next 必须跳到明天
      // 检查 next 的日期，如果不是明天就 +1 天
      if (entry.runOnce) {
        const lastRun = Utils.gget(`sched_${entry.id}_lastRun`, 0);
        const lastDay = lastRun ? new Date(lastRun).toDateString() : '';
        const today = new Date(nowMs).toDateString();
        if (lastDay === today) {
          // next 已经是明天 → 保持；否则 +1 天
          const tomorrow = new Date(nowMs + 86400000);
          const tomorrowStr = tomorrow.toDateString();
          const nextStr = new Date(next.getTime()).toDateString();
          if (nextStr !== tomorrowStr) {
            next = new Date(next.getTime() + 86400000);
          }
        }
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
    fireToTarget(entry) {
      Utils.log(`调度器: 触发 ${entry.id} → ${entry.target}`);

      if (location.pathname !== '/xz/') {
        Utils.warn(`调度器: 触发时不在主页 (${location.pathname})，跳过`);
        // 推后 1min 让用户导航回来
        entry.nextRunAt = Utils.getServerTime().getTime() + 60000;
        if (DAILY_SCHEDULE.includes(entry)) {
          // 不持久化（固定表每次 computeAll 重算）
        } else {
          Utils.gset(`sched_${entry.id}_nextAt`, entry.nextRunAt);
        }
        this.scheduleNext();
        return;
      }

      const link = Array.from(document.querySelectorAll('a')).find(a => {
        const t = a.textContent.trim();
        const h = a.getAttribute('href') || '';
        return t.includes(entry.nav) && h.includes(entry.target);
      });

      if (!link) {
        Utils.warn(`调度器: 找不到链接 "${entry.nav}" → ${entry.target}，5min 后重试`);
        entry.nextRunAt = Utils.getServerTime().getTime() + 300000;
        if (!DAILY_SCHEDULE.includes(entry)) {
          Utils.gset(`sched_${entry.id}_nextAt`, entry.nextRunAt);
        }
        this.scheduleNext();
        return;
      }

      // 记下当前 mod_<id>_done 值，waitForDone 据此判断"是否新完成"
      const beforeAt = Utils.gget(`mod_${entry.module}_done`, 0);

      Utils.gset(PHASE_KEY, {
        state: 'running',
        id: entry.id,
        module: entry.module,
        target: entry.target,
        nav: entry.nav,
        startedAt: Date.now(),
        runMs: entry.runMs || 10000,
        beforeAt,
      });

      Utils.click(link);
      // 当前页死 — 目标页加载时 onPageLoad() 接管
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

      Utils.gset(`sched_${phase.id}_lastRun`, Date.now());
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
        if (DAILY_SCHEDULE.includes(entry)) {
          // 固定表：明天同时间（computeAll 会重算，这里只更新缓存）
          entry.nextRunAt = entry.nextRunAt + 86400000;
        } else {
          // 动态表：computeNext()
          const newNext = entry.computeNext();
          entry.nextRunAt = newNext;
          Utils.gset(`sched_${entry.id}_nextAt`, newNext);
        }
      }

      if (this.isOn()) {
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
      { module: 'season',     navSteps: [{ text: '>>夏日签到活动<<',    hrefMatch: '/xz/activity_season' }] },
      { module: 'egg',        navSteps: [{ text: '>>小镇扭蛋活动<<',    hrefMatch: '/xz/activity_egg' }] },
      { module: 'foodCoupon', navSteps: [{ text: '仓库',                hrefMatch: '/xz/warehouse' },
                                         { text: '食材券',              hrefMatch: '/xz/warehouse_1_0' }] },
      { module: 'energy',     navSteps: [{ text: '吃饭活动',            hrefMatch: '/xz/activity_energy' }] },
      { module: 'restaurant', navSteps: [{ text: '我的餐厅',            hrefMatch: '/xz/restaurant' }] },
      { module: 'facility',   navSteps: [{ text: '设施',                hrefMatch: '/xz/restaurant_facility' }] },
      { module: 'bag',        navSteps: [{ text: '仓库',                hrefMatch: '/xz/warehouse' },
                                         { text: '礼包',                hrefMatch: '/xz/warehouse_2_0' }] },
      { module: 'recipe',     navSteps: [{ text: '食谱',                hrefMatch: '/xz/cookbook_' }] },
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
      // 重置会话级 lastPage 记录（用于去重）
      Utils.gset('autopilot_session', { id: Date.now(), lastPage: '', lastPageAt: 0, iter: 0 });
      Utils.gset(this.stateKey, { enabled: true, stepIndex: 0, startedAt: Date.now() });
      Utils.log('▶▶ 自动计划启动');
      Utils.showStatus('自动驾驶', '启动中…', '#FF9800');
      // 若不在主页，先导航到主页
      if (location.pathname !== '/xz/') this.navigateToHome();
    },

    stop(reason = '') {
      Utils.gset(this.stateKey, { enabled: false });
      Utils.gset('autopilot_session', null);
      Utils.log(`⏹ 自动计划停止${reason ? ': ' + reason : ''}`);
      Utils.showStatus('自动驾驶', '已停止', '#f44');
    },

    async continue() {
      const state = Utils.gget(this.stateKey, null);
      if (!state || !state.enabled) return;

      // 紧急停止标志（外部 Esc/按钮可置位）
      if (Utils.gget('autopilot_emergency_stop', false)) {
        Utils.gset('autopilot_emergency_stop', false);
        this.stop('紧急停止');
        return;
      }

      // 会话级去重：同页 5s 内重复到达则跳过
      const session = Utils.gget('autopilot_session', null) || { lastPage: '', lastPageAt: 0, iter: 0 };
      const path = location.pathname;
      const now = Date.now();
      session.iter = (session.iter || 0) + 1;
      // 安全网：单次会话 iter > 80 强制停止（防止真死循环）
      if (session.iter > 80) {
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
        this.scheduleNext();
        this.stop('全部完成');
        return;
      }

      const targetPath = step.navSteps[step.navSteps.length - 1].hrefMatch;
      Utils.log(`自动驾驶: iter=${session.iter} step=${stepIdx + 1}/${this.PLAN.length} (${step.module}) path=${path} target=${targetPath}`);

      // 同页快速去重：5s 内已处理过同 path → advance 跳过
      if (session.lastPage === path && (now - (session.lastPageAt || 0)) < 5000) {
        Utils.log(`自动驾驶: ${path} 5s 内重复，跳过 advance`);
        this.advance();
        return;
      }
      session.lastPage = path;
      session.lastPageAt = now;
      Utils.gset('autopilot_session', session);

      if (path === targetPath) {
        // 到达目标 → 运行模块
        if (!isEnabled(step.module)) {
          Utils.log(`计划[${stepIdx + 1}/${this.PLAN.length}] ${step.module}: 已关闭，跳过`);
          this.advance();
          return;
        }
        Utils.log(`计划[${stepIdx + 1}/${this.PLAN.length}] ▶ ${step.module} 开始`);
        Utils.showStatus('自动驾驶', `${stepIdx + 1}/${this.PLAN.length} ${step.module}`, '#FF9800');
        try {
          await MOD[step.module].run();
        } catch (e) {
          Utils.warn(`${step.module} 异常: ${e.message}`);
        }
        await Utils.sleep(Utils.randMs(2, 3));
        // 模块可能跳到子页（如 restaurant_facility → set_X_0）
        const newPath = location.pathname;
        const isSubPage = this.PLAN[stepIdx].navSteps.some(ns => ns.hrefMatch === newPath);
        if (!isSubPage && newPath !== targetPath) {
          // 模块改了路径但不是子页 → 直接 advance（让 advance 来回主页）
          Utils.log(`计划: 模块跳到 ${newPath}，回主页后下一项`);
        }
        this.advance();
      } else if (path === '/xz/') {
        // 在主页，导航到本步骤
        await this.gotoStep(step);
      } else {
        // 在其他页面（如上一步子页遗留）→ 先回主页
        Utils.log(`计划: 当前 ${path}（非目标非主页），先回主页`);
        await this.navigateToHome();
      }
    },

    async gotoStep(step) {
      let curPath = location.pathname;
      for (const nav of step.navSteps) {
        if (curPath === nav.hrefMatch) break;
        // 在当前页找 nav.text + hrefMatch 的链接
        const link = Array.from(document.querySelectorAll('a')).find(a => {
          const t = a.textContent.trim();
          const h = a.getAttribute('href') || '';
          return t.includes(nav.text) && h.includes(nav.hrefMatch);
        });
        if (!link) {
          Utils.warn(`导航: 找不到 "${nav.text}" → ${nav.hrefMatch}`);
          // 尝试回主页
          await this.navigateToHome();
          return false;
        }
        await Utils.sleep(Utils.randMs(1, 2));
        Utils.click(link);
        const newPath = await this.waitForPathChange(curPath, 8000);
        if (!newPath) {
          Utils.warn(`导航: 跳转超时 (${nav.text})`);
          return false;
        }
        curPath = newPath;
        await Utils.sleep(Utils.randMs(1, 2));
      }
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
      state.stepIndex = (state.stepIndex || 0) + 1;
      Utils.gset(this.stateKey, state);
      // 回主页
      this.navigateToHome();
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
      Utils.log(`路由: ${path}`);
      let matched = 0;
      for (const [key, mod] of Object.entries(MOD)) {
        if (mod.match(path)) {
          matched++;
          if (isEnabled(key)) {
            Utils.log(`▶ ${key} 模块触发`);
            try {
              await mod.run();
            } catch (e) {
              Utils.warn(`${key} 异常: ${e.message}\n${e.stack}`);
            } finally {
              // 写完成标志（无论成功失败），供 Scheduler.onPageLoad 检测
              Utils.gset(`mod_${key}_done`, Date.now());
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
    Panel.create();
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