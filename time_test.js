const byDay = {
    '2026-03-23': { tokens: 0, cost: 0, calls: 16 }
};

const today = new Date();
const dayChart = [];
for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    dayChart.push({ label, key, calls: byDay[key]?.calls || 0 });
}

console.log("Current UTC Time:", new Date().toISOString());
console.log("Current Local Time:", new Date().toString());
console.log("DayChart:");
console.table(dayChart.slice(-3));
