# 네이버 음식점 정보 수집

- 대한민국 행정구역 경계 좌표 확인
- - [vuski admdongkor 깃허브](https://github.com/vuski/admdongkor/tree/master/ver20250401)에서 geojson 파일 다운로드
- - union_geojson.py 파일 안 union 함수를 실행하여 다운받은 geojson 파일의 모든 폴리곤 병합하여 merged.geojson 생성 (기존 원본은 파일크기가 커서 삭제)
- - 병합이 잘 되었는지는 [geojson.io](https://geojson.io/) 사이트에 merged.geojson 파일을 올려 확인 가능

- 좌표가 대한민국 행정구역 경계 안에 포함되는지 확인
- - 경도, 위도를 0.001 단위(약 100m) 로 변화하며, 해당 좌표가 merged.geojson 폴리곤 안에 포함되는지 확인
- - union_geojson.py 안의 find 함수로 포함여부 확인해가며, 포함되는 좌표는 output.csv 파일에 삽입 (output.csv 파일크기가 커서 삭제)

