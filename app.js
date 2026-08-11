
'use strict';

const $ = (id) => document.getElementById(id);
const man = (n) => `${Math.round(n).toLocaleString('ja-JP')}万円`;
const valueOf = (id) => Number.parseFloat($(id).value);

function monthlyPayment(principalMan, annualRate, years) {
  const principal = Math.max(0, principalMan) * 10000;
  const months = Math.max(1, years * 12);
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months / 10000;
  const f = Math.pow(1 + r, months);
  return principal * r * f / (f - 1) / 10000;
}

function principalFromPayment(paymentMan, annualRate, years) {
  const payment = Math.max(0, paymentMan) * 10000;
  const months = Math.max(1, years * 12);
  const r = annualRate / 100 / 12;
  if (r === 0) return payment * months / 10000;
  const f = Math.pow(1 + r, months);
  return payment * (f - 1) / (r * f) / 10000;
}

function getValues() {
  return {
    age:valueOf('age'), income:valueOf('income'), takehome:valueOf('takehome'),
    savings:valueOf('savings'), children:valueOf('children'), living:valueOf('living'),
    otherDebt:valueOf('otherDebt'), car:valueOf('car'), price:valueOf('price'),
    down:valueOf('down'), years:valueOf('years'), rate:valueOf('rate')
  };
}

function validate(v) {
  const e = [];
  if (!Number.isFinite(v.age) || v.age < 18 || v.age > 79) e.push('本人年齢は18〜79歳で入力してください。');
  if (!Number.isFinite(v.income) || v.income <= 0) e.push('世帯年収を入力してください。');
  if (!Number.isFinite(v.takehome) || v.takehome <= 0) e.push('手取り月収を入力してください。');
  if (!Number.isFinite(v.savings) || v.savings < 0) e.push('預貯金を確認してください。');
  if (!Number.isFinite(v.children) || v.children < 0) e.push('子どもの人数を確認してください。');
  if (!Number.isFinite(v.price) || v.price <= 0) e.push('希望住宅価格を入力してください。');
  if (!Number.isFinite(v.down) || v.down < 0) e.push('頭金を確認してください。');
  if (v.down > v.price) e.push('頭金が希望住宅価格を上回っています。');
  if (!Number.isFinite(v.years) || v.years < 5 || v.years > 50) e.push('返済期間は5〜50年で入力してください。');
  if (!Number.isFinite(v.rate) || v.rate < 0 || v.rate > 10) e.push('想定金利は0〜10%で入力してください。');
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

  // MVP用の暫定安全基準。本番前にFP基準として正式設計すること。
  let housingRatio = 0.25 - Math.min(v.children * 0.02, 0.06);
  if (v.age >= 50) housingRatio -= 0.02;
  housingRatio = Math.max(0.15, housingRatio);

  const targetHousingPayment = Math.max(0, v.takehome * housingRatio - v.otherDebt);
  const reserveNeed = v.living * 6 + 100;
  const usableDown = Math.max(0, v.savings - reserveNeed);
  const safeDown = Math.min(v.down, usableDown);

  let safeLoan = principalFromPayment(targetHousingPayment, v.rate, v.years);
  if (v.age + v.years > 75) safeLoan *= 0.90;

  const safePrice = Math.max(0, safeLoan + safeDown);
  const loan = Math.max(0, v.price - v.down);
  const payment = monthlyPayment(loan, v.rate, v.years);
  const stressPayment = monthlyPayment(loan, v.rate + 1.0, v.years);
  const ratio = ((payment + v.otherDebt) / v.takehome) * 100;
  const reserveAfter = v.savings - v.down;
  const gap = v.price - safePrice;

  let cls='good', title='🟢 安全圏の可能性';
  if (gap > 300 || ratio > 30 || reserveAfter < reserveNeed) {
    cls='bad'; title='🔴 負担が大きい可能性';
  } else if (gap > 0 || ratio > 25 || v.age + v.years > 75) {
    cls='warn'; title='🟡 購入前に詳細確認を推奨';
  }

  $('judgement').className = `judgement ${cls}`;
  $('judgement').textContent = title;
  $('mPrice').textContent = man(v.price);
  $('mSafe').textContent = `約${man(safePrice)}`;
  $('mLoan').textContent = man(loan);
  $('mPay').textContent = `${payment.toFixed(1)}万円/月`;
  $('mRatio').textContent = `${ratio.toFixed(1)}%`;
  $('mReserve').textContent = man(reserveAfter);

  $('summary').textContent = gap > 0
    ? `希望価格は、この簡易診断の推奨住宅予算を約${Math.round(gap).toLocaleString('ja-JP')}万円上回っています。契約前に詳細な資金計画を確認してください。`
    : '希望価格は、この簡易診断の推奨住宅予算の範囲内です。ただし、教育費・老後資金・住宅維持費などの詳細確認は必要です。';

  const risks = [];
  if (reserveAfter < reserveNeed) risks.push(`購入後預貯金が、簡易予備資金目安（約${Math.round(reserveNeed).toLocaleString('ja-JP')}万円）を下回ります。`);
  if (ratio > 25) risks.push(`住宅ローン返済＋他借入が手取り月収の${ratio.toFixed(1)}%です。家計余力が小さくなる可能性があります。`);
  if (v.children > 0) risks.push(`子ども${v.children}人の教育費ピークと住宅ローン返済が重なる時期を確認してください。`);
  if (v.age + v.years > 75) risks.push(`予定完済年齢は${Math.round(v.age + v.years)}歳です。退職後返済の確認が必要です。`);
  if (v.car >= 4) risks.push(`車関連費が月${v.car.toFixed(1)}万円です。複数台保有・買替え費用も長期計画に含めてください。`);
  risks.push('固定資産税、保険、修繕、外構、地盤改良、登記、家具家電、引越し等はこの簡易版では十分に反映していません。');
  $('risks').innerHTML = risks.map(r => `<div class="risk">・${r}</div>`).join('');

  $('stressPay').textContent = `${stressPayment.toFixed(1)}万円/月`;
  $('stressDiff').textContent = `現在の想定より月約${Math.max(0,stressPayment-payment).toFixed(1)}万円増える試算です。`;

  $('result').hidden = false;
  requestAnimationFrame(() => $('result').scrollIntoView({behavior:'smooth', block:'start'}));
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.hidden = el.id !== id);
  document.querySelectorAll('.menu-card').forEach(btn => btn.classList.toggle('active', btn.dataset.target === id));
  window.scrollTo({top:0, behavior:'smooth'});
}

document.addEventListener('DOMContentLoaded', () => {
  $('diagnoseBtn').addEventListener('click', diagnose);
  $('retryBtn').addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));

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

  if (isIOS && !isStandalone) {
    installBtn.hidden = false;
  }

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
