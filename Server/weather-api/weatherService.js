import axios from 'axios';
import { convertLatLngToGrid } from './gridConverter.js';

const SERVICE_KEY = process.env.WEATHER_API_SERVICE_KEY;
const API_BASE_URL = process.env.WEATHER_API_BASE_URL;

function getBaseDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    let baseDate = `${year}${month}${day}`;

    let currentHour = now.getHours();
    let currentMinute = now.getMinutes();

    let baseTimeHour;
    let targetDate = new Date(now);

    // 현재 분이 40분 미만이면 이전 시간대의 30분 발표 데이터 사용 (예: 17:00 ~ 17:39 -> 16:30 데이터)
    // 현재 분이 40분 이상이면 현재 시간대의 30분 발표 데이터 사용 (예: 17:40 ~ 17:59 -> 17:30 데이터)
    if (currentMinute < 40) {
        baseTimeHour = currentHour - 1;
        if (baseTimeHour < 0) {
            baseTimeHour = 23;
            targetDate.setDate(targetDate.getDate() - 1);
        }
    } else {
        baseTimeHour = currentHour;
    }
    
    const baseTime = String(baseTimeHour).padStart(2, '0') + '30';

    baseDate = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}${String(targetDate.getDate()).padStart(2, '0')}`;

    return { base_date: baseDate, base_time: baseTime };
}

export async function getWeatherData(lat, lon) {
    const gridCoords = convertLatLngToGrid(lat, lon);

    if (!gridCoords) {
        throw new Error('위도/경도를 격자 좌표로 변환할 수 없습니다.');
    }

    const { nx, ny } = gridCoords;
    const { base_date, base_time } = getBaseDateTime();

    let queryParams = `serviceKey=${SERVICE_KEY}`;
    queryParams += `&pageNo=1`;
    queryParams += `&numOfRows=1000`;
    queryParams += `&dataType=JSON`;
    queryParams += `&base_date=${base_date}`;
    queryParams += `&base_time=${base_time}`;
    queryParams += `&nx=${nx}`;
    queryParams += `&ny=${ny}`;

    console.log(`[WeatherService] 기상청 API 호출: ${API_BASE_URL}?${queryParams}`);

    try {
        const response = await axios.get(`${API_BASE_URL}?${queryParams}`);
        const apiData = response.data;

        if (apiData && apiData.response && apiData.response.header && apiData.response.header.resultCode === '00') {
            const items = apiData.response.body.items.item;
            const parsedWeather = {};

            items.forEach(item => {
                switch (item.category) {
                    case 'T1H': parsedWeather.temperature = parseFloat(item.obsrValue); break;
                    case 'RN1': parsedWeather.rainAmount = parseFloat(item.obsrValue); break;
                    case 'REH': parsedWeather.humidity = parseFloat(item.obsrValue); break;
                    case 'PTY': parsedWeather.precipitationType = item.obsrValue; break;
                    case 'SKY': parsedWeather.skyStatus = item.obsrValue; break;
                    case 'WSD': parsedWeather.windSpeed = parseFloat(item.obsrValue); break;
                    case 'VEC': parsedWeather.windDirection = parseFloat(item.obsrValue); break;
                }
            });
            
            parsedWeather.precipitationTypeDescription = getPrecipitationTypeDescription(parsedWeather.precipitationType);
            parsedWeather.skyStatusDescription = getSkyStatusDescription(parsedWeather.skyStatus);

            return {
                location: { latitude: lat, longitude: lon, nx, ny },
                baseTime: { base_date, base_time },
                weather: parsedWeather
            };

        } else {
            const errorMsg = apiData.response?.header?.resultMsg || '알 수 없는 기상청 API 오류 발생';
            console.error('[WeatherService] 기상청 API 응답 오류:', apiData);
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error('[WeatherService] 날씨 데이터 호출 중 오류:', error.message);
        if (error.response) {
            console.error('응답 데이터:', error.response.data);
            console.error('응답 상태:', error.response.status);
        }
        throw new Error('날씨 정보를 가져오는 데 실패했습니다.');
    }
}

function getPrecipitationTypeDescription(code) {
    switch (code) {
        case '0': return '없음'; case '1': return '비'; case '2': return '비/눈';
        case '3': return '눈'; case '5': return '빗방울'; case '6': return '빗방울눈날림';
        case '7': return '눈날림'; default: return '알 수 없음';
    }
}

function getSkyStatusDescription(code) {
    switch (code) {
        case '1': return '맑음'; case '3': return '구름많음'; case '4': return '흐림';
        default: return '알 수 없음';
    }
}