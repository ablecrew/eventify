import { getCart, getCartTotal, clearCart } from "./utils/util.js";
import { getCurrentUser } from "./utils/auth-utils.js";

const notyf = new Notyf({
  duration: 4000,
  position: { x: "right", y: "top" },
  ripple: false,
});

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

function createOrderItemHTML(item) {
  return `
    <div class="order-item">
      <img src="${item.eventImage}" alt="${item.eventTitle}" class="item-image">
      <div class="item-details">
        <h3>${item.eventTitle}</h3>
        <p class="item-quantity">${item.quantity} ticket${
    item.quantity > 1 ? "s" : ""
  }</p>
        <p class="item-date">${formatDate(item.date)}</p>
        <p class="item-type">${item.ticketTypeName}</p>
      </div>
      <div class="item-price">${formatPrice(item.price * item.quantity)}</div>
    </div>
  `;
}

function showLoadingState() {
  const loadingElement = document.getElementById("checkout-loading");
  const emptyStateElement = document.getElementById("empty-cart-state");
  const checkoutItemsContainer = document.getElementById(
    "checkout-items-container"
  );
  const checkoutBreakdownContainer = document.getElementById(
    "checkout-breakdown-container"
  );

  if (loadingElement) loadingElement.style.display = "flex";
  if (emptyStateElement) emptyStateElement.style.display = "none";
  if (checkoutItemsContainer) checkoutItemsContainer.style.display = "none";
  if (checkoutBreakdownContainer)
    checkoutBreakdownContainer.style.display = "none";
}

function showEmptyState() {
  const loadingElement = document.getElementById("checkout-loading");
  const emptyStateElement = document.getElementById("empty-cart-state");
  const checkoutItemsContainer = document.getElementById(
    "checkout-items-container"
  );
  const checkoutBreakdownContainer = document.getElementById(
    "checkout-breakdown-container"
  );

  if (loadingElement) loadingElement.style.display = "none";
  if (emptyStateElement) emptyStateElement.style.display = "flex";
  if (checkoutItemsContainer) checkoutItemsContainer.style.display = "none";
  if (checkoutBreakdownContainer)
    checkoutBreakdownContainer.style.display = "none";
}

function showCheckoutContent() {
  const loadingElement = document.getElementById("checkout-loading");
  const emptyStateElement = document.getElementById("empty-cart-state");
  const checkoutItemsContainer = document.getElementById(
    "checkout-items-container"
  );
  const checkoutBreakdownContainer = document.getElementById(
    "checkout-breakdown-container"
  );

  if (loadingElement) loadingElement.style.display = "none";
  if (emptyStateElement) emptyStateElement.style.display = "none";
  if (checkoutItemsContainer) checkoutItemsContainer.style.display = "block";
  if (checkoutBreakdownContainer)
    checkoutBreakdownContainer.style.display = "block";
}

function updateCheckoutDisplay() {
  const cart = getCart();
  const orderItemsContainer = document.getElementById(
    "checkout-items-container"
  );

  if (!orderItemsContainer) return;

  if (cart.length === 0) {
    showEmptyState();
  } else {
    showCheckoutContent();

    orderItemsContainer.innerHTML = "";

    cart.forEach((item) => {
      orderItemsContainer.insertAdjacentHTML(
        "beforeend",
        createOrderItemHTML(item)
      );
    });
  }

  updateOrderSummary();
}

function updateOrderSummary() {
  const cart = getCart();
  const subtotal = getCartTotal();
  const tax = Math.round(subtotal * 0.05); // 5% tax
  const serviceFee = cart.length > 0 ? 75 : 0;
  const total = subtotal + tax + serviceFee;

  // Update the breakdown items by selecting the spans in each breakdown-item
  const breakdownItems = document.querySelectorAll(".breakdown-item");

  breakdownItems.forEach((item) => {
    const spans = item.querySelectorAll("span");
    if (spans.length >= 2) {
      const label = spans[0].textContent.trim();
      const valueSpan = spans[1];

      if (label === "Subtotal") {
        valueSpan.textContent = formatPrice(subtotal);
      } else if (label === "Estimated Tax") {
        valueSpan.textContent = formatPrice(tax);
      } else if (label === "Service Fee") {
        valueSpan.textContent = formatPrice(serviceFee);
      } else if (label === "Total") {
        valueSpan.textContent = formatPrice(total);
      }
    }
  });
}

function validateCVV(cvv) {
  const cleaned = cvv.replace(/\D/g, "");
  return cleaned.length === 3;
}

function prepareCartForPurchase(cart) {
  return cart.map((item) => ({
    id: item.id,
    occurrenceId: item.occurrenceId,
    ticketTypeId: item.ticketTypeId,
    quantity: item.quantity,
    price: item.price,
  }));
}

async function processPurchase(cartItems, userId) {
  try {
    const response = await fetch("/api/purchases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        cartItems: cartItems,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Purchase failed");
    }

    return data;
  } catch (error) {
    console.error("Purchase error:", error);
    throw error;
  }
}

async function handlePaymentSubmit() {
  const cvv = document.getElementById("cvv").value.trim();
  const payBtn = document.querySelector(".btn-pay");

  const user = await getCurrentUser();
  if (!user) {
    return Swal.fire({
      title: "Sign In or Sign Up",
      text: "You need an account to continue.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sign In",
      cancelButtonText: "Sign Up",
      reverseButtons: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#00b894",
    }).then((result) => {
      if (result.isConfirmed) {
        setTimeout(() => {
          window.location.href = `/pages/sign-in.html?src=${currentPath}`;
        }, 100);
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        setTimeout(() => {
          window.location.href = `/pages/sign-up.html?src=${currentPath}`;
        }, 100);
      }
    });
  }

  if (!validateCVV(cvv)) {
    notyf.error("Enter a valid 3-digit CVV");
    return;
  }

  const cart = getCart();
  if (cart.length === 0) {
    notyf.error("Your cart is empty");
    return;
  }

  if (payBtn) {
    payBtn.disabled = true;
    payBtn.textContent = "Processing...";
  }

  try {
    const cartItems = prepareCartForPurchase(cart);
    const purchaseResult = await processPurchase(cartItems, user.id);

    notyf.success("Purchase completed successfully!");

    clearCart();

    window.location.href = `./purchase-history.html`;
  } catch (error) {
    console.error("Purchase failed:", error);
    notyf.error(error.message || "Purchase failed. Please try again.");
  } finally {
    // Re-enable the pay button
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = "Complete Purchase";
    }
  }
}

function setupEventListeners() {
  const backBtn = document.querySelector(".btn-back");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.back();
    });
  }

  const payBtn = document.querySelector(".btn-pay");
  if (payBtn) {
    payBtn.addEventListener("click", handlePaymentSubmit);
  }

  const cvvInput = document.getElementById("cvv");
  if (cvvInput) {
    cvvInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "");
      clearError();
    });
  }

  document.querySelectorAll(".payment-option").forEach((option) => {
    option.addEventListener("click", (e) => {
      document
        .querySelectorAll(".payment-option")
        .forEach((opt) => opt.classList.remove("active"));
      e.target.closest(".payment-option").classList.add("active");
    });
  });
}

function initializeCheckout() {
  showLoadingState();

  setTimeout(() => {
    updateCheckoutDisplay();
    setupEventListeners();
  }, 400);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCheckout);
} else {
  initializeCheckout();
}
