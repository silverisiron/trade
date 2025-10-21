let price = 100;
let trend = 0;
let balance = 10000;
let position = null;

// 차트 데이터
const labels = [];
const prices = [];
let viewMode = "seconds";
let minuteData = [];
let secCounter = 0;

// DOM 요소
const logBox = document.getElementById("log");
const tradeSlider = document.getElementById("tradeSize");
const tradePercentLabel = document.getElementById("tradePercent");
const leverageSlider = document.getElementById("leverage");
const leverageValue = document.getElementById("leverageValue");

// 사운드 요소
const buySound = document.getElementById("buySound");
const sellSound = document.getElementById("sellSound");
const closeSound = document.getElementById("closeSound");
const newsSound = document.getElementById("newsSound");
const newsBox = document.getElementById("newsBox");

// Chart.js 설정
const ctx = document.getElementById("chart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: labels,
    datasets: [
      {
        label: "가격 (USDT)",
        data: prices,
        borderColor: "#58a6ff",
        borderWidth: 2,
        fill: false,
        tension: 0, // 직선 그래프
      },
    ],
  },
  options: {
    animation: false,
    scales: {
      x: { display: false },
      y: {
        ticks: { color: "#c9d1d9" },
        grid: { color: "#30363d" },
      },
    },
    plugins: {
      legend: { labels: { color: "#c9d1d9" } },
    },
  },
});

// 로그 출력
function log(msg) {
  logBox.innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}<br>` + logBox.innerHTML;
}

// === 초기 더미 데이터 생성 ===
function generateDummyData(minutes = 5) {
  const totalPoints = minutes * 60; // 초당 1포인트
  let dummyPrice = price;
  for (let i = totalPoints; i > 0; i--) {
    dummyPrice += (Math.random() - 0.5) * 2;
    dummyPrice = Math.max(1, dummyPrice);
    const time = new Date(Date.now() - i * 1000).toLocaleTimeString();
    labels.push(time);
    prices.push(dummyPrice);
  }
  chart.update();
  log(`📊 ${minutes}분 분량의 과거 시세 데이터 생성 완료`);
}

// === 페이지 로드 시 실행 ===
generateDummyData(5);

// 가격 업데이트
function updatePrice() {
  trend += (Math.random() - 0.5) * 0.1;
  trend = Math.max(-1, Math.min(1, trend));
  price += trend + (Math.random() - 0.5) * 2;
  price = Math.max(1, price);

  document.getElementById("price").textContent = `가격: ${price.toFixed(2)} USDT`;

  // 초단위 데이터 저장
  secCounter++;
  if (secCounter >= 60) {
    const avg = prices.slice(-60).reduce((a, b) => a + b, 0) / Math.min(60, prices.length);
    minuteData.push({ time: new Date().toLocaleTimeString(), price: avg });
    if (minuteData.length > 60) minuteData.shift();
    secCounter = 0;
  }

  updateChart();
  updatePnL();
  maybeTriggerNews();
}

// 차트 갱신
function updateChart() {
  if (viewMode === "seconds") {
    const now = new Date().toLocaleTimeString();
    labels.push(now);
    prices.push(price);
    if (labels.length > 300) { // 더미 포함 시 300개 이상 방지
      labels.shift();
      prices.shift();
    }
    chart.data.labels = labels;
    chart.data.datasets[0].data = prices;
  } else {
    chart.data.labels = minuteData.map((d) => d.time);
    chart.data.datasets[0].data = minuteData.map((d) => d.price);
  }
  chart.update();
}

// 포지션 진입
function openPosition(type) {
  if (position) {
    log("❗ 이미 포지션이 있습니다. 먼저 종료하세요.");
    return;
  }

  const percent = tradeSlider.value / 100;
  const leverage = parseInt(leverageSlider.value);
  const margin = balance * percent;
  const positionValue = margin * leverage;

  if (margin < 1) {
    log("❗ 너무 작은 금액입니다.");
    return;
  }

  position = { type, entry: price, margin, leverage, amount: positionValue };
  balance -= margin; // 증거금 차감

  // 🎵 사운드 재생
  if (type === "long") buySound.play();
  else sellSound.play();

  log(
    `${type === "long" ? "📈 Long" : "📉 Short"} ${leverage}x 포지션 진입 | 증거금: ${margin.toFixed(
      2
    )} USDT (${(percent * 100).toFixed(0)}%)`
  );

  document.getElementById("position").textContent = `포지션: ${type.toUpperCase()} ${leverage}x @ ${price.toFixed(2)}`;
  updateBalance();
}

// 포지션 종료
function closePosition() {
  if (!position) {
    log("❗ 포지션이 없습니다.");
    return;
  }

  closeSound.play(); // 🎵 포지션 종료 사운드 재생

  const { type, entry, margin, leverage, amount } = position;
  let profit = 0;
  if (type === "long") {
    profit = ((price - entry) / entry) * amount;
  } else {
    profit = ((entry - price) / entry) * amount;
  }

  balance += margin + profit; // 증거금 반환 + 손익 반영
  log(`✅ 포지션 종료 (${type.toUpperCase()} ${leverage}x) | 손익: ${profit.toFixed(2)} USDT`);
  position = null;
  document.getElementById("position").textContent = "포지션: 없음";
  updateBalance();
}

// 잔고 표시 갱신
function updateBalance() {
  document.getElementById("balance").textContent = `잔고: 💰 ${balance.toFixed(2)} USDT`;
}

// 손익 실시간 표시
function updatePnL() {
  if (!position) return;
  const { type, entry, margin, leverage, amount } = position;
  let profit = 0;
  if (type === "long") {
    profit = ((price - entry) / entry) * amount;
  } else {
    profit = ((entry - price) / entry) * amount;
  }
  const pnlPercent = (profit / margin) * 100;
  document.getElementById("position").textContent =
    `포지션: ${type.toUpperCase()} ${leverage}x @ ${entry.toFixed(2)} | 손익: ${profit.toFixed(2)} USDT (${pnlPercent.toFixed(2)}%)`;
}

// 더미 헤드라인 목록
const dummyNews = [
  { headline: "🚀 비트코인 ETF 전격 승인!", impact: 3 },
  { headline: "💥 주요 거래소 해킹 발생, 투자자 혼란", impact: -4 },
  { headline: "🏦 중앙은행, 금리 인하 발표", impact: 2 },
  { headline: "⚠️ 규제 강화 예고, 시장 불안", impact: -3 },
  { headline: "🔥 대형 투자자, 대규모 매수 진입", impact: 4 },
  { headline: "🌐 글로벌 채굴 난이도 급락", impact: -2 },
  { headline: "🪙 신규 코인 상장 기대감 확산", impact: 2 },
];

// 뉴스 이벤트 트리거
function maybeTriggerNews() {
  const chance = Math.random();
  if (chance < 0.02) { // 2% 확률로 발생 (약 50초마다)
    const event = dummyNews[Math.floor(Math.random() * dummyNews.length)];
    triggerNews(event);
  }
}

// 뉴스 실행
function triggerNews(event) {
  const { headline, impact } = event;
  newsSound.play(); // 사운드 재생
  log(`🗞️ 뉴스 속보: ${headline}`);
  newsBox.textContent = `🗞️ ${headline}`;

  // 가격 충격
  price += impact * (Math.random() + 0.5); // 영향 반영
  if (price < 1) price = 1;

  // 10초 뒤 뉴스 제거
  setTimeout(() => {
    newsBox.textContent = "📰 최근 뉴스 없음";
  }, 10000);
}

// 슬라이더 값 표시
tradeSlider.addEventListener("input", () => {
  tradePercentLabel.textContent = `${tradeSlider.value}%`;
});
leverageSlider.addEventListener("input", () => {
  leverageValue.textContent = `${leverageSlider.value}x`;
});

// 보기 전환
document.getElementById("secView").addEventListener("click", () => {
  viewMode = "seconds";
  log("⏱ 초단위 보기로 전환");
});
document.getElementById("minView").addEventListener("click", () => {
  viewMode = "minutes";
  log("🕒 분단위 보기로 전환");
});

// 버튼 이벤트
document.getElementById("longBtn").addEventListener("click", () => openPosition("long"));
document.getElementById("shortBtn").addEventListener("click", () => openPosition("short"));
document.getElementById("closeBtn").addEventListener("click", closePosition);

// 주기적 업데이트
setInterval(updatePrice, 1000);
