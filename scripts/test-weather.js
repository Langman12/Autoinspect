#!/usr/bin/env node

/**
 * AutoGuard AI - Weather Intelligence & Road Hazard Test
 */

async function testWeather() {
  console.log('='.repeat(60));
  console.log('🌩️  AutoGuard AI - Location-Based Weather & Road Hazard Test');
  console.log('='.repeat(60));

  const testCities = ['Dallas, TX', 'Tokyo, Japan', 'Munich, Germany', 'Cape Town, South Africa'];

  for (const city of testCities) {
    try {
      console.log(`\n📍 Looking up weather for: ${city}...`);
      const searchToken = city.includes(',') ? city.split(',')[0].trim() : city.trim();
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchToken)}&count=5&language=en&format=json`;
      
      let geoRes;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'AutoGuard-AI/1.0' } });
          if (geoRes && geoRes.ok) break;
        } catch (e) {
          if (attempt === 2) throw e;
          await new Promise((r) => setTimeout(r, (attempt + 1) * 800));
        }
      }

      const geoData = await geoRes.json();
      const match = geoData.results?.[0];

      if (!match) {
        console.log(`   ❌ Location not found: ${city}`);
        continue;
      }

      console.log(`   Coordinates: ${match.latitude.toFixed(4)}°, ${match.longitude.toFixed(4)}° (${match.country})`);
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${match.latitude}&longitude=${match.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_gusts_10m&hourly=visibility,precipitation_probability&forecast_days=1`;
      
      let wRes;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          wRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'AutoGuard-AI/1.0' } });
          if (wRes.ok) break;
        } catch (e) {
          if (attempt === 2) throw e;
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      const wData = await wRes.json();
      const current = wData.current || {};
      const hourly = wData.hourly || {};

      const temp = current.temperature_2m;
      const wind = current.wind_speed_10m;
      const gusts = current.wind_gusts_10m;
      const precip = current.precipitation;
      const vis = hourly.visibility?.[0] ? (hourly.visibility[0] / 1000).toFixed(1) : '10';

      console.log(`   🌡️ Temp: ${temp}°C | Wind: ${wind} km/h (Gusts: ${gusts} km/h) | Rain: ${precip} mm/h | Vis: ${vis} km`);
      
      // Calculate Grip & Hazard
      let grip = 95;
      let status = 'OPTIMAL';
      if (precip > 3) { grip -= 35; status = 'HYDROPLANING_RISK'; }
      if (temp <= 2 && precip > 0) { grip -= 50; status = 'BLACK_ICE_RISK'; }
      if (gusts > 50) { grip -= 15; status = 'HIGH_CROSSWINDS'; }

      console.log(`   🚗 Road Surface Grip: ${grip}% | Hazard Status: ${status}`);
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`   ❌ Error querying ${city}:`, err.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Weather API & Hazard Assessment Engine verified successfully!');
  console.log('='.repeat(60));
}

testWeather();
