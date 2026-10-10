import sys
import json

sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')

try:
    from deep_translator import MyMemoryTranslator
except ImportError:
    MyMemoryTranslator = None

def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            print(json.dumps({"ok": False, "error": "Empty input"}))
            return
        data = json.loads(raw)
        text = data.get("text", "")
        src = data.get("src", "en-US")
        tgt = data.get("tgt", "ro-RO")

        if not text:
            print(json.dumps({"ok": True, "result": ""}))
            return

        if MyMemoryTranslator:
            res = MyMemoryTranslator(source=src, target=tgt).translate(text)
            print(json.dumps({"ok": True, "result": res}))
        else:
            print(json.dumps({"ok": False, "error": "MyMemoryTranslator not available"}))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))

if __name__ == '__main__':
    main()
