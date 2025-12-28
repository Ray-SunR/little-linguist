# /// script
# requires-python = ">=3.9"
# dependencies = [
#     "beautifulsoup4",
#     "requests",
# ]
# ///

import argparse
import json
import os
import re
import sys
import urllib.parse
import logging
from typing import List, Dict, Optional
import requests
from bs4 import BeautifulSoup

# --- Configuration ---
BOOKS_JSON_PATH = os.path.join("data", "books.json")
PUBLIC_BOOKS_DIR = os.path.join("public", "books")

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# --- Utils ---

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def download_image(url: str, dest_path: str):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        r = requests.get(url, headers=headers, stream=True)
        r.raise_for_status()
        with open(dest_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        logging.info(f"Downloaded: {dest_path}")
    except Exception as e:
        logging.error(f"Error downloading {url}: {e}")

# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="Scrape book content from URL to books.json")
    parser.add_argument("url", help="URL to scrape")
    parser.add_argument("--selector", help="CSS selector for the content container (e.g. '#content', '.article')", default=None)
    parser.add_argument("--title", help="Book title (overrides page title)")
    parser.add_argument("--book-id", help="Manual book ID (default: slugified title)")
    
    args = parser.parse_args()
    
    # 1. Fetch content
    logging.info(f"Fetching {args.url}...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        r = requests.get(args.url, headers=headers)
        r.raise_for_status()
        html_content = r.text
    except Exception as e:
        logging.error(f"Failed to fetch {args.url}: {e}")
        sys.exit(1)
        
    # 2. Parse Content
    soup = BeautifulSoup(html_content, 'html.parser')
    
    container = None
    if args.selector:
        container = soup.select_one(args.selector)
    else:
        # Try common selectors
        common_selectors = [
            '.article__content',
            '.article-content',
            '.rte', # Common in Shopify
            'article',
            'main',
            '#content',
            '#main',
            '.post-content'
        ]
        for sel in common_selectors:
            found = soup.select_one(sel)
            if found:
                logging.info(f"Auto-detected content container with selector: {sel}")
                container = found
                break
                
    if not container:
        logging.warning("Could not find a specific content container. Falling back to body.")
        container = soup.body
        
    if not container:
        logging.error("No content could be parsed.")
        sys.exit(1)
        
    # Extract text and images
    # We want to traverse the container and maintain order
    
    full_text = ""
    images_data = []
    
    # Heuristic: We iterate through all elements. If it's text, we append. If it's image, we record.
    # To do this safely and simply, we can iterate over all descendants or use a recursive function.
    # But traversing in document order is easiest.
    
    # However, detecting "paragraph breaks" is important for text.
    # We'll use get_text() with separator for the full text, but we need to know WHERE the images are relative to words.
    
    # Strategy:
    # 1. Iterate recursively.
    # 2. Maintain a running "word count".
    # 3. When an image is encountered, record it with current word count.
    # 4. When text is encountered, append to full_context and update word count.
    
    running_text = [] 
    
    def process_node(node):
        nonlocal running_text
        
        if node.name == 'img':
            src = node.get('src')
            if src:
                # Cleanup src (sometimes they are protocol relative)
                if src.startswith('//'):
                    src = 'https:' + src
                elif src.startswith('/'):
                    src = urllib.parse.urljoin(args.url, src)
                
                # Filter out small icons or UI elements if possible?
                # For now take all images in the container
                
                # Calculate current word count
                # Join what we have so far
                current_full_str = "\n".join(running_text)
                words = re.findall(r'\S+', current_full_str)
                word_index = len(words) - 1 if words else -1
                
                images_data.append({
                    'src': src,
                    'alt': node.get('alt', ''),
                    'word_index': word_index
                })
            return

        if node.name in ['script', 'style', 'noscript', 'iframe', 'svg']:
            return
            
        if isinstance(node, str):
            text = node.strip()
            if text:
                # Special handling: if parent is block level, maybe prepend newline?
                # But our running_text list is simpler. 
                # Just append unique chunks.
                # Actually, Beautiful soup string navigation can be tricky with whitespace.
                pass
                
        # If it's a tag
        if hasattr(node, 'children'):
            # Block level elements usually mean newlines
             is_block = node.name in ['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'section', 'article']
             
             if is_block and running_text and running_text[-1] != "":
                 pass # We handle joining later, but maybe add a placeholder?
                 
             for child in node.children:
                 if isinstance(child, str):
                     clean = re.sub(r'\s+', ' ', child).strip()
                     if clean:
                         running_text.append(clean)
                 else:
                     process_node(child)
             
             if is_block:
                 running_text.append("") # Marker for newline

    process_node(container)
    
    # Post-process content
    # Remove empty strings
    clean_paragraphs = [p for p in running_text if p]
    final_text_content = "\n\n".join(clean_paragraphs)
    
    # 3. Determine Metadata
    title = args.title
    if not title:
        if soup.title:
            title = soup.title.string.split('|')[0].strip()
        else:
            title = "Untitled Book"
    
    book_id = args.book_id or slugify(title)
    
    logging.info(f"Book ID: {book_id}")
    logging.info(f"Title: {title}")
    logging.info(f"Found {len(images_data)} images.")
    
    # 4. Process Images
    book_dir = os.path.join(PUBLIC_BOOKS_DIR, book_id)
    os.makedirs(book_dir, exist_ok=True)
    
    final_images = []
    seen_urls = set()
    
    for i, img in enumerate(images_data):
        src = img['src']
        
        if src in seen_urls:
            continue
        seen_urls.add(src)
        
        # Check for query params in extension
        path = urllib.parse.urlparse(src).path
        ext = os.path.splitext(path)[1]
        if not ext:
            ext = ".jpg"
            
        filename = f"img_{i:03d}{ext}"
        
        # Download
        download_image(src, os.path.join(book_dir, filename))
        
        final_images.append({
            "id": f"{book_id}-{i}",
            "afterWordIndex": img['word_index'],
            "src": f"/books/{book_id}/{filename}",
            "caption": img['alt'] or f"Illustration {i+1}",
            "alt": img['alt'] or f"Illustration {i+1}",
            "sourceUrl": src
        })
        
    # 5. Update books.json
    try:
        with open(BOOKS_JSON_PATH, 'r') as f:
            books_data = json.load(f)
    except FileNotFoundError:
        books_data = []
        
    # Check duplicate
    existing_idx = next((i for i, b in enumerate(books_data) if b['id'] == book_id), -1)
    
    new_entry = {
        "id": book_id,
        "title": title,
        "text": final_text_content,
        "images": final_images
    }
    
    if existing_idx >= 0:
        logging.info(f"Updating existing book entry for {book_id}")
        books_data[existing_idx] = new_entry
    else:
        logging.info(f"Adding new book entry for {book_id}")
        books_data.append(new_entry)
        
    with open(BOOKS_JSON_PATH, 'w') as f:
        json.dump(books_data, f, indent=2)
        
    logging.info("Done!")

if __name__ == "__main__":
    main()
