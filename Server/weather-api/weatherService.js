import axios from 'axios';
import { convertLatLngToGrid } from './gridConverter.js';

const SERVICE_KEY = process.env.WEATHER_API_SERVICE_KEY;
const API_BASE_URL = process.env.WEATHER_API_BASE_URL;

function getBaseDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    let currentHour = now.getHours();
    let currentMinute = now.getMinutes();

    let baseTimeHour = currentHour;
    const baseTimeMinute = 30; // 초단기예보는 30분 단위로 발표

    let targetDate = new Date(now);

    // 예보는 매시 30분 발표 & 매시 45분부터 호출 가능
    // 현재 분이 45분 미만이면 이전 시간대의 30분 발표 데이터 사용
    if (currentMinute < 45) {
        baseTimeHour = currentHour - 1;
        if (baseTimeHour < 0) {
            baseTimeHour = 23;
            targetDate.setDate(targetDate.getDate() - 1);
        }
    }
    
    const baseDate = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}${String(targetDate.getDate()).padStart(2, '0')}`;
    const baseTime = String(baseTimeHour).padStart(2, '0') + String(baseTimeMinute);

    return { base_date: baseDate, base_time: baseTime };
}

export async function getWeatherData(lat, lon) {
    // 1. 위도/경도를 기상청 격자 좌표(nx, ny)로 변환
    const gridCoords = convertLatLngToGrid(lat, lon);

    if (!gridCoords) {
        throw new Error('위도/경도를 격자 좌표로 변환할 수 없습니다.');
    }

    const { nx, ny } = gridCoords;

    // 2. 기상청 API 호출에 필요한 발표 일자(base_date)와 발표 시각(base_time) 계산
    const { base_date, base_time } = getBaseDateTime();

    // 3. API 호출을 위한 쿼리 파라미터 구성
    const queryParams = new URLSearchParams({
        pageNo: '1',
        numOfRows: '1000', 
        dataType: 'JSON',
        base_date: base_date,
        base_time: base_time,
        nx: nx,
        ny: ny
    }).toString();

    //const apiUrl = `${API_BASE_URL}?serviceKey=${SERVICE_KEY}&${queryParams}`; //디코딩 키 사용 시
    const apiUrl = `${API_BASE_URL}?serviceKey=${decodeURIComponent(
      SERVICE_KEY
    )}&${queryParams}`;
    console.log(`기상청 API 호출: ${apiUrl}`);

    try {
        // 4. 기상청 API에 HTTP GET 요청 보내기
        const response = await axios.get(apiUrl);
        const apiData = response.data;

        // 5. API 응답의 결과 코드 확인
        if (apiData && apiData.response && apiData.response.header && apiData.response.header.resultCode === '00') {
            const items = apiData.response.body.items.item;
            const parsedWeather = {};

            // 6. 현재 시점에 가장 가까운 예측 데이터(fcstDate, fcstTime)를 선택하여 파싱
            const now = new Date();
            const targetFcstHour = now.getHours();
            const targetFcstTime = String(targetFcstHour).padStart(2, '0') + '00';
            const targetFcstDate = base_date;

            // 목표 예측 시간의 데이터 파싱
            items.forEach(item => {
                if (item.fcstDate === targetFcstDate && item.fcstTime === targetFcstTime) {
                    switch (item.category) {
                        case 'T1H': parsedWeather.temperature = parseFloat(item.fcstValue); break;
                        case 'RN1': 
                            parsedWeather.rainAmount = item.fcstValue === '강수없음' ? 0 : parseFloat(item.fcstValue); 
                            break;
                        case 'REH': parsedWeather.humidity = parseFloat(item.fcstValue); break;
                        case 'PTY': parsedWeather.precipitationType = item.fcstValue; break;
                        case 'SKY': parsedWeather.skyStatus = item.fcstValue; break;
                        case 'WSD': parsedWeather.windSpeed = parseFloat(item.fcstValue); break;
                        case 'VEC': parsedWeather.windDirection = parseFloat(item.fcstValue); break;
                    }
                }
            });

            // 7. 파싱된 코드값을 설명으로 변환
            parsedWeather.pitationTypeDescription = getPrecipitationTypeDescription(parsedWeather.precipitationType);
            parsedWeather.skyStatusDescription = getSkyStatusDescription(parsedWeather.skyStatus);

            // 8. 결과 반환
            return {
                location: { latitude: lat, longitude: lon, nx, ny },
                baseTime: { base_date, base_time },
                weather: parsedWeather
            };

        } else {
            const errorMsg = apiData.response?.header?.resultMsg || '알 수 없는 기상청 API 오류 발생';
            console.error('기상청 API 응답 오류:', apiData);
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error('날씨 데이터 호출 중 오류:', error.message);
        if (error.response) {
            console.error('응답 데이터:', error.response.data);
            console.error('응답 상태:', error.response.status);
        }
        throw new Error('날씨 정보를 가져오는 데 실패했습니다.');
    }
}

function getPrecipitationTypeDescription(code) {
    switch (code) {
        case '0': return '없음';
        case '1': return '비';
        case '2': return '비/눈';
        case '3': return '눈';
        case '5': return '빗방울';
        case '6': return '빗방울눈날림';
        case '7': return '눈날림';
        default: return '알 수 없음';
    }
}

function getSkyStatusDescription(code) {
    switch (code) {
        case '1': return '맑음';
        case '3': return '구름많음';
        case '4': return '흐림';
        default: return '알 수 없음';
    }
}