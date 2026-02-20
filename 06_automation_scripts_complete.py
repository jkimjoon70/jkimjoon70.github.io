#!/usr/bin/env python3
"""
automation/blog_automation.py
완전한 블로그 자동화 스크립트 - 기존 automation 폴더에 추가
"""

import os
import sys
import yaml
import json
import requests
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import hashlib
import shutil
from PIL import Image
import markdown

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('automation/blog_automation.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class BlogAutomation:
    """블로그 자동화 메인 클래스"""
    
    def __init__(self, config_path: str = "_config.yml"):
        self.config_path = config_path
        self.site_config = self.load_site_config()
        self.github_token = os.getenv('GITHUB_TOKEN')
        self.repo_owner = 'jkimjoon70'
        self.repo_name = 'jkimjoon70.github.io'
        self.site_url = 'https://jkimjoon70.github.io'
        
        # 디렉토리 설정
        self.base_dir = Path('.')
        self.posts_dir = self.base_dir / '_posts'
        self.assets_dir = self.base_dir / 'assets'
        self.images_dir = self.assets_dir / 'images'
        self.automation_dir = self.base_dir / 'automation'
        
        # 디렉토리 생성
        self.automation_dir.mkdir(exist_ok=True)
        self.images_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info("🤖 Blog Automation initialized")

    def load_site_config(self) -> Dict[str, Any]:
        """Jekyll 설정 파일 로드"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
            logger.info("✅ Site configuration loaded")
            return config
        except FileNotFoundError:
            logger.warning(f"⚠️ Configuration file {self.config_path} not found")
            return {}
        except yaml.YAMLError as e:
            logger.error(f"❌ Error parsing YAML config: {e}")
            return {}

    def check_site_health(self) -> Dict[str, Any]:
        """사이트 상태 종합 점검"""
        logger.info("🏥 Starting comprehensive site health check...")
        
        health_report = {
            'timestamp': datetime.now().isoformat(),
            'site_availability': self.check_site_availability(),
            'performance': self.check_site_performance(),
            'seo_health': self.check_seo_health(),
            'content_integrity': self.check_content_integrity(),
            'security_scan': self.check_security(),
            'build_status': self.check_build_status()
        }
        
        # 건강도 점수 계산
        health_report['overall_score'] = self.calculate_health_score(health_report)
        
        # 보고서 저장
        self.save_health_report(health_report)
        
        logger.info(f"🎯 Overall health score: {health_report['overall_score']}/100")
        return health_report

    def check_site_availability(self) -> Dict[str, Any]:
        """사이트 접근성 확인"""
        try:
            start_time = datetime.now()
            response = requests.get(self.site_url, timeout=10)
            end_time = datetime.now()
            
            response_time = (end_time - start_time).total_seconds() * 1000
            
            return {
                'status': 'online' if response.status_code == 200 else 'issues',
                'status_code': response.status_code,
                'response_time_ms': round(response_time, 2),
                'headers': dict(response.headers),
                'ssl_valid': response.url.startswith('https://'),
                'timestamp': datetime.now().isoformat()
            }
        except requests.RequestException as e:
            logger.error(f"❌ Site availability check failed: {e}")
            return {
                'status': 'offline',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def check_site_performance(self) -> Dict[str, Any]:
        """사이트 성능 분석"""
        logger.info("⚡ Analyzing site performance...")
        
        performance_data = {
            'lighthouse_score': self.run_lighthouse_audit(),
            'page_size': self.analyze_page_size(),
            'load_time_history': self.get_load_time_history(),
            'optimization_suggestions': []
        }
        
        # 최적화 제안 생성
        if performance_data['lighthouse_score'] and performance_data['lighthouse_score'] < 90:
            performance_data['optimization_suggestions'].append("Consider optimizing images and CSS")
        
        return performance_data

    def run_lighthouse_audit(self) -> Optional[int]:
        """Lighthouse 성능 감사 실행"""
        try:
            cmd = [
                'lighthouse', self.site_url,
                '--output=json',
                '--output-path=automation/lighthouse-report.json',
                '--chrome-flags="--headless --no-sandbox"',
                '--quiet'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0 and os.path.exists('automation/lighthouse-report.json'):
                with open('automation/lighthouse-report.json', 'r') as f:
                    report = json.load(f)
                    performance_score = report.get('lhr', {}).get('categories', {}).get('performance', {}).get('score', 0)
                    return int(performance_score * 100) if performance_score else None
            
        except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError) as e:
            logger.warning(f"⚠️ Lighthouse audit failed: {e}")
        
        return None

    def analyze_page_size(self) -> Dict[str, Any]:
        """페이지 크기 분석"""
        try:
            response = requests.get(self.site_url)
            html_size = len(response.content)
            
            # CSS 파일 크기 확인
            css_size = 0
            css_files = self.find_css_files()
            for css_file in css_files:
                try:
                    css_response = requests.get(f"{self.site_url}/{css_file}")
                    css_size += len(css_response.content)
                except:
                    pass
            
            return {
                'html_size_kb': round(html_size / 1024, 2),
                'css_size_kb': round(css_size / 1024, 2),
                'total_size_kb': round((html_size + css_size) / 1024, 2)
            }
        except Exception as e:
            logger.error(f"❌ Page size analysis failed: {e}")
            return {}

    def find_css_files(self) -> List[str]:
        """CSS 파일 목록 찾기"""
        css_files = []
        css_dir = self.assets_dir / 'css'
        
        if css_dir.exists():
            for css_file in css_dir.glob('*.css'):
                css_files.append(f"assets/css/{css_file.name}")
        
        return css_files

    def get_load_time_history(self) -> List[Dict[str, Any]]:
        """로드 시간 히스토리 조회"""
        history_file = self.automation_dir / 'performance_history.json'
        
        if history_file.exists():
            try:
                with open(history_file, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                return []
        
        return []

    def check_seo_health(self) -> Dict[str, Any]:
        """SEO 상태 점검"""
        logger.info("🔍 Checking SEO health...")
        
        seo_report = {
            'sitemap_exists': self.check_sitemap(),
            'robots_txt_exists': self.check_robots_txt(),
            'meta_tags_analysis': self.analyze_meta_tags(),
            'structured_data': self.check_structured_data(),
            'internal_links': self.check_internal_links(),
            'page_titles': self.analyze_page_titles()
        }
        
        return seo_report

    def check_sitemap(self) -> Dict[str, Any]:
        """사이트맵 존재 및 유효성 확인"""
        sitemap_url = f"{self.site_url}/sitemap.xml"
        
        try:
            response = requests.get(sitemap_url)
            if response.status_code == 200:
                # XML 파싱하여 URL 개수 확인
                import xml.etree.ElementTree as ET
                root = ET.fromstring(response.content)
                url_count = len(root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url'))
                
                return {
                    'exists': True,
                    'accessible': True,
                    'url_count': url_count,
                    'last_modified': response.headers.get('Last-Modified'),
                    'size_kb': round(len(response.content) / 1024, 2)
                }
            else:
                return {'exists': False, 'status_code': response.status_code}
        except Exception as e:
            return {'exists': False, 'error': str(e)}

    def check_robots_txt(self) -> Dict[str, Any]:
        """robots.txt 확인"""
        robots_url = f"{self.site_url}/robots.txt"
        
        try:
            response = requests.get(robots_url)
            return {
                'exists': response.status_code == 200,
                'content': response.text if response.status_code == 200 else None,
                'size': len(response.content) if response.status_code == 200 else 0
            }
        except Exception as e:
            return {'exists': False, 'error': str(e)}

    def analyze_meta_tags(self) -> Dict[str, Any]:
        """메타 태그 분석"""
        try:
            response = requests.get(self.site_url)
            html_content = response.text
            
            # 기본 메타 태그 확인
            meta_analysis = {
                'has_title': '<title>' in html_content,
                'has_description': 'name="description"' in html_content,
                'has_keywords': 'name="keywords"' in html_content,
                'has_og_tags': 'property="og:' in html_content,
                'has_twitter_cards': 'name="twitter:' in html_content,
                'has_canonical': 'rel="canonical"' in html_content
            }
            
            return meta_analysis
        except Exception as e:
            logger.error(f"❌ Meta tags analysis failed: {e}")
            return {}

    def check_structured_data(self) -> Dict[str, Any]:
        """구조화된 데이터 확인"""
        try:
            response = requests.get(self.site_url)
            html_content = response.text
            
            return {
                'has_json_ld': 'application/ld+json' in html_content,
                'has_microdata': 'itemscope' in html_content,
                'has_rdfa': 'typeof=' in html_content
            }
        except Exception as e:
            return {'error': str(e)}

    def check_internal_links(self) -> Dict[str, Any]:
        """내부 링크 확인"""
        try:
            # htmlproofer 사용하여 링크 체크
            cmd = ['bundle', 'exec', 'htmlproofer', './_site', '--disable-external', '--check-html']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            
            return {
                'check_passed': result.returncode == 0,
                'output': result.stdout,
                'errors': result.stderr if result.returncode != 0 else None
            }
        except Exception as e:
            return {'error': str(e)}

    def analyze_page_titles(self) -> Dict[str, Any]:
        """페이지 제목 분석"""
        titles_analysis = {
            'post_titles': [],
            'duplicate_titles': [],
            'missing_titles': []
        }
        
        # _posts 디렉토리의 모든 포스트 확인
        if self.posts_dir.exists():
            for post_file in self.posts_dir.glob('*.md'):
                try:
                    with open(post_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    # Front matter에서 title 추출
                    if content.startswith('---'):
                        front_matter = content.split('---')[1]
                        front_matter_data = yaml.safe_load(front_matter)
                        title = front_matter_data.get('title')
                        
                        if title:
                            titles_analysis['post_titles'].append({
                                'file': post_file.name,
                                'title': title,
                                'length': len(title)
                            })
                        else:
                            titles_analysis['missing_titles'].append(post_file.name)
                            
                except Exception as e:
                    logger.warning(f"⚠️ Error analyzing {post_file}: {e}")
        
        # 중복 제목 찾기
        titles = [item['title'] for item in titles_analysis['post_titles']]
        titles_analysis['duplicate_titles'] = list(set([title for title in titles if titles.count(title) > 1]))
        
        return titles_analysis

    def check_content_integrity(self) -> Dict[str, Any]:
        """콘텐츠 무결성 확인"""
        logger.info("📝 Checking content integrity...")
        
        integrity_report = {
            'posts_count': self.count_posts(),
            'images_analysis': self.analyze_images(),
            'broken_links': self.find_broken_links(),
            'missing_assets': self.find_missing_assets(),
            'content_quality': self.analyze_content_quality()
        }
        
        return integrity_report

    def count_posts(self) -> Dict[str, int]:
        """포스트 개수 계산"""
        counts = {
            'total_posts': 0,
            'published_posts': 0,
            'draft_posts': 0,
            'recent_posts': 0  # 최근 30일
        }
        
        if self.posts_dir.exists():
            recent_date = datetime.now() - timedelta(days=30)
            
            for post_file in self.posts_dir.glob('*.md'):
                counts['total_posts'] += 1
                
                try:
                    with open(post_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if content.startswith('---'):
                        front_matter = content.split('---')[1]
                        front_matter_data = yaml.safe_load(front_matter)
                        
                        # 발행 상태 확인
                        if not front_matter_data.get('draft', False):
                            counts['published_posts'] += 1
                        else:
                            counts['draft_posts'] += 1
                        
                        # 최근 포스트 확인
                        post_date = front_matter_data.get('date')
                        if post_date and isinstance(post_date, datetime) and post_date > recent_date:
                            counts['recent_posts'] += 1
                            
                except Exception as e:
                    logger.warning(f"⚠️ Error reading {post_file}: {e}")
        
        return counts

    def analyze_images(self) -> Dict[str, Any]:
        """이미지 분석"""
        image_analysis = {
            'total_images': 0,
            'total_size_mb': 0,
            'large_images': [],  # 1MB 이상
            'unoptimized_images': [],
            'missing_alt_text': []
        }
        
        if self.images_dir.exists():
            for img_file in self.images_dir.rglob('*'):
                if img_file.is_file() and img_file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                    image_analysis['total_images'] += 1
                    
                    # 파일 크기 확인
                    file_size = img_file.stat().st_size
                    image_analysis['total_size_mb'] += file_size / (1024 * 1024)
                    
                    if file_size > 1024 * 1024:  # 1MB 이상
                        image_analysis['large_images'].append({
                            'file': str(img_file.relative_to(self.base_dir)),
                            'size_mb': round(file_size / (1024 * 1024), 2)
                        })
                    
                    # 이미지 최적화 가능성 확인
                    if img_file.suffix.lower() in ['.png', '.jpg', '.jpeg']:
                        try:
                            with Image.open(img_file) as img:
                                if img.mode == 'RGBA' and img_file.suffix.lower() in ['.jpg', '.jpeg']:
                                    image_analysis['unoptimized_images'].append(str(img_file.relative_to(self.base_dir)))
                        except Exception:
                            pass
        
        image_analysis['total_size_mb'] = round(image_analysis['total_size_mb'], 2)
        return image_analysis

    def find_broken_links(self) -> List[str]:
        """깨진 링크 찾기"""
        broken_links = []
        
        # 모든 마크다운 파일에서 링크 추출 및 확인
        for md_file in self.base_dir.rglob('*.md'):
            try:
                with open(md_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 마크다운 링크 패턴 찾기
                import re
                links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
                
                for link_text, link_url in links:
                    if link_url.startswith('http'):
                        # 외부 링크는 건너뛰기 (시간이 오래 걸림)
                        continue
                    elif link_url.startswith('/'):
                        # 절대 경로 링크 확인
                        full_url = f"{self.site_url}{link_url}"
                        try:
                            response = requests.head(full_url, timeout=5)
                            if response.status_code >= 400:
                                broken_links.append(f"{md_file}: {link_url}")
                        except:
                            broken_links.append(f"{md_file}: {link_url}")
                    else:
                        # 상대 경로 링크 확인
                        link_path = md_file.parent / link_url
                        if not link_path.exists():
                            broken_links.append(f"{md_file}: {link_url}")
                            
            except Exception as e:
                logger.warning(f"⚠️ Error checking links in {md_file}: {e}")
        
        return broken_links

    def find_missing_assets(self) -> List[str]:
        """누락된 에셋 찾기"""
        missing_assets = []
        
        # 필수 파일들 확인
        required_files = [
            'favicon.ico',
            'assets/images/og-default.png',
            'assets/images/logo.png',
            'assets/manifest.json'
        ]
        
        for required_file in required_files:
            file_path = self.base_dir / required_file
            if not file_path.exists():
                missing_assets.append(required_file)
        
        return missing_assets

    def analyze_content_quality(self) -> Dict[str, Any]:
        """콘텐츠 품질 분석"""
        quality_metrics = {
            'avg_post_length': 0,
            'posts_without_tags': [],
            'posts_without_description': [],
            'readability_scores': []
        }
        
        if self.posts_dir.exists():
            total_words = 0
            post_count = 0
            
            for post_file in self.posts_dir.glob('*.md'):
                try:
                    with open(post_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if content.startswith('---'):
                        parts = content.split('---', 2)
                        if len(parts) >= 3:
                            front_matter_data = yaml.safe_load(parts[1])
                            post_content = parts[2]
                            
                            # 태그 확인
                            if not front_matter_data.get('tags'):
                                quality_metrics['posts_without_tags'].append(post_file.name)
                            
                            # 설명 확인
                            if not front_matter_data.get('description'):
                                quality_metrics['posts_without_description'].append(post_file.name)
                            
                            # 단어 수 계산
                            word_count = len(post_content.split())
                            total_words += word_count
                            post_count += 1
                            
                except Exception as e:
                    logger.warning(f"⚠️ Error analyzing content quality for {post_file}: {e}")
            
            if post_count > 0:
                quality_metrics['avg_post_length'] = round(total_words / post_count)
        
        return quality_metrics

    def check_security(self) -> Dict[str, Any]:
        """보안 점검"""
        logger.info("🔒 Running security scan...")
        
        security_report = {
            'https_enabled': self.site_url.startswith('https://'),
            'security_headers': self.check_security_headers(),
            'dependency_vulnerabilities': self.check_dependencies(),
            'sensitive_files': self.check_sensitive_files()
        }
        
        return security_report

    def check_security_headers(self) -> Dict[str, Any]:
        """보안 헤더 확인"""
        try:
            response = requests.get(self.site_url)
            headers = response.headers
            
            security_headers = {
                'content_security_policy': 'Content-Security-Policy' in headers,
                'x_frame_options': 'X-Frame-Options' in headers,
                'x_content_type_options': 'X-Content-Type-Options' in headers,
                'strict_transport_security': 'Strict-Transport-Security' in headers,
                'referrer_policy': 'Referrer-Policy' in headers
            }
            
            return security_headers
        except Exception as e:
            return {'error': str(e)}

    def check_dependencies(self) -> Dict[str, Any]:
        """의존성 취약점 확인"""
        try:
            # bundle audit 실행
            result = subprocess.run(['bundle', 'audit', 'check'], 
                                  capture_output=True, text=True, timeout=60)
            
            return {
                'vulnerabilities_found': result.returncode != 0,
                'output': result.stdout,
                'errors': result.stderr if result.returncode != 0 else None
            }
        except Exception as e:
            return {'error': str(e)}

    def check_sensitive_files(self) -> List[str]:
        """민감한 파일 확인"""
        sensitive_patterns = [
            '*.key',
            '*.pem',
            '*.p12',
            '.env',
            'config/database.yml',
            'config/secrets.yml'
        ]
        
        sensitive_files = []
        for pattern in sensitive_patterns:
            for file_path in self.base_dir.rglob(pattern):
                if file_path.is_file():
                    sensitive_files.append(str(file_path.relative_to(self.base_dir)))
        
        return sensitive_files

    def check_build_status(self) -> Dict[str, Any]:
        """빌드 상태 확인"""
        logger.info("🔨 Checking build status...")
        
        try:
            # Jekyll 빌드 테스트
            result = subprocess.run(['bundle', 'exec', 'jekyll', 'build', '--dry-run'], 
                                  capture_output=True, text=True, timeout=60)
            
            return {
                'build_successful': result.returncode == 0,
                'output': result.stdout,
                'errors': result.stderr if result.returncode != 0 else None,
                'build_time': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'build_successful': False,
                'error': str(e),
                'build_time': datetime.now().isoformat()
            }

    def calculate_health_score(self, health_report: Dict[str, Any]) -> int:
        """전체 건강도 점수 계산"""
        score = 0
        max_score = 100
        
        # 사이트 접근성 (20점)
        if health_report['site_availability']['status'] == 'online':
            score += 20
            if health_report['site_availability']['response_time_ms'] < 1000:
                score += 5  # 보너스
        
        # 성능 (20점)
        lighthouse_score = health_report['performance'].get('lighthouse_score')
        if lighthouse_score:
            score += int(lighthouse_score * 0.2)
        
        # SEO (20점)
        seo_checks = [
            health_report['seo_health']['sitemap_exists'].get('exists', False),
            health_report['seo_health']['robots_txt_exists'].get('exists', False),
            health_report['seo_health']['meta_tags_analysis'].get('has_title', False),
            health_report['seo_health']['meta_tags_analysis'].get('has_description', False)
        ]
        score += sum(seo_checks) * 5
        
        # 콘텐츠 무결성 (20점)
        content_score = 0
        if health_report['content_integrity']['posts_count']['total_posts'] > 0:
            content_score += 10
        if len(health_report['content_integrity']['broken_links']) == 0:
            content_score += 10
        score += content_score
        
        # 보안 (10점)
        if health_report['security_scan']['https_enabled']:
            score += 5
        if not health_report['security_scan']['dependency_vulnerabilities'].get('vulnerabilities_found', True):
            score += 5
        
        # 빌드 상태 (10점)
        if health_report['build_status']['build_successful']:
            score += 10
        
        return min(score, max_score)

    def save_health_report(self, health_report: Dict[str, Any]) -> None:
        """건강 보고서 저장"""
        report_file = self.automation_dir / f"health_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(health_report, f, indent=2, ensure_ascii=False, default=str)
            
            logger.info(f"📊 Health report saved: {report_file}")
            
            # 최신 보고서 링크 생성
            latest_report = self.automation_dir / 'latest_health_report.json'
            if latest_report.exists():
                latest_report.unlink()
            latest_report.symlink_to(report_file.name)
            
        except Exception as e:
            logger.error(f"❌ Failed to save health report: {e}")

    def optimize_images(self, quality: int = 85) -> Dict[str, Any]:
        """이미지 최적화"""
        logger.info("🖼️ Starting image optimization...")
        
        optimization_report = {
            'processed_images': 0,
            'total_size_before': 0,
            'total_size_after': 0,
            'optimized_files': [],
            'errors': []
        }
        
        if not self.images_dir.exists():
            logger.warning("⚠️ Images directory not found")
            return optimization_report
        
        for img_file in self.images_dir.rglob('*'):
            if img_file.is_file() and img_file.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                try:
                    original_size = img_file.stat().st_size
                    optimization_report['total_size_before'] += original_size
                    
                    # 이미지 최적화
                    with Image.open(img_file) as img:
                        # EXIF 데이터 제거 및 최적화
                        if img.mode in ('RGBA', 'LA'):
                            # PNG로 저장 (투명도 유지)
                            img.save(img_file, 'PNG', optimize=True)
                        else:
                            # JPEG로 저장
                            if img.mode != 'RGB':
                                img = img.convert('RGB')
                            img.save(img_file, 'JPEG', quality=quality, optimize=True)
                    
                    new_size = img_file.stat().st_size
                    optimization_report['total_size_after'] += new_size
                    optimization_report['processed_images'] += 1
                    
                    if new_size < original_size:
                        optimization_report['optimized_files'].append({
                            'file': str(img_file.relative_to(self.base_dir)),
                            'size_before': original_size,
                            'size_after': new_size,
                            'savings_percent': round((1 - new_size/original_size) * 100, 1)
                        })
                    
                except Exception as e:
                    optimization_report['errors'].append({
                        'file': str(img_file.relative_to(self.base_dir)),
                        'error': str(e)
                    })
                    logger.error(f"❌ Error optimizing {img_file}: {e}")
        
        # 통계 계산
        if optimization_report['total_size_before'] > 0:
            savings_percent = (1 - optimization_report['total_size_after'] / optimization_report['total_size_before']) * 100
            optimization_report['total_savings_percent'] = round(savings_percent, 1)
            optimization_report['size_saved_mb'] = round((optimization_report['total_size_before'] - optimization_report['total_size_after']) / (1024 * 1024), 2)
        
        logger.info(f"✅ Image optimization complete: {optimization_report['processed_images']} images processed")
        return optimization_report

    def backup_content(self) -> Dict[str, Any]:
        """콘텐츠 백업"""
        logger.info("💾 Starting content backup...")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = self.automation_dir / 'backups' / timestamp
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        backup_report = {
            'timestamp': timestamp,
            'backup_location': str(backup_dir),
            'backed_up_items': [],
            'total_size_mb': 0,
            'errors': []
        }
        
        # 백업할 디렉토리/파일 목록
        backup_items = [
            ('_posts', 'Blog posts'),
            ('_layouts', 'Layout templates'),
            ('_includes', 'Include files'),
            ('_data', 'Data files'),
            ('assets', 'Assets'),
            ('_config.yml', 'Site configuration'),
            ('about.md', 'About page'),
            ('index.md', 'Home page')
        ]
        
        for item, description in backup_items:
            source_path = self.base_dir / item
            
            if source_path.exists():
                try:
                    if source_path.is_file():
                        # 파일 백업
                        dest_path = backup_dir / item
                        dest_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(source_path, dest_path)
                        size = source_path.stat().st_size
                    else:
                        # 디렉토리 백업
                        dest_path = backup_dir / item
                        shutil.copytree(source_path, dest_path, dirs_exist_ok=True)
                        size = sum(f.stat().st_size for f in source_path.rglob('*') if f.is_file())
                    
                    backup_report['backed_up_items'].append({
                        'item': item,
                        'description': description,
                        'size_mb': round(size / (1024 * 1024), 2)
                    })
                    backup_report['total_size_mb'] += size / (1024 * 1024)
                    
                except Exception as e:
                    backup_report['errors'].append({
                        'item': item,
                        'error': str(e)
                    })
                    logger.error(f"❌ Error backing up {item}: {e}")
        
        backup_report['total_size_mb'] = round(backup_report['total_size_mb'], 2)
        
        # 백업 보고서 저장
        report_file = backup_dir / 'backup_report.json'
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(backup_report, f, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"❌ Failed to save backup report: {e}")
        
        logger.info(f"✅ Backup complete: {len(backup_report['backed_up_items'])} items backed up")
        return backup_report

    def generate_sitemap(self) -> Dict[str, Any]:
        """사이트맵 생성"""
        logger.info("🗺️ Generating sitemap...")
        
        try:
            # Jekyll 빌드를 통해 사이트맵 생성
            result = subprocess.run(['bundle', 'exec', 'jekyll', 'build'], 
                                  capture_output=True, text=True, timeout=120)
            
            if result.returncode == 0:
                sitemap_file = self.base_dir / '_site' / 'sitemap.xml'
                if sitemap_file.exists():
                    # 사이트맵 통계
                    with open(sitemap_file, 'r', encoding='utf-8') as f:
                        sitemap_content = f.read()
                    
                    import xml.etree.ElementTree as ET
                    root = ET.fromstring(sitemap_content)
                    url_count = len(root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url'))
                    
                    return {
                        'success': True,
                        'url_count': url_count,
                        'file_size': sitemap_file.stat().st_size,
                        'generated_at': datetime.now().isoformat()
                    }
                else:
                    return {
                        'success': False,
                        'error': 'Sitemap file not found after build'
                    }
            else:
                return {
                    'success': False,
                    'error': 'Jekyll build failed',
                    'output': result.stderr
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def run_full_automation(self) -> Dict[str, Any]:
        """전체 자동화 실행"""
        logger.info("🚀 Starting full blog automation...")
        
        automation_report = {
            'started_at': datetime.now().isoformat(),
            'health_check': None,
            'image_optimization': None,
            'backup': None,
            'sitemap_generation': None,
            'completed_at': None,
            'overall_success': False
        }
        
        try:
            # 1. 건강 상태 점검
            automation_report['health_check'] = self.check_site_health()
            
            # 2. 이미지 최적화
            automation_report['image_optimization'] = self.optimize_images()
            
            # 3. 콘텐츠 백업
            automation_report['backup'] = self.backup_content()
            
            # 4. 사이트맵 생성
            automation_report['sitemap_generation'] = self.generate_sitemap()
            
            automation_report['completed_at'] = datetime.now().isoformat()
            automation_report['overall_success'] = True
            
            logger.info("✅ Full automation completed successfully")
            
        except Exception as e:
            automation_report['error'] = str(e)
            automation_report['completed_at'] = datetime.now().isoformat()
            logger.error(f"❌ Automation failed: {e}")
        
        # 자동화 보고서 저장
        report_file = self.automation_dir / f"automation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(automation_report, f, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"❌ Failed to save automation report: {e}")
        
        return automation_report

def main():
    """메인 실행 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Blog Automation Tool')
    parser.add_argument('--action', choices=['health', 'optimize', 'backup', 'sitemap', 'full'], 
                       default='health', help='Action to perform')
    parser.add_argument('--config', default='_config.yml', help='Jekyll config file path')
    
    args = parser.parse_args()
    
    automation = BlogAutomation(args.config)
    
    if args.action == 'health':
        result = automation.check_site_health()
        print(f"Health Score: {result['overall_score']}/100")
    elif args.action == 'optimize':
        result = automation.optimize_images()
        print(f"Optimized {result['processed_images']} images")
    elif args.action == 'backup':
        result = automation.backup_content()
        print(f"Backed up {len(result['backed_up_items'])} items")
    elif args.action == 'sitemap':
        result = automation.generate_sitemap()
        print(f"Sitemap generation: {'Success' if result['success'] else 'Failed'}")
    elif args.action == 'full':
        result = automation.run_full_automation()
        print(f"Full automation: {'Success' if result['overall_success'] else 'Failed'}")

if __name__ == '__main__':
    main()