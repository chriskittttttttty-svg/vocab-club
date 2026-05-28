import { useEffect, useState, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAKVuH_7sAhqsIDsI5aCJMWNXdVf7XGkCE",
  authDomain: "vocab-club.firebaseapp.com",
  projectId: "vocab-club",
  storageBucket: "vocab-club.firebasestorage.app",
  messagingSenderId: "86046186994",
  appId: "1:86046186994:web:4205207fc20746d574df6b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ====== 商店物品 ======
const SHOP_ITEMS = [
  { id: "yarn",       name: "毛线球",     emoji: "🧶", price: 10,  desc: "猫咪最爱的玩具，玩了还想玩" },
  { id: "fish_snack", name: "小鱼干零食", emoji: "🐟", price: 15,  desc: "香喷喷，猫咪立刻变乖" },
  { id: "wand",       name: "逗猫棒",     emoji: "🪄", price: 20,  desc: "挥一挥，猫咪原地疯狂" },
  { id: "catnip",     name: "猫薄荷",     emoji: "🌿", price: 25,  desc: "神奇植物，猫咪直接飞升" },
  { id: "bow",        name: "蝴蝶结项圈", emoji: "🎀", price: 30,  desc: "粉嫩可爱，超级上镜" },
  { id: "laser",      name: "激光笔",     emoji: "🔴", price: 35,  desc: "追了一辈子的那个红点！" },
  { id: "moon",       name: "月亮枕头",   emoji: "🌙", price: 40,  desc: "月亮形状，做梦都甜" },
  { id: "bed",        name: "豪华猫窝",   emoji: "🏠", price: 50,  desc: "软绵绵，睡觉香到不想起来" },
  { id: "music",      name: "音乐盒",     emoji: "🎵", price: 60,  desc: "叮咚作响，猫咪陶醉其中" },
  { id: "crown",      name: "小皇冠",     emoji: "👑", price: 80,  desc: "戴上这个，猫咪就是贵族" },
];

// ====== 三餐配置 ======
const MEALS = [
  { id: "breakfast", name: "早餐", emoji: "🌅", time: "09:00", startH: 9,  endH: 14 },
  { id: "lunch",     name: "午餐", emoji: "☀️", time: "14:00", startH: 14, endH: 22 },
  { id: "dinner",    name: "晚餐", emoji: "🌙", time: "22:00", startH: 22, endH: 9  },
];
const MEAL_COST = 5;

// ====== 工具函数 ======
function getToday() {
  return new Date().toISOString().split("T")[0];
}

function isMealActive(meal) {
  const h = new Date().getHours();
  if (meal.id === "dinner") return h >= 22 || h < 9;
  return h >= meal.startH && h < meal.endH;
}

function getDaysMissed(lastFedDate) {
  if (!lastFedDate) return 0;
  const diff = (new Date(getToday()) - new Date(lastFedDate)) / 86400000;
  return Math.floor(Math.max(0, diff));
}

function calcHunger(pet) {
  if (!pet || pet.runAway) return 0;
  return Math.max(0, 100 - getDaysMissed(pet.lastFedDate) * 7);
}

function getCatStatus(pet) {
  if (!pet || pet.runAway || getDaysMissed(pet?.lastFedDate) >= 14) return "stray";
  const h = calcHunger(pet);
  if (h >= 70) return "happy";
  if (h >= 40) return "normal";
  if (h >= 20) return "hungry";
  return "starving";
}

const STATUS_CONFIG = {
  happy:    { emoji: "😸", msg: "心满意足，正在打呼噜～",   color: "text-emerald-400", anim: "animate-bounce" },
  normal:   { emoji: "😺", msg: "状态不错，随时等投喂！",   color: "text-blue-400",    anim: "" },
  hungry:   { emoji: "😿", msg: "肚子空空的...快来喂我",   color: "text-yellow-400",  anim: "animate-pulse" },
  starving: { emoji: "🙀", msg: "饿！饿！救命！！",         color: "text-red-400",     anim: "animate-pulse" },
  stray:    { emoji: "🐾", msg: "猫咪已经离家出走了...",   color: "text-zinc-500",    anim: "" },
};

// ====== 主组件 ======
export default function App() {
  const members = ["冬冬", "wendy", "晨曦", "润泽", "青青"];
  const formatDate = (d) => d.toISOString().split("T")[0];

  // 学习相关状态
  const [tab, setTab] = useState("study");
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [records, setRecords] = useState([]);
  const [selectedUser, setSelectedUser] = useState("晨曦");
  const [newWords, setNewWords] = useState("");
  const [reviewWords, setReviewWords] = useState("");
  const [reading, setReading] = useState("");

  // 猫咪相关状态
  const [pet, setPet] = useState(null);
  const [showShop, setShowShop] = useState(false);
  const [toast, setToast] = useState("");
  const autoFedRef = useRef(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // 学习记录监听
  useEffect(() => {
    return onSnapshot(collection(db, "vocabRecords"), (snap) => {
      setRecords(snap.docs.map((d) => d.data()));
    });
  }, []);

  // 猫咪数据监听
  useEffect(() => {
    return onSnapshot(doc(db, "pet", "status"), (snap) => {
      if (snap.exists()) {
        setPet(snap.data());
      } else {
        const init = {
          foodStock: 20,
          coins: 0,
          fedMeals: [],
          ownedItems: [],
          lastFedDate: getToday(),
          runAway: false,
          adoptedDate: getToday(),
        };
        setDoc(doc(db, "pet", "status"), init);
        setPet(init);
      }
    });
  }, []);

  // 自动投喂：有猫粮就喂当前这餐
  useEffect(() => {
    if (!pet || pet.runAway || autoFedRef.current) return;

    const today = getToday();
    const fedMeals = pet.fedMeals || [];
    const foodStock = pet.foodStock || 0;

    const toFeed = MEALS.filter(
      (m) =>
        isMealActive(m) &&
        !fedMeals.includes(`${today}-${m.id}`) &&
        foodStock >= MEAL_COST
    );

    if (toFeed.length === 0) return;

    autoFedRef.current = true;
    setTimeout(() => { autoFedRef.current = false; }, 5000);

    const newFed = [...fedMeals, ...toFeed.map((m) => `${today}-${m.id}`)];
    const used = toFeed.length * MEAL_COST;

    setDoc(doc(db, "pet", "status"), {
      ...pet,
      fedMeals: newFed,
      foodStock: Math.max(0, foodStock - used),
      lastFedDate: today,
    });

    const mealNames = toFeed.map((m) => m.name).join("、");
    showToast(`🍽️ 自动投喂了${mealNames}！猫咪好开心～`);
  }, [pet]);

  // 加载当天学习数据
  useEffect(() => {
    const cur = records.find((r) => r.name === selectedUser);
    const d = cur?.records?.[selectedDate];
    setNewWords(d?.newWords ?? "");
    setReviewWords(d?.review ?? "");
    setReading(d?.reading ?? "");
  }, [selectedDate, selectedUser, records]);

  // 保存学习记录 + 换猫粮
  const handleSubmit = async () => {
    if (!newWords || !reviewWords) return;

    const existing = records.find((r) => r.name === selectedUser);
    await setDoc(doc(db, "vocabRecords", selectedUser), {
      name: selectedUser,
      records: {
        ...(existing?.records || {}),
        [selectedDate]: {
          newWords: Number(newWords),
          review: Number(reviewWords),
          reading: Number(reading) || 0,
        },
      },
    });

    if (pet && !pet.runAway) {
      const food = Math.round(
        Number(newWords) * 1 +
        Number(reviewWords) * 0.5 +
        (Number(reading) || 0) * 3
      );
      const coins = Math.floor(food / 2);
      await setDoc(doc(db, "pet", "status"), {
        ...pet,
        foodStock: (pet.foodStock || 0) + food,
        coins: (pet.coins || 0) + coins,
      });
      showToast(`+${food} 🐟 猫粮，+${coins} 🪙 金币！`);
    }
  };

  // 购买商店物品
  const buyItem = async (item) => {
    if (!pet) return;
    if ((pet.coins || 0) < item.price) {
      showToast("金币不足，多学习赚金币！💪");
      return;
    }
    if ((pet.ownedItems || []).includes(item.id)) {
      showToast("已经拥有了！");
      return;
    }
    await setDoc(doc(db, "pet", "status"), {
      ...pet,
      coins: pet.coins - item.price,
      ownedItems: [...(pet.ownedItems || []), item.id],
    });
    showToast(`✅ 购买成功！猫咪得到了 ${item.emoji} ${item.name}`);
  };

  // 重新领养
  const resetPet = async () => {
    await setDoc(doc(db, "pet", "status"), {
      foodStock: 20,
      coins: pet?.coins || 0,
      fedMeals: [],
      ownedItems: pet?.ownedItems || [],
      lastFedDate: getToday(),
      runAway: false,
      adoptedDate: getToday(),
    });
  };

  const getTodayData = (u) => {
    const d = u.records?.[selectedDate];
    return d || { newWords: 0, review: 0, reading: 0 };
  };

  const sorted = [...records].sort((a, b) => {
    const ad = getTodayData(a), bd = getTodayData(b);
    return (
      bd.newWords + bd.review + (bd.reading || 0) -
      (ad.newWords + ad.review + (ad.reading || 0))
    );
  });

  const changeDate = (n) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + n);
    setSelectedDate(formatDate(d));
  };

  const status = getCatStatus(pet);
  const hunger = calcHunger(pet);
  const sc = STATUS_CONFIG[status];
  const today = getToday();
  const fedMeals = pet?.fedMeals || [];
  const daysMissed = getDaysMissed(pet?.lastFedDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900 text-white">

      {/* Tab 导航栏 */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-md mx-auto flex">
          {[["study", "📚 学习"], ["pet", "🐱 小猫"]].map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-4 text-sm font-bold transition-all ${
                tab === t
                  ? "text-emerald-400 border-b-2 border-emerald-400"
                  : "text-zinc-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Toast 提示 */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black font-bold px-6 py-3 rounded-full text-sm shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="max-w-md mx-auto p-5 space-y-6 pb-20">

        {/* ========== 学习 TAB ========== */}
        {tab === "study" && (
          <>
            <div className="pt-4">
              <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Vocab Club
              </h1>
              <p className="text-zinc-500 mt-3 text-sm">☁️ 多人实时学习系统</p>
            </div>

            {/* 日期切换 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 flex items-center justify-between">
              <button onClick={() => changeDate(-1)} className="bg-black/30 px-5 py-3 rounded-2xl text-xl">←</button>
              <div className="text-center">
                <p className="text-zinc-500 text-sm">当前日期</p>
                <h2 className="text-2xl font-black mt-1">{selectedDate}</h2>
              </div>
              <button onClick={() => changeDate(1)} className="bg-black/30 px-5 py-3 rounded-2xl text-xl">→</button>
            </div>

            {/* 输入区 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-5">
              <div>
                <h2 className="text-2xl font-black">今日学习</h2>
                <p className="text-zinc-500 text-sm mt-1">Daily Study</p>
              </div>

              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-2xl p-4"
              >
                {members.map((m) => <option key={m}>{m}</option>)}
              </select>

              <input type="number" placeholder="今天新学多少单词" value={newWords}
                onChange={(e) => setNewWords(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-2xl p-4" />

              <input type="number" placeholder="今天复习多少单词" value={reviewWords}
                onChange={(e) => setReviewWords(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-2xl p-4" />

              <input type="number" placeholder="今天读了几篇阅读" value={reading}
                onChange={(e) => setReading(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-2xl p-4" />

              <p className="text-xs text-zinc-600 text-center">
                🐱 新词×1 + 复习×0.5 + 阅读×3 = 猫粮，每2猫粮=1金币
              </p>

              <button onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-black rounded-2xl p-4 font-black text-lg hover:scale-[1.02] transition-all duration-300">
                ✨ 保存今日记录
              </button>
            </div>

            {/* 排行榜 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6">
              <div className="mb-5">
                <h2 className="text-3xl font-black">🏆 当日排行榜</h2>
                <p className="text-zinc-500 text-sm mt-2">Daily Ranking</p>
              </div>
              <div className="space-y-4">
                {sorted.map((item, i) => {
                  const d = getTodayData(item);
                  return (
                    <div key={item.name} className="bg-black/30 border border-white/10 rounded-3xl p-5 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-black flex items-center justify-center font-black text-lg">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-black text-2xl">{item.name}</p>
                          <p className="text-zinc-500 text-sm mt-1">
                            📘 {d.newWords} 新词 · 🔁 {d.review} 复习 · 📖 {d.reading ?? 0} 阅读
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black">{d.newWords + d.review + (d.reading ?? 0)}</p>
                        <p className="text-zinc-500 text-sm">XP</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ========== 小猫 TAB ========== */}
        {tab === "pet" && (
          <>
            {status === "stray" ? (
              /* 猫咪跑路了 */
              <div className="text-center pt-16 space-y-6">
                <div className="text-9xl">🐾</div>
                <h2 className="text-3xl font-black text-zinc-400">猫咪离家出走了...</h2>
                <p className="text-zinc-600 text-sm">太久没有投喂，它去当流浪猫了 😢</p>
                <p className="text-zinc-700 text-xs">好好学习才能把它接回来</p>
                <button onClick={resetPet}
                  className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-black rounded-2xl px-8 py-4 font-black text-lg hover:scale-105 transition-all">
                  🐱 再领养一只猫咪
                </button>
              </div>
            ) : (
              <>
                {/* 猫咪展示区 */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 text-center space-y-4">

                  {/* 猫咪动画 */}
                  <div className={`text-9xl select-none leading-none ${sc.anim}`}>
                    {sc.emoji}
                  </div>

                  {/* 已购买的物品展示 */}
                  {(pet?.ownedItems || []).length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {(pet.ownedItems).map((id) => {
                        const item = SHOP_ITEMS.find((i) => i.id === id);
                        return item
                          ? <span key={id} className="text-2xl" title={item.name}>{item.emoji}</span>
                          : null;
                      })}
                    </div>
                  )}

                  <p className={`font-bold text-lg ${sc.color}`}>{sc.msg}</p>

                  {/* 饥饿值进度条 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>饥饿值</span>
                      <span>{hunger}%</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-700 ${
                          hunger > 60
                            ? "bg-gradient-to-r from-emerald-400 to-cyan-400"
                            : hunger > 30
                            ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                            : "bg-gradient-to-r from-red-500 to-red-400"
                        }`}
                        style={{ width: `${hunger}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 猫粮 & 金币 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-5 text-center">
                    <p className="text-3xl mb-1">🐟</p>
                    <p className="text-2xl font-black">{pet?.foodStock ?? 0}</p>
                    <p className="text-zinc-500 text-xs mt-1">猫粮储备</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-5 text-center">
                    <p className="text-3xl mb-1">🪙</p>
                    <p className="text-2xl font-black">{pet?.coins ?? 0}</p>
                    <p className="text-zinc-500 text-xs mt-1">金币（买玩具）</p>
                  </div>
                </div>

                {/* 今日三餐 */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black">今日三餐</h2>
                    <span className="text-zinc-500 text-xs">每餐 {MEAL_COST} 猫粮，自动投喂</span>
                  </div>
                  {MEALS.map((meal) => {
                    const key = `${today}-${meal.id}`;
                    const fed = fedMeals.includes(key);
                    const active = isMealActive(meal);
                    const enough = (pet?.foodStock || 0) >= MEAL_COST;
                    return (
                      <div key={meal.id} className="flex items-center justify-between bg-black/30 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{meal.emoji}</span>
                          <div>
                            <p className="font-bold">{meal.name}</p>
                            <p className="text-zinc-500 text-xs">{meal.time}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${
                          fed ? "text-emerald-400" :
                          active ? "text-yellow-400" :
                          "text-zinc-600"
                        }`}>
                          {fed ? "✅ 已喂" :
                           active ? (enough ? "⏳ 自动中..." : "❌ 粮不足") :
                           "🔒 未到时间"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 警告：快跑路了 */}
                {daysMissed > 0 && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 text-center space-y-1">
                    <p className="text-red-400 font-bold">
                      ⚠️ 已经 {daysMissed} 天没有投喂了！
                    </p>
                    <p className="text-red-400/60 text-xs">
                      超过14天猫咪会离家出走，快去学习赚猫粮吧！
                    </p>
                  </div>
                )}

                {/* 商店入口 */}
                <button
                  onClick={() => setShowShop(true)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-black text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <span>🛒 猫咪商店</span>
                  <span className="text-zinc-400 font-normal text-sm">余额 {pet?.coins ?? 0} 🪙</span>
                </button>

                {/* 猫粮换算说明 */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-zinc-500 space-y-1">
                  <p className="font-bold text-zinc-400 mb-2">📋 猫粮换算表</p>
                  <p>📘 新学单词 × 1 = 猫粮</p>
                  <p>🔁 复习单词 × 0.5 = 猫粮</p>
                  <p>📖 阅读篇数 × 3 = 猫粮</p>
                  <p>🪙 每 2 猫粮 = 1 金币（用于商店）</p>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* 商店弹窗 */}
      {showShop && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end"
          onClick={() => setShowShop(false)}
        >
          <div
            className="w-full max-w-md mx-auto bg-zinc-900 border border-white/10 rounded-t-[2rem] p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black">🛒 猫咪商店</h2>
              <button onClick={() => setShowShop(false)} className="text-zinc-500 text-2xl leading-none">✕</button>
            </div>
            <p className="text-zinc-500 text-sm mb-5">余额：{pet?.coins ?? 0} 🪙</p>

            <div className="space-y-3">
              {SHOP_ITEMS.map((item) => {
                const owned = (pet?.ownedItems || []).includes(item.id);
                const enough = (pet?.coins || 0) >= item.price;
                return (
                  <div key={item.id} className="flex items-center justify-between bg-black/40 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{item.emoji}</span>
                      <div>
                        <p className="font-bold text-sm">{item.name}</p>
                        <p className="text-zinc-500 text-xs">{item.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => buyItem(item)}
                      disabled={owned || !enough}
                      className={`ml-3 px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                        owned
                          ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                          : enough
                          ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:scale-105"
                          : "bg-white/5 text-zinc-600 cursor-not-allowed"
                      }`}
                    >
                      {owned ? "✓ 已拥有" : `${item.price} 🪙`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
