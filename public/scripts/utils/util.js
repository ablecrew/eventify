export function formatDateTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, "0");
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

export function formatMonth(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString("default", { month: "short" }).toUpperCase();
}

export function getDayOfMonth(dateStr) {
  return new Date(dateStr).getDate();
}

export function getCheapestTicketPrice(event) {
  if (!event.ticketTypes || event.ticketTypes.length === 0) {
    return "Free";
  }

  const cheapestTicket = event.ticketTypes.reduce((cheapest, ticket) => {
    return ticket.price < cheapest.price ? ticket : cheapest;
  }, event.ticketTypes[0]);

  return `Ksh ${cheapestTicket.price}`;
}

export function formatCategory(category) {
  return category
    .replace("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

export function addToCart(eventData) {
  let cart = JSON.parse(localStorage.getItem("cart") || "[]");

  const existingItemIndex = cart.findIndex(
    (item) =>
      item.id === eventData.eventId &&
      item.occurrenceId === eventData.occurrenceId &&
      item.ticketTypeId === eventData.ticketTypeId
  );

  if (existingItemIndex !== -1) {
    cart[existingItemIndex].quantity += eventData.quantity;
    cart[existingItemIndex].addedAt = new Date().toISOString();
  } else {
    cart.push({
      id: eventData.eventId,
      occurrenceId: eventData.occurrenceId,
      ticketTypeId: eventData.ticketTypeId,
      eventTitle: eventData.title,
      eventImage: eventData.imageUrl,
      price: eventData.ticketPrice,
      date: eventData.date,
      ticketTypeName: eventData.ticketTypeName,
      quantity: eventData.quantity,
      addedAt: new Date().toISOString(),
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  return true;
}

export function getCart() {
  return JSON.parse(localStorage.getItem("cart") || "[]");
}

export function removeFromCart(
  eventId,
  occurrenceId = null,
  ticketTypeId = null
) {
  let cart = getCart();

  if (occurrenceId && ticketTypeId) {
    // Remove specific item variant
    cart = cart.filter(
      (item) =>
        !(
          item.id === eventId &&
          item.occurrenceId === occurrenceId &&
          item.ticketTypeId === ticketTypeId
        )
    );
  } else {
    // Remove all items with this eventId
    cart = cart.filter((item) => item.id !== eventId);
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  return cart;
}

export function updateQuantity(
  eventId,
  occurrenceId,
  ticketTypeId,
  newQuantity
) {
  let cart = getCart();

  const itemIndex = cart.findIndex(
    (item) =>
      item.id === eventId &&
      item.occurrenceId === occurrenceId &&
      item.ticketTypeId === ticketTypeId
  );

  if (itemIndex !== -1) {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      cart.splice(itemIndex, 1);
    } else {
      cart[itemIndex].quantity = newQuantity;
      cart[itemIndex].addedAt = new Date().toISOString();
    }

    localStorage.setItem("cart", JSON.stringify(cart));
  }

  return cart;
}

export function adjustQuantity(
  eventId,
  occurrenceId,
  ticketTypeId,
  adjustment
) {
  let cart = getCart();

  const itemIndex = cart.findIndex(
    (item) =>
      item.id === eventId &&
      item.occurrenceId === occurrenceId &&
      item.ticketTypeId === ticketTypeId
  );

  if (itemIndex !== -1) {
    const newQuantity = cart[itemIndex].quantity + adjustment;

    if (newQuantity <= 0) {
      // Remove item if quantity would be 0 or less
      cart.splice(itemIndex, 1);
    } else {
      cart[itemIndex].quantity = newQuantity;
      cart[itemIndex].addedAt = new Date().toISOString();
    }

    localStorage.setItem("cart", JSON.stringify(cart));
  }

  return cart;
}

export function clearCart() {
  localStorage.removeItem("cart");
  return [];
}

export function getCartTotal() {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function getCartItemCount() {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
}

// New functions for checking cart status
export function isInCart(eventId, occurrenceId, ticketTypeId) {
  const cart = getCart();
  return cart.some(
    (item) =>
      item.id === eventId &&
      item.occurrenceId === occurrenceId &&
      item.ticketTypeId === ticketTypeId
  );
}

export function getCartItem(eventId, occurrenceId, ticketTypeId) {
  const cart = getCart();
  return cart.find(
    (item) =>
      item.id === eventId &&
      item.occurrenceId === occurrenceId &&
      item.ticketTypeId === ticketTypeId
  );
}

export function hasEventInCart(eventId) {
  const cart = getCart();
  return cart.some((item) => item.id === eventId);
}