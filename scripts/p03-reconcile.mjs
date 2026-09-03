#!/usr/bin/env node
/**
 * P0.3 — Đối chiếu OpenAPI spec (nguồn sự thật) với `src/lib/api/*.ts`.
 *
 *   node scripts/p03-reconcile.mjs                          # đọc spec từ BE đang chạy
 *   node scripts/p03-reconcile.mjs path/to/api-docs.json    # đọc spec từ file
 *
 * Sinh `docs/p03-endpoint-reconciliation.md`. Chạy lại được ở bất kỳ phase nào —
 * so số OK/CHƯA CÓ giữa hai lần chạy là cách rẻ nhất để thấy tiến độ wire thật.
 *
 * Giới hạn đã biết: chỉ bắt được `api.<verb>(...)` / `axios.<verb>(...)` với path là
 * string literal. Path dựng động (nối biến) sẽ lọt lưới và bị báo nhầm là CHƯA CÓ.
 */
import fs from 'node:fs';
import pathMod from 'node:path';
import { fileURLToPath } from 'node:url';

const SPEC_URL = 'http://localhost:8080/v3/api-docs';
const ROOT = pathMod.resolve(pathMod.dirname(fileURLToPath(import.meta.url)), '..');
const API_DIR = pathMod.join(ROOT, 'src/lib/api');
const OUT_FILE = pathMod.join(ROOT, 'docs/p03-endpoint-reconciliation.md');

const CTRL_PKG = {
  'post-controller': 'posts', 'event-controller': 'posts', 'comment-controller': 'posts',
  'post-reaction-controller': 'posts', 'location-controller': 'posts', 'quiz-controller': 'posts',
  'auth-controller': 'security', 'profile-controller': 'security',
  'book-controller': 'bookstore', 'payment-controller': 'bookstore',
  'explanation-controller': 'knowledge', 'personal-access-token-controller': 'knowledge',
  'knowledge-sync-controller': 'knowledge', 'professional-profile-controller': 'knowledge',
  'friendship-controller': 'friendships',
  'roadmap-controller': 'roadmap', 'skill-verification-controller': 'roadmap',
  'notification-controller': 'notifications', 'github-controller': 'github',
  'project-controller': 'matchmaking', 'admin-moderation-controller': 'moderation',
  'chat-controller': 'chat', 'newsfeed-controller': 'newsfeed',
  'reputation-controller': 'reputation', 'search-controller': 'search',
  'trending-controller': 'trending',
};

const HTTP = ['get', 'put', 'post', 'delete', 'patch'];
const norm = (p) => p.replace(/\{[^}]*\}/g, '{}').replace(/\/+$/, '');

/** Endpoint mà FE KHÔNG được gọi — server-to-server hoặc đích redirect của browser. */
const NOT_FE = {
  'POST /v1/api/payments/momo/webhook':
    'MoMo gọi server-to-server (IPN). FE viết hàm gọi cái này là lỗi.',
  'GET /v1/api/events/google/callback':
    'Google redirect thẳng browser về BE (`GOOGLE_CALENDAR_REDIRECT_URI` trỏ :8080). FE không gọi.',
};

/**
 * Lệch shape đã xác nhận bằng tay từ DTO/entity Java. Giữ dạng bảng tra thay vì so
 * tự động vì `src/lib/types/index.ts` viết tay, tên type không khớp tên schema spec.
 */
const SHAPE = {
  'POST /v1/api/auth/login': 'FE `LoginResponse` thiếu field spec có: `isAutoLinked`, `isNewUser`',
  'POST /v1/api/auth/magic-link/login':
    'FE `LoginResponse` thiếu field spec có: `isAutoLinked`, `isNewUser`',
  'POST /v1/api/posts/locations/resolve':
    'FE `LocationResolutionResponse` thiếu field spec có: `googleMapsUrl`',
  'GET /v1/api/notifications/preferences':
    'FE `NotificationPreference.id: number` không tồn tại trên entity BE; FE thiếu `updatedAt`',
  'PUT /v1/api/notifications/preferences':
    'FE `NotificationPreference.id: number` không tồn tại trên entity BE; FE thiếu `updatedAt`',
};

/**
 * Tìm `api.<verb>(` rồi đi tiếp tới string literal đầu tiên. Không dùng một regex cho
 * cả lời gọi vì generic lồng nhau (`api.get<Page<Foo>>(`) làm regex đứt giữa chừng.
 */
function extractCalls(src, file) {
  const calls = [];
  // chain có thể xuống dòng: `axios\n  .post(` — cho phép whitespace quanh dấu chấm
  const re = /\b(?:api|axios)\s*\.\s*(get|put|post|delete|patch)\b/g;
  let m;
  while ((m = re.exec(src))) {
    const verb = m[1].toUpperCase();
    let i = re.lastIndex;
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === '<') depth++;
      else if (c === '>') depth--;
      else if (c === '(' && depth === 0) break;
      else if (!/\s/.test(c) && depth === 0) break;
      i++;
    }
    if (src[i] !== '(') continue;
    i++;
    while (i < src.length && /\s/.test(src[i])) i++;
    const q = src[i];
    if (!'\'"`'.includes(q)) continue;
    let j = i + 1;
    let lit = '';
    while (j < src.length && src[j] !== q) lit += src[j++];
    calls.push({ verb, literal: lit, file, line: src.slice(0, m.index).split('\n').length });
  }
  return calls;
}

/** `${process.env.X}/v1/api/books/${id}` -> `/v1/api/books/{}` */
function toPath(lit) {
  let p = lit.replace(/\$\{[^}]*\}/g, (mm) => (/process\.env|API_URL/.test(mm) ? '' : '{}'));
  const i = p.indexOf('/v1/api');
  if (i > 0) p = p.slice(i);
  return p.replace(/\/+$/, '');
}

async function loadSpec() {
  const arg = process.argv[2];
  if (arg) return JSON.parse(fs.readFileSync(arg, 'utf8'));
  const res = await fetch(SPEC_URL);
  if (!res.ok) throw new Error(`${SPEC_URL} -> HTTP ${res.status}`);
  return res.json();
}

async function main() {
  let SPEC;
  try {
    SPEC = await loadSpec();
  } catch (e) {
    console.error(
      `Không đọc được spec: ${e.message}\n` +
        `Bật BE (cần JWT_SECRET >=32 ký tự) hoặc truyền đường dẫn file api-docs.json.`
    );
    process.exit(1);
  }

  const specKeys = new Set();
  for (const p of Object.keys(SPEC.paths))
    for (const m of HTTP) if (SPEC.paths[p][m]) specKeys.add(`${m.toUpperCase()} ${norm(p)}`);

  const apiFiles = fs.readdirSync(API_DIR).filter((x) => x.endsWith('.ts'));
  const feByKey = new Map();
  const extraCalls = [];
  for (const f of apiFiles) {
    const src = fs.readFileSync(pathMod.join(API_DIR, f), 'utf8');
    const cs = extractCalls(src, f);
    for (const c of cs) {
      if (!c.literal.includes('/v1/api')) continue;
      const key = `${c.verb} ${toPath(c.literal)}`;
      if (!specKeys.has(key)) {
        extraCalls.push({ key, ...c });
        continue;
      }
      if (!feByKey.has(key)) feByKey.set(key, []);
      feByKey.get(key).push(c);
    }
    // Tham chiếu dạng URL thuần (đưa cho <a href>), không phải lời gọi axios.
    const callLits = new Set(cs.map((c) => c.literal));
    const re = /[`'"]([^`'"\n]*\/v1\/api\/[^`'"\n]*)[`'"]/g;
    let m;
    while ((m = re.exec(src))) {
      if (callLits.has(m[1])) continue;
      const key = `GET ${toPath(m[1])}`;
      if (!specKeys.has(key)) continue;
      if (!feByKey.has(key)) feByKey.set(key, []);
      feByKey
        .get(key)
        .push({ file: f, line: src.slice(0, m.index).split('\n').length, urlOnly: true });
    }
  }

  const rows = [];
  for (const p of Object.keys(SPEC.paths))
    for (const m of HTTP) {
      const op = SPEC.paths[p][m];
      if (!op) continue;
      const verb = m.toUpperCase();
      const key = `${verb} ${norm(p)}`;
      const ctrl = (op.tags && op.tags[0]) || '?';
      const fe = feByKey.get(key);
      let status;
      let note = '';
      if (NOT_FE[`${verb} ${p}`]) {
        status = 'N/A';
        note = NOT_FE[`${verb} ${p}`];
      } else if (fe && SHAPE[key]) {
        status = 'WIRE SAI';
        note = SHAPE[key];
      } else if (fe) {
        status = 'OK';
        note = fe[0].urlOnly ? 'dùng dạng URL, không phải call axios' : '';
      } else {
        status = 'CHƯA CÓ';
      }
      rows.push({
        pkg: CTRL_PKG[ctrl] || '?',
        ctrl: ctrl.replace('-controller', ''),
        method: verb,
        path: p,
        status,
        note,
        fe: fe ? fe.map((c) => `${c.file}:${c.line}`).join(', ') : '—',
      });
    }

  rows.sort(
    (a, b) =>
      a.pkg.localeCompare(b.pkg) || a.path.localeCompare(b.path) || a.method.localeCompare(b.method)
  );

  const out = [];
  const say = (s = '') => out.push(s);
  const count = (s) => rows.filter((r) => r.status === s).length;
  const nSchemas = Object.keys((SPEC.components && SPEC.components.schemas) || {}).length;

  say('# P0.3 — Đối chiếu OpenAPI spec ↔ `src/lib/api/*.ts`');
  say('');
  say('> Sinh bằng `node scripts/p03-reconcile.mjs`. Đừng sửa tay — sửa script rồi chạy lại.');
  say('');
  say(
    `Nguồn: \`${SPEC_URL}\` (${Object.keys(SPEC.paths).length} path / ${rows.length} operation / ` +
      `${nSchemas} schema) đối chiếu với ${apiFiles.length} file trong \`src/lib/api/\`.`
  );
  say('');
  say('| Nhóm | Số | Nghĩa |');
  say('|---|---|---|');
  say(`| **OK** | ${count('OK')} | path + verb + tên field khớp spec |`);
  say(`| **WIRE SAI** | ${count('WIRE SAI')} | có hàm FE, path đúng, nhưng shape lệch |`);
  say(`| **CHƯA CÓ** | ${count('CHƯA CÓ')} | spec có, FE chưa gọi |`);
  say(`| **N/A** | ${count('N/A')} | endpoint không dành cho FE gọi |`);
  say(`| **FE THỪA** | ${extraCalls.length} | FE gọi path spec không định nghĩa |`);
  say(`| Σ spec | ${rows.length} | |`);
  say('');

  say('## FE THỪA — nghiêm trọng nhất');
  say('');
  say('`/v1/api/social/*` **không tồn tại trong backend**: không có trong spec, không có');
  say('`SocialController.java`, `grep` toàn bộ `src/main/java` không ra mapping nào.');
  say('Toàn bộ `src/lib/api/social.ts` (7 hàm) + `src/lib/hooks/use-social.ts` (6 hook) gọi');
  say('vào hư không.');
  say('');
  say('| verb | path | file |');
  say('|---|---|---|');
  for (const e of extraCalls)
    say(`| ${e.verb} | \`${e.key.split(' ')[1]}\` | ${e.file}:${e.line} |`);
  say('');
  say('**Đã chạm tới UI đang chạy:** `src/app/(main)/dashboard/page.tsx:51-52` gọi');
  say('`useFollowers()` / `useFollowing()` rồi render `followers?.totalElements` và');
  say('`following?.totalElements` vào 2 StatCard. Hai query này 404, `data` mãi `undefined`,');
  say('nên 2 ô số liệu trên dashboard luôn rỗng.');
  say('');

  say('## WIRE SAI');
  say('');
  say('| endpoint | file | lệch chỗ nào |');
  say('|---|---|---|');
  for (const r of rows.filter((x) => x.status === 'WIRE SAI'))
    say(`| \`${r.method} ${r.path}\` | ${r.fe} | ${r.note} |`);
  say('');
  say('`NotificationPreference.id` là field ma: `NotificationPreferenceEntity.java:27` khai');
  say('`@Id private Integer userId` — không có `id`. FE khai `id: number` **không optional**,');
  say('nên chỗ nào đọc `.id` cũng ra `undefined`.');
  say('');
  say('Ghi chú BE: `/notifications/preferences` trả thẳng JPA entity');
  say('(`NotificationPreferenceEntity`) chứ không phải DTO — schema duy nhất trong spec có hậu');
  say('tố `Entity`. Không chặn FE, nhưng là chỗ nên nêu khi làm domain `notifications`.');
  say('');

  say('## Độ phủ theo package');
  say('');
  say('| package | OK | WIRE SAI | CHƯA CÓ | N/A | Σ |');
  say('|---|---|---|---|---|---|');
  const pkgs = [...new Set(rows.map((r) => r.pkg))].sort(
    (a, b) => rows.filter((r) => r.pkg === b).length - rows.filter((r) => r.pkg === a).length
  );
  for (const p of pkgs) {
    const rs = rows.filter((r) => r.pkg === p);
    const c = (s) => rs.filter((r) => r.status === s).length;
    say(`| ${p} | ${c('OK')} | ${c('WIRE SAI')} | ${c('CHƯA CÓ')} | ${c('N/A')} | ${rs.length} |`);
  }
  say(
    `| **Σ** | **${count('OK')}** | **${count('WIRE SAI')}** | **${count('CHƯA CÓ')}** | ` +
      `**${count('N/A')}** | **${rows.length}** |`
  );
  say('');

  say(`## Toàn bộ ${rows.length} operation`);
  say('');
  say('| # | package | controller | verb | path | trạng thái | file FE / ghi chú |');
  say('|---|---|---|---|---|---|---|');
  rows.forEach((r, i) => {
    const last = r.status === 'N/A' ? r.note : r.fe + (r.note ? ` — ${r.note}` : '');
    say(`| ${i + 1} | ${r.pkg} | ${r.ctrl} | ${r.method} | \`${r.path}\` | ${r.status} | ${last} |`);
  });

  fs.writeFileSync(OUT_FILE, out.join('\n') + '\n');
  console.log(
    `OK=${count('OK')} WIRE_SAI=${count('WIRE SAI')} CHUA_CO=${count('CHƯA CÓ')} ` +
      `NA=${count('N/A')} FE_THUA=${extraCalls.length} TOTAL=${rows.length}`
  );
  console.log(`-> ${pathMod.relative(ROOT, OUT_FILE)}`);
}

main();
