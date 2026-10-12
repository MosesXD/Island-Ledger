const STORAGE_KEY = "island-ledger-transactions-v1";
const money = new Intl.NumberFormat("en-TT", { style: "currency", currency: "TTD" });
const form = document.querySelector("#transaction-form");
const list = document.querySelector("#transaction-list");
const message = document.querySelector("#form-message");
const dateInput = document.querySelector("#date");

dateInput.value = new Date().toISOString().slice(0, 10);
document.querySelector("#footer-year").textContent = new Date().getFullYear();
document.querySelector("#month-label").textContent = new Date().toLocaleDateString("en-TT", { month: "long", year: "numeric" });

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}
let transactions = loadTransactions();

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function render() {
  const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  document.querySelector("#balance-total").textContent = money.format(income - expenses);
  document.querySelector("#income-total").textContent = money.format(income);
  document.querySelector("#expense-total").textContent = money.format(expenses);

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  if (!sorted.length) {
    list.innerHTML = '<tr><td colspan="5" class="empty-note">No transactions yet. Add one above to get started.</td></tr>';
  } else {
    list.innerHTML = sorted.map(t => `
      <tr>
        <td><strong>${escapeHTML(t.description)}</strong></td>
        <td><span class="category-pill">${escapeHTML(t.category)}</span></td>
        <td>${escapeHTML(t.date)}</td>
        <td class="align-right ${t.type === "income" ? "amount-income" : "amount-expense"}">${t.type === "income" ? "+" : "−"}${money.format(t.amount)}</td>
        <td><button class="delete-button" type="button" data-delete="${t.id}" aria-label="Delete ${escapeHTML(t.description)}">×</button></td>
      </tr>`).join("");
  }
  renderSpending();
}
function renderSpending() {
  const expenses = transactions.filter(t => t.type === "expense");
  const totals = {};
  expenses.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const container = document.querySelector("#spending-bars");
  if (!entries.length) {
    container.innerHTML = '<p class="empty-note">Add a few expenses to see your category breakdown.</p>';
    return;
  }
  const max = entries[0][1] || 1;
  container.innerHTML = entries.slice(0, 5).map(([category, amount]) => `
    <div class="bar-row">
      <div class="bar-label"><span>${escapeHTML(category)}</span><span>${money.format(amount)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, amount / max * 100)}%"></div></div>
    </div>`).join("");
}
form.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(form);
  const amount = Number(data.get("amount"));
  const description = String(data.get("description")).trim();
  if (!description || !Number.isFinite(amount) || amount <= 0) {
    message.textContent = "Enter a description and an amount greater than zero.";
    return;
  }
  transactions.push({
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
    description,
    amount: Math.round(amount * 100) / 100,
    type: data.get("type"),
    category: data.get("category"),
    date: data.get("date")
  });
  saveTransactions();
  render();
  form.reset();
  dateInput.value = new Date().toISOString().slice(0, 10);
  message.textContent = "Transaction added. Nice one!";
});
list.addEventListener("click", event => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  transactions = transactions.filter(t => t.id !== button.dataset.delete);
  saveTransactions();
  render();
  message.textContent = "Transaction removed.";
});
document.querySelector("#clear-demo").addEventListener("click", () => {
  if (!transactions.length) return;
  if (confirm("Clear all transactions saved in this browser? This cannot be undone.")) {
    transactions = [];
    saveTransactions();
    render();
    message.textContent = "Browser demo data cleared.";
  }
});
render();
