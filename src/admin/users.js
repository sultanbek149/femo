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

let allUsers = []; 
let currentFilters = {
  search: '',
  country: '',
  role: '',
  grade: ''
};

// Загрузка всех пользователей
async function loadAllUsers() {
  try {
    console.log("Загрузка пользователей...");
    
    const res = await authorizedFetch("https://portal.gradients.academy/users/dashboard/");
    if (!res.ok) {
      throw new Error(`Ошибка HTTP: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log("Получены данные:", data);
    
    if (!Array.isArray(data)) {
      throw new Error("Ожидался массив пользователей");
    }
    
    allUsers = data;
    initFilters(allUsers);
    applyFilters();
    
  } catch (err) {
    console.error("Ошибка загрузки:", err);
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-4 text-center text-red-500">
          ${err.message}
        </td>
      </tr>
    `;
  }
}

// Инициализация фильтров
function initFilters(users) {
  // Страны
  const countries = [...new Set(users.map(u => u.country))].filter(Boolean);
  const countrySelect = document.querySelector('.country-filter');
  countrySelect.innerHTML = `
    <option value="">Все страны</option>
    ${countries.map(c => `<option>${c}</option>`).join('')}
  `;

  // Роли (уже есть в HTML)
  
  // Классы
  const grades = [...new Set(users.map(u => u.grade))].filter(Boolean).sort();
  const gradeSelect = document.querySelector('.grade-filter');
  gradeSelect.innerHTML = `
    <option value="">Все классы</option>
    ${grades.map(g => `<option>${g}</option>`).join('')}
  `;

  // Навешиваем обработчики
  document.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', () => applyFilters());
  });
}

// Применение фильтров
function applyFilters() {
  // Используем конкретный ID инпута
  const searchInput = document.querySelector('#search_by_id_or_name');
  const searchTerm = searchInput.value.toLowerCase();
  
  const country = document.querySelector('.country-filter').value;
  const role = document.querySelector('.role-filter').value;
  const grade = document.querySelector('.grade-filter').value;

  const filtered = allUsers.filter(user => {
    // Преобразуем ID в строку и в нижний регистр
    const userIdString = user.id.toString().toLowerCase();
    // Ищем совпадения в имени или ID
    const matchesSearch = 
      user.full_name_ru.toLowerCase().includes(searchTerm) || 
      userIdString.includes(searchTerm);
    
    // Проверяем остальные фильтры
    const matchesCountry = !country || user.country === country;
    const matchesRole = !role || user.role === role;
    const matchesGrade = !grade || user.grade === grade;
    
    return matchesSearch && matchesCountry && matchesRole && matchesGrade;
  });

  renderUsers(filtered);
}

// Отрисовка пользователей
function renderUsers(users) {
  const tbody = document.querySelector("tbody");
  tbody.innerHTML = users.length === 0 ? `
    <tr>
      <td colspan="6" class="px-6 py-4 text-center text-gray-500">
        Пользователи не найдены
      </td>
    </tr>
  ` : users.map(user => {
    const roleInfo = user.role === "participant" ? {
      class: "text-blue-primary",
      label: "Участник"
    } : {
      class: "text-violet-primary",
      label: "Представитель"
    };

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <img class="h-8 w-8 rounded-full"
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=32&h=32&auto=format&fit=crop&q=60"
              alt="" />
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900">
                ${user.full_name_ru}
              </div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 text-sm whitespace-nowrap">${user.id}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <span class="mr-2">${getFlagEmoji(user.country)}</span>
            <span class="text-sm text-gray-900">${user.country}</span>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="${roleInfo.class} flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium">
            <span class="text-xl">•</span> ${roleInfo.label}
          </span>
        </td>
        <td class="px-6 py-4 text-sm whitespace-nowrap">${user.grade || "-"}</td>
        <td class="px-6 py-4 text-sm whitespace-nowrap">
          <!-- Кнопки действий остаются без изменений -->
            <div class="flex justify-between gap-2 *:cursor-pointer">
            <button class="text-gray-400 hover:text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
            <button class="hover:text-blue-primary text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
            </button>
          </div>
        </td>
        </td>
      </tr>
    `;
  }).join('');
}

// Вспомогательная функция для флагов
function getFlagEmoji(country) {
  const flags = {
    'Казахстан': '🇰🇿',
    'Россия': '🇷🇺',
    'Узбекистан': '🇺🇿'
  };
  return flags[country] || '';
}

// Обновленный setupSearch с debounce
function setupSearch() {
  const searchInput = document.querySelector('#search_by_id_or_name');
  const debouncedSearch = debounce(() => applyFilters(), 500);
  
  searchInput.addEventListener('input', debouncedSearch);
  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') applyFilters();
  });
}

// Инициализация
document.addEventListener("DOMContentLoaded", async () => {
  const user = await ensureUserAuthenticated();
  if (!user) return;

  renderUserInfo(user);
  setupSearch();
  
  try {
    await loadAllUsers();
  } catch (err) {
    console.error("Ошибка инициализации:", err);
  }
});

// Функция debounce
function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

