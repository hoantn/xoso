// server.js - Backend Xổ Số Miền Bắc Nhanh (1p, 3p, 5p, 30p) Tiếng Việt

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Đã kết nối MongoDB"))
.catch((err) => console.error("Lỗi kết nối MongoDB:", err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  history: { type: Array, default: [] },
});
const User = mongoose.model("User", userSchema);

const lotterySchema = new mongoose.Schema({
  type: { type: String, required: true }, // 1p, 3p, 5p, 30p
  roundId: { type: String, required: true },
  result: { type: Object }, // Kết quả đầy đủ
  createdAt: { type: Date, default: Date.now },
});
const Lottery = mongoose.model("Lottery", lotterySchema);

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "Bạn chưa đăng nhập" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token không hợp lệ" });
    req.user = user;
    next();
  });
};

function getRoundId(type) {
  const now = new Date();
  if (type === "1p") return `${now.getUTCHours()}h${now.getUTCMinutes()}m`;
  if (type === "3p") return `${now.getUTCHours()}h${Math.floor(now.getUTCMinutes()/3)*3}m`;
  if (type === "5p") return `${now.getUTCHours()}h${Math.floor(now.getUTCMinutes()/5)*5}m`;
  if (type === "30p") return `${now.getUTCHours()}h${now.getUTCMinutes() < 30 ? 0 : 30}m`;
}

function generateXSMBResult() {
  function rand(num) {
    return Math.floor(Math.random() * Math.pow(10, num)).toString().padStart(num, '0');
  }
  return {
    dacBiet: [rand(5)],
    giaiNhat: [rand(5)],
    giaiNhi: [rand(5), rand(5)],
    giaiBa: [rand(5), rand(5), rand(5), rand(5), rand(5), rand(5)],
    giaiTu: [rand(4), rand(4), rand(4), rand(4)],
    giaiNam: [rand(4), rand(4), rand(4), rand(4), rand(4), rand(4)],
    giaiSau: [rand(3), rand(3), rand(3)],
    giaiBay: [rand(2), rand(2), rand(2), rand(2)],
  };
}

async function getOrCreateRound(type) {
  const roundId = getRoundId(type);
  let round = await Lottery.findOne({ type, roundId });
  if (!round) {
    round = await Lottery.create({ type, roundId, result: generateXSMBResult() });
  }
  return round;
}

// Routes

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const newUser = await User.create({ username, password: hash });
    res.json({ message: "Đăng ký thành công", userId: newUser._id });
  } catch (err) {
    res.status(400).json({ message: "Tên tài khoản đã tồn tại" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: "Tài khoản không tồn tại" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Sai mật khẩu" });
  const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET);
  res.json({ message: "Đăng nhập thành công", token });
});

app.get("/api/profile", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "Không tìm thấy tài khoản" });
  res.json({ username: user.username, balance: user.balance, history: user.history });
});

app.post("/api/deposit", authMiddleware, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Số tiền nạp không hợp lệ" });
  }
  await User.findByIdAndUpdate(req.user.id, { $inc: { balance: amount } });
  res.json({ message: `Đã nạp ${amount} vnđ thành công` });
});

app.post("/api/bet/:type", authMiddleware, async (req, res) => {
  const { number, amount } = req.body;
  const { type } = req.params;
  if (!["1p", "3p", "5p", "30p"].includes(type)) {
    return res.status(400).json({ message: "Loại cược không hợp lệ" });
  }
  if (!number || number.length !== 5 || isNaN(Number(number))) {
    return res.status(400).json({ message: "Bạn phải nhập đúng 5 chữ số" });
  }
  if (amount <= 0) {
    return res.status(400).json({ message: "Số tiền cược không hợp lệ" });
  }

  const user = await User.findById(req.user.id);
  if (user.balance < amount) {
    return res.status(400).json({ message: "Số dư không đủ để đặt cược" });
  }

  const round = await getOrCreateRound(type);

  let win = false;
  let winAmount = 0;

  if (round.result.dacBiet.includes(number)) {
    win = true;
    winAmount = amount * 10000;
  } else {
    const allResults = [
      ...round.result.giaiNhat,
      ...round.result.giaiNhi,
      ...round.result.giaiBa,
      ...round.result.giaiTu,
      ...round.result.giaiNam,
      ...round.result.giaiSau,
      ...round.result.giaiBay,
    ];
    if (allResults.includes(number)) {
      win = true;
      winAmount = amount * 100;
    }
  }

  const newBalance = user.balance - amount + winAmount;

  const historyEntry = {
    time: new Date(),
    type,
    roundId: round.roundId,
    yourPick: number,
    result: round.result,
    win,
    amountBet: amount,
    winAmount,
  };

  user.balance = newBalance;
  user.history.unshift(historyEntry);
  if (user.history.length > 30) user.history.pop();
  await user.save();

  res.json({
    message: win ? "Bạn đã thắng!" : "Bạn đã thua!",
    result: round.result,
    winAmount,
    balance: user.balance,
    history: user.history,
  });
});

app.get("/api/lottery/:type/current", async (req, res) => {
  const { type } = req.params;
  if (!["1p", "3p", "5p", "30p"].includes(type)) {
    return res.status(400).json({ message: "Loại xổ số không hợp lệ" });
  }
  const round = await getOrCreateRound(type);
  res.json({ roundId: round.roundId, result: round.result });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server đang chạy tại cổng ${PORT}`));
