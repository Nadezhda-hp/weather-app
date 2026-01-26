console.log("Приложение для погоды инициализировано");

const API_KEY = "8505e243c325a5b125a50217c33230a6";

const cityForm = document.getElementById("cityForm");
const cityInput = document.getElementById("cityInput");
const cityList = document.getElementById("cityList");
const errorEl = document.getElementById("error");
const refreshBtn = document.getElementById("refreshBtn");

// ------------------ Геолокация ------------------

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showWeather, showCityForm);
  } else {
    showCityForm();
  }
}

function showWeather(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  fetchWeatherByCoords(lat, lon, "currentWeather");
}

function showCityForm() {
  const currentWeatherEl = document.getElementById("currentWeather");
  currentWeatherEl.textContent = "Введите город для прогноза";
}

// ------------------ Получение погоды ------------------

async function fetchWeatherByCoords(lat, lon, elementId) {
  const el = document.getElementById(elementId);
  el.textContent = "Загрузка...";

  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=3&appid=${API_KEY}&lang=ru`);
    if (!res.ok) throw new Error("Ошибка при получении данных");
    const data = await res.json();

    el.innerHTML = `
      <p><strong>${data.city.name}</strong></p>
      <p>Сегодня: ${Math.round(data.list[0].main.temp)}°C, ${data.list[0].weather[0].description}</p>
      <p>Завтра: ${Math.round(data.list[1].main.temp)}°C, ${data.list[1].weather[0].description}</p>
      <p>Послезавтра: ${Math.round(data.list[2].main.temp)}°C, ${data.list[2].weather[0].description}</p>
    `;
  } catch (err) {
    el.textContent = "Ошибка загрузки данных";
    console.error(err);
  }
}

// ------------------ Добавление и удаление городов ------------------

cityForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;

  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}&lang=ru`);
    if (!res.ok) throw new Error("Город не найден");

    const data = await res.json();
    addCityToList(data.name, data.main.temp, data.weather[0].description);
    saveCities();
    errorEl.textContent = "";
    cityInput.value = "";
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

function addCityToList(name, temp, desc) {
  const li = document.createElement("li");
  li.classList.add("city-item");
  li.innerHTML = `
    <span class="city-text">${name}: ${Math.round(temp)}°C, ${desc}</span>
    <button class="delete-btn">Удалить</button>
  `;

  li.querySelector(".delete-btn").addEventListener("click", () => {
    li.remove();
    saveCities();
  });

  cityList.appendChild(li);
}

// ------------------ Сохранение и загрузка ------------------

function saveCities() {
  const cities = [];
  cityList.querySelectorAll(".city-item").forEach(li => {
    const text = li.querySelector(".city-text").textContent;
    cities.push(text);
  });
  localStorage.setItem("cities", JSON.stringify(cities));
}

async function loadCities() {
  const cities = JSON.parse(localStorage.getItem("cities") || "[]");
  for (const cityText of cities) {
    const cityName = cityText.split(":")[0];
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&appid=${API_KEY}&lang=ru`);
      const data = await res.json();
      addCityToList(data.name, data.main.temp, data.weather[0].description);
    } catch (err) {
      console.error("Ошибка при загрузке города из localStorage:", cityName);
    }
  }
}

// ------------------ Кнопка обновления ------------------

refreshBtn.addEventListener("click", () => {
  getLocation();

  cityList.querySelectorAll(".city-item").forEach(async li => {
    const cityName = li.querySelector(".city-text").textContent.split(":")[0];
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&appid=${API_KEY}&lang=ru`);
      const data = await res.json();
      li.querySelector(".city-text").textContent = `${data.name}: ${Math.round(data.main.temp)}°C, ${data.weather[0].description}`;
      saveCities();
    } catch (err) {
      li.querySelector(".city-text").textContent = `${cityName}: ошибка обновления`;
    }
  });
});

// ------------------ Инициализация ------------------

document.addEventListener("DOMContentLoaded", () => {
  const currentWeatherEl = document.getElementById("currentWeather");
  currentWeatherEl.textContent = "Информация о погоде будет здесь";

  loadCities();
  getLocation();
});
