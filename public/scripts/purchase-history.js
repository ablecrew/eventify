import { getCurrentUser } from "./utils/auth-utils.js";

const notyf = new Notyf({
  duration: 4000,
  position: { x: "right", y: "top" },
  ripple: false,
});

function createTicketCard(ticket) {
  return `
    <div class="ticket-item" data-category="${ticket.category}">
      <div class="ticket-image">
        <img
          src="${ticket.imageUrl}"
          alt="${ticket.imageAlt}"
        />
      </div>
      <div class="ticket-details">
        <div class="ticket-header">
          <h3 class="event-title">${ticket.eventTitle}</h3>
          <div class="ticket-meta">
            <p class="event-type">${ticket.eventType}</p>
            <span class="ticket-type">${ticket.ticketType}</span>
          </div>
        </div>
        <div class="purchase-info">
          <div class="purchase-date">
            <img
              src="../assets/icons/calendar.png"
              alt="Calendar"
              class="calendar-icon"
            />
            <span>Purchased: ${ticket.purchaseDate}</span>
          </div>
          <div class="ticket-price">
            <span class="price">${ticket.price}</span>
            <button class="download-btn" data-ticket-id="${ticket.id}">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M7 10L12 15L17 10M12 15V3"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Download Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function fetchPurchaseHistory() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(`/api/tickets/user/${user.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const tickets = await response.json();
    return tickets;
  } catch (error) {
    console.error("Error fetching purchase history:", error);
    throw error;
  }
}

async function renderTickets(tickets) {
  const user = await getCurrentUser();
  const ticketList = document.getElementById("ticket-list");

  if (!user) {
    ticketList.innerHTML = `<div class="empty-state">
      <img src="../assets/icons/calendar.png" class="empty-state-icon" alt="Calendar">
      <h3>Log In</h3>
      <p>Sign in or Sign up to view your purchased tickets.</p>
      <button class="empty-state-action" onclick="location.href='sign-in.html'">Log In</button>
    </div>`;
    return;
  }

  if (tickets.length === 0) {
    ticketList.innerHTML = `<div class="empty-state">
      <img src="../assets/icons/calendar.png" class="empty-state-icon" alt="Calendar">
      <h3>No tickets found</h3>
      <p>Purchase your first ticket to view them here.</p>
      <button class="empty-state-action" onclick="location.reload()">Refresh</button>
    </div>`;
    return;
  }

  const ticketHTML = tickets.map((ticket) => createTicketCard(ticket)).join("");
  ticketList.innerHTML = ticketHTML;

  addDownloadEventListeners();
}

function addDownloadEventListeners() {
  const downloadButtons = document.querySelectorAll(".download-btn");

  downloadButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const ticketId = button.getAttribute("data-ticket-id");
      handleDownloadTicket(ticketId);
    });
  });
}

async function handleDownloadTicket(ticketId) {
  console.log(`Downloading ticket with ID: ${ticketId}`);

  try {
    // Fetch the specific ticket details
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const ticket = await response.json();

    const button = document.querySelector(`[data-ticket-id="${ticketId}"]`);
    const originalText = button.innerHTML;

    // Store original text as data attribute for error recovery
    button.setAttribute("data-original-text", originalText);

    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
      </svg>
      Generating PDF...
    `;
    button.disabled = true;

    const doc = await generateTicketPDF(ticket);

    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
      </svg>
      Downloading...
    `;

    const fileName = `${ticket.event.title.replace(/\s+/g, "_")}_${
      ticket.ticketType.name
    }_Ticket.pdf`;

    doc.save(fileName);

    button.innerHTML = originalText;
    button.disabled = false;

    notyf.success("Ticket downloaded successfully!");
  } catch (error) {
    console.error("Error generating PDF:", error);

    const button = document.querySelector(`[data-ticket-id="${ticketId}"]`);
    if (button) {
      const originalText =
        button.getAttribute("data-original-text") || "Download Ticket";
      button.innerHTML = originalText;
      button.disabled = false;
    }

    notyf.error("Failed to generate ticket. Please try again.");
  }
}

async function initializePurchaseHistory() {
  try {
    const tickets = await fetchPurchaseHistory();
    renderTickets(tickets);
  } catch (error) {
    console.error("Error fetching purchase history:", error);

    const ticketList = document.getElementById("ticket-list");
    ticketList.innerHTML = `<div class="error-state">
      <img src="../assets/icons/info.png" class="error-state-icon" alt="Error">
      <h3>Something went wrong</h3>
      <p>Failed to load purchase history. Please try again later.</p>
      <button class="error-state-action" onclick="location.reload()">Try Again</button>
    </div>`;
  }
}

function filterTickets(category = "all") {
  const tickets = document.querySelectorAll(
    ".ticket-item:not(.skeleton-loader)"
  );

  tickets.forEach((ticket) => {
    if (
      category === "all" ||
      ticket.getAttribute("data-category") === category
    ) {
      ticket.style.display = "flex";
    } else {
      ticket.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializePurchaseHistory();
});

window.PurchaseHistory = {
  initialize: initializePurchaseHistory,
  filter: filterTickets,
  refresh: initializePurchaseHistory,
};

function generateBarcode(text) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 80;

      if (typeof window.JsBarcode === "undefined") {
        throw new Error("JsBarcode library not loaded");
      }

      window.JsBarcode(canvas, text, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 12,
        textMargin: 5,
        background: "#ffffff",
        lineColor: "#000000",
        margin: 5,
      });

      const dataURL = canvas.toDataURL("image/png", 1.0);
      resolve(dataURL);
    } catch (error) {
      reject(error);
    }
  });
}

function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = function () {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = this.naturalWidth;
      canvas.height = this.naturalHeight;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(this, 0, 0);

      try {
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

// Updated PDF generation function to work with the new API data structure
async function generateTicketPDF(ticket) {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [150, 250],
  });

  const primaryBlue = [52, 152, 219];
  const darkText = [44, 62, 80];
  const lightGray = [128, 128, 128];
  const white = [255, 255, 255];

  // Background
  doc.setFillColor(...white);
  doc.rect(0, 0, 150, 250, "F");

  // Main ticket container
  doc.setFillColor(248, 249, 250);
  doc.rect(10, 10, 130, 230, "F");

  try {
    const imageData = await loadImageAsBase64(ticket.event.imageUrl);
    doc.addImage(imageData, "PNG", 20, 20, 110, 60);
  } catch (error) {
    console.warn("Failed to load event image:", error);
    // Fallback - gray placeholder
    doc.setFillColor(100, 100, 100);
    doc.rect(20, 20, 110, 60, "F");

    doc.setTextColor(...white);
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("EVENT IMAGE", 75, 52, { align: "center" });
  }

  // Event title
  doc.setTextColor(...darkText);
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text(ticket.event.title, 20, 95);

  // Event details
  doc.setTextColor(...lightGray);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  const eventDate = new Date(ticket.eventOccurrence.date).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
  doc.text(`${eventDate} - ${ticket.event.location}`, 20, 105);

  // Info grid
  const startY = 115;
  const lineHeight = 16;

  // Left column
  doc.setTextColor(...lightGray);
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");

  doc.text("Ticket ID", 20, startY);
  doc.setTextColor(...darkText);
  doc.setFont(undefined, "bold");
  doc.text(`#${ticket.id.slice(-6)}`, 20, startY + 7);

  doc.setTextColor(...lightGray);
  doc.setFont(undefined, "normal");
  doc.text("Date", 20, startY + lineHeight + 2);
  doc.setTextColor(...darkText);
  doc.setFont(undefined, "bold");
  doc.text(eventDate, 20, startY + lineHeight + 9);

  // Right column
  doc.setTextColor(...lightGray);
  doc.setFont(undefined, "normal");
  doc.text("Ticket Type", 85, startY);
  doc.setTextColor(...darkText);
  doc.setFont(undefined, "bold");
  doc.text(ticket.ticketType.name, 85, startY + 7);

  doc.setTextColor(...lightGray);
  doc.setFont(undefined, "normal");
  doc.text("Time", 85, startY + lineHeight + 2);
  doc.setTextColor(...darkText);
  doc.setFont(undefined, "bold");
  const eventTime = new Date(
    ticket.eventOccurrence.startTime
  ).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  doc.text(eventTime, 85, startY + lineHeight + 9);

  // Price
  doc.setTextColor(...primaryBlue);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(`Ksh ${ticket.ticketType.price}`, 20, startY + lineHeight * 2 + 15);

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(20, 165, 130, 165);

  // Barcode section
  const barcodeY = 175;

  try {
    // Use the ticket's barcode value
    const barcodeValue =
      ticket.barcodeValue || `TK${Date.now()}${ticket.id.slice(-6)}`;

    console.log("Generating barcode for:", barcodeValue);

    // Use the generateBarcode function
    const barcodeDataURL = await generateBarcode(barcodeValue);

    // Add barcode to PDF
    doc.addImage(barcodeDataURL, "PNG", 25, barcodeY, 100, 20);

    console.log("Barcode generated and added successfully!");
  } catch (error) {
    console.error("Barcode generation failed:", error);

    // Fallback with text
    doc.setFillColor(240, 240, 240);
    doc.rect(25, barcodeY, 100, 20, "F");

    doc.setTextColor(...darkText);
    doc.setFontSize(8);
    doc.text("BARCODE UNAVAILABLE", 75, barcodeY + 10, { align: "center" });
    doc.text(
      ticket.barcodeValue || `TK${ticket.id.slice(-6)}`,
      75,
      barcodeY + 16,
      {
        align: "center",
      }
    );
  }

  // Important information section
  const infoStartY = 205;

  doc.setTextColor(...darkText);
  doc.setFontSize(7);
  doc.setFont(undefined, "bold");
  doc.text("IMPORTANT INFO:", 20, infoStartY);

  doc.setFont(undefined, "normal");
  doc.setFontSize(6);
  doc.text("• Present this ticket at venue entrance", 20, infoStartY + 5);
  doc.text("• Non-transferable and non-refundable", 20, infoStartY + 10);
  doc.text("• Valid for one-time entry only", 20, infoStartY + 15);

  // Footer
  const footerY = 235;
  doc.setTextColor(...lightGray);
  doc.setFontSize(6);
  doc.text(
    `eventify.com | support@eventify.com | Ticket #${
      ticket.barcodeValue || ticket.id.slice(-6)
    }`,
    75,
    footerY,
    { align: "center" }
  );

  // Ticket type badge (top right)
  const badgeWidth = 22;
  const badgeHeight = 7;
  const badgeX = 108;
  const badgeY = 25;

  doc.setFillColor(...primaryBlue);
  doc.rect(badgeX, badgeY, badgeWidth, badgeHeight, "F");

  doc.setTextColor(...white);
  doc.setFontSize(6);
  doc.setFont(undefined, "bold");
  doc.text(
    ticket.ticketType.name.toUpperCase(),
    badgeX + badgeWidth / 2,
    badgeY + 4.5,
    { align: "center" }
  );

  return doc;
}