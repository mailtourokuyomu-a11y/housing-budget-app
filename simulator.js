'use strict';

function monthlyPayment(principalMan, annualRate, years) {
  const principal = Math.max(0, principalMan) * 10000;
  const months = Math.max(1, Math.round(years * 12));
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months / 10000;
  const f = Math.pow(1 + r, months);
  return principal * r * f / (f - 1) / 10000;
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
  return Math.max(0, principal * f - payment * (f - 1) / r) / 10000;
}

function simulate(v, options = {}) {
  const years = 10;
  const rate = options.rate ?? v.rate;
  const incomeMultiplier = options.incomeMultiplier ?? 1;
  const livingMultiplier = options.livingMultiplier ?? 1;
  const loan = Math.max(0, v.price - v.down);
  const mortgage = monthlyPayment(loan, rate, v.loanYears);
  const startingSavings = v.savings - v.down - v.acquisitionCost - v.movingCost;
  let savings = startingSavings;
  const reserveNeed = Math.max(150, (v.living + v.car + v.otherDebt) * 6);
  const rows = [];

  for (let y = 1; y <= years; y++) {
    const income = v.takehome * 12 * Math.pow(1 + v.incomeGrowth / 100, y - 1) * incomeMultiplier + v.bonus * incomeMultiplier;
    const living = v.living * 12 * Math.pow(1 + v.inflation / 100, y - 1) * livingMultiplier;
    const education = v.education * 12 * Math.pow(1 + v.inflation / 100, y - 1);
    const car = v.car * 12 * Math.pow(1 + v.inflation / 100, y - 1);
    const otherDebt = v.otherDebt * 12;
    const retirement = v.retirementSave * 12;
    const propertyTax = v.propertyTax * Math.pow(1 + v.inflation / 100, y - 1);
    const insurance = v.insurance * Math.pow(1 + v.inflation / 100, y - 1);
    const repairReserve = Math.max(0, v.repairReserve);
    const repairEvent = y % Math.max(1, v.repairCycle) === 0 ? Math.max(0, v.repair) : 0;
    const repair = repairReserve + repairEvent;
    const event = y === v.eventYear ? v.eventAmount : 0;
    const mortgagePayment = mortgage * 12;
    const totalOut = living + education + car + otherDebt + retirement + propertyTax + insurance + repair + event + mortgagePayment;
    const cashFlow = income - totalOut;
    savings += cashFlow;
    const balance = remainingBalance(loan, rate, v.loanYears, y);
    rows.push({year:y,income,living,education,car,otherDebt,retirement,propertyTax,insurance,repair,event,mortgagePayment,cashFlow,savings,mortgageBalance:balance});
  }

  let minSavings = startingSavings;
  let minYear = 0;
  for (const row of rows) {
    if (row.savings < minSavings) {
      minSavings = row.savings;
      minYear = row.year;
    }
  }

  return { rows, mortgage, loan, startingSavings, finalSavings:savings, minSavings, minYear, reserveNeed };
}

function assess(result) {
  if (result.minSavings < 0) {
    const when = result.minYear === 0 ? '購入時点' : `10年以内の${result.minYear}年目`;
    return {cls:'bad', label:'🔴 負担が大きい可能性', reason:`${when}に預貯金がマイナスになる試算です。条件の見直しが必要です。`};
  }
  if (result.minSavings < result.reserveNeed) {
    return {cls:'warn', label:'🟡 注意が必要', reason:`最低残高が生活防衛資金の簡易目安（約${Math.round(result.reserveNeed).toLocaleString('ja-JP')}万円）を下回る試算です。`};
  }
  return {cls:'good', label:'🟢 安心できる範囲', reason:'入力条件による10年間の試算では、預貯金がマイナスにならず生活防衛資金の簡易目安も維持します。将来を保証する判定ではありません。'};
}

window.HousingSimulator = { simulate, assess, monthlyPayment };
