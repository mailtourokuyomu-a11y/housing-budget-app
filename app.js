
'use strict';

const $ = (id) => document.getElementById(id);
const valueOf = (id) => Number.parseFloat($(id).value);
const man = (n) => `${Math.round(Math.max(0, n)).toLocaleString('ja-JP')}万円`;

function monthlyPayment(principalMan, annualRate, years) {
  const principal = Math.max(0, principalMan) * 10000;
  const months = Math.max(1, Math.round(years * 12));
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months / 10000;
  const f = Math.pow(1 + r, months);
  return principal * r * f / (f - 1) / 10000;
}

function principalFromPayment(paymentMan, annualRate, years) {
  const payment = Math.max(0, paymentMan) * 10000;
  const months = Math.max(1, Math.round(years * 12));
  const r = annualRate / 100 / 12;
  if (r === 0) return payment * months / 10000;
  const f = Math.pow(1 + r, months);
  return payment * (f - 1) / (r * f) / 10000;
}

function remainingBalance(principalMan, annualRate, years, paidYears) {
  const principal = Math.max(0, principalMan) * 10000;
  const totalMonths = Math.max(1, Math.round(years * 12));
  const paidMonths = Math.max(0, Math.min(totalMonths, Math.round(paidYears * 12)));
  if (paidMonths >= totalMonths) return 0;
  const r = annualRate / 100 / 12;
  const payment = monthlyPayment(principalMan, annualRate, years) * 10000;
  if (r === 0) return Math.max(0, principal - payment * paidMonths) / 10000;
  const f = Math.pow(1 + r, paidMonths);
  const balance = principal * f - payment * (f - 1) / r;
  return Math.max(0, balance) / 10000;
}

function parseChildAges(text) {
  if (!text.trim()) return [];
  return text.split(/[,\s、]+/)
    .map(x => Number.parseInt(x, 10))
    .filter(x => Number.isFinite(x) && x >= 0 && x <= 30);
}

function getValues() {
  return {
    age: valueOf('age'),
    spouseAge: valueOf('spouseAge'),
    retireAge: valueOf('retireAge'),
    income: valueOf('income'),
    takehome: valueOf('takehome'),
    savings: valueOf('savings'),
    children: valueOf('children'),
    childAges: parseChildAges($('childAges').value),
    living: valueOf('living'),
    car: valueOf('car'),
    otherDebt: valueOf('otherDebt'),
    educationSave: valueOf('educationSave'),
    retirementSave: valueOf('retirementSave'),
    price: valueOf('price'),
    down: valueOf('down'),
    years: valueOf('years'),
    rate: valueOf('rate')
  };
}

function validate(v) {
  const e = [];
  if (!Number.isFinite(v.age) || v.age < 18 || v.age > 79) e.push('本人年齢は18〜79歳で入力してください。');
  if (!Number.isFinite(v.spouseAge) || v.spouseAge < 0 || v.spouseAge > 79) e.push('配偶者年齢を確認してください。');
  if (!Number.isFinite(v.retireAge) || v.retireAge < 50 || v.retireAge > 80 || v.retireAge <= v.age) e.push('退職予定年齢は本人年齢より高く入力してください。');
  if (!Number.isFinite(v.income) || v.income <= 0) e.push('世帯年収を入力してください。');
  if (!Number.isFinite(v.takehome) || v.takehome <= 0) e.push('手取り月収を入力してください。');
  if (!Number.isFinite(v.savings) || v.savings < 0) e.push('預貯金を確認してください。');
  if (!Number.isFinite(v.children) || v.children < 0 || v.children > 8) e.push('子どもの人数を確認してください。');
  if (!Number.isFinite(v.living) || v.living < 0) e.push('基本生活費を確認してください。');
  if (!Number.isFinite(v.car) || v.car < 0) e.push('車関連費を確認してください。');
  if (!Number.isFinite(v.otherDebt) || v.otherDebt < 0) e.push('他の借入返済を確認してください。');
  if (!Number.isFinite(v.educationSave) || v.educationSave < 0) e.push('教育費・教育積立を確認してください。');
  if (!Number.isFinite(v.retirementSave) || v.retirementSave < 0) e.push('老後積立を確認してください。');
  if (!Number.isFinite(v.price) || v.price <= 0) e.push('希望住宅価格を入力してください。');
  if (!Number.isFinite(v.down) || v.down < 0 || v.down > v.price) e.push('頭金を確認してください。');
  if (!Number.isFinite(v.years) || v.years < 5 || v.years > 50) e.push('返済期間は5〜50年で入力してください。');
  if (!Number.isFinite(v.rate) || v.rate < 0 || v.rate > 10) e.push('想定金利は0〜10%で入力してください。');
  if (v.children > 0 && v.childAges.length > 0 && v.childAges.length !== v.children) {
    e.push('子どもの年齢は、人数と同じ数だけ入力してください（例：12,8）。');
  }
  return e;
}

function diagnose() {
  const v = getValues();
  const errors = validate(v);
  const eb = $('errorBox');
  if (errors.length) {
    eb.innerHTML = errors.map(x => `・${x}`).join('<br>');
    eb.style.display = 'block';
    return;
  }
  eb.style.display = 'none';

  const loan = Math.max(0, v.price - v.down);
  const payment = monthlyPayment(loan, v.rate, v.years);
  const stressPayment = monthlyPayment(loan, v.rate + 1.0, v.years);

  // 生活防衛資金：基本生活費・車・他借入の6か月分＋50万円、最低150万円。
  const monthlyEssential = v.living + v.car + v.otherDebt;
  const reserveNeed = Math.max(150, monthlyEssential * 6 + 50);
  const usableDown = Math.max(0, v.savings - reserveNeed);
  const safeDown = Math.min(v.down, usableDown);

  // 所有後の税・保険・修繕等の簡易積立。年0.8%相当、最低月2万円。
  const ownershipCost = Math.max(2.0, v.price * 0.008 / 12);

  // 収入減・突発費に備える月次余力。手取りの8%、最低2万円。
  const monthlyBuffer = Math.max(2.0, v.takehome * 0.08);
  const educationPeakBuffer = v.childAges.reduce((sum, age) => {
  if (age >= 16 && age <= 22) return sum + 2.0;
  if (age >= 10 && age <= 15) return sum + 1.0;
  return sum;
}, 0);

  // 家計から見た住宅ローン返済余力。
  const cashflowCapacity = Math.max(
    0,
    v.takehome
      - v.living
      - v.car
      - v.otherDebt
      - v.educationSave
    -- educationPeakBuffer
      - v.retirementSave
    
      - monthlyBuffer
      - ownershipCost
  );

  // 支出が低く入力された場合の暴走防止として、手取り25%も上限にする。
  const ratioCapacity = Math.max(0, v.takehome * 0.25);
  const safePayment = Math.min(cashflowCapacity, ratioCapacity);

  // 退職後の返済を長く残し過ぎないよう、安心予算は「退職＋5歳」までを目安に逆算。
  const safeYears = Math.max(5, Math.min(v.years, v.retireAge + 5 - v.age));
  const safeLoan = principalFromPayment(safePayment, v.rate, safeYears);
  const safePrice = Math.max(0, safeLoan + safeDown);

  const cashRatio = v.takehome > 0 ? (payment / v.takehome) * 100 : 0;
  const annualDebt = (payment + v.otherDebt) * 12;
  const dti = v.income > 0 ? (annualDebt / v.income) * 100 : 0;
  const flat35Limit = v.income < 400 ? 30 : 35;

  const reserveAfter = v.savings - v.down;
  const yearsToRetire = Math.max(0, v.retireAge - v.age);
  const retireBalance = remainingBalance(loan, v.rate, v.years, yearsToRetire);
  const gap = v.price - safePrice;

  const childPeakSoon = v.childAges.some(a => a >= 10 && a <= 18);
  const stressIncrease = Math.max(0, stressPayment - payment);

  let cls = 'good';
  let title = '🟢 安全圏の可能性';

  const majorRisk =
    gap > 300 ||
    reserveAfter < reserveNeed ||
    cashflowCapacity <= 0 ||
    cashRatio > 30 ||
    retireBalance > Math.max(500, v.income);

  const caution =
    gap > 0 ||
    cashRatio > 25 ||
    dti > flat35Limit ||
    stressIncrease >= 2 ||
    childPeakSoon;

  if (majorRisk) {
    cls = 'bad';
    title = '🔴 負担が大きい可能性';
  } else if (caution) {
    cls = 'warn';
    title = '🟡 購入前に詳細確認を推奨';
  }

  $('judgement').className = `judgement ${cls}`;
  $('judgement').textContent = title;
  $('mPrice').textContent = man(v.price);
  $('mSafe').textContent = `約${man(safePrice)}`;
  $('mGap').textContent = gap > 0 ? `約${man(gap)}超過` : `約${man(Math.abs(gap))}余裕`;
  $('mLoan').textContent = man(loan);
  $('mPay').textContent = `${payment.toFixed(1)}万円/月`;
  $('mCashRatio').textContent = `${cashRatio.toFixed(1)}%`;
  $('mReserve').textContent = man(reserveAfter);
  $('mRetireBalance').textContent = man(retireBalance);
  $('mDti').textContent = `${dti.toFixed(1)}%`;
  $('mFlat35').textContent = `年収区分の基準 ${flat35Limit}%以下`;

  $('summary').textContent = gap > 0
    ? `希望価格は、家計から見た安心購入予算を約${Math.round(gap).toLocaleString('ja-JP')}万円上回る試算です。「審査に通るか」ではなく、購入後の生活・教育・老後まで含めて再確認してください。`
    : '希望価格は簡易診断上の安心購入予算の範囲内です。ただし、教育費・老後資金・住宅維持費・収入減少などの個別確認は必要です。';

  const risks = [];
  risks.push(`住宅所有後の税・保険・修繕等として月約${ownershipCost.toFixed(1)}万円を簡易的に見込んでいます。`);
  risks.push(`家計の突発支出・収入減に備える余力として月約${monthlyBuffer.toFixed(1)}万円を確保して計算しています。`);
  if (reserveAfter < reserveNeed) risks.push(`購入後預貯金が、生活防衛資金の簡易目安（約${Math.round(reserveNeed).toLocaleString('ja-JP')}万円）を下回ります。`);
  if (cashRatio > 25) risks.push(`住宅ローン返済だけで手取り月収の${cashRatio.toFixed(1)}%です。家計余力を確認してください。`);
  if (dti > flat35Limit) risks.push(`入力条件による参考総返済負担率が${dti.toFixed(1)}%で、フラット35の年収区分別基準${flat35Limit}%を上回っています。`);
  if (v.children > 0) risks.push(`子ども${v.children}人の教育費ピークと住宅ローン返済が重なる時期を確認してください。`);
  if (childPeakSoon) risks.push('10〜18歳のお子さまがいるため、近い将来の教育費増加を特に確認してください。');
  if (retireBalance > 0) risks.push(`退職予定年齢${Math.round(v.retireAge)}歳時点の残債は約${Math.round(retireBalance).toLocaleString('ja-JP')}万円の試算です。退職後返済の原資を確認してください。`);
  if (v.car >= 4) risks.push(`車関連費が月${v.car.toFixed(1)}万円です。車検・保険・タイヤ・買替え費用も長期計画に含めてください。`);
  risks.push('外構、地盤改良、登記、引越し、家具家電等の住宅取得諸費用は別途見積確認が必要です。');

  $('risks').innerHTML = risks.map(r => `<div class="risk-item">・${r}</div>`).join('');

  $('stressPay').textContent = `${stressPayment.toFixed(1)}万円/月`;
  $('stressDiff').textContent = `現在の想定より月約${stressIncrease.toFixed(1)}万円増える試算です。`;

  $('result').hidden = false;
  requestAnimationFrame(() => $('result').scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.hidden = el.id !== id);
  document.querySelectorAll('.menu-card').forEach(btn => btn.classList.toggle('active', btn.dataset.target === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  $('diagnoseBtn').addEventListener('click', diagnose);
  $('retryBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  document.querySelectorAll('.menu-card').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.target));
  });

  $('closeInstallHelp').addEventListener('click', () => $('iosInstall').hidden = true);

  let deferredPrompt = null;
  const installBtn = $('installBtn');
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone) installBtn.hidden = false;
  });

  if (isIOS && !isStandalone) installBtn.hidden = false;

  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.hidden = true;
    } else if (isIOS) {
      $('iosInstall').hidden = false;
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
});
