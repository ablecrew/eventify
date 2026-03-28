//#region Auth Check
async function getCurrentUser() {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include", 
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    const userData = await res.json();
    return userData;
  } catch (error) {
    console.error("Authentication check failed:", error);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  ticketOptions();
  applyFlatPickrs();
  toggleFreeEventPricing();
  toggleEventTypeControls();
  setupTableControls(
    ".event-dates-table",
    "event-date-row-template",
    ".add-event-date-button"
  );
  setupTableControls(
    ".ticket-types-table",
    "ticket-row-template",
    ".add-ticket-type-button"
  );
  setupTableControls(
    ".discount-codes-table",
    "discount-row-template",
    ".add-discount-code-button"
  );
  initFormValidation();
  setupCancelButton();
});

//#region Ticket Options Function
function ticketOptions() {
  const ticketOptions = document.querySelectorAll(".ticket-option");
  ticketOptions.forEach((option) => {
    option.addEventListener("click", function () {
      ticketOptions.forEach((opt) => opt.classList.remove("selected"));
      this.classList.add("selected");
      const radio = this.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
      }
    });
  });
}

//#region Toggle ticket 
function toggleFreeEventPricing() {
  const freeEventRadio = document.getElementById("free-event");
  const ticketedEventRadio = document.getElementById("ticketed-event");
  const ticketPriceColumnHeader = document.querySelector(
    ".ticket-types-table thead th:nth-child(2)"
  );
  const ticketPriceTableBody = document.querySelector(
    ".ticket-types-table tbody"
  );
  let isFreeEvent = ticketedEventRadio.checked ? false : freeEventRadio.checked;

  function updateTicketPriceVisibility() {
    const priceHeader = ticketPriceColumnHeader;
    const priceCells = ticketPriceTableBody.querySelectorAll("td:nth-child(2)");
    const priceInputs = ticketPriceTableBody.querySelectorAll(
      'input[name^="ticket-price-"]'
    );

    if (isFreeEvent) {
      if (priceHeader) priceHeader.style.display = "none";
      priceCells.forEach((cell) => (cell.style.display = "none"));
      priceInputs.forEach((input) => (input.value = "0"));
    } else {
      if (priceHeader) priceHeader.style.display = "";
      priceCells.forEach((cell) => (cell.style.display = ""));
    }
  }

  freeEventRadio.addEventListener("change", function () {
    isFreeEvent = this.checked;
    updateTicketPriceVisibility();
  });

  ticketedEventRadio.addEventListener("change", function () {
    isFreeEvent = !this.checked;
    updateTicketPriceVisibility();
  });

  const observer = new MutationObserver(updateTicketPriceVisibility);
  observer.observe(ticketPriceTableBody, { childList: true, subtree: true });

  updateTicketPriceVisibility();
}

//#region Toggle event-typ
function toggleEventTypeControls() {
  const singleEventRadio = document.getElementById("single-event");
  const recurringEventRadio = document.getElementById("recurring-event");
  const addEventDateButton = document.querySelector(".add-event-date-button");
  const eventDatesTableBody = document.querySelector(
    ".event-dates-table tbody"
  );
  const firstDateRow = eventDatesTableBody.querySelector(".first-row");
  const rowTemplate = document
    .getElementById("event-date-row-template")
    ?.content?.querySelector("tr");

  function handleSingleEvent() {
    if (addEventDateButton) {
      addEventDateButton.style.display = "none";
    }
    const extraRows =
      eventDatesTableBody.querySelectorAll("tr:not(.first-row)");
    extraRows.forEach((row) => row.remove());
  }

  function handleRecurringEvent() {
    if (addEventDateButton) {
      addEventDateButton.style.display = "";
    }
    // Add a new row if only the first row exists
    if (
      eventDatesTableBody.querySelectorAll("tr").length === 1 &&
      rowTemplate
    ) {
      const newRow = rowTemplate.cloneNode(true);
      const rowId = generateUniqueId();
      newRow.dataset.rowId = rowId;
      newRow.querySelectorAll("input, select, textarea").forEach((input) => {
        const baseId = input.id || input.name;
        const newId = `${baseId}-${rowId}`;
        if (input.id) input.id = newId;
        input.name = newId;
        if (input.type !== "radio" && input.type !== "checkbox")
          input.value = "";
      });
      const removeButton = newRow.querySelector(".remove-button");
      if (removeButton) {
        removeButton.style.display = "";
        removeButton.addEventListener("click", () => {
          removeRow(newRow, ".event-dates-table");
          if (window.formValidator) window.formValidator.refresh();
        });
      }
      eventDatesTableBody.appendChild(newRow);
      newRow.querySelectorAll("input").forEach((input) => {
        if (input.type === "date") applyDatePicker(input);
        else if (input.type === "datetime-local") applyDateTimePicker(input);
        else if (input.type === "time") applyTimePicker(input);
      });
      if (window.formValidator) window.formValidator.refresh();
    }
  }

  singleEventRadio.addEventListener("change", handleSingleEvent);
  recurringEventRadio.addEventListener("change", handleRecurringEvent);

  if (singleEventRadio.checked) {
    handleSingleEvent();
  } else if (recurringEventRadio.checked) {
    handleRecurringEvent();
  }
}

//#region Flatpickr
const dateConfig = {
  dateFormat: "Y-m-d H:i",
  minDate: new Date().fp_incr(1),
  altInput: true,
  altFormat: "F j, Y",
};

const dateTimeConfig = {
  enableTime: true,
  dateFormat: "Y-m-d H:i",
  minDate: new Date().fp_incr(1),
  altInput: true,
  altFormat: "F j, Y (h: S K)",
};

const timeConfig = {
  enableTime: true,
  noCalendar: true,
  dateFormat: "h:i K",
};

function applyFlatPickrs() {
  flatpickr("input[type=date]", dateConfig);
  flatpickr("input[type=datetime-local]", dateTimeConfig);
  flatpickr("input[type=time]", timeConfig);
}

function applyDatePicker(element) {
  flatpickr(element, dateConfig);
}

function applyDateTimePicker(element) {
  flatpickr(element, dateTimeConfig);
}

function applyTimePicker(element) {
  flatpickr(element, timeConfig);
}

function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9);
}

//#region Dynamic rows
function setupTableControls(tableSelector, rowTemplateId, buttonSelector) {
  const table = document.querySelector(tableSelector);
  const tbody = table.querySelector("tbody");
  const addButton = document.querySelector(buttonSelector);
  const rowTemplate = document
    .getElementById(rowTemplateId)
    .content.querySelector("tr");
  const singleEventRadio = document.getElementById("single-event");
  const recurringEventRadio = document.getElementById("recurring-event");

  if (!table || !tbody || !addButton || !rowTemplate) {
    console.error(
      `Table or add button or template not found for selector: ${tableSelector} or template: ${rowTemplateId}`
    );
    return;
  }

  // Add unique IDs to first row (remains the same)
  const firstRow = tbody.querySelector("tr.first-row");
  if (firstRow) {
    const rowId = generateUniqueId();
    firstRow.dataset.rowId = rowId;
    firstRow.querySelectorAll("input, select, textarea").forEach((input) => {
      const baseId = input.id || input.name;
      const newId = `${baseId}-${rowId}`;
      input.id = newId;
      input.name = newId;
      const label = document.querySelector(`label[for="${baseId}"]`);
      if (label) label.setAttribute("for", newId);
    });
    const removeButton = firstRow.querySelector(".remove-button");
    if (removeButton) removeButton.style.display = "none";
  }

  addButton.addEventListener("click", () => {
    const newRow = rowTemplate.cloneNode(true);
    const rowId = generateUniqueId();
    newRow.dataset.rowId = rowId;
    newRow.querySelectorAll("input, select, textarea").forEach((input) => {
      const baseId = input.id || input.name;
      const newId = `${baseId}-${rowId}`;
      if (input.id) input.id = newId;
      input.name = newId;
      if (input.type !== "radio" && input.type !== "checkbox") input.value = "";
    });

    const removeButton = newRow.querySelector(".remove-button");
    if (removeButton) {
      removeButton.style.display = "";
      removeButton.addEventListener("click", () => {
        removeRow(newRow, tableSelector);

        if (window.formValidator) {
          window.formValidator.refresh();
        }

        // Check for single row after removal for event dates
        if (
          tableSelector === ".event-dates-table" &&
          recurringEventRadio.checked
        ) {
          if (tbody.querySelectorAll("tr").length === 1) {
            console.log("Only one row left, switching to single event");
            singleEventRadio.checked = true;
            const addEventDateButton = document.querySelector(
              ".add-event-date-button"
            );
            if (addEventDateButton) {
              addEventDateButton.style.display = "none";
            }
          }
        }
      });
    }

    tbody.appendChild(newRow);
    newRow.querySelectorAll("input").forEach((input) => {
      if (input.type === "date") applyDatePicker(input);
      else if (input.type === "datetime-local") applyDateTimePicker(input);
      else if (input.type === "time") applyTimePicker(input);
    });
    if (window.formValidator) window.formValidator.refresh();
  });
}

function removeRow(row, tableSelector) {
  const table = document.querySelector(tableSelector);
  if (!table) {
    console.error(`Table not found for selector: ${tableSelector}`);
    return;
  }
  if (table.querySelectorAll("tbody tr").length > 1) {
    row.remove();
  } else {
    alert("Cannot remove the last row.");
  }
}

//#region Form Data
function collectFormData() {
  const form = document.getElementById("create_event_form");
  const formData = new FormData(form);
  const eventData = {
    "event-dates": [],
    "ticket-types": [],
    "discount-codes": [],
  };

  for (let [key, value] of formData.entries()) {
    // Skip table data which is process separately
    if (
      key.startsWith("start-date-") ||
      key.startsWith("start-time-") ||
      key.startsWith("end-time-") ||
      key.startsWith("ticket-name-") ||
      key.startsWith("ticket-price-") ||
      key.startsWith("ticket-stock-") ||
      key.startsWith("discount-code-") ||
      key.startsWith("percent-off-") ||
      key.startsWith("expiration-date-")
    ) {
      continue;
    }

    eventData[key] = value;
  }

  const eventDatesRows = document.querySelectorAll(
    ".event-dates-table tbody tr"
  );
  eventDatesRows.forEach((row) => {
    const rowId = row.dataset.rowId;
    if (!rowId) return;

    const startDate = formData.get(`start-date-${rowId}`);
    const startTime = formData.get(`start-time-${rowId}`);
    const endTime = formData.get(`end-time-${rowId}`);

    if (startDate && startTime && endTime) {
      eventData["event-dates"].push({
        startDate,
        startTime,
        endTime,
      });
    }
  });

  // Process ticket types
  const ticketTypesRows = document.querySelectorAll(
    ".ticket-types-table tbody tr"
  );
  ticketTypesRows.forEach((row) => {
    const rowId = row.dataset.rowId;
    if (!rowId) return;

    const ticketName = formData.get(`ticket-name-${rowId}`);
    const ticketPrice = formData.get(`ticket-price-${rowId}`);
    const ticketStock = formData.get(`ticket-stock-${rowId}`);

    if (ticketName && ticketPrice && ticketStock) {
      eventData["ticket-types"].push({
        ticketName,
        ticketPrice,
        ticketStock,
      });
    }
  });

  // Process discount codes
  const discountCodesRows = document.querySelectorAll(
    ".discount-codes-table tbody tr"
  );
  discountCodesRows.forEach((row) => {
    const rowId = row.dataset.rowId;
    if (!rowId) return;

    const discountCode = formData.get(`discount-code-${rowId}`);
    const percentOff = formData.get(`percent-off-${rowId}`);
    const expirationDate = formData.get(`expiration-date-${rowId}`);

    if (discountCode && percentOff && expirationDate) {
      eventData["discount-codes"].push({
        discountCode,
        percentOff,
        expirationDate,
      });
    }
  });

  return eventData;
}

//#region Form validation
function initFormValidation() {
  const form = document.getElementById("create_event_form");
  if (!form) {
    console.error("Form not found");
    return;
  }

  const validator = new JustValidate("#create_event_form", {
    errorFieldCssClass: "is-invalid",
    errorLabelStyle: {
      fontSize: "13px",
      color: "#dc3545",
      margin: "4px 0 0 0",
      display: "block",
      width: "inherit",
    },
    focusInvalidField: true,
    lockForm: true,
  });

  // Basic validation rules
  validator
    .addField("#title", [
      {
        rule: "required",
        errorMessage: "Title is required",
      },
      {
        rule: "minLength",
        value: 3,
        errorMessage: "Title should be at least 3 characters",
      },
    ])
    .addField("#category", [
      {
        rule: "required",
        errorMessage: "Please select a category",
      },
    ])
    .addField("#location", [
      {
        rule: "required",
        errorMessage: "Location is required",
      },
    ])
    .addField("#description", [
      {
        rule: "required",
        errorMessage: "Description is required",
      },
      {
        rule: "minLength",
        value: 10,
        errorMessage: "Description should be at least 10 characters",
      },
    ])
    .addField("#cover", [
      {
        rule: "minFilesCount",
        value: 1,
        errorMessage: "Cover image is required",
      },
      {
        rule: "maxFilesCount",
        value: 1,
        errorMessage: "Only 1 cover image can be uploaded",
      },
      {
        rule: "files",
        value: {
          files: {
            extensions: ["jpeg", "jpg", "png"],
            types: ["image/jpeg", "image/jpg", "image/png"],
          },
        },
        errorMessage: "Only jpeg, jpg or png are accepted",
      },
    ]);

  // Add validation for dynamic table rows
  function addTableRowValidation() {
    validator.refresh();

    // Event dates validation
    document.querySelectorAll(".event-dates-table tbody tr").forEach((row) => {
      const rowId = row.dataset.rowId;
      if (!rowId) return;

      const startDateId = `start-date-${rowId}`;
      const startTimeId = `start-time-${rowId}`;
      const endTimeId = `end-time-${rowId}`;

      validator
        .addField(`#${startDateId}`, [
          {
            rule: "required",
            errorMessage: "Date is required",
          },
        ])
        .addField(`#${startTimeId}`, [
          {
            rule: "required",
            errorMessage: "Start time is required",
          },
        ])
        .addField(`#${endTimeId}`, [
          {
            rule: "required",
            errorMessage: "End time is required",
          },
          {
            validator: (value, fields) => {
              const startTimeField = fields[`#${startTimeId}`];
              if (!startTimeField) return false;

              const start = startTimeField.elem.value;
              const end = value;

              // Compare times as strings (HH:MM in 24hr format)
              return end > start;
            },
            errorMessage: "End time must be after start time",
          },
        ]);
    });

    // Ticket types validation
    const ticketTypeSelected =
      document
        .querySelector('input[name="ticket-type"]:checked')
        .closest(".ticket-option")
        .querySelector(".ticket-label")
        .textContent.trim() === "Ticketed Event";

    if (ticketTypeSelected) {
      document
        .querySelectorAll(".ticket-types-table tbody tr")
        .forEach((row) => {
          const rowId = row.dataset.rowId;
          if (!rowId) return;

          const ticketNameId = `ticket-name-${rowId}`;
          const ticketPriceId = `ticket-price-${rowId}`;
          const ticketStockId = `ticket-stock-${rowId}`;

          validator
            .addField(`#${ticketNameId}`, [
              {
                rule: "required",
                errorMessage: "Ticket name is required",
              },
            ])
            .addField(`#${ticketPriceId}`, [
              {
                rule: "required",
                errorMessage: "Price is required",
              },
              {
                rule: "number",
                errorMessage: "Price must be a number",
              },
              {
                rule: "minNumber",
                value: 0,
                errorMessage: "Price must be positive",
              },
            ])
            .addField(`#${ticketStockId}`, [
              {
                rule: "required",
                errorMessage: "Stock is required",
              },
              {
                rule: "number",
                errorMessage: "Stock must be a number",
              },
              {
                rule: "integer",
                errorMessage: "Stock must be a whole number",
              },
              {
                rule: "minNumber",
                value: 1,
                errorMessage: "Stock must be positive",
              },
            ]);
        });
    }

    document
      .querySelectorAll(".discount-codes-table tbody tr")
      .forEach((row) => {
        const rowId = row.dataset.rowId;
        if (!rowId) return;

        const discountCodeId = `discount-code-${rowId}`;
        const percentOffId = `percent-off-${rowId}`;
        const expirationDateId = `expiration-date-${rowId}`;

        // Only validate if any field in the row has a value
        const discountInput = document.getElementById(discountCodeId);
        const percentInput = document.getElementById(percentOffId);
        const dateInput = document.getElementById(expirationDateId);

        if (discountInput.value || percentInput.value || dateInput.value) {
          validator
            .addField(`#${discountCodeId}`, [
              {
                rule: "required",
                errorMessage: "Discount code is required",
              },
              {
                rule: "minLength",
                value: 6,
                errorMessage: "Code should be at least 6 characters",
              },
            ])
            .addField(`#${percentOffId}`, [
              {
                rule: "required",
                errorMessage: "Percentage is required",
              },
              {
                rule: "number",
                errorMessage: "Percentage must be a number",
              },
              {
                rule: "minNumber",
                value: 1,
                errorMessage: "Percentage must be at least 1",
              },
              {
                rule: "maxNumber",
                value: 100,
                errorMessage: "Percentage cannot exceed 100",
              },
            ])
            .addField(`#${expirationDateId}`, [
              {
                rule: "required",
                errorMessage: "Expiration date is required",
              },
            ]);
        }
      });
  }

  addTableRowValidation();

  document
    .querySelectorAll('.ticket-option input[type="radio"]')
    .forEach((radio) => {
      radio.addEventListener("change", addTableRowValidation);
    });

  validator.onSuccess((event) => {
    event.preventDefault();
    const eventData = collectFormData();
    console.log("Data", eventData);
    renderPreviewModal(eventData);
  });
}

//#region Cancell button
function setupCancelButton() {
  const cancelButton = document.querySelector(".btn-cancel");
  const form = document.getElementById("create_event_form");

  if (!cancelButton || !form) return;

  cancelButton.addEventListener("click", () => {
    localStorage.removeItem("savedEventFormData");
    form.reset();

    const dynamicTables = form.querySelectorAll("table.data-table");

    dynamicTables.forEach((table) => {
      const tbody = table.querySelector("tbody");
      const firstRow = tbody.querySelector("tr.first-row");

      tbody
        .querySelectorAll("tr:not(.first-row)")
        .forEach((row) => row.remove());

      if (firstRow) {
        firstRow
          .querySelectorAll("input, select, textarea")
          .forEach((input) => {
            if (input.type !== "radio" && input.type !== "checkbox") {
              input.value = "";
            } else {
              input.checked = false;
            }
          });
      }
    });

    document.querySelectorAll(".flatpickr-input").forEach((input) => {
      if (input._flatpickr) {
        input._flatpickr.clear();
      }
    });

    if (window.formValidator) {
      window.formValidator.refresh();
    }

    const titleInput = document.getElementById("title");
    if (titleInput) {
      titleInput.scrollIntoView({ behavior: "smooth", block: "center" });
      titleInput.focus();
    }
  });
}

//#region Preview modal
function renderPreviewModal(eventData) {
  const content = document.getElementById("modal-content");
  const cover =
    eventData.cover instanceof File
      ? URL.createObjectURL(eventData.cover)
      : "https://placehold.co/600x400";

  const ticketBadge =
    eventData["ticket-type"] === "free" ? "Free Entry" : "Ticketed Event";
  const category = eventData.category || "Uncategorized";
  const isRecurring = eventData["event-type"] === "recurring";

  const datesHTML = eventData["event-dates"]
    .map(
      (d) => `
    <tr>
      <td class="event_preview_icon_cell icon-cell"><img src="../assets/icons/calendar.png" alt="Calendar" /></td>
      <td>${formatDate(d.startDate)}</td>
      <td class="event_preview_icon_cell icon-cell"><img src="../assets/icons/clock.png" alt="Clock" /></td>
      <td>${d.startTime} - ${d.endTime}</td>
    </tr>
  `
    )
    .join("");

  const ticketsHTML = eventData["ticket-types"]
    .map((t) => {
      let stockClass = "event_preview_stock_high";
      if (t.ticketStock <= 50) {
        stockClass = "event_preview_stock_limited";
      } else if (t.ticketStock <= 20) {
        stockClass = "event_preview_stock_low";
      }
      return `
    <tr>
      <td>${t.ticketName}</td>
      <td class="event_preview_ticket_price ticket-price">${t.ticketPrice} Ksh</td>
      <td class="event_preview_ticket_stock ${stockClass}">${t.ticketStock} available</td>
    </tr>
  `;
    })
    .join("");

  // Fixed discount codes HTML structure
  const discountsHTML = (eventData["discount-codes"] || [])
    .map(
      (d) => `
    <tr>
      <td><code class="event_preview_discount_code">${
        d.discountCode
      }</code></td>
      <td class="event_preview_discount_value">${d.percentOff} % off${
        d.ticketType ? ` ${d.ticketType} only` : ""
      }</td>
      <td class="event_preview_expiry_date">${formatDateTime(
        d.expirationDate
      )}</td>
    </tr>
  `
    )
    .join("");

  content.innerHTML = `
    <img class="event_preview_cover_img preview-cover" src="${cover}" alt="Event cover" />
    <div class="event_preview_content_wrapper content-wrapper">
      <div class="event_preview_event_header event-header">
        <div class="event_preview_event_title_area">
          <h2 class="event_preview_event_title event-title">${
            eventData.title
          }</h2>
          <div class="event_preview_meta_badges">
            <span class="event_preview_ticket_badge ticket-type-badge">${ticketBadge}</span>
            <span class="event_preview_category_badge">${category}</span>
            ${
              isRecurring
                ? '<span class="event_preview_recurring_badge">Multiple Days</span>'
                : ""
            }
          </div>
        </div>
      </div>

      <div class="event_preview_section section">
        <h3 class="event_preview_section_title section-title">Date and Time</h3>
        <div class="event_preview_dates_container event-dates">
          <table class="event_preview_dates_table date-table">
            ${datesHTML}
          </table>
          <div class="event_preview_location_row location-row">
            <img src="../assets/icons/marker.png" alt="Location" />
            <span>${eventData.location}</span>
          </div>
        </div>
      </div>

      <div class="event_preview_section section">
        <h3 class="event_preview_section_title section-title">Ticket Information</h3>
        <table class="event_preview_tickets_table ticket-table">
          <thead>
            <tr><th>Type</th><th>Price</th><th>Stock</th></tr>
          </thead>
          <tbody>${ticketsHTML}</tbody>
        </table>
      </div>

      ${
        discountsHTML
          ? `
        <div class="event_preview_section section">
          <h3 class="event_preview_section_title section-title">Discount Codes</h3>
          <table class="event_preview_tickets_table event_preview_discount_table ticket-table">
            <thead><tr><th>Code</th><th>Discount</th><th>Expiration Date</th></tr></thead>
            <tbody>${discountsHTML}</tbody>
          </table>
        </div>
      `
          : ""
      }

      <div class="event_preview_section section">
        <h3 class="event_preview_section_title section-title">Event Description</h3>
        <div class="event_preview_description_card description-card">
          <p>${eventData.description}</p>
        </div>
      </div>
    </div>
  `;

  MicroModal.show("preview-modal");
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const submitButton = document.getElementById("confirm-submit");
const originalButtonText = submitButton.textContent;

function setLoading(isLoading) {
  if (isLoading) {
    submitButton.innerHTML = '<span class="spinner"></span> Uploading event...';
    submitButton.disabled = true;
  } else {
    submitButton.innerHTML = originalButtonText;
    submitButton.disabled = false;
  }
}

//#region On Submit
document
  .getElementById("confirm-submit")
  .addEventListener("click", async () => {
    const notyf = new Notyf({
      duration: 3000,
      position: { x: "right", y: "top" },
      ripple: false,
    });

    const eventData = collectFormData();
    localStorage.setItem("savedEventFormData", JSON.stringify(eventData));

    try {
      const user = await getCurrentUser();
      const currentPath = encodeURIComponent(window.location.pathname);

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

      setLoading(true);

      notyf.open({
        type: "info",
        message: "Uploading cover image...",
        duration: 0,
        ripple: true,
      });

      let coverUrl = null;

      if (eventData.cover && eventData.cover instanceof File) {
        try {
          const formData = new FormData();
          formData.append("file", eventData.cover);
          formData.append("upload_preset", `__eventify_cloudinary_preset`);
          formData.append("folder", "event-covers");

          const res = await fetch(
            `https://api.cloudinary.com/v1_1/dzhb1frj7/image/upload`,
            {
              method: "POST",
              body: formData,
            }
          );

          const data = await res.json();

          if (data.secure_url) {
            coverUrl = data.secure_url;
            eventData.coverUrl = coverUrl;
            delete eventData.cover;
          } else {
            throw new Error("Cloudinary response invalid");
          }

          notyf.dismissAll();
        } catch (err) {
          setLoading(false);
          console.error("Image upload failed:", err);
          notyf.dismissAll();
          notyf.error("Failed to upload cover image. Please try again.");
          return;
        }
      } else {
        notyf.dismissAll();
      }

      notyf.open({
        type: "info",
        message: "Saving event details...",
        duration: 0,
        ripple: true,
      });

      const formattedEventData = {
        creatorId: user.id,
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        category: eventData.category,
        eventType: eventData["event-type"],
        ticketType: eventData["ticket-type"],
        coverUrl: eventData.coverUrl,
        eventDates: eventData["event-dates"],
        ticketTypes: eventData["ticket-types"],
        discountCodes: eventData["discount-codes"] || [],
      };

      const res = await fetch("/api/events", {
        method: "POST",
        body: JSON.stringify(formattedEventData),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to create event");
      }

      const result = await res.json();

      localStorage.removeItem("savedEventFormData");
      setLoading(false);
      MicroModal.close("preview-modal");

      notyf.dismissAll();
      notyf.success("Event created successfully!");

      setTimeout(() => {
        window.location.href = `/pages/event.html?id=${result.eventId}`;
      }, 1500);
    } catch (error) {
      setLoading(false);
      console.error("Submit error:", error);
      notyf.dismissAll();
      notyf.error("Something went wrong. Please try again.");
    }
  });

//#region Restorimg form
function restoreSavedFormData() {
  const savedData = localStorage.getItem("savedEventFormData");

  if (savedData) {
    try {
      const eventData = JSON.parse(savedData);
      populateFormWithData(eventData);
    } catch (error) {
      console.error("Error restoring form data:", error);
    }
  }
}

function populateFormWithData(data) {
  Object.keys(data).forEach((key) => {
    const element = document.getElementById(key);
    if (element) {
      if (element.type === "checkbox") {
        element.checked = data[key];
      } else if (element.tagName === "SELECT") {
        element.value = data[key];
      } else if (element.type === "radio") {
        document.querySelector(
          `input[name="${key}"][value="${data[key]}"]`
        ).checked = true;
      } else {
        element.value = data[key];
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", restoreSavedFormData);