import argparse
import json
import os
import sys
import requests
import time

def align_book(book_dir, port=55000):
    metadata_path = os.path.join(book_dir, "metadata.json")
    if not os.path.exists(metadata_path):
        print(f"Error: metadata.json not found in {book_dir}")
        return

    with open(metadata_path, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    tokens = metadata.get("tokens", [])
    shards = metadata.get("audio", {}).get("shards", [])

    if not shards:
        print("Error: No audio shards found in metadata.")
        return

    # Helper to get text for a word index range
    def get_text_for_range(start_idx, end_idx):
        range_tokens = []
        for t in tokens:
            if t.get("type") == "w" and t.get("i") is not None:
                if start_idx <= t["i"] <= end_idx:
                    # Collect this word and all following separators until the next word
                    collecting = True
                    range_tokens.append(t["t"])
            elif t.get("type") in ["s", "p"] and len(range_tokens) > 0:
                # If we are currently in range, add separators
                # This is tricky because indices are only on words. 
                # Better approach: find the first token of the first word and last token of last word.
                pass
        
        # Simpler approach: 
        # Iterate all tokens. If it's a word and in range, include it.
        # If it's a separator and comes after the first word and before/at the last word in range.
        
        result = []
        in_range = False
        for t in tokens:
            if t.get("type") == "w" and t.get("i") is not None:
                if t["i"] == start_idx:
                    in_range = True
                
                if in_range:
                    result.append(t["t"])
                
                if t["i"] == end_idx:
                    in_range = False
                    break
            elif in_range:
                result.append(t["t"])
        
        return "".join(result)

    all_timings = []
    cumulative_offset = 0.0

    gentle_url = f"http://localhost:{port}/transcriptions?async=false"

    for shard in shards:
        idx = shard["index"]
        audio_path = os.path.join(book_dir, shard["path"])
        start_word_idx = shard["start_word_index"]
        end_word_idx = shard["end_word_index"]

        print(f"🔄 Aligning Shard {idx} (Words {start_word_idx}-{end_word_idx})...")

        if not os.path.exists(audio_path):
            print(f"  ⚠️ Audio file not found: {audio_path}")
            continue

        # Get duration for cumulative offset
        shard_duration = 0.0
        try:
            import subprocess
            output = subprocess.check_output(["afinfo", audio_path]).decode()
            for line in output.split('\n'):
                if "estimated duration" in line:
                    shard_duration = float(line.split(':')[1].split()[0])
                    break
        except Exception as e:
            print(f"  ⚠️ Could not get duration for {audio_path}: {e}")

        # 1. Build transcript and char index map
        transcript = ""
        char_to_index = {} # char_offset -> word_index
        
        started = False
        for t in tokens:
            t_type = t.get("type")
            t_idx = t.get("i")
            
            if t_type == "w" and t_idx is not None:
                if t_idx == start_word_idx:
                    started = True
                if t_idx > end_word_idx:
                    break
                
                if started:
                    start_char = len(transcript)
                    transcript += t["t"]
                    end_char = len(transcript)
                    for c in range(start_char, end_char):
                        char_to_index[c] = t_idx
            elif started:
                transcript += t.get("t", "")

        if not transcript.strip():
            print(f"  ❌ Error: Transcript is empty for shard {idx}. Check if tokens are present in metadata.json")
            continue

        # 2. Call Gentle
        try:
            with open(audio_path, 'rb') as audio_file:
                files = {
                    'audio': audio_file,
                    'transcript': ('transcript.txt', transcript)
                }
                response = requests.post(gentle_url, files=files, timeout=300)
                response.raise_for_status()
                result = response.json()
        except Exception as e:
            print(f"  ❌ Gentle request failed for shard {idx}: {e}")
            continue

        # 3. Map Gentle words to tokens using offsets
        gentle_words = result.get("words", [])
        total_gentle = len(gentle_words)
        success_gentle = len([w for w in gentle_words if w.get("case") == "success"])
        print(f"  📊 Gentle aligned {success_gentle}/{total_gentle} words successfully.")
        
        # Use a dict to collect timings for each word (in case Gentle splits a word)
        shard_timings = {} # absIndex -> {start, end, ...}

        for g_word in gentle_words:
            if g_word.get("case") != "success":
                continue
                
            start_off = g_word.get("startOffset")
            if start_off is not None and start_off in char_to_index:
                abs_idx = char_to_index[start_off]
                
                start_time = round(cumulative_offset + g_word["start"], 3)
                end_time = round(cumulative_offset + g_word["end"], 3)
                
                if abs_idx not in shard_timings:
                    shard_timings[abs_idx] = {
                        "absIndex": abs_idx,
                        "shardIndex": idx,
                        "start": start_time,
                        "end": end_time,
                        "offset": round(cumulative_offset, 3),
                        "word": "" # Will fill from tokens below
                    }
                else:
                    # Merge timings if word was split
                    shard_timings[abs_idx]["start"] = min(shard_timings[abs_idx]["start"], start_time)
                    shard_timings[abs_idx]["end"] = max(shard_timings[abs_idx]["end"], end_time)

        # Fill in word text and ensure all tokens are present (even if Gentle missed some)
        shard_word_tokens = [t for t in tokens if t.get("type") == "w" and t.get("i") is not None and start_word_idx <= t["i"] <= end_word_idx]
        for token in shard_word_tokens:
            abs_idx = token["i"]
            if abs_idx in shard_timings:
                timing = shard_timings[abs_idx]
                timing["word"] = token["t"]
                all_timings.append(timing)
            else:
                # Word missed by Gentle, skip or we could interpolate? 
                # For now just skip as before.
                pass
        
        cumulative_offset += shard_duration

    output_path = os.path.join(book_dir, "timing_tokens.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_timings, f, indent=2)

    print(f"\n✨ Alignment complete! Timings saved to: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Align book audio with text using Gentle.")
    parser.add_argument("book_dir", help="Directory containing book metadata and audio")
    parser.add_argument("--port", type=int, default=55002, help="Gentle server port (default: 55002)")
    
    args = parser.parse_args()
    align_book(args.book_dir, port=args.port)
