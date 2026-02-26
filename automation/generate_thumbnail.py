from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO

def download_logo(team_id):
    url = f"https://www.mlbstatic.com/team-logos/{team_id}.svg"
    png_url = f"https://www.mlbstatic.com/team-logos/{team_id}.png"
    r = requests.get(png_url)
    return Image.open(BytesIO(r.content)).convert("RGBA")

def create_thumbnail(home_id, away_id, home_score, away_score, filename):
    width, height = 1200, 630
    bg = Image.new("RGB", (width, height), (10, 20, 40))

    home_logo = download_logo(home_id).resize((220,220))
    away_logo = download_logo(away_id).resize((220,220))

    bg.paste(home_logo, (200,200), home_logo)
    bg.paste(away_logo, (780,200), away_logo)

    draw = ImageDraw.Draw(bg)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)

    score_text = f"{away_score} : {home_score}"
    draw.text((470, 250), score_text, font=font, fill="white")

    bg.save(filename)
