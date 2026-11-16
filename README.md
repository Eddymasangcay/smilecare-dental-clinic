# SmileCare Dental Clinic — Patient Portal

Mobile-first patient appointment booking portal for **SmileCare Dental Clinic** — HTML, CSS, and vanilla JavaScript for static hosting (Render).

## Demo patient accounts

| Username | Password       | Patient        |
|----------|----------------|----------------|
| `juan`   | `smilecare123` | Juan Dela Cruz |
| `ana`    | `smilecare123` | Ana Reyes      |

Each account only sees **its own** appointments and profile.  
Authentication is **simulated in the browser** and is not secure for real medical data.

## Features

- Patient registration and login / logout
- Show/hide password
- Personalized dashboard (own stats only)
- Browse dental services and book visits
- Appointment confirmation with reference number (`APT-####`)
- Date / time selection with clinic-wide conflict prevention
- Reschedule and cancel own appointments
- Appointment history and status
- Profile view / edit
- localStorage persistence (device- and browser-specific)
- Reset demonstration data

## Run locally

Open `index.html` in a browser, or:

```bash
py -m http.server 8765
```

## Deploy on Render (Static Site)

1. Push this folder to Git.
2. Create a **Static Site** on Render.
3. **Build Command:** empty (or `echo "No build"`)
4. **Publish Directory:** `.`
5. No environment variables required.

Entry point: `index.html` · relative paths only · works over HTTPS.

## Project structure

```
smilecare-dental-clinic/
├── index.html
├── css/styles.css
├── js/data.js
├── js/storage.js
├── js/app.js
├── render.yaml
└── README.md
```
