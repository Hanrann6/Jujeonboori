import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Jimp = require("jimp");

export async function preprocessImage(inputPath, outputPath) {
  const image = await new Promise((resolve, reject) => {
    Jimp.read(inputPath, (err, image) => {
      if (err) reject(err);
      else resolve(image);
    });
  });

  await image
    .resize(800, Jimp.AUTO) // 크기 고정
    .greyscale() // 흑백
    .contrast(1) // 최대 대비
    .brightness(0.1) // 약간 밝게
    .normalize() // 히스토그램 정규화
    .posterize(5) // 색상 수 줄이기 (노이즈 제거)
    .writeAsync(outputPath);
}
