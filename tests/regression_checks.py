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


require("v3.7 metadata", "// @version      3.7" in text and "日常一体化 v3.7" in text)

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
require("autopilot recipe route is two-step", "{ text: '可升级'," in text and "hrefMatch: '/xz/cookbook_8_3_1'" in text)

require("guardian continues one shot per page", "guardianLaunch') && oc.includes('82') && oc.includes(',1)'" in text)
require("guardian replenishes 300", "input.value = '300';" in text and "buyByActivity(0,82,0)" in text)
require("egg action returns in-progress", "扭蛋: 已扭" in text and "return false;" in text)

require("market discount is exactly 666", "DISCOUNT_PRICE: 666" in text and "price === this.CONFIG.DISCOUNT_PRICE" in text)
require("market discount dedupes by server hour", "market_last_discount_hour" in text)
require("facility threshold restored to 5", "MIN_COUNT: 5" in text)
require("facility schedule capped at 24h", "Math.min(remainingMs + offsetMs, 24 * 3600000)" in text)
require("restaurant oil has independent switch", "restaurant_oil: true" in text and "restaurant_oil', true" in text)
require("restaurant oil threshold restored", "if (cur < 11000)" in text)
require("recipe default is off", text.count("recipe_target_level', 'off'") >= 2)
require("recipe disables itself after scan", "Utils.gset('recipe_target_level', 'off');" in text)

require("scheduler persists fixed plans", "Utils.gset(`sched_${e.id}_nextAt`, e.nextRunAt);" in text)
require("scheduler start does not call missing init", "this.init();" not in text)
require("scheduler start computes immediately on home", "this.computeAll();\n        this.scheduleNext();" in text)
require("scheduler supports multi-page navigation", "async navigatePhase(phase, currentPath)" in text)
require("scheduler bag route is two-step", "route: [{ text: '仓库', href: '/xz/warehouse' }, { text: '礼包', href: '/xz/warehouse_2_0' }]" in text)
require("scheduler guardian route is two-step", "{ text: '挑战守护者', href: '/xz/guardian' }" in text)
require("scheduler recomputes all tasks after return", "this.computeAll();\n        this.scheduleNext();" in text)

print(f"\nAll regression checks passed: {SCRIPT}")
