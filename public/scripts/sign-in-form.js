document.addEventListener("DOMContentLoaded", function () {
  const notyf = new Notyf({
    duration: 3000,
    position: { x: "right", y: "top" },
    ripple: false,
  });

  const submitButton = document.querySelector(".submit-btn");
  const originalButtonText = submitButton.textContent;

  function setLoading(isLoading) {
    if (isLoading) {
      submitButton.innerHTML = '<span class="spinner"></span> Signing in...';
      submitButton.disabled = true;
    } else {
      submitButton.innerHTML = originalButtonText;
      submitButton.disabled = false;
    }
  }

  const validate = new JustValidate("#sign_in_form", {
    errorFieldCssClass: "is-invalid",
    errorLabelStyle: {
      fontSize: "15px",
      color: "#dc3545",
      margin: "5px 0 0 0",
      display: "block",
    },
    errorLabelCssClass: "error-message",
    focusInvalidField: true,
    lockForm: true,
  });

  validate
    .addField("#email", [
      { rule: "required", errorMessage: "Email is required" },
      { rule: "email", errorMessage: "Please enter a valid email" },
    ])
    .addField("#password", [
      { rule: "required", errorMessage: "Password is required" },
      {
        rule: "minLength",
        value: 8,
        errorMessage: "Password should be at least 8 characters",
      },
    ])
    .onSuccess(async (event) => {
      event.preventDefault();

      setLoading(true);

      const formElement = event.target;
      const formData = new FormData(formElement);
      const formDataObject = {};
      formData.forEach((value, key) => {
        formDataObject[key] = value;
      });

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: formDataObject.email,
            password: formDataObject.password,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          notyf.success("Signed in successfully!");

          const urlParams = new URLSearchParams(window.location.search);
          const requestedRedirect = decodeURIComponent(
            urlParams.get("src") || ""
          );

          const allowedRedirects = [
            "/pages/index.html",
            "/pages/dashboard.html",
            "/pages/create-event.html",
          ];

          const redirectTo = allowedRedirects.includes(requestedRedirect)
            ? requestedRedirect
            : "/pages/index.html";

          setTimeout(() => {
            window.location.href = redirectTo;
          }, 1000);
        } else {
          setLoading(false);
          notyf.error(data.error || "Invalid email or password");
        }
      } catch (error) {          
        setLoading(false);
        console.error("Login error:", error);
        notyf.error("Something went wrong. Please try again.");
      }
    });

  const eyeIcon = document.querySelector(".eye-icon");
  const passwordInput = document.querySelector("#password");

  if (eyeIcon && passwordInput) {
    eyeIcon.addEventListener("click", function () {
      const isPassword = passwordInput.getAttribute("type") === "password";
      passwordInput.setAttribute("type", isPassword ? "text" : "password");
      eyeIcon.src = isPassword
        ? "../assets/icons/eye-crossed.png"
        : "../assets/icons/eye.png";

      this.classList.toggle("visible");
    });
  }
});
