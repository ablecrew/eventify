import { logOut, getCurrentUser } from "./scripts/utils/auth-utils.js";
import { getCartItemCount } from "./scripts/utils/util.js";

document.addEventListener("DOMContentLoaded", function () {
  loadComponent("navbar-container", "../components/navbar.html");
  loadComponent("footer-container", "../components/footer.html");

  setTimeout(setActivePage, 100);
  setTimeout(setupMobileMenu, 100);
  setTimeout(updateCartCount, 100);
});

function loadComponent(containerId, componentPath) {
  const container = document.getElementById(containerId);
  if (!container) return;

  fetch(componentPath)
    .then((response) => response.text())
    .then((html) => {
      container.innerHTML = html;
      if (
        containerId === "navbar-container" &&
        typeof pageStyle !== "undefined"
      ) {
        applyPageStyle(pageStyle);
      }

      if (containerId === "navbar-container") {
        setupMobileMenu();
        updateCartCount();
      }
    })
    .catch((error) => console.error("Error loading component:", error));
}

function updateCartCount() {
  const cartCount = getCartItemCount();

  // Update desktop cart icon
  const desktopCartLink = document.getElementById("nav-shopping-cart");
  if (desktopCartLink) {
    // Remove existing badge if any
    const existingBadge = desktopCartLink.querySelector(".cart-count-badge");
    if (existingBadge) {
      existingBadge.remove();
    }

    // Add badge if cart has items
    if (cartCount > 0) {
      const badge = document.createElement("span");
      badge.className = "cart-count-badge";
      badge.textContent = cartCount > 99 ? "99+" : cartCount;
      desktopCartLink.appendChild(badge);
    }
  }

  // Update mobile cart link
  const mobileCartLink = document.getElementById("mobile-nav-cart");
  if (mobileCartLink) {
    // Remove existing badge if any
    const existingBadge = mobileCartLink.querySelector(".cart-count-badge");
    if (existingBadge) {
      existingBadge.remove();
    }

    // Add badge if cart has items
    if (cartCount > 0) {
      const badge = document.createElement("span");
      badge.className = "cart-count-badge";
      badge.textContent = cartCount > 99 ? "99+" : cartCount;
      mobileCartLink.appendChild(badge);
    }
  }
}

// Make updateCartCount globally available so other scripts can call it
window.updateCartCount = updateCartCount;

function setActivePage() {
  const path = window.location.pathname;
  const page = path.split("/").pop() || "index.html";

  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `../pages/${page}`) {
      link.classList.add("active");
    }
  });

  if (page === "wishlist.html") {
    const heartIcon = document.getElementById("heart");
    if (heartIcon) heartIcon.src = "../assets/icons/heart-fill.png";
  }

  if (page === "shopping-cart.html") {
    const cartIcon = document.querySelector("#nav-shopping-cart .nav-icon");
    if (cartIcon) cartIcon.src = "../assets/icons/shopping-cart-fill.png";
  }

  // Fallback
  if (page === "" || page === "index.html") {
    const homeLink = document.getElementById("nav-home");
    if (homeLink) homeLink.classList.add("active");
  }
}

// handles mobile menu functionality
function setupMobileMenu() {
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const mobileNavbar = document.getElementById("mobileNavbar");
  const mobileCloseBtn = document.getElementById("mobileCloseBtn");

  if (!mobileMenuToggle || !mobileNavbar || !mobileCloseBtn) {
    return;
  }

  mobileMenuToggle.addEventListener("click", function () {
    mobileNavbar.classList.add("active");
    mobileMenuToggle.classList.add("active");
    document.body.classList.add("menu-open");
  });

  // Close menu when X button is clicked
  mobileCloseBtn.addEventListener("click", function () {
    mobileNavbar.classList.remove("active");
    mobileMenuToggle.classList.remove("active");
    document.body.classList.remove("menu-open");
  });

  const mobileNavLinks = document.querySelectorAll(
    ".mobile-nav-links .nav-link"
  );
  mobileNavLinks.forEach((link) => {
    link.addEventListener("click", function () {
      mobileNavbar.classList.remove("active");
      mobileMenuToggle.classList.remove("active");
      document.body.classList.remove("menu-open");
    });
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return;
    }

    showLogoutButtons(user);
    setupLogout();
  } catch (error) {
    console.error("Auth check failed:", error);
  }
});

function showLogoutButtons(user) {
  // Desktop
  const desktopDropdown = document.querySelector(".dropdown-content");
  if (desktopDropdown) {
    desktopDropdown.innerHTML = `
    <a href="#" class="nav-link logout-button">Log Out</a>
    <hr>
    <a href="../pages/purchase-history.html" class="nav-link">Purchase History</a>
    <hr>
    <a href="#" class="nav-link">Hello ${user.name}</a>
  `;
  }

  // Mobile
  const mobileAuthList1 = document.querySelector(".mobile-auth-list-1");
  if (mobileAuthList1) {
    mobileAuthList1.innerHTML = `
    <a href="#" class="nav-link logout-button">Log Out</a>
  `;
  }

  const mobileAuthList2 = document.querySelector(".mobile-auth-list-2");
  if (mobileAuthList2) {
    mobileAuthList2.innerHTML = `
    <a href="../pages/purchase-history.html" class="nav-link">Purchase History</a>
    <hr>
    <a href="#" class="nav-link">Hello ${user.name}</a>
  `;
  }
}

function setupLogout() {
  const logoutButtons = document.querySelectorAll(".logout-button");

  const notyf = new Notyf({
    duration: 3000,
    position: { x: "right", y: "top" },
    ripple: false,
  });

  if (logoutButtons.length > 0) {
    logoutButtons.forEach((button) => {
      button.addEventListener("click", async (e) => {
        e.preventDefault();

        try {
          const success = await logOut();

          if (success) {
            notyf.success("Logged out successfully!");

            setTimeout(() => {
              window.location.href = "/pages/index.html";
            }, 900);
          }
        } catch (error) {
          console.error("Logout error:", error);
          notyf.error("Something went wrong. Please try again.");
        }
      });
    });
  }
}