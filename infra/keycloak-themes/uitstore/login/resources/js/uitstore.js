(function () {
  function togglePassword(btn) {
    var wrap = btn.closest(".password-wrap");
    if (!wrap) return;
    var input = wrap.querySelector('input[type="password"], input[type="text"]');
    if (!input) return;
    var show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-pressed", show ? "true" : "false");
    btn.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
  }

  function calcStrength(pw) {
    var s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }

  var strengthLabels = ["", "Yếu", "Trung bình", "Tốt", "Mạnh"];
  var strengthColors = ["", "#EF4444", "#F59E0B", "#3B82F6", "#10B981"];

  function updateStrength(pw) {
    var block = document.getElementById("password-strength");
    if (!block) return;
    var bars = block.querySelectorAll(".strength-bar");
    var label = block.querySelector(".strength-label");
    if (!pw) {
      block.hidden = true;
      return;
    }
    block.hidden = false;
    var s = calcStrength(pw);
    bars.forEach(function (bar, i) {
      bar.style.background = i < s ? strengthColors[s] : "var(--ink-200)";
    });
    if (label) {
      label.textContent = "Độ mạnh: " + (strengthLabels[s] || "");
      label.style.color = strengthColors[s] || "var(--ink-600)";
    }
  }

  function splitFullName(full) {
    var parts = full.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts[parts.length - 1],
    };
  }

  function initRegisterForm() {
    var form = document.getElementById("kc-register-form");
    if (!form) return;

    var fullName = document.getElementById("fullName");
    var firstName = document.getElementById("firstName");
    var lastName = document.getElementById("lastName");
    var password = document.getElementById("password");
    var confirm = document.getElementById("password-confirm");
    var mismatch = document.getElementById("password-mismatch");

    if (password) {
      password.addEventListener("input", function () {
        updateStrength(password.value);
      });
    }

    if (confirm && password) {
      confirm.addEventListener("input", function () {
        if (!mismatch) return;
        var bad = confirm.value && confirm.value !== password.value;
        mismatch.hidden = !bad;
        confirm.classList.toggle("is-invalid", bad);
      });
    }

    form.addEventListener("submit", function () {
      if (fullName && firstName && lastName) {
        var split = splitFullName(fullName.value);
        firstName.value = split.firstName;
        lastName.value = split.lastName;
      }
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-toggle-password]");
    if (btn) {
      e.preventDefault();
      togglePassword(btn);
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    initRegisterForm();
    var pw = document.getElementById("password");
    if (pw && pw.value) updateStrength(pw.value);
  });
})();
