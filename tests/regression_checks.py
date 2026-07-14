from __future__ import annotations

import re
import sys
from pathlib import Path


SCRIPT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parents[1] / "梦想小镇日常一体化.user.js"
text = SCRIPT.read_text(encoding="utf-8")


def require(name: str, condition: bool) -> None:
    if not condition:
        raise AssertionError(name)
    print(f"PASS: {name}")


require("v3.22 metadata and shared panel version", "// @version      3.22" in text and "const SCRIPT_VERSION = '3.22';" in text and "v${SCRIPT_VERSION}" in text)
require("panel has no stale hardcoded title", "梦想小镇日常 v3.18" not in text and "梦想小镇日常 v3.20" not in text)
require("server time accepts current and legacy labels", "/(?:驯鹿|家园)报时[：:]/" in text)
require("server clock advances from static page sample", "_serverClockCapturedAt" in text and "localNow - this._serverClockCapturedAt" in text)

coupon_ids = re.search(r"PROP_IDS:\s*\[([^\]]+)\]", text)
require("food coupon whitelist exists", coupon_ids is not None)
ids = [int(value) for value in re.findall(r"\d+", coupon_ids.group(1))]
require("food coupon uses only legacy 8 ids", ids == [244, 21, 22, 23, 24, 25, 245, 224])
require("food coupon matches real warehouse", "p === '/xz/warehouse'" in text)
require("food coupon matches current exchange path", "(?:prop_)?food_random_" in text)
require("food coupon reads remaining quantity", "const remaining = quantityMatch ? parseInt(quantityMatch[1], 10) : null;" in text)
require("food coupon returns only after zero", "if (remaining === 0)" in text and "已归零，回仓库" in text)
require("food coupon uses exchange while nonzero", "if (exchangeBtn && remaining !== 0)" in text)
require("food coupon has no text fallback", "名字含\"食材\"/\"调料\"/\"随机\"" not in text)
daily_start = text.index("const DAILY_SCHEDULE = [")
daily_end = text.index("const DYNAMIC_SCHEDULE = [")
daily = text[daily_start:daily_end]
require("food coupon is in daily scheduler", "id: 'foodCoupon', module: 'foodCoupon'" in daily)

require("bag matches current result URL", r"/\/xz\/(?:prop|open)_bag_/" in text)
require("bag clicks only first item", "Utils.click(links[0]);" in text)
require("bag no longer clickAll", "Utils.clickAll(links, '礼包')" not in text)
require("bag completes only when empty", "礼包: 无可用" in text and "return true;" in text)

require("autopilot removed same-page advance", "session.lastPage" not in text and "5s 内重复" not in text)
require("autopilot clears emergency stop on start", "Utils.gset('autopilot_emergency_stop', false);" in text)
require("autopilot continues disabled steps on home", "setTimeout(() => this.continue(), 700);" in text)
require("autopilot requires explicit completion", "if (completed === true)" in text)
require("router yields plan modules", "由 AutoPilot 独占，Router 不重复执行" in text)
require("router does not mark action-in-progress complete", "仍有后续动作，不写完成标志" in text)
require("autopilot food coupon route is real", "{ module: 'foodCoupon', navSteps: [{ text: '仓库'," in text)
require("autopilot includes market purchase", "{ module: 'market',     navSteps: [{ text: '菜场'," in text)
require("autopilot includes daily friend projects", "{ module: 'dailyFriend', navSteps: [{ text: '好友'," in text)
require("autopilot includes daily bar projects", "{ module: 'dailyBar',   navSteps: [{ text: '广场'," in text)
require("autopilot includes extra wish project", "{ module: 'extraWish',  navSteps: [{ text: '许愿'," in text)
require("autopilot includes vitality claims", "{ module: 'vitality',   navSteps: [{ text: '今日活跃'," in text)
require("autopilot preview uses live plan length", "自动驾驶流程（${AutoPilot.PLAN.length} 步）" in text)
require("autopilot recipe route is dynamic", "{ text: '可升级'," in text and "hrefPattern: '^/xz/cookbook_\\\\d+_3_1$'" in text)
require("autopilot is labelled one-shot", "🚀 立即跑一轮全套" in text and "🚀 自动跑全套日常" not in text)

require("guardian continues one shot per page", "guardianLaunch') && oc.includes('82') && oc.includes(',1)'" in text)
require("guardian replenishes 300", "input.value = '300';" in text and "buyByActivity(0,82,0)" in text)
require("egg action returns in-progress", "扭蛋: 已扭" in text and "return false;" in text)
require("daily projects exclude moving", "DAILY_PROJECT_DEFS" in text and "project_move" not in text)
require("daily project labels show vitality recommendations", "打蟑螂（推荐15次）" in text and "翻橱柜（推荐20次）" in text and "点赞/被赞（推荐5次）" in text)
require("daily project counts persist on input and change", "addEventListener('input', saveProjectCount)" in text and "addEventListener('change', saveProjectCount)" in text)
require("daily projects use 6am game day", "date.getTime() - 6 * 3600000" in text)
require("daily friend actions are configurable", "['like', 'dig', 'roach'].some" in text and "DailyProjectState.remaining(type, state)" in text)
require("daily bar actions are configurable", "DailyProjectState.remaining('fist'" in text and "DailyProjectState.remaining('cup'" in text and "DailyProjectState.remaining('number'" in text)
require("daily bar visits Wenjie once", "拜访雯姐（推荐1次）" in text and "a[onclick=\"see()\"]" in text and "今日已拜访雯姐" in text)
require("friend list prioritizes roach markers", "img[src=\"/readImg/xz_cockroach\"]" in text and "const marked = links.filter(hasRoachMark);" in text)
require("friend floors follow roach markers", "const markedRoachFloor = floorLinks.find" in text and "Utils.click(floorToVisit);" in text)
require("autopilot hands off to scheduler", "自动驾驶: 已交接长期循环调度器" in text and "Scheduler.start();" in text)
require("emergency stop does not restart scheduler", "Esc 紧急停止', { resumeScheduler: false }" in text and "面板停止', { resumeScheduler: false }" in text)
require("vitality claims first available award", "a[onclick^='addVitalityAward']" in text and "今日活跃: 领取第一项" in text)
require("morning and evening reward sweeps exist", "vitalityMorning" in daily and "vitalityEvening" in daily and "seasonMorning" in daily and "seasonEvening" in daily and "eggMorning" in daily and "eggEvening" in daily)
require("temporary reward routes are optional", "optional: true" in daily and "可选入口" in text)
require("scheduled modules are isolated", "与当前调度阶段" in text and "mod.requiresScheduled" in text)

require("market discount is exactly 666", "DISCOUNT_PRICE: 666" in text and "price === this.CONFIG.DISCOUNT_PRICE" in text)
require("market discount dedupes by server hour", "market_last_discount_hour" in text)
require("market does not buy daily market rows", "buyDayFood" not in text and "DAY_LEVEL1_MAX" not in text and "DAY_LEVEL2_MAX" not in text)
require("market claims Tuesday reserve coupon first", "a[onclick^='getEverydayReserve']" in text and "已领取周二日常食材预定券" in text)
require("market claim remains in progress across refresh", "Utils.click(reserveClaim);" in text and "return false;" in text)
market_run = text[text.index("MOD.market = {"):text.index("// ----- 7. 食材券")]
require("market explicitly completes when no purchase remains", "市场: 无常驻菜" in market_run and "市场: 常驻菜全部达标" in market_run and market_run.count("return true;") >= 5)
require("market purchase remains in progress across refresh", "Utils.click(foodToBuy.buyButton);" in market_run and "return false;" in market_run)
require("router respects explicit in-progress result", "(!inPlan && completed !== false)" in text)
require("facility threshold restored to 5", "MIN_COUNT: 5" in text)
require("facility schedule capped at 24h", "Math.min(remainingMs + offsetMs, 24 * 3600000)" in text)
require("restaurant oil has independent switch", "restaurant_oil: true" in text and "restaurant_oil', true" in text)
require("restaurant oil threshold restored", "if (cur < 11000)" in text)
require("restaurant dig stops on insufficient energy", "/体力不足|翻橱柜失败|无法继续翻/" in text and "翻柜已停止" in text)
require("restaurant dig has a hard cap", "MAX_DIG_ATTEMPTS: 120" in text and "restaurant_dig_attempts" in text)
require("restaurant rescue disables stuck run", "v39_restaurant_rescue_done" in text and "Utils.gset('mod_restaurant_enabled', false);" in text)
require("restaurant roach has failure stop and hard cap", "MAX_ROACH_ATTEMPTS: 20" in text and "restaurant_roach_attempts" in text and "打蟑螂已停止" in text)
require("restaurant v310 rescue disables both risky actions", "v310_restaurant_rescue_done" in text and "Utils.gset('restaurant_cockroach', false);" in text)
require("recipe default is off", text.count("recipe_target_level', 'off'") >= 2)
require("recipe disables itself after scan", "Utils.gset('recipe_target_level', 'off');" in text)
require("recipe syncs disabled target to panel", "if (levelSelect) levelSelect.value = 'off';" in text)
require("recipe uses middle-tier name in UI", '<option value="中品">升级到中品</option>' in text and "升级到中品（原特色）" not in text)
require("recipe keeps legacy middle-tier parser alias", "'中品': 1, '特色': 1" in text)
require("recipe migrates legacy target", "recipe_target_level', 'off') === '特色'" in text and "recipe_target_level', '中品'" in text)
require("recipe parses plain-text detail level", "食谱等级[:：]\\s*(金牌(?:\\d+级)?|极品|上品|中品|特色|普通)" in text)
detail_start = text.index("async processDetail()")
detail_end = text.index("// 找普通升级按钮", detail_start)
detail = text[detail_start:detail_end]
require("recipe checks target before upgrade button", "currentLevel >= targetLevel" in detail and detail.index("currentLevel >= targetLevel") < detail.index("findNormalUpgradeButton"))
require("recipe fails closed when level is unknown", "currentLevel === undefined || targetLevel === undefined" in detail and "等级解析失败，已跳过" in detail)

require("scheduler persists fixed plans", "Utils.gset(`sched_${e.id}_nextAt`, e.nextRunAt);" in text)
require("scheduler preserves overdue fixed plans", "e.nextRunAt = saved > 0 ? saved : this.computeFixedNext(e, nowMs);" in text)
require("scheduler preserves overdue dynamic plans", "e.nextRunAt = saved > 0 ? saved : e.computeNext();" in text)
require("scheduler no longer discards overdue plans", "saved > nowMs ? saved" not in text)
require("scheduler start does not call missing init", "this.init();" not in text)
require("scheduler start computes immediately on home", "this.computeAll();\n        this.scheduleNext();" in text)
require("scheduler supports multi-page navigation", "async navigatePhase(phase, currentPath)" in text)
require("scheduler bag route is two-step", "route: [{ text: '仓库', href: '/xz/warehouse' }, { text: '礼包', href: '/xz/warehouse_2_0' }]" in text)
require("scheduler guardian route is two-step", "{ text: '挑战守护者', href: '/xz/guardian' }" in text)
require("scheduler recipe route is dynamic", "hrefPattern: '^/xz/cookbook_\\\\d+_3_1$'" in daily and "target: '/xz/cookbook_8_3_1'" not in daily)
require("scheduler restaurant route uses real href without mutable text", "id: 'restaurant', module: 'restaurant', target: '/xz/restaurant', nav: '餐厅', route: [{ href: '/xz/restaurant' }]" in text)
require("scheduler supports pattern navigation", "new RegExp(step.hrefPattern).test(href)" in text and "new RegExp(nav.hrefPattern).test(href)" in text)
require("24h schedules have no cumulative jitter", "slot: '24h', jitterMin: 0, jitterMax: 0" in daily and "jitterMax: 60" not in daily)
require("scheduler recomputes all tasks after return", "this.computeAll();\n        this.scheduleNext();" in text)
require("scheduler records completion in server time", "Utils.gset(`sched_${phase.id}_lastRun`, Utils.getServerTime().getTime());" in text)
require("fixed daily tasks catch up after missed slot", "if (lastDay !== today && next.getTime() <= nowMs) return nowMs + 5000;" in text)

market_start = text.index("id: 'market', module: 'market', target: '/xz/market'")
market_end = text.index("// 餐厅：17-45min", market_start)
market_schedule = text[market_start:market_end]
require("market tracks completion by server hour", "ranThisHour" in market_schedule and "sched_market_lastRun" in market_schedule)
require("market schedules pre-6 on same day", "todaySix.setHours(6, 0, 0, 0);" in market_schedule)
require("market catches up current active hour", "hour <= 23 && !ranThisHour" in market_schedule and "nowMs + 5000" in market_schedule)
require("market schedules post-23 on next day", "tomorrow.setDate(tomorrow.getDate() + 1);" in market_schedule and "tomorrow.setHours(6, 0, 0, 0);" in market_schedule)
require("market removed normalized-date double increment", "next.setHours(next.getHours() + 1)" not in market_schedule)
require("scheduler migration clears every stale plan", "Utils.gset(`sched_${id}_nextAt`, 0);" in text and "scheduler_schema_version', 3" in text)
require("scheduler migration converts legacy local timestamps", "oldLastRun + serverOffset" in text and "ALL_ENTRIES().forEach" in text)
require("scheduler migration resets meal window date", "sched_energy_lastWindow', null" in text and "sched_energy_lastResetDay', null" in text)

print(f"\nAll regression checks passed: {SCRIPT}")
