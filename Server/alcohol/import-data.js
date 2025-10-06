import mongoose from 'mongoose';
import fs from 'fs';
import Papa from 'papaparse';
import 'dotenv/config';

import Alcohol from './model/alcohol.model.js';

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB 연결 완료'))
    .catch(err => console.error('연결 실패:', err));

const csvFile = fs.readFileSync('./Server/alcohol_crawl/real_final.csv', 'utf8');

Papa.parse(csvFile, {
    header: true,
    complete: async (results) => {
        try {
            // 기존 데이터 삭제
            await Alcohol.deleteMany({});
            // 새 데이터 삽입
            await Alcohol.insertMany(results.data);
            
            console.log(`${results.data.length}개 데이터 import 완료`);
            process.exit(0);
        } catch (error) {
            console.error('Import 실패:', error);
            process.exit(1);
        }
    }
});