import requests
import datetime
import os
from anthropic import Anthropic

# Claude 설정
client = Anthropic()

# 날짜 설정
today = datetime.datetime.utcnow().strftime("%Y-%m-%d")

print(f"🔍 {today} 경기 데이터 수집 중...")

# MLB API
url = f"https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={today}"
data = requests.get(url).json()

games = data.get("dates", [])

if not games:
    print("❌ 오늘 경기 없음")
    exit()

games = games[0]["games"]
print(f"📊 총 경기 수: {len(games)}")

posts_created = 0

for game in games:
    status = game["status"]["detailedState"]

    # ✅ 경기 종료된 것만 처리
    if status != "Final":
        continue

    game_id = game["gamePk"]

    home = game["teams"]["home"]["team"]["name"]
    away = game["teams"]["away"]["team"]["name"]

    home_score = game["teams"]["home"]["score"]
    away_score = game["teams"]["away"]["score"]

    title = f"{away} {away_score} - {home_score} {home}"

    # ✅ 중복 포스팅 방지
    filename = f"_posts/{today}-{game_id}.md"
    if os.path.exists(filename):
        print("⏭ 이미 포스트됨:", title)
        continue

    print("✍️ Claude 요약 생성 중...")

    prompt = f"""
다음 MLB 경기 결과를 한국어 스포츠 기사 스타일로 요약해 주세요.

경기:
{away} {away_score} - {home_score} {home}

포맷:
- 경기 요약
- 주요 포인트
- 승부 흐름
"""

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )

    content = message.content[0].text

    # 블로그 포스트 생성
    post = f"""---
title: "{title}"
date: {today}
categories: MLB
---

{content}
"""

    os.makedirs("_posts", exist_ok=True)

    with open(filename, "w", encoding="utf-8") as f:
        f.write(post)

    print("✅ 포스트 생성:", title)
    posts_created += 1

if posts_created == 0:
    print("ℹ️ 새로 생성된 포스트 없음")
else:
    print(f"🚀 총 {posts_created}개 포스트 생성 완료")
