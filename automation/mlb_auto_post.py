import requests
from datetime import datetime
import os
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO

# =========================
# MLB API 설정
# =========================

MLB_API = "https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={date}&hydrate=linescore,boxscore"

LOGO_URL = "https://www.mlbstatic.com/team-logos/{team_id}.svg"


# =========================
# 오늘 경기 데이터 수집
# =========================

def get_games():
    today = datetime.utcnow().strftime("%Y-%m-%d")
    url = MLB_API.format(date=today)

    res = requests.get(url)
    data = res.json()

    games = []

    for date in data.get("dates", []):
        for g in date.get("games", []):

            status = g["status"]["detailedState"]

            # 경기 종료된 경기만
            if status != "Final":
                continue

            game_data = {
                "home": g["teams"]["home"]["team"]["name"],
                "away": g["teams"]["away"]["team"]["name"],
                "home_score": g["teams"]["home"]["score"],
                "away_score": g["teams"]["away"]["score"],
                "home_id": g["teams"]["home"]["team"]["id"],
                "away_id": g["teams"]["away"]["team"]["id"],
                "boxscore": g.get("boxscore", {}),
            }

            games.append(game_data)

    return games


# =========================
# 팀 로고 다운로드
# =========================

def download_logo(team_id):
    try:
        url = f"https://www.mlbstatic.com/team-logos/{team_id}.png"
        res = requests.get(url, timeout=10)
        return Image.open(BytesIO(res.content)).convert("RGBA")
    except:
        return None


# =========================
# ESPN 스타일 썸네일 생성
# =========================

def create_thumbnail(game, date_str):

    width, height = 1280, 720
    img = Image.new("RGB", (width, height), "#0b0f14")
    draw = ImageDraw.Draw(img)

    # 상단 ESPN 스타일 바
    draw.rectangle((0, 0, width, 80), fill="#e10600")

    try:
        font_big = ImageFont.truetype("DejaVuSans-Bold.ttf", 140)
        font_mid = ImageFont.truetype("DejaVuSans-Bold.ttf", 60)
        font_small = ImageFont.truetype("DejaVuSans-Bold.ttf", 36)
    except:
        font_big = font_mid = font_small = ImageFont.load_default()

    away_logo = download_logo(game["away_id"])
    home_logo = download_logo(game["home_id"])

    if away_logo:
        away_logo.thumbnail((220, 220))
        img.paste(away_logo, (140, 240), away_logo)

    if home_logo:
        home_logo.thumbnail((220, 220))
        img.paste(home_logo, (920, 240), home_logo)

    # 팀명
    draw.text((260, 260), game["away"].upper(), font=font_mid, fill="white")
    draw.text((720, 260), game["home"].upper(), font=font_mid, fill="white")

    # 점수 강조
    score_text = f'{game["away_score"]} : {game["home_score"]}'
    draw.text((420, 360), score_text, font=font_big, fill="#ffd700")

    draw.text((20, 20), "MLB SPRING TRAINING", font=font_small, fill="white")
    draw.text((950, 20), date_str, font=font_small, fill="white")

    path = f"assets/images/{date_str}-{game['away']}-vs-{game['home']}.png"
    os.makedirs("assets/images", exist_ok=True)
    img.save(path, quality=95)

    return path


# =========================
# MVP 자동 계산
# =========================

def calculate_mvp(game):

    players = []

    for team in game.get("boxscore", {}).get("teams", {}).values():
        for player in team.get("players", {}).values():

            # 타자
            batting = player.get("stats", {}).get("batting", {})
            hits = batting.get("hits", 0)
            hr = batting.get("homeRuns", 0)
            rbi = batting.get("rbi", 0)

            score = hits + hr * 3 + rbi * 2

            if score > 0:
                players.append((player["person"]["fullName"], score))

            # 투수
            pitching = player.get("stats", {}).get("pitching", {})
            wins = pitching.get("wins", 0)
            saves = pitching.get("saves", 0)
            strikeouts = pitching.get("strikeOuts", 0)

            score = wins * 5 + saves * 4 + strikeouts

            if score > 0:
                players.append((player["person"]["fullName"], score))

    if not players:
        return None

    return max(players, key=lambda x: x[1])[0]


# =========================
# 블로그 포스트 생성
# =========================

def create_post(game, thumbnail):

    date_str = datetime.now().strftime("%Y-%m-%d")

    mvp = calculate_mvp(game)

    title = f"{game['away']} vs {game['home']} 경기 결과"

    content = f"""---
layout: post
title: "{title}"
date: {date_str}
categories: mlb
image: /{thumbnail}
---

## ⚾ 경기 결과
**{game['away']} {game['away_score']} - {game['home_score']} {game['home']}**

"""

    if mvp:
        content += f"\n🏆 **MVP: {mvp}**\n"

    content += "\n---\nMLB 시범경기 자동 업데이트\n"

    filename = f"_posts/{date_str}-{game['away']}-vs-{game['home']}.md"
    os.makedirs("_posts", exist_ok=True)

    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

    return filename


# =========================
# 메인 실행
# =========================

def main():

    print("🔍 경기 종료 데이터 확인 중...")

    games = get_games()

    if not games:
        print("❌ 종료된 경기 없음")
        return

    print(f"✅ 종료 경기 수: {len(games)}")

    date_str = datetime.now().strftime("%Y-%m-%d")

    for game in games:
        print(f"⚾ 포스트 생성: {game['away']} vs {game['home']}")

        thumbnail = create_thumbnail(game, date_str)
        create_post(game, thumbnail)

    print("🚀 블로그 포스트 생성 완료")


if __name__ == "__main__":
    main()
