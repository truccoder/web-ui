# P0.5 — Bản đồ token Design System → Tailwind v4

Nguồn: `D:\DATN\elite-nexus-design-system\project\` — `constitution.md`, `tokens/*.css`,
và các trang `guidelines/*.html` **đã mở render trong browser preview** (neutrals,
accent, type-sans) chứ không suy từ giá trị CSS.

**File này chưa sửa `globals.css`.** Việc transcribe thật nằm ở P1.3. Đây là bản thiết
kế + danh sách bẫy phải tránh khi transcribe.

Giá trị token là **dữ liệu thuần** nên được phép chép nguyên (CLAUDE.md §1). Không có
dòng `.jsx` nào của DS được đọc hay port.

---

## 0. Bốn phát hiện phải xử lý trước khi transcribe

Đo trực tiếp trên app đang chạy (`localhost:3000/login`), không phải đọc code đoán ra.

### 0.1 Cả app đang render bằng font serif, chưa bao giờ ra Geist

`getComputedStyle(document.body).fontFamily` → **`"Times New Roman"`**.

Nguyên nhân ở `src/app/globals.css:10`:

```css
@theme inline {
  --font-sans: var(--font-sans);   /* tự trỏ vào chính nó → rỗng */
```

`layout.tsx` khai `--font-geist-sans` / `--font-geist-mono` qua `next/font`, nhưng
`@theme` lại trỏ `--font-sans` về `--font-sans`. Vòng lặp → giá trị rỗng → `@apply
font-sans` ở `html` đổ về serif mặc định của browser. `--font-mono` cũng rỗng
(`""`), dù dòng 11 trỏ sang `--font-geist-mono`.

Ảnh chụp trang `/login` xác nhận: toàn bộ tiêu đề và nhãn đang là serif.

**Sửa ở P1.3:** `--font-sans: var(--font-geist-sans)`, `--font-mono: var(--font-geist-mono)`.
Geist đúng là font DS yêu cầu nên chỉ cần nối đúng dây, không phải thêm font mới.

### 0.2 Dark mode là code chết

`globals.css:5` khai `@custom-variant dark (&:is(.dark *))` và có nguyên khối `.dark`,
nhưng **không có `ThemeProvider` nào được mount** — `src/providers/index.tsx` chỉ có
I18n, Redux, React Query, Toaster. `next-themes` nằm trong `package.json` mà không ai
dùng. Đo được: `documentElement.className` không chứa `dark`, `data-theme` là `null`.

DS đổi theme bằng thuộc tính `[data-theme="dark"]` (đã verify: set
`data-theme="dark"` lên `<html>` của trang guideline thì mọi alias remap đúng).

**Quyết định đề xuất:** mount `next-themes` với `attribute="data-theme"` và đổi
`@custom-variant dark` thành `&:where([data-theme="dark"] *)`. Lý do: chọn như vậy thì
khối dark trong `tokens/colors.css` chép được **nguyên xi**, không phải dịch selector —
mà đây là file sẽ phải đồng bộ lại mỗi lần DS đổi.

### 0.3 Palette hiện tại không có màu thương hiệu nào

Toàn bộ `:root` trong `globals.css` là thang oklch của shadcn với **chroma = 0** — xám
tuyệt đối. Không có Elite Blue, không có Amber. Nói cách khác chưa có gì để "sửa dần":
lớp màu phải thay, không phải chỉnh.

Trang `/login` hiện có gradient xanh-tím nền + ô logo tím + nút đen tuyền — sai cả ba so
với DS (§1.5 cấm gradient trang trí; action phải là Elite Blue; nút chính là ink
`#101820`). Ghi vào ledger mục "DS deviation" khi làm lại `security`.

### 0.4 Tên alias của DS đụng tên alias của shadcn

Đây là bẫy im lặng, đã đo được thật: DS khai `--accent: var(--blue-500)`, shadcn khai
`--accent: oklch(0.97 0 0)`. Trên app hiện tại `--accent` trả về màu gần trắng của
shadcn. Nếu P1.3 dán token DS vào cùng `:root`, một trong hai thắng tuỳ thứ tự dòng và
**không có cảnh báo nào**.

Còn đụng: `--radius-sm/md/lg/xl`, `--border`, `--card`, `--popover`, `--primary`.

**Quyết định đề xuất: mọi alias DS mang tiền tố `--nx-`.** shadcn còn sống tới tận P4.3
nên hai hệ phải chạy song song một thời gian dài. Tiền tố giữ ranh giới rõ, và khi gỡ
shadcn thì không phải đổi lại tên lần nữa.

---

## 1. Chiến lược map sang Tailwind v4

Tailwind v4 không có file config; token nằm trong `@theme` của `globals.css`. Hai lớp:

```css
/* Lớp 1 — biến CSS thuần. Ramp + alias, remap theo theme. KHÔNG sinh utility. */
:root { --nx-gray-950:#101820; ... --nx-surface-page:var(--nx-gray-50); ... }
[data-theme="dark"] { --nx-surface-page:var(--nx-gray-950); ... }

/* Lớp 2 — chỉ ALIAS được đưa vào @theme inline để sinh utility Tailwind. */
@theme inline {
  --color-surface-page: var(--nx-surface-page);
  ...
}
```

Vì sao `@theme inline` chứ không phải `@theme`: giá trị trong `@theme` thường bị "đóng
băng" lúc build nên dark mode không remap được. `inline` giữ nguyên `var()` nên utility
đọc biến lúc chạy — đúng cơ chế mà khối shadcn hiện tại đang dùng.

Vì sao **chỉ alias** vào `@theme`, không đưa ramp: constitution §10 cấm hex thô trong
screen, và §1 nói alias là từ vựng. Đưa cả ramp vào sẽ đẻ ra `bg-gray-400`,
`bg-blue-300`… tức là mời gọi đúng thứ DS cấm. Ramp chỉ tồn tại để alias trỏ vào.

---

## 2. Màu

### 2.1 Ramp — biến thuần, không sinh utility

Chép nguyên từ `tokens/colors.css`, thêm tiền tố `--nx-`.

| DS           | giá trị   |     | DS            | giá trị   |     | DS            | giá trị   |
| ------------ | --------- | --- | ------------- | --------- | --- | ------------- | --------- |
| `--gray-0`   | `#ffffff` |     | `--blue-50`   | `#eef4fb` |     | `--amber-50`  | `#fbf4e7` |
| `--gray-25`  | `#fcfcfd` |     | `--blue-100`  | `#d9e7f7` |     | `--amber-100` | `#f6e6c8` |
| `--gray-50`  | `#f6f7f8` |     | `--blue-200`  | `#b4cfee` |     | `--amber-200` | `#eed49f` |
| `--gray-100` | `#eceef0` |     | `--blue-300`  | `#82ade0` |     | `--amber-300` | `#e7be7a` |
| `--gray-200` | `#dee1e5` |     | `--blue-400`  | `#4e87cf` |     | `--amber-400` | `#dda64f` |
| `--gray-300` | `#c8cdd3` |     | `--blue-500`  | `#2e6fc2` |     | `--amber-500` | `#d18f2e` |
| `--gray-400` | `#9aa2ac` |     | `--blue-600`  | `#2459a6` |     | `--amber-600` | `#b47624` |
| `--gray-500` | `#6c7681` |     | `--blue-700`  | `#1d4a8a` |     | `--amber-700` | `#8f5d1d` |
| `--gray-600` | `#4d5760` |     | `--blue-800`  | `#173a6c` |     | `--amber-800` | `#6b4516` |
| `--gray-700` | `#37414a` |     |               |           |     |               |           |
| `--gray-800` | `#232c34` |     | `--green-50`  | `#ecf7f0` |     | `--red-50`    | `#fbeeee` |
| `--gray-900` | `#161e26` |     | `--green-100` | `#d3ecdd` |     | `--red-100`   | `#f5d8d8` |
| `--gray-950` | `#101820` |     | `--green-300` | `#8fd4ab` |     | `--red-500`   | `#d64545` |
|              |           |     | `--green-500` | `#2e9e5b` |     | `--red-600`   | `#b93a3a` |
|              |           |     | `--green-600` | `#26854c` |     | `--red-700`   | `#992f2f` |
|              |           |     | `--green-700` | `#1f6c3e` |     |               |           |

`--gray-950 #101820` là màu thương hiệu: nút chính, surface đảo, heading.

### 2.2 Alias → utility Tailwind

| biến `@theme inline`           | light                | dark                    | utility sinh ra         | dùng cho                                          |
| ------------------------------ | -------------------- | ----------------------- | ----------------------- | ------------------------------------------------- |
| `--color-surface-page`         | `gray-50`            | `gray-950`              | `bg-surface-page`       | nền trang                                         |
| `--color-surface-card`         | `gray-0`             | `gray-900`              | `bg-surface-card`       | thẻ, panel                                        |
| `--color-surface-sunken`       | `gray-100`           | `#0b1219`               | `bg-surface-sunken`     | vùng lõm, nhấn mạnh                               |
| `--color-surface-raised`       | `gray-0`             | `gray-800`              | `bg-surface-raised`     | popover, menu                                     |
| `--color-surface-inverse`      | `gray-950`           | `gray-50`               | `bg-surface-inverse`    | dải đảo màu                                       |
| `--color-surface-hover`        | `rgba(16,24,32,.04)` | `rgba(236,238,240,.06)` | `bg-surface-hover`      | bậc hover 4%                                      |
| `--color-surface-pressed`      | `rgba(16,24,32,.08)` | `rgba(236,238,240,.1)`  | `bg-surface-pressed`    | bậc pressed 8%                                    |
| `--color-surface-selected`     | `blue-50`            | `rgba(46,111,194,.18)`  | `bg-surface-selected`   | mục đang chọn                                     |
| `--color-text-primary`         | `gray-950`           | `#eceeec`               | `text-text-primary`     | chữ chính                                         |
| `--color-text-secondary`       | `gray-600`           | `gray-300`              | `text-text-secondary`   | chữ phụ                                           |
| `--color-text-muted`           | `gray-500`           | `gray-400`              | `text-text-muted`       | metadata                                          |
| `--color-text-faint`           | `gray-400`           | `gray-500`              | `text-text-faint`       | mờ nhất — §12 cấm dưới 12px cho nội dung có nghĩa |
| `--color-text-inverse`         | `gray-50`            | `gray-950`              | `text-text-inverse`     | chữ trên surface đảo                              |
| `--color-text-link`            | `blue-500`           | `#6ba3d8`               | `text-text-link`        | link                                              |
| `--color-text-on-color`        | `#ffffff`            | `#ffffff`               | `text-text-on-color`    | chữ trên nền bão hoà — **không đổi theo theme**   |
| `--color-border-default`       | `gray-200`           | `#2c343b`               | `border-border-default` | hairline mặc định                                 |
| `--color-border-strong`        | `gray-300`           | `gray-700`              | `border-border-strong`  | viền control                                      |
| `--color-border-subtle`        | `gray-100`           | `gray-800`              | `border-border-subtle`  | vách ngăn trong                                   |
| `--color-accent`               | `blue-500`           | `blue-400`              | `bg-accent`             | accent                                            |
| `--color-accent-hover`         | `blue-600`           | `blue-300`              |                         |                                                   |
| `--color-accent-soft`          | `blue-50`            | `rgba(46,111,194,.18)`  |                         | nền nhạt                                          |
| `--color-focus-ring`           | `blue-500`           | `blue-400`              | `ring-focus-ring`       | vòng focus 2px                                    |
| `--color-action-primary`       | `blue-600`           | `#3d7ecb`               | `bg-action-primary`     | nút chính                                         |
| `--color-action-primary-hover` | `blue-700`           | `#5591d6`               |                         |                                                   |

**Amber — chỉ dành cho reputation.** Constitution §1.3 và §6: không bao giờ dùng cho
nút, nav, hay action.

| biến                 | light       | dark                   |
| -------------------- | ----------- | ---------------------- |
| `--color-rep`        | `amber-500` | `amber-500`            |
| `--color-rep-soft`   | `amber-50`  | `rgba(209,143,46,.14)` |
| `--color-rep-text`   | `amber-700` | `amber-400`            |
| `--color-rep-strong` | `amber-600` | `amber-300`            |
| `--color-rep-border` | `amber-200` | `rgba(209,143,46,.4)`  |

**Status** — 4 nhóm `info` / `success` / `warning` / `danger`, mỗi nhóm có `-bg` và
`-fg` (light thêm màu đặc). Chỉ dùng để báo trạng thái, không dùng làm màu trang trí.

| nhóm    | bg light   | fg light    | bg dark                | fg dark     |
| ------- | ---------- | ----------- | ---------------------- | ----------- |
| info    | `blue-50`  | `blue-700`  | `rgba(47,109,178,.18)` | `#8fbce5`   |
| success | `green-50` | `green-700` | `rgba(46,158,91,.16)`  | `#7cc99a`   |
| warning | `amber-50` | `amber-700` | `rgba(209,143,46,.16)` | `amber-300` |
| danger  | `red-50`   | `red-700`   | `rgba(214,69,69,.16)`  | `#e89393`   |

Scrim overlay: `rgba(16,24,32,0.55)` light / `rgba(0,0,0,0.6)` dark.

---

## 3. Spacing — không cần transcribe

Lưới 4pt của DS **trùng khít thang spacing mặc định của Tailwind v4**:

| DS            | px  | utility |
| ------------- | --- | ------- |
| `--space-0-5` | 2   | `p-0.5` |
| `--space-1`   | 4   | `p-1`   |
| `--space-1-5` | 6   | `p-1.5` |
| `--space-2`   | 8   | `p-2`   |
| `--space-2-5` | 10  | `p-2.5` |
| `--space-3`   | 12  | `p-3`   |
| `--space-3-5` | 14  | `p-3.5` |
| `--space-4`   | 16  | `p-4`   |
| `--space-5`   | 20  | `p-5`   |
| `--space-6`   | 24  | `p-6`   |
| `--space-8`   | 32  | `p-8`   |
| `--space-10`  | 40  | `p-10`  |
| `--space-12`  | 48  | `p-12`  |
| `--space-16`  | 64  | `p-16`  |
| `--space-24`  | 96  | `p-24`  |

Tailwind v4 mặc định `--spacing: 0.25rem` = 4px ở root size mặc định, nhân theo hệ số →
ra đúng từng nấc trên. **Đề xuất giữ nguyên `rem`, không ép sang px**: constitution §12
đặt accessibility làm sàn, mà `rem` co giãn theo cỡ chữ người dùng đặt còn `px` thì
không. Giá trị px trong bảng là _ý đồ thiết kế_ ở cỡ gốc mặc định, không phải ràng buộc
cứng.

Layout — vào `@theme` để sinh `max-w-*`:

| DS                    | giá trị  | utility                                  |
| --------------------- | -------- | ---------------------------------------- |
| `--container-content` | `960px`  | `max-w-content`                          |
| `--container-wide`    | `1200px` | `max-w-wide`                             |
| `--sidebar-width`     | `248px`  | giữ làm biến thuần, không phải container |

---

## 4. Bo góc — ĐỤNG ĐỘ, phải ghi đè tường minh

Tên trùng nhưng **giá trị khác**. Không ghi đè là mọi `rounded-md` lệch 2px so với bản DS.

| DS              | DS px  | Tailwind v4 mặc định   | lệch |
| --------------- | ------ | ---------------------- | ---- |
| `--radius-xs`   | 4      | 2px                    | ✗    |
| `--radius-sm`   | 6      | 4px                    | ✗    |
| `--radius-md`   | 8      | 6px                    | ✗    |
| `--radius-lg`   | 12     | 8px                    | ✗    |
| `--radius-xl`   | 16     | 12px                   | ✗    |
| `--radius-full` | 9999px | `--radius-full` 9999px | ✓    |

Ghi chú DS: `sm` cho control, `md` cho card, `lg` cho modal, `full` cho avatar.
Khối `@theme inline` hiện tại đang tính radius bằng `calc(var(--radius) * n)` — bỏ hẳn,
thay bằng số DS.

---

## 5. Typography

Thang đóng, thêm cỡ mới phải sửa constitution chứ không tự chế (§7.2).

| DS       | size | line-height | weight | tracking | `@theme` v4                            |
| -------- | ---- | ----------- | ------ | -------- | -------------------------------------- |
| display  | 32px | 1.2         | 600    | -0.02em  | `--text-display` + `--text-display--*` |
| title    | 24px | 1.25        | 600    | -0.015em | `--text-title`                         |
| title-sm | 20px | 1.3         | 600    | -0.01em  | `--text-title-sm`                      |
| heading  | 18px | 1.35        | 600    | -0.01em  | `--text-heading`                       |
| subhead  | 15px | 1.45        | 600    | 0        | `--text-subhead`                       |
| body     | 15px | 1.6         | 400    | —        | `--text-body`                          |
| ui       | 14px | 1.5         | —      | —        | `--text-ui`                            |
| body-sm  | 13px | 1.55        | —      | —        | `--text-body-sm`                       |
| code     | 13px | 1.6         | —      | —        | `--text-code`                          |
| caption  | 12px | 1.4         | —      | —        | `--text-caption`                       |
| micro    | 11px | 1.3         | —      | —        | `--text-micro`                         |
| overline | 11px | 1.3         | —      | 0.08em   | `--text-overline`                      |

Cú pháp v4 cho thuộc tính đi kèm:

```css
--text-display: 32px;
--text-display--line-height: 1.2;
--text-display--font-weight: 600;
--text-display--letter-spacing: -0.02em;
```

Font — sửa luôn lỗi ở 0.1:

| biến          | giá trị                                                            |
| ------------- | ------------------------------------------------------------------ |
| `--font-sans` | `var(--font-geist-sans)` (next/font, đã có sẵn trong `layout.tsx`) |
| `--font-mono` | `var(--font-geist-mono)`                                           |

**Mono là chất giọng thương hiệu, không phải chỉ để hiển thị code** (§7.1): handle,
timestamp, số đếm, version — thứ gì terminal in ra thì render bằng Geist Mono. Bảng
`type-mono` đã render xác nhận: `@nguyen.dev`, `3h ago`, `2.4k followers`, `v2.1.0`.

---

## 6. Elevation

Hairline trước, shadow sau (§1.4). Tên `--shadow-1/2/3` không đụng tên mặc định của
Tailwind (`sm/md/lg/xl/2xl/inner`) nên đưa thẳng vào `@theme` được.

| DS           | giá trị                                                        | dùng cho          |
| ------------ | -------------------------------------------------------------- | ----------------- |
| level 0      | chỉ `1px --border-default`                                     | thẻ mặc định      |
| `--shadow-1` | `0 1px 2px rgba(16,24,32,.05)`                                 | card hover        |
| `--shadow-2` | `0 1px 2px rgba(16,24,32,.05), 0 4px 12px rgba(16,24,32,.07)`  | popover, dropdown |
| `--shadow-3` | `0 2px 4px rgba(16,24,32,.06), 0 12px 32px rgba(16,24,32,.12)` | modal, drawer     |

Cấm shadow màu, cấm glow, cấm frosted glass.

---

## 7. Motion

| DS                | giá trị                   | ghi chú                                                     |
| ----------------- | ------------------------- | ----------------------------------------------------------- |
| `--ease-out`      | `cubic-bezier(0.2,0,0,1)` | **đụng độ**: Tailwind mặc định là `cubic-bezier(0,0,0.2,1)` |
| `--duration-fast` | 120ms                     | hover, tooltip, menu, palette                               |
| `--duration-base` | 200ms                     | dialog, toast                                               |
| `--duration-slow` | 300ms                     | drawer, panel                                               |
| `--duration-exit` | 80ms                      | mọi exit                                                    |

Ghi đè `--ease-out` sẽ đổi nghĩa utility `ease-out` toàn repo. Vẫn nên ghi đè — DS coi
đây _là_ ease-out của hệ thống (§9 nói timing là tập đóng) — nhưng phải nói rõ trong
commit, đừng để người sau tưởng Tailwind đổi mặc định.

Tailwind v4 không sinh utility từ namespace `--duration-*`; dùng qua
`duration-[var(--nx-duration-fast)]` hoặc trong CSS của component.

Entrance chuẩn: fade + dịch lên 4px. `prefers-reduced-motion` phải triệt tiêu hết — DS
đã có sẵn media query này trong `tokens/base.css`, chép cùng.

---

## 8. Thang trạng thái (§2.1) — không phải token, là quy tắc

`rest → hover (tint 4%) → pressed (tint 8%) → selected (tint xanh + cạnh accent) →
focused (ring xanh 2px)`. Mọi phần tử tương tác đều leo đúng thang này. **Không có gì
dịch chuyển hay phóng to khi hover.**

Đã có token cho từng bậc: `--surface-hover`, `--surface-pressed`, `--surface-selected`,
`--focus-ring`. Mọi primitive dựng ở P1.3 phải phủ đủ 5 bậc + disabled + loading + dark.

---

## 9. Việc của P1.3

1. Sửa dây `--font-sans` / `--font-mono` (mục 0.1) — một dòng, hết serif.
2. Mount `ThemeProvider` với `attribute="data-theme"`; đổi `@custom-variant dark`.
3. Dán ramp + alias DS với tiền tố `--nx-`, kèm khối `[data-theme="dark"]`.
4. Map alias → `@theme inline` theo bảng mục 2.2.
5. Ghi đè radius (mục 4) và type scale (mục 5) — hai chỗ tên trùng giá trị khác.
6. **Không** đụng khối shadcn `:root` / `.dark`. Nó sống tới P4.3; hai hệ chạy song song
   nhờ tiền tố.
7. Chỉ dựng primitive mà domain đầu tiên của Phase 2 thực sự cần — không dựng trước cả
   bộ 13 cái (CLAUDE.md Phase 1.3).

## 10. Chưa quyết

- **Bỏ `tw-animate-css` hay không.** DS quy định tập motion đóng (120/200/300/exit 80),
  còn thư viện này mở ra hàng chục animation ngoài tập đó. Nghiêng về bỏ ở P4.3 cùng
  shadcn, nhưng cần rà chỗ đang dùng trước.
- **`--sidebar-width: 248px` của DS vs rail 52px trong constitution §4.1.** Hai con số
  cho hai thứ khác nhau (rail icon vs panel), sẽ chốt khi dựng app shell ở P3.4.
