import { getCurrentUser } from "./utils/auth-utils.js";
import {
  formatCategory,
  formatDateTime,
  formatMonth,
  getDayOfMonth,
  getCheapestTicketPrice,
  addToCart,
  removeFromCart,
  isInCart,
} from "./utils/util.js";

class EventPage {
  constructor() {
    this.eventId = this.getEventIdFromURL();
    this.eventData = null;
    this.relatedEvents = [];
    this.selectedDate = null;
    this.selectedTicketType = null;
    this.selectedTicketPrice = null;
    this.isInWishlist = false;
    this.isInCart = false;
    this.currentUser = null;

    this.notyf = new Notyf({
      duration: 3000,
      position: { x: "right", y: "top" },
      ripple: false,
    });

    this.init();
  }

  async init() {
    this.currentUser = await getCurrentUser();
    await this.fetchEventData();
    if (this.currentUser) {
      await this.checkWishlistStatus();
    }
  }

  getEventIdFromURL() {
    const urlParts = window.location.pathname.split("/");
    const eventId = urlParts[urlParts.length - 1];

    if (!eventId || eventId.includes(".html")) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("id");
    }

    return eventId;
  }

  setupEventListeners() {
    const dateSelect = document.getElementById("dateSelect");
    if (dateSelect) {
      dateSelect.addEventListener("change", (e) => {
        this.selectedDate = e.target.value;
        this.updateTicketPricing();
        this.checkCartStatus();
      });
    }

    const ticketSelect = document.getElementById("ticketSelect");
    if (ticketSelect) {
      ticketSelect.addEventListener("change", (e) => {
        const selectedOption = e.target.selectedOptions[0];
        const price = selectedOption?.dataset.price || null;

        this.selectedTicketType = e.target.value;
        this.selectedTicketPrice = price;

        this.updateCartButton();
        this.checkCartStatus();
      });
    }

    const addToCartBtn = document.querySelector(".btn-primary");
    if (addToCartBtn) {
      addToCartBtn.addEventListener("click", () => {
        this.toggleCart();
      });
    }

    const addToWishlistBtn = document.querySelector(".btn-secondary");
    if (addToWishlistBtn) {
      addToWishlistBtn.addEventListener("click", () => {
        this.toggleWishlist();
      });
    }
  }

  // Check if event is in user's wishlist
  async checkWishlistStatus() {
    if (!this.currentUser) return;

    try {
      const response = await fetch(`/api/wishlist/${this.eventId}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        this.isInWishlist = data.isSaved;
        this.updateWishlistButton();
      }
    } catch (error) {
      console.error("Error checking wishlist status:", error);
    }
  }

  // Check if current selection is in cart
  checkCartStatus() {
    if (this.selectedDate && this.selectedTicketType) {
      this.isInCart = isInCart(
        this.eventId,
        this.selectedDate,
        this.selectedTicketType
      );
      this.updateCartButton();
    }
  }

  // Update wishlist button text and state
  updateWishlistButton() {
    const wishlistBtn = document.querySelector(".btn-secondary");
    if (wishlistBtn) {
      if (this.isInWishlist) {
        wishlistBtn.textContent = "Remove from Wishlist";
        wishlistBtn.classList.add("in-wishlist");
      } else {
        wishlistBtn.textContent = "Add to Wishlist";
        wishlistBtn.classList.remove("in-wishlist");
      }
    }
  }

  // Fetch event data from API
  async fetchEventData() {
    try {
      console.log(`Fetching event data for ID: ${this.eventId}`);

      const response = await fetch(`/api/events/${this.eventId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.eventData = data.event;
        this.relatedEvents = data.relatedEvents;

        this.renderEventDetails();
        this.renderEventMeta();
        this.renderRelatedEvents();
        this.setupEventListeners();

        console.log("Event data loaded successfully:", this.eventData);
      } else {
        throw new Error(data.error || "Failed to fetch event data");
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
      this.handleFetchError(error);
    }
  }

  renderEventDetails() {
    if (!this.eventData) return;

    // Replace skeleton with actual event header
    const container = document.querySelector(".container");
    if (container) {
      // Find and replace the skeleton event header
      const skeletonHeader = container.querySelector(".skeleton-event-header");
      if (skeletonHeader) {
        const eventHeader = document.createElement("div");
        eventHeader.className = "event-header";
        eventHeader.innerHTML = `
          <img
            src="${this.eventData.imageUrl}"
            alt="${this.eventData.title}"
            class="event-image"
          />
          <div class="event-content">
            <h1 class="event-title">${this.eventData.title}</h1>
            <div class="event-price">From Ksh ${this.getMinimumPrice()}</div>
  
            <div class="event-meta">
              <div class="meta-section">
                <div class="meta-title">Date and Time</div>
                <select class="event-dropdown" id="dateSelect">
                  <option value="">Select Date</option>
                </select>
              </div>
  
              <div class="meta-section">
                <div class="meta-title">Ticket Type</div>
                <select class="event-dropdown" id="ticketSelect">
                  <option value="">Select Ticket Type</option>
                </select>
              </div>
  
              <div class="meta-section">
                <div class="meta-title">Location</div>
                <div class="location-info">
                  <svg
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
                    />
                  </svg>
                  <span>${this.eventData.location}</span>
                </div>
              </div>
            </div>
  
            <div class="action-buttons">
              <button class="btn btn-secondary">Add to Wishlist</button>
              <button class="btn btn-primary">Add to Cart</button>
            </div>
          </div>
        `;

        skeletonHeader.parentNode.replaceChild(eventHeader, skeletonHeader);
      }

      // Replace skeleton details section
      const skeletonDetails = container.querySelector(
        ".skeleton-details-section"
      );
      if (skeletonDetails) {
        const detailsSection = document.createElement("div");
        detailsSection.className = "details-section";
        detailsSection.innerHTML = `
          <h2 class="details-title">Details</h2>
          <p class="details-text">
            ${this.eventData.description}
          </p>
        `;

        skeletonDetails.parentNode.replaceChild(
          detailsSection,
          skeletonDetails
        );
      }
    }
  }

  renderEventMeta() {
    if (!this.eventData) return;

    this.renderDateOptions();
    this.renderTicketOptions();
  }

  renderDateOptions() {
    const dateSelect = document.getElementById("dateSelect");
    if (!dateSelect || !this.eventData.occurrences) return;

    dateSelect.innerHTML = '<option value="">Select Date</option>';

    this.eventData.occurrences.forEach((occurrence) => {
      const option = document.createElement("option");
      option.value = occurrence.id;

      const date = new Date(occurrence.date);
      const startTime = new Date(occurrence.startTime);

      const dateString = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const timeString = startTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      option.textContent = `${dateString} - ${timeString}`;
      dateSelect.appendChild(option);
    });
  }

  renderTicketOptions() {
    const ticketSelect = document.getElementById("ticketSelect");
    if (!ticketSelect || !this.eventData.ticketTypes) return;

    ticketSelect.innerHTML = '<option value="">Select Ticket Type</option>';

    this.eventData.ticketTypes.forEach((ticketType) => {
      const option = document.createElement("option");
      option.value = ticketType.id;
      option.dataset.price = ticketType.price;
      option.textContent = `${ticketType.name} - Ksh ${ticketType.price}`;

      const available = ticketType.quantityTotal - ticketType.quantitySold;
      if (available <= 0) {
        option.disabled = true;
        option.textContent += " (Sold Out)";
      }

      ticketSelect.appendChild(option);
    });
  }

  renderRelatedEvents() {
    const relatedEventsContainer = document.getElementById(
      "related-events-container"
    );
    if (!relatedEventsContainer || !this.relatedEvents) return;

    relatedEventsContainer.innerHTML = "";

    this.relatedEvents.forEach((event) => {
      const eventCard = this.createRelatedEventCard(event);
      relatedEventsContainer.appendChild(eventCard);
    });
  }

  createRelatedEventCard(event) {
    const card = document.createElement("div");
    card.dataset.eventId = event.id;

    const sortedOccurrences = [...event.occurrences].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const earliestOccurrence = sortedOccurrences[0];

    const month = formatMonth(earliestOccurrence.date);
    const day = getDayOfMonth(earliestOccurrence.date);
    const startTime = formatDateTime(earliestOccurrence.startTime);
    const endTime = formatDateTime(earliestOccurrence.endTime);
    const price = getCheapestTicketPrice(event);

    card.innerHTML = `
          <div class="event-card" data-event-id="${
            event.id
          }" data-event-title="${event.title}">
            <div class="event-image">
              <img src="${event.imageUrl}" alt="${event.title}" />
            </div>
            <div class="event-details">
              <h3 class="event-title">${event.title}</h3>
              <p class="event-category">${formatCategory(event.category)}</p>
              <div class="event-info">
                <div class="event-date">
                  <span class="month-label">${month}</span>
                  <span class="date-number">${day}</span>
                </div>
                <div class="location-time">
                  <span class="location">
                    <img src="../assets/icons/marker.png"/>
                    ${event.location}
                  </span>
                  <span class="time">${startTime} - ${endTime}</span>
                </div>
              </div>
              <div class="price-section">
                <span class="price">${price}</span>
                <a href="../pages/event.html?id=${
                  event.id
                }" class="view-details">
                  View Details
                  <img class="arrow" src="../assets/icons/arrow-up-right.png" />
                </a>
              </div>
            </div>
          </div>
        `;

    return card;
  }

  getMinimumPrice(ticketTypes = null) {
    const tickets = ticketTypes || this.eventData?.ticketTypes || [];
    if (tickets.length === 0) return 0;

    const prices = tickets.map((ticket) => parseFloat(ticket.price));
    return Math.min(...prices);
  }

  updateTicketPricing() {
    // This could be used if pricing varies by date
    // For now, just enable/disable the ticket selector
    const ticketSelect = document.getElementById("ticketSelect");
    if (ticketSelect) {
      ticketSelect.disabled = !this.selectedDate;
    }
  }

  // Update cart button state
  updateCartButton() {
    const addToCartBtn = document.querySelector(".btn-primary");
    if (addToCartBtn) {
      const hasSelection = this.selectedDate && this.selectedTicketType;

      if (!hasSelection) {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = "Select Date & Ticket";
        addToCartBtn.classList.remove("in-cart");
      } else if (this.isInCart) {
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = "Remove from Cart";
        addToCartBtn.classList.add("in-cart");
      } else {
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = "Add to Cart";
        addToCartBtn.classList.remove("in-cart");
      }
    }
  }

  // Toggle cart functionality
  toggleCart() {
    if (!this.selectedDate || !this.selectedTicketType) {
      this.notyf.error("Please select both a date and ticket type");
      return;
    }

    if (this.isInCart) {
      this.removeFromCart();
    } else {
      this.addToCart();
    }
  }

  addToCart() {
    const selectedOccurrence = this.eventData.occurrences.find(
      (occurrence) => occurrence.id === this.selectedDate
    );

    const selectedTicketType = this.eventData.ticketTypes.find(
      (ticketType) => ticketType.id === this.selectedTicketType
    );

    const actualDate = selectedOccurrence
      ? selectedOccurrence.date
      : this.selectedDate;
    const ticketTypeName = selectedTicketType
      ? selectedTicketType.name
      : "Unknown";

    const cartData = {
      eventId: this.eventId,
      occurrenceId: this.selectedDate,
      ticketTypeId: this.selectedTicketType,
      title: this.eventData.title,
      imageUrl: this.eventData.imageUrl,
      ticketPrice: this.selectedTicketPrice,
      date: actualDate,
      ticketTypeName: ticketTypeName,
      quantity: 1,
    };

    addToCart(cartData);
    this.isInCart = true;
    this.updateCartButton();

    console.log("Adding to cart:", cartData);
    this.notyf.success("Event added to cart!");
  }

  // Remove from cart functionality
  removeFromCart() {
    removeFromCart(this.eventId, this.selectedDate, this.selectedTicketType);
    this.isInCart = false;
    this.updateCartButton();

    console.log("Removing from cart:", {
      eventId: this.eventId,
      occurrenceId: this.selectedDate,
      ticketTypeId: this.selectedTicketType,
    });
    this.notyf.success("Event removed from cart!");
  }

  // Toggle wishlist functionality
  async toggleWishlist() {
    if (!this.currentUser) {
      this.notyf.error("Please login to add events to your wishlist");
      return;
    }

    const wishlistBtn = document.querySelector(".btn-secondary");
    if (wishlistBtn) {
      wishlistBtn.disabled = true;
      wishlistBtn.textContent = "Processing...";
    }

    try {
      if (this.isInWishlist) {
        await this.removeFromWishlist();
      } else {
        await this.addToWishlist();
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      this.notyf.error("Something went wrong. Please try again.");
    } finally {
      if (wishlistBtn) {
        wishlistBtn.disabled = false;
      }
    }
  }

  // Add to wishlist
  async addToWishlist() {
    try {
      const response = await fetch(`/api/wishlist/${this.eventId}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.isInWishlist = true;
        this.updateWishlistButton();
        this.notyf.success(data.message || "Event added to wishlist!");
      } else {
        throw new Error(data.error || "Failed to add to wishlist");
      }
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      throw error;
    }
  }

  // Remove from wishlist
  async removeFromWishlist() {
    try {
      const response = await fetch(`/api/wishlist/${this.eventId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.isInWishlist = false;
        this.updateWishlistButton();
        this.notyf.success(data.message || "Event removed from wishlist!");
      } else {
        throw new Error(data.error || "Failed to remove from wishlist");
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      throw error;
    }
  }

  handleFetchError(error) {
    console.error("Failed to load event data:", error);

    const container = document.querySelector(".container");
    if (container) {
      container.innerHTML = `<div class="error-state">
      <img src="../assets/icons/info.png" class="error-state-icon" alt="Error">
      <h3>Something went wrong</h3>
      <p>Couldn't load the event. Check your connection and try again.</p>
      <button class="error-state-action" onclick="location.reload()">Try Again</button>
    </div>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new EventPage();
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = EventPage;
}