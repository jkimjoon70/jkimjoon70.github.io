#!/usr/bin/env python3
"""
MLB 시범경기 자동 포스트 생성기
파일 위치: automation/mlb_auto_post.py
"""

import os
import requests
import anthropic
from datetime import datetime, timezone

# ──────────────────────────────────────────
# 1. MLB Stats API에서 오늘 시범경기 데이터 수집
# ──────────────────────────────────────────
def get_spring_training_games():
    today = datetime.now().strftime("%Y-%m-%d")
    url = "https://statsapi.mlb.com/api/v1/schedule"
    params = {
        "sportId": 1,
        "gameType": "S",           # S = Spring Training
        "date": today,
        "hydrate": "linescore,boxscore,decisions,probablePitcher"
    }
    res = requests.get(url, params=params, timeout=10)
    res.raise_for_status()
    data = res.json()

    games = []
    for date_entry in data.get("dates", []):
        for game in date_entry.get("games", []):
            status = game.get("status", {}).get("abstractGameState", "")
            # Final(종료) 또는 Live(진행중) 경기만 수집
            if status in ("Final", "Live"):
                home = game["teams"]["home"]
                away = game["teams"]["away"]
                linescore = game.get("linescore", {})
                games.append({
                    "status": status,
                    "home_team": home["team"]["name"],
                    "away_team": away["team"]["name"],
                    "home_score": home.get("score", 0),
                    "away_score": away.get("score", 0),
                    "inning": linescore.get("currentInning", "-"),
                    "inning_state": linescore.get("inningState", ""),
                    "venue": game.get("venue", {}).get("name", ""),
                })
    return games


# ──────────────────────────────────────────
# 2. Claude API로 한국어 블로그 포스트 생성
# ──────────────────────────────────────────
def generate_post_with_claude(games, date_str):
    # 경기 데이터를 텍스트로 정리
    games_text = ""
    live_games = [g for g in games if g["status"] == "Live"]
    final_games = [g for g in games if g["status"] == "Final"]

    if live_games:
        games_text += "【진행중인 경기】\n"
        for g in live_games:
            games_text += f"- {g['away_team']} {g['away_score']} vs {g['home_team']} {g['home_score']} ({g['inning_state']} {g['inning']}이닝)\n"

    if final_games:
        games_text += "\n【종료된 경기】\n"
        for g in final_games:
            winner = g['away_team'] if g['away_score'] > g['home_score'] else g['home_team']
            games_text += f"- {g['away_team']} {g['away_score']} - {g['home_team']} {g['home_score']} → {winner} 승\n"

    if not games_text:
        print("오늘 경기 데이터 없음")
        return None

    prompt = f"""
다음은 {date_str} MLB 시범경기 데이터입니다.

{games_text}

이 데이터를 바탕으로 한국 야구 팬을 위한 블로그 포스트를 작성해주세요.

조건:
- Jekyll 마크다운 형식 (front matter 포함)
- 제목은 흥미롭게 (예: "저지 2홈런 폭발! 양키스 20-3 대승")
- 한국 선수(김혜성, 김하성, 이정후, 류현진 등)가 있으면 반드시 강조
- 주요 경기 3~5개 하이라이트 중심으로 서술
- 단순 나열 말고 스토리텔링 방식으로
- 마지막에 내일 주목할 경기 한 줄 예고

반드시 아래 front matter로 시작할 것:
---
layout: post
title: "[제목]"
date: {date_str} 09:00:00 +0900
categories: [MLB, 시범경기]
tags: [MLB, 스프링트레이닝, 야구]
---
"""

    client = anthropic.Anthropic(api_key=os.environ["CLAUDE_API_KEY"])
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text


# ──────────────────────────────────────────
# 3. _posts 폴더에 마크다운 파일 저장
# ──────────────────────────────────────────
def save_post(content, date_str):
    posts_dir = "_posts"
    os.makedirs(posts_dir, exist_ok=True)

    # 같은 날 여러 번 실행 시 덮어쓰기 (업데이트)
    filename = f"{posts_dir}/{date_str}-mlb-spring-training.md"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ 포스트 저장 완료: {filename}")
    return filename


# ──────────────────────────────────────────
# 실행
# ──────────────────────────────────────────
if __name__ == "__main__":
    date_str = datetime.now().strftime("%Y-%m-%d")
    print(f"🔍 {date_str} MLB 시범경기 데이터 수집 중...")

    games = get_spring_training_games()
    print(f"📊 수집된 경기 수: {len(games)}개")

    if not games:
        print("⚠️ 오늘 경기 데이터가 없습니다.")
        exit(0)

    print("✍️ Claude로 포스트 생성 중...")
    content = generate_post_with_claude(games, date_str)

    if content:
        save_post(content, date_str)
        print("🎉 완료!")
    else:
        print("❌ 포스트 생성 실패")
