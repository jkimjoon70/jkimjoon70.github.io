import requests
import os
from datetime import datetime
import pytz
from anthropic import Anthropic

KST = pytz.timezone("Asia/Seoul")

# 오늘 날짜
today = datetime.now(KST).strftime("%Y-%m-%d")

# MLB API
url = f"https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={today}"

response = requests.get(url).json()

games = response.get("dates", [])
if not games:
    print("경기 없음")
    exit()

games = games[0]["games"]

print(f"📊 총 경기 수: {len(games)}")

posts_created = 0


def already_posted(game_id):
    if not os.path.exists("_posts"):
        return False

    for file in os.listdir("_posts"):
        if str(game_id) in file:
            return True
    return False


def create_thumbnail(team1, team2):
    return f"https://dummyimage.com/1200x675/0d1117/ffffff&text={team1}+vs+{team2}"


def generate_post(game):
    away = game["teams"]["away"]["team"]["name"]
    home = game["teams"]["home"]["team"]["name"]

    away_score = game["teams"]["away"]["score"]
    home_score = game["teams"]["home"]["score"]

    game_id = game["gamePk"]

    title = f"{away} {away_score} : {home_score} {home}"
    date_str = datetime.now(KST).strftime("%Y-%m-%d %H:%M")

    thumbnail = create_thumbnail(away, home)

    # Claude AI 요약 생성
    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = f"""
    MLB 경기 결과를 스포츠 기사 스타일로 한국어로 요약해 주세요.

    경기:
    {away} {away_score} - {home_score} {home}

    ✔ 5문장 이내
    ✔ 스포츠 뉴스 톤
    ✔ 핵심 요약
    """

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )

    summary = message.content[0].text

    filename = f"_posts/{today}-{game_id}.md"

    content = f"""---
layout: post
title: "{title}"
date: {date_str}
categories: [MLB]
image: {thumbnail}
---

## ⚾ 경기 결과

**{away} {away_score} : {home_score} {home}**

---

{summary}
"""

    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✅ 포스트 생성: {title}")


for game in games:

    status = game["status"]["detailedState"]
    game_id = game["gamePk"]

    # 종료 경기만 처리
    if status != "Final":
        continue

    # 중복 방지
    if already_posted(game_id):
        print(f"⏭ 이미 포스팅됨: {game_id}")
        continue

    generate_post(game)
    posts_created += 1

print(f"📰 생성된 포스트 수: {posts_created}")
