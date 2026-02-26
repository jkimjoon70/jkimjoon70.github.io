import requests
from datetime import datetime
import os
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO

# =========================
# 팀 ID (MLB 공식 로고)
# =========================
TEAM_IDS = {
    "Dodgers": 119,
    "White Sox": 145,
    "Padres": 135,
    "Giants": 137,
    "Yankees": 147,
    "Red Sox": 111,
    "Angels": 108,
    "Cubs": 112,
    "Mets": 121,
}

# =========================
# 썸네일 생성
# =========================
def download_logo(team_id):
    url = f"https://www.mlbstatic.com/team-logos/{team_id}.png"
    r = requests.get(url)
    return Image.open(BytesIO(r.content)).convert("RGBA")

def create_thumbnail(home_team, away_team, home_score, away_score):
    width, height = 1200, 630
    bg = Image.new("RGB", (width, height), (10, 20, 40))

    home_logo = download_logo(TEAM_IDS[home_team]).resize((220,220))
    away_logo = download_logo(TEAM_IDS[away_team]).resize((220,220))

    bg.paste(away_logo, (200,200), away_logo)
    bg.paste(home_logo, (780,200), home_logo)

    draw = ImageDraw.Draw(bg)
    font = ImageFont.truetype(
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80
    )

    score_text = f"{away_score} : {home_score}"
    draw.text((470, 250), score_text, font=font, fill="white")

    os.makedirs("assets/images", exist_ok=True)
    filename = f"assets/images/{away_team}_vs_{home_team}.png"
    bg.save(filename)

    return filename

# =========================
# MLB 데이터 가져오기
# =========================
def get_games():
    today = datetime.utcnow().strftime("%Y-%m-%d")

    url = f"https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={today}"
    data = requests.get(url).json()

    games = []

    if "dates" not in data:
        return games

    for game in data["dates"][0]["games"]:
        status = game["status"]["detailedState"]

        if status != "Final":
            continue

        home = game["teams"]["home"]["team"]["name"]
        away = game["teams"]["away"]["team"]["name"]
        home_score = game["teams"]["home"]["score"]
        away_score = game["teams"]["away"]["score"]

        games.append({
            "home": home,
            "away": away,
            "home_score": home_score,
            "away_score": away_score,
        })

    return games

# =========================
# 포스트 생성
# =========================
def create_post(game):
    date_str = datetime.now().strftime("%Y-%m-%d")

    title = f"{game['away']} vs {game['home']} 경기 결과"

    filename = f"_posts/{date_str}-{game['away']}-{game['home']}.md"

    if os.path.exists(filename):
        print("이미 포스트 존재 → 스킵")
        return

    thumbnail = create_thumbnail(
        game["home"],
        game["away"],
        game["home_score"],
        game["away_score"]
    )

    content = f"""---
layout: post
title: "{title}"
date: {datetime.now().isoformat()}
categories: mlb
thumbnail: /{thumbnail}
---

![thumbnail](/{thumbnail})

## ⚾ 경기 결과

**{game['away']} {game['away_score']} : {game['home_score']} {game['home']}**

### 경기 요약
- 최종 스코어: {game['away_score']} : {game['home_score']}
- 경기 상태: 종료
- 작성 시각: {datetime.now().strftime('%Y-%m-%d %H:%M')}

"""

    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

    print("포스트 생성 완료:", filename)

# =========================
# 실행
# =========================
if __name__ == "__main__":
    print("🔍 경기 데이터 확인 중...")

    games = get_games()

    if not games:
        print("종료된 경기 없음")
        exit()

    for game in games:
        create_post(game)

    print("✅ 모든 경기 포스팅 완료")
