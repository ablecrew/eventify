/**
 * Check if user is authenticated by querying the auth endpoint
 */
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

/**
 * Check if user is authenticated and redirect if not
 * @param {string} redirectTo - URL to redirect to if not authenticated
 * @returns {Promise<Object|null>} User data if authenticated, null otherwise
 */
async function requireAuth(redirectTo = "/pages/sign-in.html") {
  const user = await getCurrentUser();

  if (!user) {
    // Save current page to redirect back after login
    const currentPage = window.location.pathname;
    window.location.href = `${redirectTo}?src=${encodeURIComponent(
      currentPage
    )}`;
    return null;
  }

  return user;
}

/**
 * Check if cookies are being set properly (for debugging)
 * @returns {boolean} True if the auth cookie exists
 */
function checkAuthCookie() {
  return document.cookie.includes("__eventify_auth_session=");
}

/**
 * Log out the current user
 * @returns {Promise<boolean>} True if logout was successful
 */
async function logOut() {
  try {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Logout failed:", error);
    return false;
  }
}

export { getCurrentUser, requireAuth, checkAuthCookie, logOut };
