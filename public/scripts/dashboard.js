import { getCurrentUser } from "./utils/auth-utils.js";

class DashboardManager {
  constructor() {
    this.data = null;
    this.charts = {};
    this.loadingDelay = 2000;
    this.user = null;
  }

  async init() {
    this.user = await getCurrentUser();
    await this.loadData();
    this.renderDashboard();
  }

  async loadData() {
    try {
      let response;
      if (this.user.isAdmin) {
        response = await fetch("/api/dashboard/admin");
      } else {
        response = await fetch("/api/dashboard");
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      this.data = await response.json();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      document.querySelector(".dashboard-container").innerHTML = `
        <div class="error-state">
          <img src="../assets/icons/info.png" class="error-state-icon" alt="Error">
          <h3>Something went wrong</h3>
          <p>Couldn't load events. Check your connection and try again.</p>
          <button class="error-state-action" onclick="location.reload()">Try Again</button>
        </div>`;
    }
  }

  renderDashboard() {
    const dashboardContainer = document.querySelector(".dashboard-container");

    if (!this.user) {
      dashboardContainer.innerHTML = `
        <div class="empty-state">
          <img src="../assets/icons/calendar.png" class="empty-state-icon" alt="Calendar">
          <h3>Log In</h3>
          <p>Log in or sign up to view dashboard page</p>
          <button class="empty-state-action" onclick="location.href='sign-in.html'">Log In</button>
        </div>
      `;
      return;
    }

    if (
      !this.data ||
      (!this.data.stats && !this.data.charts && !this.data.events)
    ) {
      dashboardContainer.innerHTML = `
        <div class="empty-state">
          <img src="../assets/icons/calendar.png" class="empty-state-icon" alt="Calendar">
          <h3>No Events Yet</h3>
          <p>No events scheduled. Create your first event</p>
          <button class="empty-state-action" onclick="location.reload()">Refresh</button>
        </div>
      `;
      return;
    }

    this.renderGreeting();
    this.renderStats();
    this.renderCharts();
    this.renderEventsTable();
  }

  renderGreeting() {
    const greetingElement = document.querySelector(".greeting");
    if (greetingElement && this.user) {
      greetingElement.textContent = `Hello ${this.user.name}`;
    }
  }

  renderStats() {
    const statsGrid = document.querySelector(".stats-grid");
    if (!statsGrid || !this.data.stats) return;

    statsGrid.innerHTML = this.data.stats
      .map(
        (stat) => `
        <div class="stat-card">
          <div class="stat-icon">
            <img src="${stat.icon}" alt="${stat.label}" />
          </div>
          <div class="stat-content">
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
          </div>
        </div>
      `
      )
      .join("");
  }

  renderCharts() {
    // Clear existing charts
    Object.values(this.charts).forEach((chart) => {
      if (chart) chart.destroy();
    });

    // Render charts grid
    const chartsGrid = document.querySelector(".charts-grid");
    if (!chartsGrid || !this.data.charts) return;

    chartsGrid.innerHTML = `
        <div class="chart-card">
          <div class="chart-header">
            <h3>${this.data.charts.overview.title}</h3>
            <select class="chart-filter">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div class="chart-container">
            <canvas id="overviewChart"></canvas>
          </div>
        </div>
  
        <div class="chart-card">
          <div class="chart-header">
            <h3>${this.data.charts.customers.title}</h3>
            <div class="customer-stat">
              <span class="percentage">${this.data.charts.customers.percentage}</span>
              <span class="trend">${this.data.charts.customers.trend}</span>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="customersChart"></canvas>
          </div>
        </div>
      `;

    // Initialize charts
    this.initializeCharts();
  }

  initializeCharts() {
    const overviewCtx = document.getElementById("overviewChart");
    if (overviewCtx) {
      this.charts.overview = new Chart(overviewCtx.getContext("2d"), {
        type: this.data.charts.overview.type,
        data: this.data.charts.overview.data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                display: false,
              },
            },
            x: {
              grid: {
                display: false,
              },
            },
          },
        },
      });
    }

    const customersCtx = document.getElementById("customersChart");
    if (customersCtx) {
      this.charts.customers = new Chart(customersCtx.getContext("2d"), {
        type: this.data.charts.customers.type,
        data: this.data.charts.customers.data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          cutout: "70%",
        },
      });
    }
  }

  renderEventsTable() {
    const tableContainer = document.querySelector(".table-container");
    if (!tableContainer || !this.data.events) return;

    tableContainer.innerHTML = `
        <table class="events-table">
          <thead>
            <tr>
              <th>Event Image</th>
              <th>Event</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Total Sales</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.data.events
              .map(
                (event) => `
              <tr>
                <td>
                  <div class="event-image">
                    <img src="${event.image}" alt="${event.name}" />
                  </div>
                </td>
                <td>
                  <div class="event-info">
                    <div class="event-name">${event.name}</div>
                    <div class="event-category">${event.category}</div>
                  </div>
                </td>
                <td>
                  <span class="stock-badge ${event.stockStatus}">${event.stock} in stock</span>
                </td>
                <td>
                  <span class="price">${event.price}</span>
                </td>
                <td>
                  <span class="total-sales">${event.totalSales}</span>
                </td>
                <td>
                  <button 
                    class="delete-btn" 
                    data-event-id="${event.id}"
                    data-event-title="${event.name}">
                    <img src="../assets/icons/trash.png" alt="Delete" />
                  </button>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

    tableContainer.addEventListener("click", this.handleDeleteEventClick);
  }

  handleDeleteEventClick = async (event) => {
    const deleteButton = event.target.closest(".delete-btn");

    if (!deleteButton) return;

    const eventId = deleteButton.dataset.eventId;
    const eventName = deleteButton.dataset.eventTitle;

    await this.deleteEvent(eventId, eventName, deleteButton);
  };

  async deleteEvent(eventId, name) {
    const event = this.data.events.find((e) => e.id === eventId);
    const eventName = event ? event.name : name;

    Swal.fire({
      title: "Are you sure?",
      text: `You won't be able to revert deleting "${eventName}"!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(`/api/events/${eventId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to delete event");
          }

          this.data.events = this.data.events.filter(
            (event) => event.id !== eventId
          );
          this.renderEventsTable();

          Swal.fire({
            title: "Deleted!",
            text: `"${eventName}" has been deleted successfully.`,
            icon: "success",
          });
        } catch (error) {
          console.error("Error deleting event:", error);
          Swal.fire({
            title: "Error!",
            text: `Failed to delete "${eventName}". Please try again.`,
            icon: "error",
          });
        }
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire({
          title: "Cancelled",
          text: `"${eventName}" is safe and sound :)`,
          icon: "error",
        });
      }
    });
  }
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener("DOMContentLoaded", () => {
  dashboard = new DashboardManager();
  dashboard.init();
});
