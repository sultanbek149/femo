async function ensureUserAuthenticated() {
  let userData = localStorage.getItem("user");

  if (!userData) {
    console.warn("user не найден в localStorage. Пробуем обновить access_token...");
    const newAccessToken = await refreshAccessToken();
    console.log("Результат refreshAccessToken:", newAccessToken);

    if (!newAccessToken) {
      console.warn("refreshAccessToken вернул null. Перенаправление на /login.html");
      window.location.href = "/login.html";
      return null;
    }

    userData = localStorage.getItem("user");
    if (!userData) {
      console.warn("user всё ещё не найден после обновления токена. Редирект.");
      window.location.href = "/login.html";
      return null;
    }
  }

  return JSON.parse(userData);
}

function renderUserInfo(user) {
  const avatarEl = document.getElementById("user-avatar");
  const nameEl = document.getElementById("user-name");
  const roleEl = document.getElementById("user-role");
  const welcomeEl = document.querySelector("h1.text-xl");

  const imgPath = user.profile.image;
  avatarEl.src = imgPath.startsWith("http")
    ? imgPath
    : `https://portal.gradients.academy${imgPath}`;

  nameEl.textContent = user.profile.full_name_ru;
  const firstName = user.profile.full_name_ru.split(" ")[0];
  welcomeEl.textContent = `Добро пожаловать, ${firstName} 👋`;

  const roleMap = {
    administrator: "Администратор",
  };
  roleEl.textContent = roleMap[user.profile.role] || user.profile.role;
}

async function loadDashboardSummary() {
  const res = await authorizedFetch("https://portal.gradients.academy/results/dashboard/summary/");
  if (!res.ok) throw new Error("Ошибка при получении данных");

  const summary = await res.json();

  document.getElementById("registered-count").textContent = summary.registered_count;
  document.getElementById("active-olympiads").textContent = summary.active_olympiads;
  document.getElementById("average-score").textContent = summary.average_score;
  document.getElementById("total-tasks").textContent = summary.total_tasks;

  console.log("Данные дашборда успешно загружены:", summary);
}

async function loadCurrentOlympiad() {
  const res = await authorizedFetch("https://portal.gradients.academy/results/dashboard/current/");
  if (!res.ok) throw new Error("Ошибка при получении текущей олимпиады");

  const olympiad = await res.json();
  console.log("Текущая олимпиада:", olympiad);

  const block = document.querySelector(".olympiad-block");
  if (!block) return;

  block.querySelector("p.font-bold").textContent = olympiad.title;
  block.querySelector("p.text-sm").textContent = olympiad.description;

  const stageBlocks = block.querySelectorAll(".date");
  olympiad.stages.forEach((stage, index) => {
    if (stageBlocks[index]) {
      stageBlocks[index].textContent = `${stage.start} - ${stage.end}`;
      const stageTitleEl = stageBlocks[index].previousElementSibling;
      if (stageTitleEl && stageTitleEl.classList.contains("flex")) {
        stageTitleEl.querySelector("span.font-bold").textContent = stage.name;
      }
    }
  });
}

async function loadCurrentOlympiadStats() {
  const res = await authorizedFetch("https://portal.gradients.academy/results/dashboard/current_stats/");
  if (!res.ok) throw new Error("Ошибка при получении статистики текущей олимпиады");

  const stats = await res.json();
  console.log("Статистика текущей олимпиады:", stats);

  document.getElementById("participants-count").textContent = stats.participants_count;
  document.getElementById("countries-list").textContent = stats.countries.map(getFlagEmoji).join(", ");
  document.getElementById("new-today").textContent = `+ ${stats.new_today}`;
  document.getElementById("paid-count").textContent = stats.paid_count;
}
function getFlagEmoji(countryCode) {
  return countryCode
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await ensureUserAuthenticated();
  if (!user) return;

  renderUserInfo(user);

  try {
    await loadDashboardSummary();
    await loadCurrentOlympiad();
    await loadCurrentOlympiadStats();
  } catch (err) {
    console.error("Ошибка при загрузке данных:", err);
  }
});
