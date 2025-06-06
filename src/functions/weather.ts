/**
 * Functions for fetching weather data from various APIs.
 */

import * as T from '../types.ts';
import { log } from '../logger.ts';

type Params = Record<string, any>;

interface WeatherApiResponse {
  location: string;
  temperature: number;
  condition: string;
  humidity?: number;
  windSpeed?: number;
  time: string;
}

// Utility for building URL with query parameters
function buildUrl(baseUrl: string, params: Params): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString());
    }
  });
  return url.toString();
}

// A helper that wraps the fetch API with timeout handling
async function fetchWithTimeout(url: string, timeout = 5000): Promise<Params> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    // Maybe pass extra options in the future?
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) {
      throw new Error(`HTTP status ${resp.status}:${resp.statusText}!`);
    }
    const data = await resp.json();
    if (data.error) {
      throw new Error(`Response error: ${data.error.message}!`);
    }
    return data;
  } catch (error) {
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function dateWithTimezone(dt: Date, timeZone: string): string {
  return dt.toLocaleString(undefined, {
    timeZone,
    hour12: false,
    timeZoneName: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// -----------------------------------------------------------------------
// Function for WeatherAPI.com
// Documentation: https://www.weatherapi.com/docs
// -----------------------------------------------------------------------
export async function _fetchWeatherAPI(
  apiKey: string,
  location: string,
  params: Params,
  timeout: number
): Promise<WeatherApiResponse> {
  if (!apiKey) {
    throw new Error('apiKey=.. or API_KEY=.. is required for WeatherAPI');
  }
  const url = buildUrl('https://api.weatherapi.com/v1/current.json', {
    key: apiKey,
    q: location,
    aqi: 'no',
    // ...params,
  });
  log.debug(`Weather data from WeatherAPI: ${url}`);
  const data = await fetchWithTimeout(url, timeout);
  return {
    location: data.location.name,
    temperature: data.current.temp_c,
    condition: data.current.condition.text.toLowerCase(),
    humidity: data.current.humidity,
    windSpeed: data.current.wind_kph,
    time: dateWithTimezone(new Date(data.current.last_updated), data.location.tz_id),
  };
}

// -----------------------------------------------------------------------
// Function for OpenWeatherMap.org
// Documentation: https://openweathermap.org/api
// -----------------------------------------------------------------------
export async function _fetchOpenWeatherMap(
  apiKey: string,
  location: string,
  params: Params,
  timeout: number
): Promise<WeatherApiResponse> {
  if (!apiKey) {
    throw new Error('apiKey=.. or API_KEY=.. is required for OpenWeatherMap');
  }
  const url = buildUrl('https://api.openweathermap.org/data/2.5/weather', {
    appid: apiKey,
    q: location,
    units: 'metric',
    // ...params,
  });
  log.debug(`Weather data from OpenWeatherMap: ${url}`);
  const data = await fetchWithTimeout(url, timeout);
  const offsetHours = data.timezone / 3600;
  const timeZone = Intl.DateTimeFormat(undefined, { timeZoneName: 'long' })
    .resolvedOptions()
    .timeZone.replace('Coordinated Universal Time', `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`);
  return {
    location: data.name,
    temperature: data.main.temp,
    condition: data.weather[0].description,
    humidity: data.main.humidity,
    windSpeed: data.wind.speed,
    time: dateWithTimezone(new Date(data.dt * 1000), timeZone),
  };
}

// -----------------------------------------------------------------------
// Function for Open-Meteo.com
// Documentation: https://open-meteo.com/en/docs
//
// IMPORTANT: Open-Meteo does not require an API key. In this case the "location"
// parameter must be provided in "latitude,longitude" format OR passed in via extraParams.
// -----------------------------------------------------------------------
export async function _fetchOpenMeteo(
  _api: any, // here for consistency
  location: string,
  params: Params = {},
  timeout: number
): Promise<WeatherApiResponse> {
  // Open-Meteo requires latitude and longitude
  let latitude: string = '';
  let longitude: string = '';

  if (params.latitude && params.longitude) {
    // Use latitude and longitude from extra params
    latitude = String(params.latitude);
    longitude = String(params.longitude);
    delete params.latitude;
    delete params.longitude;
  } else if (location && location.includes(',')) {
    // Check if location is in "lat,long" format
    const parts = location.split(',');
    if (parts.length !== 2) {
      throw new Error('Latitude and longitude must be in "lat,long" format!');
    }
    location = '';
    latitude = parts[0].trim();
    longitude = parts[1].trim();
  } else if (params.location) {
    // Open-Meteo requires lat/lon, so we need to geocode the location first
    const geoParams = new URLSearchParams({
      name: params.location,
      count: '1',
    });
    // countryCode: ISO-3166-1 alpha2 country code
    if (params.countryCode) {
      geoParams.append('country', params.countryCode as string);
    }
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?${geoParams.toString()}`;
    log.debug(`Geocoding URL for Open-Meteo: ${geocodeUrl}`);
    const data = await fetchWithTimeout(geocodeUrl);
    log.debug('Geocoding result for Open-Meteo:', data);
    if (!data.results || data.results.length === 0) {
      throw new Error('Weather location not found');
    }
    location = data.results[0].name;
    latitude = data.results[0].latitude;
    longitude = data.results[0].longitude;
    delete params.location;
    delete params.latitude;
    delete params.longitude;
  }
  if (!latitude || !longitude) {
    throw new Error('Latitude and longitude are required for Open-Meteo API');
  }

  const url = buildUrl('https://api.open-meteo.com/v1/forecast', {
    latitude,
    longitude,
    current_weather: 'true',
    // ...params,
  });
  log.debug(`Weather data from Open-Meteo: ${url}`);
  const data = await fetchWithTimeout(`${url}`, timeout);
  // Map Open-Meteo weather code to condition (simplified)
  const weatherCodes: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    61: 'Rain',
    80: 'Rain showers',
    95: 'Thunderstorm',
  };
  const condition = weatherCodes[data.current_weather.weathercode] || 'Unknown';
  return {
    location,
    temperature: data.current_weather.temperature,
    condition,
    windSpeed: data.current_weather.windspeed,
    time: dateWithTimezone(new Date(data.current_weather.time), 'GMT'),
  };
}

export async function weather(t: string, args: Record<string, any>, meta: T.EvalMetaFull): Promise<any> {
  // Allow props like keyName=MY_API_KEY to be used
  if (args.keyName && process.env[args.keyName]) {
    args.apiKey = process.env[args.keyName];
    delete args.keyName;
  } else if (args.keyName) {
    log.warn(`Weather API: keyName=${args.keyName} is set, but no ENV variable found!`);
    return;
  }
  if (args.lat || args.lati) {
    args.latitude = args.lat || args.lati;
    delete args.lat;
    delete args.lati;
  }
  if (args.lon || args.long) {
    args.longitude = args.lon || args.long;
    delete args.lon;
    delete args.long;
  }
  if (!args.location && !args.latitude && !args.longitude) {
    log.warn('Weather API: No location or latitude/ longitude provided!');
    return;
  }
  let timeout = 5000;
  if (args.timeout) {
    const parsed = parseInt(args.timeout, 10);
    if (parsed > 0 && !isNaN(parsed)) {
      timeout = parsed;
    } else {
      log.warn(`Weather API: Invalid timeout value=${args.timeout}!`);
    }
    delete args.timeout;
  }
  const provider = (args.provider || args.service || 'OpenMeteo').toLowerCase();
  delete args.provider;
  delete args.service;
  delete args.innerText;

  try {
    let result: WeatherApiResponse | undefined;
    switch (provider) {
      case 'weatherapi':
        result = await _fetchWeatherAPI(args.apiKey, args.location, args, timeout);
        break;
      case 'openweathermap':
        result = await _fetchOpenWeatherMap(args.apiKey, args.location, args, timeout);
        break;
      case 'openmeteo':
        result = await _fetchOpenMeteo(null, args.location, args, timeout);
        break;
      default:
        log.warn(`Unknown weather provider: ${provider}!`);
        return;
    }
    if (result) {
      const text =
        `Weather in ${result.location}:\n` +
        `Last Update: ${result.time}\n` +
        `Temperature: ${result.temperature}°C\n` +
        `Condition: ${result.condition}\n` +
        (result.humidity ? `Humidity: ${result.humidity}%\n` : '') +
        (result.windSpeed ? `Wind Speed: ${result.windSpeed} km/h\n` : '');
      if (meta.node.double) return `\n${text.trim()}\n`;
      return text.trim();
    }
  } catch (error) {
    log.warn(`Weather API error: ${error.message}`);
  }
}
