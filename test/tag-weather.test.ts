import { afterEach, expect, mock, test } from 'bun:test';
import * as w from '../src/functions/weather.ts';

const mockFetch = mock();
global.fetch = mockFetch as any;

afterEach(() => {
  mockFetch.mockReset();
});

test('WeatherAPI.com should return correct data', async () => {
  const location = 'Killarney';
  mockFetch.mockReturnValueOnce(
    Promise.resolve(
      new Response(
        `{"location":{"name":"${location}","region":"Kerry","country":"Ireland","lat":52.05,"lon":-9.5167,"tz_id":"Europe/Dublin","localtime_epoch":1749156942,"localtime":"2025-06-05 21:55"}, "current":{"last_updated_epoch":1749156300,"last_updated":"2025-06-05 21:45","temp_c":10.8,"temp_f":51.5,"is_day":1,"condition":{"text":"Patchy rain nearby","icon":"//cdn.weatherapi.com/weather/64x64/day/176.png","code":1063},"wind_mph":15.0,"wind_kph":24.1,"wind_degree":306,"wind_dir":"NW","pressure_mb":1005.0,"pressure_in":29.69,"precip_mm":0.04,"precip_in":0.0,"humidity":74,"cloud":57,"feelslike_c":8.1,"feelslike_f":46.6,"windchill_c":8.1,"windchill_f":46.6,"heatindex_c":10.8,"heatindex_f":51.5,"dewpoint_c":6.4,"dewpoint_f":43.4,"vis_km":10.0,"vis_miles":6.0,"uv":0.1,"gust_mph":22.2,"gust_kph":35.7}}`
      )
    )
  );
  const data = await w._fetchWeatherAPI('secret-key', location, {}, 1000);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(data).toEqual({
    location,
    temperature: 10.8,
    condition: 'Patchy rain nearby',
    humidity: 74,
    windSpeed: 24.1,
    time: '06/05/2025, 22:45 GMT+1',
  });
});

test('OpenWeatherMap.org should return correct data', async () => {
  const location = 'Killarney';
  mockFetch.mockReturnValueOnce(
    Promise.resolve(
      new Response(
        `{"coord":{"lon":-9.5167,"lat":52.05}, "weather":[{"id":803,"main":"Clouds","description":"broken clouds","icon":"04d"}],"base":"stations", "main":{"temp":11.06,"feels_like":10.55,"temp_min":11.06,"temp_max":11.06,"pressure":1005,"humidity":89,"sea_level":1005,"grnd_level":982},"visibility":10000,"wind":{"speed":2.3,"deg":296,"gust":3.44},"clouds":{"all":65},"dt":1749156649, "sys":{"country":"IE","sunrise":1749097257,"sunset":1749156752},"timezone":3600,"id":2963370,"name":"${location}","cod":200}`
      )
    )
  );
  const data = await w._fetchOpenWeatherMap('secret-key', location, {}, 1000);
  expect(data).toEqual({
    location,
    temperature: 11.06,
    condition: 'broken clouds',
    humidity: 89,
    windSpeed: 2.3,
    time: '06/05/2025, 20:50 UTC',
  });
});

test('Open-Meteo.com should return correct data', async () => {
  mockFetch.mockReturnValueOnce(
    Promise.resolve(
      new Response(
        '{"latitude":52.050514,"longitude":-9.511337,"generationtime_ms":0.11622905731201172,"utc_offset_seconds":0,"timezone":"GMT","timezone_abbreviation":"GMT","elevation":25.0,"current_weather_units":{"time":"iso8601","interval":"seconds","temperature":"°C","windspeed":"km/h","winddirection":"°","is_day":"","weathercode":"wmo code"},"current_weather":{"time":"2025-06-05T21:00","interval":900,"temperature":11.1,"windspeed":9.7,"winddirection":290,"is_day":0,"weathercode":3}}'
      )
    )
  );
  const data = await w._fetchOpenMeteo(
    '',
    '',
    {
      latitude: 52.050514,
      longitude: -9.511337,
    },
    1000
  );
  expect(data).toEqual({
    condition: 'Overcast',
    location: '',
    temperature: 11.1,
    windSpeed: 9.7,
    time: '06/05/2025, 21:00 UTC',
  });
});

test('weather tag with OpenWeatherMap.org', async () => {
  const location = 'Carrick On Shannon';
  mockFetch.mockReturnValueOnce(
    Promise.resolve(
      new Response(
        `{"coord":{"lon":-8.09,"lat":53.9469}, "weather":[{"id":804,"main":"Clouds","description":"overcast clouds","icon":"04d"}],"base":"stations", "main":{"temp":13.91,"feels_like":13.16,"temp_min":13.91,"temp_max":13.91,"pressure":1001,"humidity":69,"sea_level":1001,"grnd_level":992},"visibility":10000,"wind":{"speed":3.78,"deg":227,"gust":7.9},"clouds":{"all":88},"dt":1748972700, "sys":{"country":"IE","sunrise":1749009899,"sunset":1749070605},"timezone":3600,"id":2965727,"name":"${location}","cod":200}`
      )
    )
  );
  const data = await w.weather('', { location, apiKey: 'x', provider: 'OpenWeatherMap' }, { node: {} });
  expect(data).toBe(
    'Weather in Carrick On Shannon:\nLast Update: 06/03/2025, 17:45 UTC\nTemperature: 13.91°C\nCondition: overcast clouds\nHumidity: 69%\nWind Speed: 3.78 km/h'
  );
});
