import { getCurrentUser } from "./utils/auth-utils.js";
import {
  formatCategory,
  formatDateTime,
  formatMonth,
  getDayOfMonth,
  getCheapestTicketPrice,
} from "./utils/util.js";

const notyf = new Notyf({
  duration: 3000,
  position: { x: "right", y: "top" },
  ripple: false,
});

//#region Event card render
async function renderEvents(events) {
  const user = await getCurrentUser();

  const eventsContainer = document.getElementById("events-container");
  eventsContainer.innerHTML = "";

  if (!events || events.length === 0) {
    document.querySelector(
      ".events-section"
    ).innerHTML = `<div class="empty-state">
      <img src="../assets/icons/calendar.png" class="empty-state-icon" alt="Calendar">
      <h3>No Events Yet</h3>
      <p>No events scheduled. Check back later or create your first event!</p>
      <button class="empty-state-action" onclick="location.reload()">Refresh</button>
    </div>`;
    return;
  }

  let bookmarkStatuses = {};
  if (user && events.length > 0) {
    try {
      const eventIds = events.map((e) => e.id);
      const res = await fetch(`/api/wishlist/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventIds }),
      });

      if (res.ok) {
        const data = await res.json();
        bookmarkStatuses = data.bookmarkStatuses || {};
      }
    } catch (error) {
      console.error("Error fetching bookmark statuses:", error);
    }
  }

  let eventsHTML = "";

  for (const event of events) {
    const sortedOccurrences = [...event.occurrences].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const earliestOccurrence = sortedOccurrences[0];

    const month = formatMonth(earliestOccurrence.date);
    const day = getDayOfMonth(earliestOccurrence.date);
    const startTime = formatDateTime(earliestOccurrence.startTime);
    const endTime = formatDateTime(earliestOccurrence.endTime);
    const price = getCheapestTicketPrice(event);

    const showBookmark = !!user;
    const isSaved = bookmarkStatuses[event.id] || false;
    const bookmarkSrc = isSaved
      ? "../assets/icons/bookmark-fill.png"
      : "../assets/icons/bookmark.png";

    eventsHTML += `
      <div class="event-card" data-event-id="${event.id}" data-event-title="${
      event.title
    }">
        <div class="event-image">
          <img src="${event.imageUrl}" alt="${event.title}" />
          ${
            showBookmark
              ? `
            <div class="bookmark-container">
              <img class="bookmark-icon"
                   id="bookmark-${event.id}"
                   src="${bookmarkSrc}"
                   alt="Bookmark"
                   data-event-id="${event.id}"
                   data-event-title="${event.title}"
                   data-is-saved="${isSaved}" />
            </div>`
              : ""
          }
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
            <a href="../pages/event.html?id=${event.id}" class="view-details">
              View Details
              <img class="arrow" src="../assets/icons/arrow-up-right.png" />
            </a>
          </div>
        </div>
      </div>
    `;
  }

  eventsContainer.innerHTML = eventsHTML;
  eventsContainer.addEventListener("click", handleBookmarkClick);
}

async function handleBookmarkClick(event) {
  const bookmarkIcon = event.target.closest(".bookmark-icon");

  if (!bookmarkIcon) {
    return;
  }

  const eventId = bookmarkIcon.dataset.eventId;
  const eventTitle = bookmarkIcon.dataset.eventTitle;

  await toggleBookmark(eventId, eventTitle, bookmarkIcon);
}

//#region Toggle bookmark
async function toggleBookmark(eventId, eventTitle, bookmarkIcon) {
  const currentSavedState = bookmarkIcon.dataset.isSaved === "true";
  bookmarkIcon.style.pointerEvents = "none";
  bookmarkIcon.style.opacity = "0.7";

  try {
    const method = currentSavedState ? "DELETE" : "POST";
    const response = await fetch(`/api/wishlist/${eventId}`, {
      method,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Bookmark toggle failed");
    }
    const newSavedState = !currentSavedState;

    bookmarkIcon.src = newSavedState
      ? "../assets/icons/bookmark-fill.png"
      : "../assets/icons/bookmark.png";

    bookmarkIcon.dataset.isSaved = newSavedState;

    const message = currentSavedState
      ? `${eventTitle} removed from wishlist`
      : `${eventTitle} added to wishlist`;

    notyf.success(message);
  } catch (error) {
    console.error("Bookmark action failed:", error);
    notyf.error("Error occurred, try again");
  } finally {
    bookmarkIcon.style.pointerEvents = "auto";
    bookmarkIcon.style.opacity = "1";
  }
}

//#region Events fetch
async function fetchEvents() {
  try {
    const res = await fetch("/api/events");
    const { events } = await res.json();

    // let filteredEvents = [...dummyEvents];
    // filteredEvents.sort((a, b) => new Date() - new Date());

    await renderEvents(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    document.querySelector(
      ".events-section"
    ).innerHTML = `<div class="error-state">
      <img src="../assets/icons/info.png" class="error-state-icon" alt="Error">
      <h3>Something went wrong</h3>
      <p>Couldn't load events. Check your connection and try again.</p>
      <button class="error-state-action" onclick="location.reload()">Try Again</button>
    </div>`;
  }
}

//#region Refresh fetch
function setupEventRefresh(intervalMinutes = 8) {
  fetchEvents();

  const intervalMs = intervalMinutes * 60 * 1000;
  setInterval(() => {
    console.log("Refreshing events data...");
    fetchEvents();
  }, intervalMs);
}

document.addEventListener("DOMContentLoaded", () => {
  setupEventRefresh();
});
