# ⚽ FootballScout – платформа за скаутирање фудбалери

Динамичка веб-апликација (MERN: **MongoDB, Express, React, Node.js**) каде скаутите следат фудбалери,
пишуваат scouting извештаи со оценки, внесуваат статистики од натпревари и дискутираат преку коментари.
Податоците се збогатуваат од надворешниот извор **TheSportsDB API** (биографии, фотографии, клубови).

> 🌐 Продукциска верзија: `https://footballscout.onrender.com` 
> 📘 REST API документација: `/api/docs/` · OpenAPI спецификација: `/api/swagger.json`

---

## 📁 Структура на проектот (MVC)

```
footballscout/
├── mockups/                 # Дел 1 – статички HTML маски (Bootstrap) + опис на секој екран
├── server/                  # Дел 2 и 3 – Express REST API
│   ├── app.js / server.js   # конфигурација на Express и стартување
│   ├── config/              # db.js (локална / Atlas база), swagger.js (swagger-jsdoc)
│   ├── models/              # M – Mongoose шеми (7 колекции)
│   ├── controllers/         # C – деловна логика
│   ├── routes/              # рути + JSDoc/OpenAPI коментари
│   ├── middleware/          # JWT автентикација, валидација, справување со грешки
│   ├── services/            # nodemailer, TheSportsDB, историја на активности
│   ├── seed/                # иницијални податоци за /db
│   └── utils/               # регуларни изрази и затворени сетови вредности
├── client/                  # Дел 4 – React SPA (V – погледи на клиентска страна)
│   └── src/
│       ├── routes/          # дополнителен модул за рутирање (AppRoutes.jsx)
│       ├── pages/           # по една (или повеќе) компонента за секој екран од Дел 1
│       ├── components/      # повторно искористливи: Navbar, Footer, модали, графикони, картички...
│       ├── models/          # 7 класи еквивалентни на MongoDB документите
│       ├── services/        # api.js (сопствен REST API), externalService.js (TheSportsDB)
│       ├── pipes/           # 10 трансформациски функции („pipes“)
│       ├── context/         # AuthContext (JWT)
│       └── utils/           # валидатори со регуларни изрази
├── Dockerfile               # multi-stage: build на React + продукциски Node сервер
├── docker-compose.yml       # MongoDB + апликација
├── render.yaml              # blueprint за Render.com
└── .env.example
```

---

## 🐳 Локално стартување со Docker (препорачано)

Предуслов: инсталиран [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone <URL-на-вашето-складиште> footballscout
cd footballscout
docker-compose up --build        # или: docker compose up --build
```

Командата автоматски:

1. ја симнува и стартува виртуелизираната **MongoDB 7** база (контејнер `footballscout-mongo`, волумен `mongo-data`);
2. го гради React клиентот и Node серверот (контејнер `footballscout-app`);
3. чека базата да биде подготвена (healthcheck) и ја поврзува апликацијата со **локалната** база;
4. при прво стартување ја полни базата со иницијални податоци (`SEED_ON_START=true`).

Отворете:

| Адреса | Опис |
|---|---|
| http://localhost:3000/ | апликацијата (React SPA) |
| http://localhost:3000/db | бришење / внесување иницијални податоци |
| http://localhost:3000/api/docs/ | Swagger UI документација |
| http://localhost:3000/api/swagger.json | OpenAPI спецификација |
| http://localhost:3000/mockups/ | статичките маски од Дел 1 |

Запирање: `Ctrl+C` па `docker-compose down` (со `-v` се брише и базата).

**Тест сметки** (по внесување иницијални податоци):

| Улога | Е-пошта | Лозинка |
|---|---|---|
| Администратор | admin@footballscout.mk | Admin1234 |
| Регистриран корисник (скаут) | troko@footballscout.mk | Scout1234 |
| Регистриран корисник (скаут) | petar@footballscout.mk | Scout1234 |

## 💻 Локално стартување без Docker

Потребно: Node.js 20+ и локален MongoDB на `27017`.

```bash
cp .env.example .env
npm run install:all
npm run seed              # иницијални податоци
npm run dev:server        # API на http://localhost:3000
npm run dev:client        # React (Vite) на http://localhost:5173 (proxy кон /api)
```

Продукциски build: `npm run build && npm start` → сè се опслужува од http://localhost:3000.

> Пред да постои `client/dist`, серверот на `/` ги опслужува статичките маски од Дел 1 (така изгледа апликацијата по Дел 2).

---

## ☁️ Објавување во облак

**База – MongoDB Atlas**
1. Креирајте бесплатен M0 кластер на https://cloud.mongodb.com.
2. *Database Access* → корисник; *Network Access* → `0.0.0.0/0`.
3. Копирајте го connection string-от: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/footballscout`.

**Апликација – Render.com** (Docker)
1. Качете го проектот на GitHub.
2. Render → *New → Blueprint* → изберете го складиштето (се користи `render.yaml`).
3. Во *Environment* поставете `MONGODB_ATLAS_URI` (и по желба SMTP_* за е-пошта).

Кога `NODE_ENV=production`, апликацијата **автоматски** ја користи `MONGODB_ATLAS_URI`; локално (Docker / `npm run dev`) се користи `MONGODB_URI` (локална база). Логиката е во `server/config/db.js`.

---

## 🔌 REST API (преглед)

Сите одговори се JSON. Грешките имаат облик `{ status, message, errors? }`.

| Метод | Рута | Пристап | Опис |
|---|---|---|---|
| POST | /api/auth/register | гостин | регистрација (+ е-пошта за добредојде) |
| POST | /api/auth/login | гостин | најава → JWT |
| GET | /api/auth/me | корисник | тековен корисник |
| GET | /api/players | сите | листа, филтри, подредување, страничење |
| GET | /api/players/:id | сите | детали + извештаи + просечни оценки |
| GET | /api/players/:id/stats | сите | агрегирана статистика од натпревари |
| POST | /api/players | корисник | нов играч |
| PUT | /api/players/:id | автор / админ | измена |
| DELETE | /api/players/:id | админ | бришење (каскадно извештаи и коментари) |
| GET/POST | /api/clubs | сите / админ | клубови |
| GET/PUT/DELETE | /api/clubs/:id | сите / админ | |
| GET/POST | /api/matches | сите / админ | натпревари со статистика по играч |
| PUT/DELETE | /api/matches/:id | админ | |
| GET/POST | /api/reports | сите / корисник | scouting извештаи |
| GET | /api/reports/export.csv | корисник | генерирање CSV извештај |
| GET/PUT/DELETE | /api/reports/:id | сите / автор / админ | |
| GET/POST | /api/reports/:id/comments | сите / корисник | коментари (+ е-пошта до авторот) |
| PUT/DELETE | /api/comments/:id | автор / админ | |
| GET | /api/users | админ | корисници |
| PUT/DELETE | /api/users/:id | сопственик / админ | профил, улога |
| GET | /api/activities | корисник | историја (админ ги гледа сите) |
| GET | /api/stats/overview | сите | податоци за графиконите |
| GET | /api/external/players?name= | сите | пребарување во TheSportsDB |
| POST | /api/external/import | корисник | увоз на играч (и клуб) од TheSportsDB |
| GET/DELETE | /api/db | – | состојба / бришење на сите податоци |
| POST | /api/db/seed | – | внесување иницијални податоци |

Статусни кодови: `200, 201, 204, 400 (валидација), 401 (без/невалиден JWT), 403 (улога), 404, 409 (дупликат/конфликт), 502 (надворешен извор)`.

---

## 👥 Типови корисници

| Функционалност | Гостин | Регистриран (скаут) | Администратор |
|---|:-:|:-:|:-:|
| Преглед на играчи, извештаи, клубови, натпревари, статистика | ✅ | ✅ | ✅ |
| Пребарување | ✅ | ✅ | ✅ |
| Додавање играч, увоз од TheSportsDB | ❌ | ✅ | ✅ |
| Уредување играч | ❌ | само своите | сите |
| Бришење играч | ❌ | ❌ | ✅ |
| Нов извештај / коментар | ❌ | ✅ | ✅ |
| Уредување/бришење извештај | ❌ | само своите | сите |
| Бришење коментар | ❌ | само своите | сите |
| CSV извоз на извештаи | ❌ | ✅ | ✅ |
| Историја на активности | ❌ | своите | на сите |
| Клубови и натпревари (додавање/измена/бришење) | ❌ | ❌ | ✅ |
| Управување со корисници и улоги | ❌ | ❌ | ✅ |

Автентикацијата е со **JWT** (`Authorization: Bearer <token>`, важи 7 дена); лозинките се хеширани со **bcryptjs**.
Контролата на пристап е на серверот (`middleware/auth.js`: `authenticate`, `authorize('admin')`, проверка на сопственост) и на клиентот (`ProtectedRoute`, прикажување копчиња по улога).

---

## ✅ Дозволени вредности за внесување

Интегритетот се проверува на три нивоа: **клиент** (`client/src/utils/validators.js`), **апликација** (`server/middleware/validate.js`) и **шема** (Mongoose validators).

| Поле | Правило |
|---|---|
| Корисничко име | `^[a-zA-Z0-9._]{3,20}$` – 3–20 знаци, букви/бројки/точка/долна црта, уникатно |
| Е-пошта | `^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$`, уникатна |
| Лозинка | `^(?=.*[A-Za-z])(?=.*\d).{8,64}$` – мин. 8 знаци, барем 1 буква и 1 бројка |
| Име / презиме (корисник, играч) | `^[\p{L}][\p{L}\s.'-]{1,49}$` – само букви (вкл. кирилица), 2–50 знаци |
| Држава / националност | букви, 2–60 знаци; при регистрација – избор од затворена листа |
| Датум на раѓање (играч) | валиден датум, возраст 14–45 години |
| Позиција | `GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST` |
| Подобра нога | `left, right, both` |
| Висина | цел број 150–215 cm |
| Пазарна вредност | цел број 0 – 500.000.000 € |
| Статус на играч | `monitoring, shortlisted, recommended, rejected` |
| URL (фото, грб) | `^https?://\S+$` |
| Белешки | до 1000 знаци |
| Име на клуб | `^[\p{L}\d][\p{L}\d\s.'&()-]{1,59}$`, уникатно |
| Година на основање | 1850 – тековна година |
| Оценки во извештај (5) | цели броеви 1–10 (техника, физичка, тактика, ментална, потенцијал) |
| Резиме на извештај | 10–2000 знаци |
| Силни / слаби страни | до 500 знаци |
| Препорака | `sign, monitor, reject` |
| Коментар | 2–500 знаци |
| Натпревар | различни домаќин/гостин, резултат 0–30, минути 0–130, голови/асист. 0–15, оцена 1–10 |

---

## 📦 Користени npm библиотеки (освен express / mongoose)

**Сервер:** `bcryptjs` (хеширање лозинки), `jsonwebtoken` (JWT), `nodemailer` (е-пошта при регистрација, нов коментар, препорака), `swagger-jsdoc` + `swagger-ui-express` (документација), `cors`, `morgan` (логирање), `dotenv`.
**Клиент:** `react-router-dom` (SPA рутирање), `react-bootstrap` + `bootstrap` (модални прозорци, UI), `chart.js` + `react-chartjs-2` (графикони), `bootstrap-icons`.

## ✉️ Е-пошта

Без SMTP поставки пораките само се логираат во конзолата. За вистинско праќање поставете `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (пр. Gmail App Password, Mailtrap, Brevo).
