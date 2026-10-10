# 🎬 Clipy — Generator & Translator Video AI

Replica performantă a Viralio Speed cu funcții 100% native:
- **Descărcare automată din linkuri**: YouTube Shorts, TikTok, Instagram Reels, Facebook, Douyin, RedNote sau fișiere locale.
- **Traducere automată cu Gemini Flash Lite**: Extragere subtitrări originale și traducere instantanee în 6 limbi (Română, Engleză, Spaniolă, Germană, Franceză, Italiană).
- **Voci neuronale AI (Edge TTS)**: 24 de voci (câte 4 per limbă) cu sinteză fluidă și preview audio.
- **Subtitrări Karaoke sincronizate la milisecundă**: Afișare fraze multi-cuvinte cu highlight dinamic pe fiecare cuvânt rostit.
- **Editor video interactiv**: Zone de Blur reglabile/mobile pe ecran, bandă de Mask, Mirror (oglindire).
- **Export nativ MP4 cu FFmpeg**: Randare fluidă la 30/60 fps fără spasme sau blocaje în browser.

---

## 🏗️ Arhitectură Producție: Vercel (Frontend) + Render (Backend)

Datorită naturii procesării video (FFmpeg, Python Edge-TTS, descărcare fișiere mari), cea mai bună arhitectură gratuită este:
1. **Frontend pe Vercel**: Viteză CDN globală instantanee, domeniu gratuit `https://clipy.vercel.app`.
2. **Backend pe Render**: Container Docker complet cu Node 20, Python 3, FFmpeg și yt-dlp, domeniu gratuit `https://clipy-backend.onrender.com`.

---

## 📋 Ghid Pas-cu-Pas de Conectare

### Pasul 1: Pune proiectul pe GitHub

1. Intră pe [github.com/new](https://github.com/new) și creează un repo nou numit **`clipy`** (Public sau Private).
2. În terminalul proiectului (`d:\Clipy`), rulează comenzile:

```bash
git remote add origin https://github.com/Spinti1/clipy.git
git branch -M main
git push -u origin main
```

*(Dacă ai denumit repo-ul altfel, înlocuiește `clipy.git` cu numele ales).*

---

### Pasul 2: Găzduiește Backend-ul pe Render.com

1. Intră pe [dashboard.render.com](https://dashboard.render.com/) și apasă pe **New +** → **Web Service**.
2. Conectează contul tău de GitHub și alege repository-ul **`clipy`**.
3. Setări configurare:
   - **Name**: `clipy-backend` (sau orice nume dorești)
   - **Language / Runtime**: **Docker** (Render va detecta automat `Dockerfile`)
   - **Plan**: **Free**
   - **Environment Variables**:
     - `PORT` = `3000`
     - `GEMINI_API_KEY` = cheia ta Gemini Flash Lite
4. Apasă pe **Deploy Web Service**.
5. Când s-a terminat de compilat, copiază linkul generat de Render (de forma: `https://clipy-backend.onrender.com`).

---

### Pasul 3: Găzduiește Frontend-ul pe Vercel

1. Intră pe [vercel.com](https://vercel.com/) și apasă pe **Add New...** → **Project**.
2. Selectează repository-ul de GitHub **`clipy`**.
3. La **Framework Preset** alege **Other**.
4. La **Output Directory** scrie `public` (sau lasă implicit, fișierul `vercel.json` din proiect se ocupă automat).
5. Apasă pe **Deploy**.
6. Vercel îți va genera linkul live (de forma: `https://clipy-spinti1.vercel.app`).

---

### Pasul 4: Leagă Frontend-ul Vercel cu Backend-ul Render

Ai **două modalități simple** de a le conecta:

#### Opțiunea A: Direct din interfața Clipy (Recomandat — 1 click)
1. Deschide linkul tău de pe Vercel în browser.
2. În colțul din dreapta-sus, apasă pe butonul **`Server Activ`** / **`Deconectat`**.
3. Lipește linkul backend-ului Render (de ex: `https://clipy-backend.onrender.com`) și apasă OK.
4. Gata! Se reîncarcă automat și scrie **`Render ⚡`**. Toate traducerile, vocile și exporturile funcționează direct!

#### Opțiunea B: Prin Vercel Rewrites (Proxy invizibil)
Dacă vrei ca toate cererile să treacă prin Vercel fără să mai setezi nimic în interfață:
Înlocuiește conținutul din `vercel.json` cu:
```json
{
  "version": 2,
  "outputDirectory": "public",
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/api/:match*",
      "destination": "https://NUMELE-TAU-RENDER.onrender.com/api/:match*"
    },
    {
      "source": "/files/:match*",
      "destination": "https://NUMELE-TAU-RENDER.onrender.com/files/:match*"
    }
  ]
}
```
Apoi dă `git commit -am "Update render rewrites" && git push`, iar Vercel va actualiza totul automat.

---

## 💻 Rulare Locală (Offline)

```bash
npm install
npm start
# Deschide http://localhost:3000
```
