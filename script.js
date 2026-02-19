(function () {
  'use strict';

  var GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';
  var WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

  var container = document.getElementById('cards-container');
  var cityInput = document.getElementById('city-input');
  var btnAdd = document.getElementById('btn-add');
  var btnRefresh = document.getElementById('btn-refresh');
  var dropdown = document.getElementById('dropdown');
  var inputError = document.getElementById('input-error');

  var cities = [];
  var searchTimeout = null;
  var selectedGeo = null;

  var WMO_ICONS = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌧️',
    56: '🌧️', 57: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    66: '🌧️', 67: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '❄️',
    77: '❄️',
    80: '🌦️', 81: '🌧️', 82: '🌧️',
    85: '🌨️', 86: '❄️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
  };

  var WMO_TEXT = {
    0: 'Ясно', 1: 'Малооблачно', 2: 'Переменная облачность', 3: 'Облачно',
    45: 'Туман', 48: 'Изморозь',
    51: 'Лёгкая морось', 53: 'Морось', 55: 'Сильная морось',
    56: 'Ледяная морось', 57: 'Ледяная морось',
    61: 'Небольшой дождь', 63: 'Дождь', 65: 'Сильный дождь',
    66: 'Ледяной дождь', 67: 'Ледяной дождь',
    71: 'Небольшой снег', 73: 'Снег', 75: 'Сильный снег',
    77: 'Снежные зёрна',
    80: 'Ливень', 81: 'Сильный ливень', 82: 'Очень сильный ливень',
    85: 'Снегопад', 86: 'Сильный снегопад',
    95: 'Гроза', 96: 'Гроза с градом', 99: 'Сильная гроза'
  };

  var DAYS_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  var MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  function formatDate(dateStr, i) {
    var d = new Date(dateStr + 'T00:00:00');
    if (i === 0) return 'Сегодня';
    if (i === 1) return 'Завтра';
    return DAYS_RU[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS_RU[d.getMonth()];
  }

  // ---- localStorage ----

  function saveCities() {
    localStorage.setItem('weather_cities', JSON.stringify(cities));
  }

  function loadCities() {
    try {
      var data = JSON.parse(localStorage.getItem('weather_cities'));
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  }

  // ---- Card Rendering ----

  function renderCardLoading(city) {
    var card = document.createElement('div');
    card.className = 'weather-card';
    card.setAttribute('data-id', city.id);

    var header = document.createElement('div');
    header.className = 'card-header';

    var title = document.createElement('div');
    var h = document.createElement('div');
    h.className = 'card-city';
    h.textContent = city.name;
    title.appendChild(h);

    if (city.isGeo) {
      var sub = document.createElement('div');
      sub.className = 'card-subtitle';
      sub.textContent = 'Текущее местоположение';
      title.appendChild(sub);
    }

    var btnRm = document.createElement('button');
    btnRm.className = 'btn btn-remove';
    btnRm.textContent = '×';
    btnRm.addEventListener('click', function () { removeCity(city.id); });

    header.appendChild(title);
    header.appendChild(btnRm);
    card.appendChild(header);

    var loading = document.createElement('div');
    loading.className = 'card-loading';
    var spinner = document.createElement('div');
    spinner.className = 'spinner';
    loading.appendChild(spinner);
    var text = document.createElement('p');
    text.textContent = 'Загрузка...';
    loading.appendChild(text);
    card.appendChild(loading);

    return card;
  }

  function renderCardError(card, msg) {
    var old = card.querySelector('.card-loading');
    if (old) card.removeChild(old);

    var err = document.createElement('div');
    err.className = 'card-error';
    var icon = document.createElement('div');
    icon.className = 'error-icon';
    icon.textContent = '⚠️';
    err.appendChild(icon);
    var p = document.createElement('p');
    p.textContent = msg;
    err.appendChild(p);
    card.appendChild(err);
  }

  function renderCardWeather(card, data, city) {
    var old = card.querySelector('.card-loading');
    if (old) card.removeChild(old);
    var oldErr = card.querySelector('.card-error');
    if (oldErr) card.removeChild(oldErr);

    var current = data.current_weather;
    var daily = data.daily;

    var cw = document.createElement('div');
    cw.className = 'current-weather';

    var iconEl = document.createElement('div');
    iconEl.className = 'current-icon';
    iconEl.textContent = WMO_ICONS[current.weathercode] || '🌡️';
    cw.appendChild(iconEl);

    var infoDiv = document.createElement('div');

    var tempEl = document.createElement('div');
    tempEl.className = 'current-temp';
    tempEl.textContent = Math.round(current.temperature) + '°';
    infoDiv.appendChild(tempEl);

    var descEl = document.createElement('div');
    descEl.className = 'current-desc';
    descEl.textContent = WMO_TEXT[current.weathercode] || 'Нет данных';
    infoDiv.appendChild(descEl);

    var details = document.createElement('div');
    details.className = 'current-details';

    var windEl = document.createElement('span');
    windEl.textContent = '💨 ' + current.windspeed + ' км/ч';
    details.appendChild(windEl);

    if (daily.precipitation_sum && daily.precipitation_sum[0] !== undefined) {
      var rainEl = document.createElement('span');
      rainEl.textContent = '💧 ' + daily.precipitation_sum[0] + ' мм';
      details.appendChild(rainEl);
    }

    infoDiv.appendChild(details);
    cw.appendChild(infoDiv);
    card.appendChild(cw);

    var forecast = document.createElement('div');
    forecast.className = 'forecast';

    var dayCount = Math.min(daily.time.length, 5);
    for (var i = 0; i < dayCount; i++) {
      var day = document.createElement('div');
      day.className = 'forecast-day';

      var dateEl = document.createElement('div');
      dateEl.className = 'forecast-date';
      dateEl.textContent = formatDate(daily.time[i], i);
      day.appendChild(dateEl);

      var fIcon = document.createElement('div');
      fIcon.className = 'forecast-icon';
      fIcon.textContent = WMO_ICONS[daily.weathercode[i]] || '🌡️';
      day.appendChild(fIcon);

      var temps = document.createElement('div');
      temps.className = 'forecast-temps';
      temps.textContent = Math.round(daily.temperature_2m_max[i]) + '°';
      var lo = document.createElement('span');
      lo.textContent = ' / ' + Math.round(daily.temperature_2m_min[i]) + '°';
      temps.appendChild(lo);
      day.appendChild(temps);

      forecast.appendChild(day);
    }

    card.appendChild(forecast);
  }

  // ---- Weather API ----

  function fetchWeather(city) {
    var existing = container.querySelector('[data-id="' + city.id + '"]');
    if (existing) container.removeChild(existing);

    var card = renderCardLoading(city);
    container.appendChild(card);

    var url = WEATHER_API +
      '?latitude=' + city.lat +
      '&longitude=' + city.lon +
      '&current_weather=true' +
      '&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum' +
      '&timezone=auto' +
      '&forecast_days=5';

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Ошибка сервера: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        renderCardWeather(card, data, city);
      })
      .catch(function (err) {
        renderCardError(card, 'Не удалось загрузить погоду: ' + err.message);
      });
  }

  function refreshAll() {
    container.innerHTML = '';
    cities.forEach(function (c) { fetchWeather(c); });
  }

  // ---- City Management ----

  function addCity(cityData) {
    var exists = cities.some(function (c) {
      return c.lat === cityData.lat && c.lon === cityData.lon;
    });
    if (exists) {
      showError('Этот город уже добавлен');
      return;
    }

    cities.push(cityData);
    saveCities();
    fetchWeather(cityData);
  }

  function removeCity(id) {
    cities = cities.filter(function (c) { return c.id !== id; });
    saveCities();
    var card = container.querySelector('[data-id="' + id + '"]');
    if (card) container.removeChild(card);
  }

  // ---- Geocoding Search ----

  function searchCities(query) {
    if (query.length < 2) { hideDropdown(); return; }

    fetch(GEO_API + '?name=' + encodeURIComponent(query) + '&count=6&language=ru')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.results || data.results.length === 0) {
          hideDropdown();
          return;
        }
        showDropdown(data.results);
      })
      .catch(function () { hideDropdown(); });
  }

  function showDropdown(results) {
    dropdown.innerHTML = '';
    dropdown.classList.remove('hidden');

    results.forEach(function (r) {
      var item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = r.name;

      if (r.admin1 || r.country) {
        var small = document.createElement('small');
        small.textContent = [r.admin1, r.country].filter(Boolean).join(', ');
        item.appendChild(small);
      }

      item.addEventListener('click', function () {
        selectedGeo = {
          id: 'city_' + r.latitude + '_' + r.longitude,
          name: r.name + (r.country ? ', ' + r.country : ''),
          lat: r.latitude,
          lon: r.longitude,
          isGeo: false
        };
        cityInput.value = r.name;
        hideDropdown();
      });

      dropdown.appendChild(item);
    });
  }

  function hideDropdown() {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
  }

  function showError(msg) {
    inputError.textContent = msg;
    inputError.classList.remove('hidden');
    setTimeout(function () { inputError.classList.add('hidden'); }, 4000);
  }

  // ---- Geolocation ----

  function requestGeo() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = Math.round(pos.coords.latitude * 100) / 100;
        var lon = Math.round(pos.coords.longitude * 100) / 100;

        fetch(GEO_API + '?latitude=' + lat + '&longitude=' + lon + '&count=1&language=ru')
          .then(function (r) { return r.json(); })
          .catch(function () { return null; })
          .then(function (data) {
            var name = 'Текущее местоположение';
            if (data && data.results && data.results.length > 0) {
              name = data.results[0].name;
            }

            var geoCity = {
              id: 'geo_current',
              name: name,
              lat: lat,
              lon: lon,
              isGeo: true
            };

            var hasGeo = cities.some(function (c) { return c.isGeo; });
            if (!hasGeo) {
              cities.unshift(geoCity);
              saveCities();
            } else {
              cities = cities.map(function (c) {
                return c.isGeo ? geoCity : c;
              });
              saveCities();
            }

            refreshAll();
          });
      },
      function () {
        if (cities.length === 0) {
          showError('Геолокация отклонена. Добавьте город вручную.');
        }
      }
    );
  }

  // ---- Events ----

  cityInput.addEventListener('input', function () {
    selectedGeo = null;
    clearTimeout(searchTimeout);
    var val = cityInput.value.trim();
    searchTimeout = setTimeout(function () { searchCities(val); }, 300);
  });

  cityInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      btnAdd.click();
    }
  });

  document.addEventListener('click', function (e) {
    if (!dropdown.contains(e.target) && e.target !== cityInput) {
      hideDropdown();
    }
  });

  btnAdd.addEventListener('click', function () {
    hideDropdown();
    inputError.classList.add('hidden');
    var val = cityInput.value.trim();

    if (!val) {
      showError('Введите название города');
      return;
    }

    if (selectedGeo) {
      addCity(selectedGeo);
      cityInput.value = '';
      selectedGeo = null;
      return;
    }

    fetch(GEO_API + '?name=' + encodeURIComponent(val) + '&count=1&language=ru')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.results || data.results.length === 0) {
          showError('Город "' + val + '" не найден. Выберите из списка.');
          return;
        }
        var r = data.results[0];
        addCity({
          id: 'city_' + r.latitude + '_' + r.longitude,
          name: r.name + (r.country ? ', ' + r.country : ''),
          lat: r.latitude,
          lon: r.longitude,
          isGeo: false
        });
        cityInput.value = '';
      })
      .catch(function () {
        showError('Ошибка поиска. Проверьте интернет.');
      });
  });

  btnRefresh.addEventListener('click', function () {
    refreshAll();
  });

  // ---- Init ----

  cities = loadCities();

  if (cities.length > 0) {
    refreshAll();
    var hasGeo = cities.some(function (c) { return c.isGeo; });
    if (hasGeo) requestGeo();
  } else {
    requestGeo();
  }

})();
