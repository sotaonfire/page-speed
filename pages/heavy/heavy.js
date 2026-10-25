// 遷移先（重いページ）のスクリプト
// <head> で同期読み込みしているので、実行が終わるまで画面は描画されない

// 計測タグの代わり。prerender では遷移する前（裏で読み込んだ時点）に出力される
console.log(
  `[計測タグ] PV送信: ${location.pathname}`,
  document.prerendering ? "（prerender 中）" : "（表示中）",
);

// ---------- 重い処理（時間で待つのではなく、決まった量の計算をする） ----------

// 重さの調整用（どちらも増やすほど重くなる）
const MODULE_PASSES = 50;
const LOTTERY_DRAWS = 150_000_000;

// 1. 巨大バンドル（heavy-bundle.js）の全関数を、データを変えながら MODULE_PASSES 回実行する
let checksum = 0;
for (let pass = 0; pass < MODULE_PASSES; pass++) {
  const chunk = HEAVY_DATA[pass % HEAVY_DATA.length];
  checksum = (checksum + chunk.charCodeAt(checksum & 0xffff)) | 0;
  for (const module of HEAVY_MODULES) {
    checksum = module(checksum);
  }
}

// 2. 大当たり抽選（1/319）をシミュレーションする
const JACKPOT_ODDS = 319;
// xorshift は 0 から始めると 0 のままになるので避ける
let lotterySeed = checksum || 1;
let jackpotHits = 0;
for (let i = 0; i < LOTTERY_DRAWS; i++) {
  // xorshift で乱数を作り、1/319 で当たり
  lotterySeed ^= lotterySeed << 13;
  lotterySeed ^= lotterySeed >>> 17;
  lotterySeed ^= lotterySeed << 5;
  if ((lotterySeed >>> 0) % JACKPOT_ODDS === 0) jackpotHits++;
}

const CONFETTI_COUNT = 120;
const CONFETTI_COLORS = [
  "#ffd700",
  "#ff1a1a",
  "#ffffff",
  "#00e5ff",
  "#3dff00",
  "#ff00d4",
];

function createConfetti() {
  const container = document.querySelector(".confetti");
  const random = (min, max) => min + Math.random() * (max - min);

  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const piece = document.createElement("span");
    piece.style.setProperty("--x", `${random(0, 100)}vw`);
    piece.style.setProperty("--size", `${random(8, 16)}px`);
    piece.style.setProperty(
      "--color",
      CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    );
    piece.style.setProperty("--duration", `${random(2.5, 5)}s`);
    piece.style.setProperty("--delay", `${random(0.6, 3)}s`);
    piece.style.setProperty("--spin", `${random(360, 1080)}deg`);
    container.append(piece);
  }
}

// 演出（アニメーション＋効果音）を始める
function startJackpot() {
  document.body.classList.add("is-active");

  const sound = document.querySelector(".jackpot-sound");
  sound.play().catch(() => {
    // 自動再生がブロックされたときは、最初のクリックかキー入力で鳴らす
    const playOnce = () => sound.play();
    document.addEventListener("pointerdown", playOnce, { once: true });
    document.addEventListener("keydown", playOnce, { once: true });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  createConfetti();
  document.querySelector(".lottery-draws").textContent =
    LOTTERY_DRAWS.toLocaleString();
  document.querySelector(".lottery-hits").textContent =
    jackpotHits.toLocaleString();

  // prerender 中は裏で読み込んでいるだけなので、実際に表示された瞬間に演出を始める
  if (document.prerendering) {
    document.addEventListener("prerenderingchange", startJackpot, {
      once: true,
    });
  } else {
    startJackpot();
  }
});
