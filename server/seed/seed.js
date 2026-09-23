/**
 * Initial data for the /db page (and SEED_ON_START in Docker).
 * All players are fictional.
 */
const User = require('../models/user');
const Club = require('../models/club');
const Player = require('../models/player');
const Match = require('../models/match');
const Report = require('../models/report');
const Comment = require('../models/comment');
const Activity = require('../models/activity');

const MODELS = { users: User, clubs: Club, players: Player, matches: Match, reports: Report, comments: Comment, activities: Activity };

const DAY = 24 * 3600 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const born = (years, extraDays = 0) => new Date(Date.now() - years * 365.25 * DAY - extraDays * DAY);

// deterministic pseudo random so the seed is always the same
let s = 42;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const pickInt = (a, b) => a + Math.floor(rnd() * (b - a + 1));

async function clearDatabase() {
  const counts = {};
  for (const [name, Model] of Object.entries(MODELS)) {
    counts[name] = (await Model.deleteMany({})).deletedCount;
  }
  return counts;
}

async function seedDatabase() {
  s = 42;
  await clearDatabase();

  // ---------- users ----------
  const usersData = [
    { username: 'admin', email: 'admin@footballscout.mk', fullName: 'Admin FootballScout', role: 'admin', country: 'North Macedonia', password: 'Admin1234' },
    { username: 'troko.scout', email: 'troko@footballscout.mk', fullName: 'David Trokoski', role: 'user', country: 'North Macedonia', password: 'Scout1234' },
    { username: 'petar.k', email: 'petar@footballscout.mk', fullName: 'Petar Kostovski', role: 'user', country: 'North Macedonia', password: 'Scout1234' },
    { username: 'elena.m', email: 'elena@footballscout.mk', fullName: 'Elena Mitrevska', role: 'user', country: 'Serbia', password: 'Scout1234' },
  ];
  const users = [];
  for (const { password, ...u } of usersData) {
    const user = new User({ ...u, emailNotifications: false });
    await user.setPassword(password);
    users.push(await user.save());
  }
  const [admin, troko, petar, elena] = users;

  // ---------- clubs ----------
  const clubs = await Club.insertMany([
    { name: 'FK Vardar', country: 'North Macedonia', league: 'Prva MFL', founded: 1947, stadium: 'Toše Proeski Arena' },
    { name: 'FK Rabotnički', country: 'North Macedonia', league: 'Prva MFL', founded: 1937, stadium: 'Toše Proeski Arena' },
    { name: 'FK Struga', country: 'North Macedonia', league: 'Prva MFL', founded: 2015, stadium: 'Gradski stadion Struga' },
    { name: 'Akademija Pandev', country: 'North Macedonia', league: 'Prva MFL', founded: 2010, stadium: 'Stadion Kukuš' },
    { name: 'Real Madrid', country: 'Spain', league: 'La Liga', founded: 1902, stadium: 'Santiago Bernabéu' },
    { name: 'FC Barcelona', country: 'Spain', league: 'La Liga', founded: 1899, stadium: 'Spotify Camp Nou' },
  ]);
  const [vardar, rabotnicki, struga, pandev, realMadrid, barcelona] = clubs;

  // ---------- players ----------
  // Macedonian players are fictional. Real Madrid / Barcelona players are real people;
  // their market values are approximate demo values.
  // [firstName, lastName, age | 'YYYY-MM-DD', nationality, position, foot, height, value, club, status, addedBy]
  const pd = [
    ['Marko', 'Petrovski', 19, 'North Macedonia', 'ST', 'right', 184, 450000, vardar, 'recommended', troko],
    ['Luka', 'Stojanov', 21, 'North Macedonia', 'CAM', 'left', 176, 600000, vardar, 'shortlisted', troko],
    ['Bojan', 'Hristov', 22, 'North Macedonia', 'CB', 'right', 190, 350000, struga, 'monitoring', petar],
    ['Nikola', 'Ilievski', 20, 'North Macedonia', 'GK', 'right', 193, 200000, rabotnicki, 'monitoring', petar],
    ['David', 'Kostov', 18, 'North Macedonia', 'LW', 'left', 172, 300000, pandev, 'shortlisted', troko],
    ['Goran', 'Spasovski', 23, 'North Macedonia', 'CM', 'right', 181, 250000, struga, 'rejected', elena],
    ['Stefan', 'Nikolić', 20, 'Serbia', 'RB', 'right', 178, 280000, vardar, 'monitoring', elena],
    ['Darko', 'Velkovski', 19, 'North Macedonia', 'CDM', 'right', 183, 320000, rabotnicki, 'monitoring', petar],
    ['Filip', 'Angelov', 17, 'North Macedonia', 'RW', 'both', 170, 150000, pandev, 'shortlisted', troko],
    ['Aleksandar', 'Trajkov', 24, 'North Macedonia', 'LB', 'left', 179, 220000, rabotnicki, 'monitoring', elena],
    ['Viktor', 'Dimovski', 21, 'North Macedonia', 'ST', 'right', 186, 380000, pandev, 'monitoring', petar],
    ['Ivan', 'Georgiev', 22, 'Bulgaria', 'CM', 'right', 180, 300000, struga, 'monitoring', troko],
    // Real Madrid
    ['Thibaut', 'Courtois', '1992-05-11', 'Belgium', 'GK', 'left', 200, 20000000, realMadrid, 'monitoring', admin],
    ['Federico', 'Valverde', '1998-07-22', 'Uruguay', 'CM', 'right', 182, 120000000, realMadrid, 'monitoring', admin],
    ['Jude', 'Bellingham', '2003-06-29', 'England', 'CAM', 'right', 186, 180000000, realMadrid, 'shortlisted', admin],
    ['Arda', 'Güler', '2005-02-25', 'Turkey', 'CAM', 'left', 176, 60000000, realMadrid, 'shortlisted', troko],
    ['Vinícius', 'Júnior', '2000-07-12', 'Brazil', 'LW', 'right', 176, 150000000, realMadrid, 'monitoring', admin],
    ['Kylian', 'Mbappé', '1998-12-20', 'France', 'ST', 'right', 178, 180000000, realMadrid, 'monitoring', admin],
    // FC Barcelona
    ['Joan', 'García', '2001-05-04', 'Spain', 'GK', 'right', 191, 25000000, barcelona, 'monitoring', admin],
    ['Pau', 'Cubarsí', '2007-01-22', 'Spain', 'CB', 'right', 184, 80000000, barcelona, 'recommended', troko],
    ['Pedri', 'González', '2002-11-25', 'Spain', 'CM', 'right', 174, 140000000, barcelona, 'monitoring', admin],
    ['Gavi', 'Páez', '2004-08-05', 'Spain', 'CM', 'right', 173, 70000000, barcelona, 'monitoring', petar],
    ['Lamine', 'Yamal', '2007-07-13', 'Spain', 'RW', 'left', 180, 200000000, barcelona, 'recommended', troko],
    ['Raphinha', 'Dias', '1996-12-14', 'Brazil', 'LW', 'left', 176, 80000000, barcelona, 'monitoring', elena],
  ];
  const players = await Player.insertMany(pd.map(([firstName, lastName, age, nationality, position, preferredFoot, heightCm, marketValue, club, status, by], i) => ({
    firstName, lastName, nationality, position, preferredFoot, heightCm, marketValue,
    dateOfBirth: typeof age === 'string' ? new Date(age) : born(age, i * 37),
    club: club._id, status, createdBy: by._id,
    notes: i === 0 ? 'Брз напаѓач, силен во воздушни дуели.' : undefined,
  })));
  const byClub = (club) => players.filter((p) => String(p.club) === String(club._id));

  // ---------- matches (with player statistics) ----------
  // [home, away, homeScore, awayScore, daysAgo, competition]
  const fixtures = [
    [vardar, rabotnicki, 2, 1, 5, 'Prva MFL'], [struga, vardar, 0, 3, 12, 'Prva MFL'], [rabotnicki, pandev, 1, 1, 19, 'Kup na Makedonija'],
    [pandev, struga, 2, 0, 26, 'Prva MFL'], [realMadrid, barcelona, 2, 3, 8, 'La Liga'], [barcelona, realMadrid, 1, 1, 40, 'Supercopa de España'],
    [vardar, pandev, 1, 1, 47, 'Prva MFL'], [struga, rabotnicki, 0, 1, 54, 'Prva MFL'], [pandev, vardar, 2, 2, 61, 'Prva MFL'],
  ];
  const matches = await Match.insertMany(fixtures.map(([home, away, hs, as, ago, competition]) => {
    const perfs = [];
    const distribute = (club, goals) => {
      const squad = byClub(club);
      const outfield = squad.filter((p) => p.position !== 'GK');
      const g = Object.fromEntries(squad.map((p) => [p._id, 0]));
      for (let k = 0; k < goals && outfield.length; k++) {
        const scorer = outfield.find((p) => ['ST', 'LW', 'RW', 'CAM'].includes(p.position) && rnd() < 0.7) || outfield[pickInt(0, outfield.length - 1)];
        g[scorer._id] += 1;
      }
      squad.forEach((p) => perfs.push({
        player: p._id, minutes: pickInt(60, 90), goals: g[p._id], assists: rnd() < 0.25 ? 1 : 0,
        rating: Math.round(Math.min(10, 6 + rnd() * 2 + g[p._id] * 0.6) * 10) / 10,
      }));
    };
    distribute(home, hs);
    distribute(away, as);
    return { homeClub: home._id, awayClub: away._id, homeScore: hs, awayScore: as, date: daysAgo(ago), competition, performances: perfs };
  }));

  // ---------- reports ----------
  const R = (player, scout, match, t, ph, ta, me, po, rec, summary, strengths, weaknesses, ago) => ({
    player: player._id, scout: scout._id, match: match?._id, ratings: { technique: t, physical: ph, tactical: ta, mental: me, potential: po },
    recommendation: rec, summary, strengths, weaknesses, createdAt: daysAgo(ago),
  });
  const [marko, luka, bojan, nikola, davidK, goran, stefan, darko, filip, aleksandar, viktor, ivan,
    , , bellingham, guler, vinicius, , , cubarsi, pedri, , yamal] = players;
  const reportDocs = [
    R(marko, troko, matches[0], 8, 7, 8, 9, 9, 'sign', 'Одличен настап, постигна гол и асистенција. Постојано бара простор зад одбраната.', 'Завршница, движење без топка', 'Игра со лева нога', 5),
    R(marko, petar, matches[1], 8, 8, 7, 8, 8, 'monitor', 'Два гола во гостински натпревар. Силен во дуели, треба подобра соработка со везните.', 'Физичка сила, позиционирање', 'Пасови под притисок', 11),
    R(marko, troko, matches[6], 7, 7, 7, 7, 8, 'monitor', 'Потивок натпревар, но покажа добро држење на топката со грб кон гол.', 'Држење топка', 'Не се враќа во одбрана', 46),
    R(luka, troko, matches[0], 8, 6, 8, 7, 8, 'sign', 'Креативен плеј-мејкер, одлични вертикални пасови.', 'Визија, лева нога', 'Физички слаб во дуели', 5),
    R(bojan, petar, matches[1], 6, 8, 7, 7, 7, 'monitor', 'Солиден централен бек, доминантен во воздух.', 'Игра со глава', 'Бавен при пресврт', 12),
    R(nikola, petar, matches[2], 6, 7, 6, 7, 7, 'monitor', 'Две добри интервенции, несигурен при излегувања.', 'Рефлекси', 'Игра со нозе', 18),
    R(davidK, troko, matches[3], 8, 7, 7, 8, 9, 'sign', 'Брзо крило со одличен дриблинг еден-на-еден. Голем потенцијал.', 'Брзина, дриблинг', 'Одлучување во завршната третина', 25),
    R(goran, elena, matches[7], 5, 6, 6, 6, 6, 'reject', 'Не се истакна, губеше многу топки во средина на терен.', 'Работливост', 'Техника, темпо', 53),
    R(stefan, elena, matches[6], 7, 8, 7, 7, 7, 'monitor', 'Модерен десен бек, многу вклучувања во напад.', 'Кондиција, центаршути', 'Позиционирање во одбрана', 45),
    R(darko, petar, matches[7], 7, 7, 8, 8, 8, 'monitor', 'Паметен дефанзивен везен, добро ги затвора линиите.', 'Читање на игра', 'Долги пасови', 52),
    R(filip, troko, matches[3], 8, 6, 7, 7, 9, 'sign', 'Само 17 години, а веќе многу зрел. Одличен прв допир.', 'Техника, агилност', 'Физичка подготовка', 24),
    R(viktor, elena, matches[8], 7, 8, 6, 7, 7, 'monitor', 'Напаѓач со добар удар, треба подобро движење.', 'Удар од далечина', 'Офсајд позиции', 60),
    R(ivan, troko, matches[3], 7, 7, 7, 6, 6, 'monitor', 'Стабилен, но без особени квалитети.', 'Дисциплина', 'Креативност', 25),
    R(aleksandar, elena, matches[2], 6, 7, 6, 7, 6, 'reject', 'Доцни во покривање, не е на потребното ниво.', 'Лева нога', 'Брзина', 18),
    // El Clásico
    R(yamal, troko, matches[4], 10, 7, 8, 9, 10, 'sign', 'Одлучувачки во Ел Класико – гол и постојана опасност по десното крило. Исклучителен талент за неговата возраст.', 'Дриблинг, лева нога, креативност', 'Одбранбена работа', 7),
    R(cubarsi, petar, matches[4], 8, 7, 9, 8, 9, 'sign', 'Смирен при излез со топка под притисок, одлични вертикални пасови од одбраната.', 'Пас, читање на игра', 'Дуели со физички силни напаѓачи', 7),
    R(pedri, elena, matches[5], 9, 6, 9, 8, 9, 'monitor', 'Го контролираше темпото во средина на терен, многу точни пасови.', 'Визија, прв допир', 'Физичка издржливост', 39),
    R(bellingham, petar, matches[4], 8, 9, 8, 9, 9, 'monitor', 'Доминантен во дуели и опасен при навлегувања во казнениот простор.', 'Физика, завршница', 'Дисциплина (картони)', 7),
    R(guler, troko, matches[5], 9, 6, 7, 7, 9, 'sign', 'Одлична лева нога, опасен од прекини и удари од далечина.', 'Техника, удар', 'Физичка сила', 39),
    R(vinicius, elena, matches[4], 9, 8, 7, 7, 8, 'monitor', 'Брз и експлозивен еден-на-еден, но нервозен во завршницата.', 'Брзина, дриблинг', 'Одлуки во завршница', 7),
  ];
  const reports = [];
  for (const d of reportDocs) reports.push(await new Report(d).save()); // save() -> computes overall
  // restore historical createdAt (timestamps overwrite it on save)
  await Promise.all(reports.map((r, i) => Report.collection.updateOne({ _id: r._id }, { $set: { createdAt: reportDocs[i].createdAt } })));

  // ---------- comments ----------
  const comments = await Comment.insertMany([
    { report: reports[0]._id, author: petar._id, text: 'Се согласувам, го гледав и против Струга – многу брз.' },
    { report: reports[0]._id, author: admin._id, text: 'Ќе го ставиме на листата за следниот трансферен рок.' },
    { report: reports[3]._id, author: elena._id, text: 'Дали игра и како лажна деветка?' },
    { report: reports[3]._id, author: troko._id, text: 'Да, во вториот дел одигра на таа позиција.' },
    { report: reports[6]._id, author: petar._id, text: 'Одличен потенцијал, но треба уште минутажа.' },
    { report: reports[7]._id, author: troko._id, text: 'Имаше лош ден, можеби да го погледнеме уште еднаш.' },
    { report: reports[10]._id, author: admin._id, text: 'Контактирајте ја академијата за статусот на договорот.' },
    { report: reports[14]._id, author: petar._id, text: 'Најдобриот млад играч што сум го гледал во последните години.' },
    { report: reports[14]._id, author: admin._id, text: 'Реално е надвор од нашиот буџет, но да го следиме развојот.' },
    { report: reports[18]._id, author: elena._id, text: 'Се согласувам, неговите слободни удари се на светско ниво.' },
  ]);

  // ---------- history ----------
  await Activity.insertMany([
    { user: admin._id, action: 'create', entityType: 'Database', description: 'Внесени иницијални податоци' },
    ...reports.map((r, i) => ({ user: r.scout, action: 'create', entityType: 'Report', entityId: r._id, description: `Креиран извештај за ${players.find((p) => p._id.equals(r.player)).fullName}`, createdAt: reportDocs[i].createdAt })),
  ]);

  return {
    users: users.length, clubs: clubs.length, players: players.length, matches: matches.length,
    reports: reports.length, comments: comments.length,
  };
}

module.exports = { seedDatabase, clearDatabase };
