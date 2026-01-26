// main.js
console.log("Приложение для погоды инициализировано");

document.addEventListener("DOMContentLoaded", () => {
  const currentWeatherEl = document.getElementById("currentWeather");
  currentWeatherEl.textContent = "Информация о погоде будет здесь";
});

const API_KEY = "8505e243c325a5b125a50217c33230a6";


// Проверяем доступность геолокации
function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showWeather, showCityForm);
  } else {
    showCityForm();
  }
}

// Если геопозиция доступна
function showWeather(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  fetchWeatherByCoords(lat, lon, "currentWeather");
}

// Если пользователь отказался или геопозиция недоступна
function showCityForm() {
  const currentWeatherEl = document.getElementById("currentWeather");
  currentWeatherEl.textContent = "Введите город для прогноза";
}


async function fetchWeatherByCoords(lat, lon, elementId) {
  const el = document.getElementById(elementId);
  el.textContent = "Загрузка...";

  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=3&appid=${API_KEY}&lang=ru`);
    if (!res.ok) throw new Error("Ошибка при получении данных");
    const data = await res.json();

    el.innerHTML = `
      <p><strong>${data.city.name}</strong></p>
      <p>Сегодня: ${data.list[0].main.temp}°C, ${data.list[0].weather[0].description}</p>
      <p>Завтра: ${data.list[1].main.temp}°C, ${data.list[1].weather[0].description}</p>
      <p>Послезавтра: ${data.list[2].main.temp}°C, ${data.list[2].weather[0].description}</p>
    `;
  } catch (err) {
    el.textContent = "Ошибка загрузки данных";
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  getLocation();
});


