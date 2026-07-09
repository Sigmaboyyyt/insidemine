const products = [
  { name: "Spektor", price: 40, color: "#a200ff", perks: ["Стартовый набор", "Цветной префикс"] },
  { name: "Friton", price: 90, color: "#006308", perks: ["Больше домов", "Команды комфорта"] },
  { name: "Qwera", price: 150, color: "#910000", perks: ["Набор ресурсов", "Доп. слоты аукциона"] },
  { name: "GrumFeek", price: 250, color: "#0099ff", perks: ["Расширенные команды", "Красивый префикс"] },
  { name: "Legend", price: 380, color: "#003cff", perks: ["Редкий кит", "Приоритет в очереди"] },
  { name: "Horror", price: 400, color: "#ff6b5f", season: "Только во время Хеллоуина", perks: ["Хеллоуинский стиль", "Особый префикс"] },
  { name: "Efrit", price: 500, color: "#020075", perks: ["Сильный набор", "Больше регионов"] },
  { name: "Region", price: 650, color: "#910000", perks: ["Удобно для кланов", "Расширенная защита"] },
  { name: "Wither", price: 800, color: "#fbff00", perks: ["Темный префикс", "Премиум команды"] },
  { name: "Ice", price: 850, color: "#54DAF4", season: "Только во время Нового года", perks: ["Зимний стиль", "Праздничный набор"] },
  { name: "Synergy", price: 1200, color: "#7700ff", perks: ["Топовые возможности", "Максимум удобства"] },
  { name: "Eternity", price: 1900, color: "#00ff40", perks: ["Элитный статус", "Лучшие бонусы"] },
  { name: "Naternion", price: 2600, color: "#00ff95", perks: ["Самый высокий ранг", "Особое оформление"] },
];

const cases = [
  {
    name: "Донат кейс",
    price: 49,
    color: "#55d8ff",
    description: "Содержит случайную привилегию до 500 рублей включительно.",
    loot: ["GrumFeek", "Legend", "Efrit"],
  },
  {
    name: "Богатый кейс",
    price: 129,
    color: "#f6c85f",
    description: "Содержит все лучшее привилегии до 2600 рублей включительно.",
    loot: ["Synergy", "Eternity", "Naternion"],
  },
  {
    name: "Сезонный кейс",
    price: 189,
    color: "#ff7bd5",
    description: "Содержит сезонную привилегию Horror или Ice и топовые привилегии.",
    loot: ["Horror / Ice", "Synergy", "Eternity", "Naternion"],
  },
];

const durationMultipliers = {
  30: 1,
  90: 2.35,
  forever: 5.5,
};

const durationLabels = {
  30: "30 дней",
  90: "90 дней",
  forever: "Навсегда",
};

const productsNode = document.querySelector("[data-products]");
const casesNode = document.querySelector("[data-cases]");
const durationButtons = document.querySelectorAll("[data-duration]");
const cartPanel = document.querySelector("[data-cart-panel]");
const cartItemsNode = document.querySelector("[data-cart-items]");
const cartEmptyNode = document.querySelector("[data-cart-empty]");
const cartTotalNode = document.querySelector("[data-cart-total]");
const cartCountNode = document.querySelector("[data-cart-count]");
const nicknameInput = document.querySelector("[data-nickname]");
const checkoutNote = document.querySelector("[data-checkout-note]");
const toast = document.querySelector("[data-toast]");

let activeDuration = "30";
let cart = [];
let toastTimer;
let nextCartId = 1;

function formatPrice(value) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function productPrice(product) {
  return Math.round(product.price * durationMultipliers[activeDuration]);
}

function renderProducts() {
  productsNode.innerHTML = products
    .map((product, index) => {
      const perks = product.perks.map((perk) => `<span class="tag">${perk}</span>`).join("");
      const season = product.season ? `<span class="tag season">${product.season}</span>` : "";

      return `
        <article class="product-card" style="--rank: ${product.color}">
          <div class="product-top">
            <div>
              <h3>${product.name}</h3>
              <p>Привилегия для комфортной игры на сервере.</p>
            </div>
            <span class="rank-icon">${product.name.slice(0, 2).toUpperCase()}</span>
          </div>
          <div class="tag-row">${perks}${season}</div>
          <div class="price-row">
            <p class="price">${formatPrice(productPrice(product))}</p>
            <span class="duration-label">${durationLabels[activeDuration]}</span>
          </div>
          <button type="button" data-add-product="${index}">Добавить</button>
        </article>
      `;
    })
    .join("");
}

function renderCases() {
  casesNode.innerHTML = cases
    .map((caseItem, index) => {
      const loot = caseItem.loot.map((item) => `<span class="tag">${item}</span>`).join("");

      return `
        <article class="case-card" style="--case-color: ${caseItem.color}">
          <div class="case-visual" aria-hidden="true">
            <span></span>
          </div>
          <div class="case-body">
            <h3>${caseItem.name}</h3>
            <p>${caseItem.description}</p>
            <div class="tag-row">${loot}</div>
          </div>
          <div class="case-footer">
            <strong>${formatPrice(caseItem.price)}</strong>
            <button type="button" data-add-case="${index}">Добавить</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function openCart() {
  cartPanel.classList.add("open");
  cartPanel.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartPanel.classList.remove("open");
  cartPanel.setAttribute("aria-hidden", "true");
}

function addToCart(item) {
  cart.push({ ...item, id: `cart-${Date.now()}-${nextCartId++}` });
  renderCart();
  showToast(`${item.name} добавлено в корзину`);
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  renderCart();
}

function renderCart() {
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  cartCountNode.textContent = cart.length;
  cartTotalNode.textContent = formatPrice(total);
  cartEmptyNode.classList.toggle("show", cart.length === 0);
  cartItemsNode.innerHTML = cart
    .map(
      (item) => `
        <article class="cart-item">
          <div>
            <h3>${item.name}</h3>
            <p>${item.meta} · ${formatPrice(item.price)}</p>
          </div>
          <button type="button" data-remove="${item.id}" aria-label="Убрать ${item.name}">×</button>
        </article>
      `,
    )
    .join("");
}

function checkout() {
  const nickname = nicknameInput.value.trim();

  if (!nickname) {
    checkoutNote.textContent = "Сначала укажи ник игрока.";
    nicknameInput.focus();
    return;
  }

  if (cart.length === 0) {
    checkoutNote.textContent = "Добавь хотя бы один товар в корзину.";
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const orderLines = cart.map((item) => `- ${item.name}: ${item.meta}, ${formatPrice(item.price)}`);
  const message = [`Заказ InsideMine`, `Ник: ${nickname}`, ...orderLines, `Итого: ${formatPrice(total)}`].join("\n");

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(message).then(() => {
      checkoutNote.textContent = "Заказ скопирован. Отправь его администратору для оплаты.";
      showToast("Заказ скопирован");
    }).catch(() => {
      checkoutNote.textContent = message;
    });
  } else {
    checkoutNote.textContent = message;
    showToast("Заказ готов");
  }
}

durationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeDuration = button.dataset.duration;
    durationButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderProducts();
  });
});

productsNode.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-product]");

  if (!button) {
    return;
  }

  const product = products[Number(button.dataset.addProduct)];
  addToCart({
    name: product.name,
    meta: `Привилегия · ${durationLabels[activeDuration]}`,
    price: productPrice(product),
  });
});

casesNode.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-case]");

  if (!button) {
    return;
  }

  const caseItem = cases[Number(button.dataset.addCase)];
  addToCart({
    name: caseItem.name,
    meta: "Кейс с привилегиями",
    price: caseItem.price,
  });
});

document.querySelector("[data-add-unban]").addEventListener("click", () => {
  addToCart({ name: "Разбан", meta: "Снятие блокировки", price: 150 });
});

document.querySelectorAll("[data-open-cart]").forEach((button) => {
  button.addEventListener("click", openCart);
});

document.querySelectorAll("[data-close-cart]").forEach((button) => {
  button.addEventListener("click", closeCart);
});

cartItemsNode.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");

  if (button) {
    removeFromCart(button.dataset.remove);
  }
});

document.querySelector("[data-checkout]").addEventListener("click", checkout);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCart();
  }
});

renderProducts();
renderCases();
renderCart();
