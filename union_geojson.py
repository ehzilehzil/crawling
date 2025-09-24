# pip install geopandas

import os
import geopandas as gpd
from shapely.geometry import Point


def union():
    gdf = gpd.read_file("HangJeongDong_ver20250401.geojson")
    merged = gdf.unary_union
    merged_gdf = gpd.GeoDataFrame(geometry=[merged], crs=gdf.crs)
    merged_gdf.to_file("merged.geojson", driver="GeoJSON")


def find():
    gdf = gpd.read_file("merged.geojson")
    filename = "output.csv"

    if not os.path.exists(filename):
        with open(filename, "w", encoding="utf-8") as f:
            f.write(f"lon,lat\n")

    # 대한민국 전국을 커버하는 위도 경도 범위 copilot 발췌
    # 경도: 124.5 ~ 132.0
    # 위도: 32.9 ~ 38.7

    for x in range(124500, 132001):
        for y in range(32900, 38701):
            lon, lat = x / 1_000, y / 1_000
            point = Point(lon, lat)

            matched = gdf[gdf.contains(point)]
            if not matched.empty:
                with open(filename, "a", encoding="utf-8") as f:
                    f.write(f"{lon},{lat}\n")

            print(point)


if __name__ == "__main__":
    # union()
    find()