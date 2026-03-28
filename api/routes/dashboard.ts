import express from "express";
import prisma from "../../lib/prisma";
import { requireAuth } from "../../lib/auth-middleware";

const router = express.Router();

// Admin dashboard route - gets all data across the platform
router.get("/admin", requireAuth, async (req, res): Promise<any> => {
  try {
    const user = req.user;

    if (!user!.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get all stats for admin
    const totalRevenue = await prisma.purchase.aggregate({
      _sum: { totalPrice: true },
    });

    const totalUsers = await prisma.user.count();

    const totalTickets = await prisma.ticket.count();

    const totalPurchases = await prisma.purchase.count();

    // Calculate profit (assuming 20% margin for simplicity)
    const profit = totalRevenue._sum.totalPrice
      ? Number(totalRevenue._sum.totalPrice) * 0.8
      : 0;

    // Get monthly revenue data for chart
    const monthlyRevenue = await prisma.purchase.groupBy({
      by: ["purchasedAt"],
      _sum: { totalPrice: true },
      orderBy: { purchasedAt: "asc" },
    });

    // Process monthly data into chart format
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = new Date();
      month.setMonth(i);
      const monthRevenue = monthlyRevenue
        .filter((purchase) => new Date(purchase.purchasedAt).getMonth() === i)
        .reduce(
          (sum, purchase) => sum + Number(purchase._sum.totalPrice || 0),
          0
        );
      return Math.round(monthRevenue / 1000);
    });

    // Get customer retention data
    const userPurchaseCounts = await prisma.user.findMany({
      select: {
        id: true,
        _count: {
          select: { purchases: true },
        },
      },
      where: {
        purchases: {
          some: {},
        },
      },
    });

    const newCustomers = userPurchaseCounts.filter(
      (u) => u._count.purchases === 1
    ).length;
    const returningCustomers = userPurchaseCounts.filter(
      (u) => u._count.purchases > 1
    ).length;
    const totalCustomers = newCustomers + returningCustomers;
    const newCustomerPercentage =
      totalCustomers > 0
        ? Math.round((newCustomers / totalCustomers) * 100)
        : 0;

    // Get all events for admin
    const events = await prisma.event.findMany({
      include: {
        organizer: { select: { name: true } },
        ticketTypes: true,
        tickets: true,
        _count: {
          select: { tickets: true },
        },
      },
    });

    const eventTableData = events.map((event) => {
      const totalStock = event.ticketTypes.reduce(
        (sum, tt) => sum + tt.quantityTotal,
        0
      );
      const soldTickets = event._count.tickets;
      const remainingStock = totalStock - soldTickets;
      const totalSales = event.tickets.length;
      const avgPrice =
        event.ticketTypes.length > 0
          ? event.ticketTypes.reduce((sum, tt) => sum + Number(tt.price), 0) /
            event.ticketTypes.length
          : 0;

      return {
        id: event.id,
        name: event.title,
        category: event.category.replace("_", " ").toUpperCase(),
        image: event.imageUrl,
        stock: remainingStock,
        stockStatus: remainingStock < 10 ? "low-stock" : "in-stock",
        price: `Ksh ${Math.round(avgPrice)}`,
        totalSales: totalSales,
      };
    });

    const dashboardData = {
      stats: [
        {
          id: "revenue",
          icon: "../assets/icons/revenue.png",
          value:
            Number(totalRevenue._sum.totalPrice || 0) >= 2000
              ? `Ksh ${Math.round(
                  Number(totalRevenue._sum.totalPrice || 0) / 1000
                )}k`
              : `Ksh ${Number(totalRevenue._sum.totalPrice || 0)}`,
          label: "Total Revenue",
        },
        {
          id: "users",
          icon: "../assets/icons/users .png",
          value:
            totalUsers >= 2000
              ? `${(totalUsers / 1000).toFixed(1)}k`
              : totalUsers.toString(),
          label: "Total Users",
        },
        {
          id: "tickets",
          icon: "../assets/icons/tickets-sold.png",
          value:
            totalTickets >= 2000
              ? `${Math.round(totalTickets / 1000)}k`
              : totalTickets.toString(),
          label: "Tickets Sold",
        },
        {
          id: "profit",
          icon: "../assets/icons/earnings.png",
          value:
            profit >= 2000
              ? `Ksh ${Math.round(profit / 1000)}k`
              : `Ksh ${profit}`,
          label: "Profit",
        },
        {
          id: "purchases",
          icon: "../assets/icons/total-purchases.png",
          value:
            totalPurchases >= 2000
              ? `${Math.round(totalPurchases / 1000)}k`
              : totalPurchases.toString(),
          label: "Overall Purchases",
        },
      ],
      charts: {
        overview: {
          title: "Overview",
          type: "bar",
          data: {
            labels: [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ],
            datasets: [
              {
                label: "Revenue",
                data: monthlyData,
                backgroundColor: "#8b5cf6",
                borderColor: "#7c3aed",
                borderWidth: 1,
                borderRadius: 4,
              },
            ],
          },
        },
        customers: {
          title: "Customers",
          type: "doughnut",
          percentage: `${newCustomerPercentage}%`,
          trend: "+2.5% from last week",
          data: {
            labels: ["New Customers", "Returning Customers"],
            datasets: [
              {
                data: [newCustomerPercentage, 100 - newCustomerPercentage],
                backgroundColor: ["#8b5cf6", "#ec4899"],
                borderWidth: 0,
              },
            ],
          },
        },
      },
      events: eventTableData,
    };

    res.json(dashboardData);
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// Regular user (organizer) dashboard route - gets only their event data
router.get("/", requireAuth, async (req, res): Promise<any> => {
  try {
    const user = req.user;
    const userId = user!.id;

    // Get organizer's events
    const organizerEvents = await prisma.event.findMany({
      where: { organizerId: userId },
      include: {
        ticketTypes: true,
        tickets: {
          include: {
            purchase: true,
          },
        },
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (organizerEvents.length === 0) {
      return res.json({
        stats: [],
        charts: null,
        events: [],
      });
    }

    // Calculate stats for organizer's events only
    const eventIds = organizerEvents.map((e) => e.id);

    const organizerRevenue = await prisma.purchase.aggregate({
      _sum: { totalPrice: true },
      where: {
        tickets: {
          some: {
            eventId: { in: eventIds },
          },
        },
      },
    });

    const organizerTickets = await prisma.ticket.count({
      where: { eventId: { in: eventIds } },
    });

    // Calculate profit for organizer (assuming 20% margin)
    const profit = organizerRevenue._sum.totalPrice
      ? Number(organizerRevenue._sum.totalPrice) * 0.8
      : 0;

    // Get monthly revenue data for organizer's events
    const monthlyRevenue = await prisma.purchase.groupBy({
      by: ["purchasedAt"],
      _sum: { totalPrice: true },
      where: {
        tickets: {
          some: {
            eventId: { in: eventIds },
          },
        },
      },
      orderBy: { purchasedAt: "asc" },
    });

    // Process monthly data into chart format
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthRevenue = monthlyRevenue
        .filter((purchase) => new Date(purchase.purchasedAt).getMonth() === i)
        .reduce(
          (sum, purchase) => sum + Number(purchase._sum.totalPrice || 0),
          0
        );
      return Math.round(monthRevenue / 1000); // Convert to thousands
    });

    // Get customer retention data for organizer's events
    const customerPurchases = await prisma.user.findMany({
      select: {
        id: true,
        purchases: {
          where: {
            tickets: {
              some: {
                eventId: { in: eventIds },
              },
            },
          },
        },
      },
      where: {
        purchases: {
          some: {
            tickets: {
              some: {
                eventId: { in: eventIds },
              },
            },
          },
        },
      },
    });

    const newCustomers = customerPurchases.filter(
      (u) => u.purchases.length === 1
    ).length;
    const returningCustomers = customerPurchases.filter(
      (u) => u.purchases.length > 1
    ).length;
    const totalCustomers = newCustomers + returningCustomers;
    const newCustomerPercentage =
      totalCustomers > 0
        ? Math.round((newCustomers / totalCustomers) * 100)
        : 0;

    // Format events for table
    const eventTableData = organizerEvents.map((event) => {
      const totalStock = event.ticketTypes.reduce(
        (sum, tt) => sum + tt.quantityTotal,
        0
      );
      const soldTickets = event._count.tickets;
      const remainingStock = totalStock - soldTickets;
      const totalSales = event.tickets.length;
      const avgPrice =
        event.ticketTypes.length > 0
          ? event.ticketTypes.reduce((sum, tt) => sum + Number(tt.price), 0) /
            event.ticketTypes.length
          : 0;

      return {
        id: event.id,
        name: event.title,
        category: event.category.replace("_", " ").toUpperCase(),
        image: event.imageUrl,
        stock: remainingStock,
        stockStatus: remainingStock < 10 ? "low-stock" : "in-stock",
        price: `Ksh ${Math.round(avgPrice)}`,
        totalSales: totalSales,
      };
    });

    const dashboardData = {
      stats: [
        {
          id: "revenue",
          icon: "../assets/icons/revenue.png",
          value: `Ksh ${Math.round(
            Number(organizerRevenue._sum.totalPrice || 0) / 1000
          )}k`,
          label: "Total Revenue",
        },
        {
          id: "tickets",
          icon: "../assets/icons/tickets-sold.png",
          value: organizerTickets >= 2000 
            ? `${Math.round(organizerTickets / 1000)}k` 
            : organizerTickets.toString(),
          label: "Tickets Sold",
        },        
        {
          id: "profit",
          icon: "../assets/icons/earnings.png",
          value: `Ksh ${Math.round(profit / 1000)}k`,
          label: "Profit",
        },
      ],
      charts: {
        overview: {
          title: "Overview",
          type: "bar",
          data: {
            labels: [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ],
            datasets: [
              {
                label: "Revenue",
                data: monthlyData,
                backgroundColor: "#8b5cf6",
                borderColor: "#7c3aed",
                borderWidth: 1,
                borderRadius: 4,
              },
            ],
          },
        },
        customers: {
          title: "Customers",
          type: "doughnut",
          percentage: `${newCustomerPercentage}%`,
          trend: "+2.5% from last week",
          data: {
            labels: ["New Customers", "Returning Customers"],
            datasets: [
              {
                data: [newCustomerPercentage, 100 - newCustomerPercentage],
                backgroundColor: ["#8b5cf6", "#ec4899"],
                borderWidth: 0,
              },
            ],
          },
        },
      },
      events: eventTableData,
    };

    res.json(dashboardData);
  } catch (error) {
    console.error("Error fetching organizer dashboard data:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

export default router;