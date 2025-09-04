# merged csv를 가나다순으로 정렬하고 새로 index 부여하는 코드

import pandas as pd

df = pd.read_csv("merged_traditional_alcohol2.csv", dtype=str)

df = df.drop(columns=[col for col in df.columns if 'Unnamed' in col or col == 'index'])

df = df.sort_values(by="제품명", key=lambda x: x.str.normalize("NFC"))

df = df.reset_index(drop=True)
df['index'] = df.index

cols = ['index'] + [col for col in df.columns if col != 'index']
df = df[cols]

df.to_csv("sorted_traditional_alcohol2.csv", index=False)