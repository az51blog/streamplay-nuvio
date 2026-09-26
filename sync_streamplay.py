import os
import json
import urllib.request
import re

REPO_JSON_URL = "https://raw.githubusercontent.com/phisher98/cloudstream-extensions-phisher/refs/heads/builds/repo.json"
DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json"

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def check_and_sync():
    print(f"[*] Checking phisher repository: {REPO_JSON_URL}")
    repo = fetch_json(REPO_JSON_URL)
    
    plugin_list_url = repo.get("pluginLists", [])[0]
    print(f"[*] Fetching plugins index from: {plugin_list_url}")
    plugins = fetch_json(plugin_list_url)
    
    streamplay = None
    for p in plugins:
        if p.get("internalName") == "StreamPlay" or p.get("name") == "StreamPlay":
            streamplay = p
            break
            
    if not streamplay:
        print("[!] StreamPlay provider not found in phisher repo!")
        return

    latest_version = streamplay.get("version")
    cs3_url = streamplay.get("url")
    print(f"[+] Found StreamPlay original release: v{latest_version}")
    print(f"[+] Direct package URL: {cs3_url}")
    
    # Check domains
    print(f"[*] Checking latest streaming domains from phisher central config...")
    domains = fetch_json(DOMAINS_URL)
    print(f"[+] Fetched {len(domains)} active streaming domains from phisher98.")

    # Update manifest.json metadata with latest version & status
    manifest_path = os.path.join(os.path.dirname(__file__), "manifest.json")
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        
        manifest["version"] = f"2.{latest_version}"
        manifest["description"] = f"StreamPlay MultiAPI ported to Nuvio - Synced with Phisher v{latest_version} build"
        
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        print(f"[OK] manifest.json successfully updated to match StreamPlay v{latest_version}.")

if __name__ == "__main__":
    check_and_sync()
