import pandas as pd
import locale

# 한국어 로케일 설정 (정렬용)
try:
    locale.setlocale(locale.LC_ALL, "ko_KR.UTF-8")
except:
    try:
        locale.setlocale(locale.LC_ALL, "Korean_Korea.949")
    except:
        print("한국어 로케일 설정 실패. 기본 정렬을 사용합니다.")


def sort_csv_by_alcohol_name(input_file, output_file=None):
    """
    CSV 파일을 alcoholName 컬럼 기준으로 가나다순 정렬

    Args:
        input_file (str): 입력 CSV 파일 경로
        output_file (str): 출력 CSV 파일 경로 (기본값: 입력파일명_sorted.csv)
    """
    try:
        # CSV 파일 읽기
        df = pd.read_csv(input_file)

        # alcoholName 컬럼 확인
        if "alcoholName" not in df.columns:
            print("Error: 'alcoholName' 컬럼을 찾을 수 없습니다.")
            print("사용 가능한 컬럼:", list(df.columns))
            return

        # 가나다순 정렬
        df_sorted = df.sort_values(by="alcoholName", key=lambda x: x.str.lower())

        # index 컬럼이 있으면 0부터 다시 부여
        if "index" in df_sorted.columns:
            df_sorted["index"] = range(len(df_sorted))

        # 인덱스 리셋 (pandas 내부 인덱스도 0부터 다시)
        df_sorted.reset_index(drop=True, inplace=True)

        # 출력 파일명 설정
        if output_file is None:
            output_file = input_file.replace(".csv", "_sorted.csv")

        # 정렬된 데이터 저장
        df_sorted.to_csv(output_file, index=False, encoding="utf-8-sig")

        print(f"✅ 정렬 완료!")
        print(f"📁 입력 파일: {input_file}")
        print(f"📁 출력 파일: {output_file}")
        print(f"📊 총 {len(df_sorted)}개 행이 정렬되었습니다.")

        # 정렬된 alcoholName 리스트 미리보기
        print("\n🍶 정렬된 술 이름 (상위 10개):")
        for i, name in enumerate(df_sorted["alcoholName"].head(10)):
            print(f"  {i+1}. {name}")

        if len(df_sorted) > 10:
            print(f"  ... 외 {len(df_sorted)-10}개")

    except FileNotFoundError:
        print(f"Error: '{input_file}' 파일을 찾을 수 없습니다.")
    except Exception as e:
        print(f"Error: {e}")


# 사용 예제
if __name__ == "__main__":
    # 파일 경로 설정
    input_csv = (
        "integrated_traditional_liquor_sorted.csv"  # 여기에 실제 CSV 파일 경로 입력
    )

    # CSV 정렬 실행
    sort_csv_by_alcohol_name(input_csv)

    # 특정 출력 파일명 지정하고 싶다면:
    # sort_csv_by_alcohol_name(input_csv, "my_sorted_alcohol.csv")
