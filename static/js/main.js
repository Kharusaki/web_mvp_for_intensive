/* =========================================================
   ЗАРЯ — весь интерактив сайта в одном файле.
   Всё хранится в localStorage, поэтому серверу база не нужна.
   ========================================================= */

// ---------- Вспомогательные функции ----------

function load(key, fallback) {
    // Безопасно читаем данные из браузера
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
        return fallback;
    }
}

function save(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        // Приватный режим браузера — просто игнорируем
    }
}

function formatPrice(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ---------- Тосты (всплывающие сообщения) ----------

const toast = document.getElementById("toast");
let toastTimer = null;

function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

// ---------- Появление блоков при скролле ----------

const revealElements = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && revealElements.length) {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12 }
    );
    revealElements.forEach((el) => observer.observe(el));
} else {
    revealElements.forEach((el) => el.classList.add("is-visible"));
}

// ---------- Меню на телефоне ----------

const burger = document.getElementById("burger");
const nav = document.getElementById("main-nav");

if (burger && nav) {
    burger.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        burger.setAttribute("aria-expanded", String(open));
    });

    nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => nav.classList.remove("is-open"));
    });
}

// ---------- Поиск в шапке ----------

const searchBox = document.getElementById("search");
const searchToggle = document.getElementById("search-toggle");
const searchInput = document.getElementById("search-input");

if (searchBox && searchToggle && searchInput) {
    searchToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        const open = searchBox.classList.toggle("is-open");
        if (open) searchInput.focus();
    });

    document.addEventListener("click", (event) => {
        if (!searchBox.contains(event.target)) {
            searchBox.classList.remove("is-open");
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") searchBox.classList.remove("is-open");
    });
}

// ---------- Избранное (лайки) ----------

const liked = load("zarya_likes", {});

function isLiked(id) {
    return Boolean(liked[id]);
}

function updateLikeButton(button) {
    const active = isLiked(button.dataset.id);
    button.classList.toggle("is-liked", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute(
        "aria-label",
        active ? "Убрать из избранного" : "Добавить в избранное"
    );
    const label = button.querySelector("span");
    if (label) label.textContent = active ? "В избранном" : "В избранное";
}

document.querySelectorAll(".like-btn").forEach(updateLikeButton);

document.addEventListener("click", (event) => {
    const button = event.target.closest(".like-btn");
    if (!button) return;

    const id = button.dataset.id;
    if (isLiked(id)) {
        delete liked[id];
        showToast("Убрали из избранного");
    } else {
        liked[id] = true;
        showToast("Сохранено в избранное");
    }
    save("zarya_likes", liked);
    updateLikeButton(button);

    button.classList.remove("pulse");
    void button.offsetWidth; // перезапуск анимации
    button.classList.add("pulse");
});

// ---------- Корзина ----------

const cart = load("zarya_cart", {});

function cartCount() {
    return Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
}

function updateCartBadge(bump) {
    const badge = document.getElementById("cart-badge");
    if (!badge) return;
    const count = cartCount();
    badge.hidden = count === 0;
    badge.textContent = count > 99 ? "99+" : count;
    if (bump && count > 0) {
        badge.classList.remove("bump");
        void badge.offsetWidth;
        badge.classList.add("bump");
    }
}

function addToCart(product) {
    if (cart[product.id]) {
        cart[product.id].qty += 1;
    } else {
        cart[product.id] = Object.assign({ qty: 1 }, product);
    }
    save("zarya_cart", cart);
    updateCartBadge(true);
    showToast("«" + product.name + "» — в корзине");
    renderCartPage();
}

function readProductFromButton(button) {
    // Собираем данные товара прямо из карточки на странице
    const card = button.closest(".product-card");
    const scope = card || document;
    const titleEl = scope.querySelector(".card-title a, .product-info h1");
    const priceEl = scope.querySelector(".price, .price--big");
    const imageEl = scope.querySelector(".card-media img, .product-media img");

    if (!titleEl || !priceEl) return null;

    return {
        id: button.dataset.id,
        name: titleEl.textContent.trim(),
        price: Number(priceEl.textContent.replace(/\D/g, "")),
        image: imageEl ? imageEl.getAttribute("src") : "",
        category: card ? card.dataset.category : "",
    };
}

document.addEventListener("click", (event) => {
    const button = event.target.closest(".add-cart");
    if (!button) return;

    const product = readProductFromButton(button);
    if (!product) return;
    addToCart(product);

    const original = button.textContent;
    button.textContent = "Добавлено ✓";
    button.classList.add("is-added");
    setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-added");
    }, 1500);
});

updateCartBadge(false);

// ---------- Страница корзины ----------

const cartItemsEl = document.getElementById("cart-items");
const cartEmptyEl = document.getElementById("cart-empty");
const cartSummaryEl = document.getElementById("cart-summary");

function cartItems() {
    return Object.values(cart);
}

function renderCartPage() {
    if (!cartItemsEl) return;

    const items = cartItems();
    const isEmpty = items.length === 0;

    if (cartEmptyEl) cartEmptyEl.hidden = !isEmpty;
    if (cartSummaryEl) cartSummaryEl.hidden = isEmpty;
    cartItemsEl.hidden = isEmpty;

    if (isEmpty) {
        cartItemsEl.innerHTML = "";
        return;
    }

    cartItemsEl.innerHTML = items
        .map((item) => {
            return (
                '<div class="cart-item" data-id="' +
                escapeHtml(item.id) +
                '">' +
                '<img src="' +
                escapeHtml(item.image) +
                '" alt="' +
                escapeHtml(item.name) +
                '">' +
                '<div class="cart-item-info">' +
                '<span class="card-category">' +
                escapeHtml(item.category || "Украшение") +
                "</span>" +
                "<h3>" +
                escapeHtml(item.name) +
                "</h3>" +
                '<div class="cart-item-price">' +
                formatPrice(item.price * item.qty) +
                "</div>" +
                "</div>" +
                '<div class="cart-item-controls">' +
                '<div class="qty">' +
                '<button type="button" data-action="minus" aria-label="Убрать одну штуку">−</button>' +
                "<span>" +
                item.qty +
                "</span>" +
                '<button type="button" data-action="plus" aria-label="Добавить одну штуку">+</button>' +
                "</div>" +
                '<button class="remove-item" type="button" data-action="remove">Удалить</button>' +
                "</div>" +
                "</div>"
            );
        })
        .join("");

    renderSummary();
}

function renderSummary() {
    const subtotal = cartItems().reduce(
        (sum, item) => sum + item.price * item.qty,
        0
    );
    const delivery = subtotal === 0 || subtotal >= 5000 ? 0 : 350;

    const subtotalEl = document.getElementById("summary-subtotal");
    const deliveryEl = document.getElementById("summary-delivery");
    const totalEl = document.getElementById("summary-total");
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (deliveryEl) deliveryEl.textContent = delivery === 0 ? "бесплатно" : formatPrice(delivery);
    if (totalEl) totalEl.textContent = formatPrice(subtotal + delivery);
}

if (cartItemsEl) {
    cartItemsEl.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const row = button.closest(".cart-item");
        const id = row.dataset.id;
        const item = cart[id];
        if (!item) return;

        if (button.dataset.action === "plus") item.qty += 1;
        if (button.dataset.action === "minus") item.qty -= 1;
        if (button.dataset.action === "remove" || item.qty <= 0) delete cart[id];

        save("zarya_cart", cart);
        updateCartBadge(false);
        renderCartPage();
    });

    renderCartPage();
}

const checkoutBtn = document.getElementById("checkout");
if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
        Object.keys(cart).forEach((key) => delete cart[key]);
        save("zarya_cart", cart);
        updateCartBadge(false);
        renderCartPage();
        showToast("Демо-заказ оформлен! Мы позвоним для подтверждения");
    });
}

// ---------- Фильтры каталога ----------

const filterRow = document.getElementById("filters");
if (filterRow) {
    filterRow.addEventListener("click", (event) => {
        const chip = event.target.closest(".chip");
        if (!chip) return;

        filterRow.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");

        const filter = chip.dataset.filter;
        const cards = document.querySelectorAll("#catalog-grid .product-card");
        let visible = 0;

        cards.forEach((card) => {
            const show = filter === "all" || card.dataset.category === filter;
            card.hidden = !show;
            if (show) visible += 1;
        });

        const empty = document.getElementById("catalog-empty");
        if (empty) empty.hidden = visible > 0;
    });
}

// ---------- Форма входа (демо) ----------

const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!loginForm.checkValidity()) {
            loginForm.reportValidity();
            return;
        }
        showToast("Демо-режим: вход на сервер не отправляется");
        loginForm.reset();
    });
}
