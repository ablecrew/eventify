import {
  getCart,
  getCartTotal,
  removeFromCart,
  adjustQuantity,
} from "./utils/util.js"; 

function formatPrice(price) {
  return `Ksh ${price.toLocaleString()}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const notyf = new Notyf({
  duration: 3000,
  position: { x: "right", y: "top" },
  ripple: false,
});

function createCartItemHTML(item) {
  const itemId = `${item.id}-${item.occurrenceId}-${item.ticketTypeId}`;

  return `
        <div class="shopping-cart-item" data-item-id="${itemId}">
          <img src="${item.eventImage}" alt="${item.eventTitle}" />
          <div class="item-info">
            <p class="title">${item.eventTitle}</p>
            <p class="id">#${item.id}</p>
            ${
              item.date
                ? `<p class="date">${formatDate(item.date)} - ${
                    item.ticketTypeName
                  }</p>`
                : ""
            }
          </div>
          <div class="qty-control">
            <button class="qty-btn" data-action="decrease" data-event-id="${
              item.id
            }" 
                    data-occurrence-id="${
                      item.occurrenceId
                    }" data-ticket-type-id="${item.ticketTypeId}">-</button>
            <span class="qty-display">${item.quantity}</span>
            <button class="qty-btn" data-action="increase" data-event-id="${
              item.id
            }" 
                    data-occurrence-id="${
                      item.occurrenceId
                    }" data-ticket-type-id="${item.ticketTypeId}">+</button>
          </div>
          <p class="price">${formatPrice(item.price)}</p>
          <button class="remove" aria-label="Remove item" data-event-id="${
            item.id
          }" 
                  data-occurrence-id="${
                    item.occurrenceId
                  }" data-ticket-type-id="${item.ticketTypeId}">✖</button>
        </div>
      `;
}

function showLoadingState() {
  const loadingElement = document.getElementById("cart-loading");
  const emptyStateElement = document.getElementById("empty-cart-state");
  const cartItemsContainer = document.getElementById("cart-items-container");

  if (loadingElement) loadingElement.style.display = "flex";
  if (emptyStateElement) emptyStateElement.style.display = "none";
  if (cartItemsContainer) cartItemsContainer.style.display = "none";
}

function showEmptyState() {
  const loadingElement = document.getElementById("cart-loading");
  const emptyStateElement = document.getElementById("empty-cart-state");
  const cartItemsContainer = document.getElementById("cart-items-container");

  if (loadingElement) loadingElement.style.display = "none";
  if (emptyStateElement) emptyStateElement.style.display = "flex";
  if (cartItemsContainer) cartItemsContainer.style.display = "none";
}

function showCartItems() {
  const loadingElement = document.getElementById("cart-loading");
  const emptyStateElement = document.getElementById("empty-cart-state");
  const cartItemsContainer = document.getElementById("cart-items-container");

  if (loadingElement) loadingElement.style.display = "none";
  if (emptyStateElement) emptyStateElement.style.display = "none";
  if (cartItemsContainer) cartItemsContainer.style.display = "block";
}

function updateCartDisplay() {
  const cart = getCart();
  const cartItemsContainer = document.getElementById("cart-items-container");

  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    showEmptyState();
  } else {
    showCartItems();

    cartItemsContainer.innerHTML = "";

    cart.forEach((item) => {
      cartItemsContainer.insertAdjacentHTML(
        "beforeend",
        createCartItemHTML(item)
      );
    });
  }

  updateSummaryDisplay();
}

function updateSummaryDisplay() {
  const cart = getCart();
  const subtotal = getCartTotal();
  const tax = Math.round(subtotal * 0.05); // 5% tax
  const serviceFee = cart.length > 0 ? 175 : 0;
  const total = subtotal + tax + serviceFee;

  // Update summary values using IDs
  const subtotalElement = document.getElementById("subtotal-amount");
  const taxElement = document.getElementById("tax-amount");
  const serviceFeeElement = document.getElementById("service-fee-amount");
  const totalElement = document.getElementById("total-amount");
  const checkoutBtn = document.getElementById("checkout-btn");

  if (subtotalElement) subtotalElement.textContent = formatPrice(subtotal);
  if (taxElement) taxElement.textContent = formatPrice(tax);
  if (serviceFeeElement)
    serviceFeeElement.textContent = formatPrice(serviceFee);
  if (totalElement) totalElement.textContent = formatPrice(total);

  // Update checkout button
  if (checkoutBtn) {
    checkoutBtn.disabled = cart.length === 0;
    checkoutBtn.textContent = cart.length === 0 ? "Cart is Empty" : "Checkout";
  }
}

// Event handlers
function handleQuantityChange(eventId, occurrenceId, ticketTypeId, action) {
  const adjustment = action === "increase" ? 1 : -1;
  adjustQuantity(eventId, occurrenceId, ticketTypeId, adjustment);
  updateCartDisplay();
}

function handleItemRemove(eventId, occurrenceId, ticketTypeId) {
  removeFromCart(eventId, occurrenceId, ticketTypeId);
  updateCartDisplay();
}

function handleCheckout() {
  const cart = getCart();
  if (cart.length === 0) {
    notyf.error("Your cart is empty!");
    return;
  }

  console.log("Proceeding to checkout with items:", cart);
  // Fixed: Corrected the checkout URL path
  window.location.href = "./check-out.html";
}

function initializeShoppingCart() {
  showLoadingState();

  setTimeout(() => {
    updateCartDisplay();
  }, 400);

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("qty-btn")) {
      const eventId = e.target.dataset.eventId;
      const occurrenceId = e.target.dataset.occurrenceId;
      const ticketTypeId = e.target.dataset.ticketTypeId;
      const action = e.target.dataset.action;

      handleQuantityChange(eventId, occurrenceId, ticketTypeId, action);
    }

    if (e.target.classList.contains("remove")) {
      const eventId = e.target.dataset.eventId;
      const occurrenceId = e.target.dataset.occurrenceId;
      const ticketTypeId = e.target.dataset.ticketTypeId;

      handleItemRemove(eventId, occurrenceId, ticketTypeId);
    }

    if (e.target.classList.contains("checkout-btn") && !e.target.disabled) {
      handleCheckout();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeShoppingCart);
} else {
  initializeShoppingCart();
}

