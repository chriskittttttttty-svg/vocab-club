import { useEffect, useState } from "react";
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

export default function App() {
  const members = [
    "冬冬",
    "wendy",
    "晨曦",
    "润泽",
    "青青",
  ];

  const today = new Date();

  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  const [selectedDate, setSelectedDate] = useState(
    formatDate(today)
  );

  const [records, setRecords] = useState([]);

  const [selectedUser, setSelectedUser] =
    useState("晨曦");

  const [newWords, setNewWords] = useState("");

  const [reviewWords, setReviewWords] =
    useState("");

  const [reading, setReading] = useState("");

  // Firebase 实时同步

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "vocabRecords"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) =>
          doc.data()
        );

        setRecords(data);
      }
    );

    return () => unsubscribe();
  }, []);

  // 自动读取当前日期数据

  useEffect(() => {
    const currentUser = records.find(
      (item) => item.name === selectedUser
    );

    const currentData =
      currentUser?.records?.[selectedDate];

    if (currentData) {
      setNewWords(currentData.newWords);

      setReviewWords(currentData.review);

      setReading(currentData.reading ?? "");
    } else {
      setNewWords("");

      setReviewWords("");

      setReading("");
    }
  }, [selectedDate, selectedUser, records]);

  // 保存数据

  const handleSubmit = async () => {
    if (!newWords || !reviewWords) return;

    const existingUser = records.find(
      (item) => item.name === selectedUser
    );

    const updatedUser = {
      name: selectedUser,

      records: {
        ...(existingUser?.records || {}),

        [selectedDate]: {
          newWords: Number(newWords),

          review: Number(reviewWords),

          reading: Number(reading) || 0,
        },
      },
    };

    await setDoc(
      doc(db, "vocabRecords", selectedUser),
      updatedUser
    );
  };

  // 获取当天数据

  const getTodayData = (user) => {
    const data = user.records?.[selectedDate];

    if (!data) {
      return {
        newWords: 0,

        review: 0,

        reading: 0,
      };
    }

    return data;
  };

  // 排行榜排序

  const sorted = [...records].sort((a, b) => {
    const aData = getTodayData(a);

    const bData = getTodayData(b);

    return (
      bData.newWords +
      bData.review +
      bData.reading -
      (aData.newWords + aData.review + aData.reading)
    );
  });

  // 切换日期

  const changeDate = (offset) => {
    const current = new Date(selectedDate);

    current.setDate(current.getDate() + offset);

    setSelectedDate(formatDate(current));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900 text-white p-5">

      <div className="max-w-md mx-auto space-y-6 pb-20">

        {/* Header */}

        <div className="pt-4">

          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            日期系统测试
          </h1>

          <p className="text-zinc-500 mt-3 text-sm">
            ☁️ 多人实时学习系统
          </p>

        </div>

        {/* 日期切换 */}

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 flex items-center justify-between">

          <button
            onClick={() => changeDate(-1)}
            className="bg-black/30 px-5 py-3 rounded-2xl text-xl"
          >
            ←
          </button>

          <div className="text-center">

            <p className="text-zinc-500 text-sm">
              当前日期
            </p>

            <h2 className="text-2xl font-black mt-1">
              {selectedDate}
            </h2>

          </div>

          <button
            onClick={() => changeDate(1)}
            className="bg-black/30 px-5 py-3 rounded-2xl text-xl"
          >
            →
          </button>

        </div>

        {/* 输入区 */}

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-5">

          <div>

            <h2 className="text-2xl font-black">
              今日学习
            </h2>

            <p className="text-zinc-500 text-sm mt-1">
              Daily Study
            </p>

          </div>

          <select
            value={selectedUser}
            onChange={(e) =>
              setSelectedUser(e.target.value)
            }
            className="w-full bg-black/30 border border-white/10 rounded-2xl p-4"
          >

            {members.map((member) => (
              <option key={member}>
                {member}
              </option>
            ))}

          </select>

          <input
            type="number"
            placeholder="今天新学多少单词"
            value={newWords}
            onChange={(e) =>
              setNewWords(e.target.value)
            }
            className="w-full bg-black/30 border border-white/10 rounded-2xl p-4"
          />

          <input
            type="number"
            placeholder="今天复习多少单词"
            value={reviewWords}
            onChange={(e) =>
              setReviewWords(e.target.value)
            }
            className="w-full bg-black/30 border border-white/10 rounded-2xl p-4"
          />

          <input
            type="number"
            placeholder="今天读了几篇阅读"
            value={reading}
            onChange={(e) =>
              setReading(e.target.value)
            }
            className="w-full bg-black/30 border border-white/10 rounded-2xl p-4"
          />

          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-black rounded-2xl p-4 font-black text-lg hover:scale-[1.02] transition-all duration-300"
          >
            ✨ 保存今日记录
          </button>

        </div>

        {/* 排行榜 */}

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6">

          <div className="mb-5">

            <h2 className="text-3xl font-black">
              🏆 当日排行榜
            </h2>

            <p className="text-zinc-500 text-sm mt-2">
              Daily Ranking
            </p>

          </div>

          <div className="space-y-4">

            {sorted.map((item, index) => {

              const data = getTodayData(item);

              return (

                <div
                  key={item.name}
                  className="bg-black/30 border border-white/10 rounded-3xl p-5 flex justify-between items-center"
                >

                  <div className="flex items-center gap-4">

                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-black flex items-center justify-center font-black text-lg">
                      {index + 1}
                    </div>

                    <div>

                      <p className="font-black text-2xl">
                        {item.name}
                      </p>

                      <p className="text-zinc-500 text-sm mt-1">
                        📘 {data.newWords} 新词 · 🔁 {data.review} 复习 · 📖 {data.reading ?? 0} 阅读
                      </p>

                    </div>

                  </div>

                  <div className="text-right">

                    <p className="text-3xl font-black">
                      {data.newWords + data.review + (data.reading ?? 0)}
                    </p>

                    <p className="text-zinc-500 text-sm">
                      XP
                    </p>

                  </div>

                </div>

              );

            })}

          </div>

        </div>

      </div>

    </div>
  );
}