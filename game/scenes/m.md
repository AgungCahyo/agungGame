# Upgrade Plan — Sprite Duel (UI & Battle Mechanics)

Dokumen ini adalah rencana upgrade untuk game fighting Phaser di repo `agungGame`, fokus ke dua area: **UI/HUD** dan **mekanik battle**. Ditulis supaya bisa langsung dieksekusi bertahap (per item bisa jadi satu task/PR sendiri), dengan referensi ke file yang relevan di codebase saat ini.

## Kondisi saat ini (baseline)

- 6 karakter (Fighter, Samurai, Shinobi, Vampire_Girl, Converted_Vampire, Countess_Vampire), 1v1 vs AI, single round, tanpa timer.
- Sistem yang sudah ada: `StateMachine`, `CombatSystem`, `HitboxSystem`, `PhysicsSystem`, `SkillSystem`, `AISystem`, `EffectsSystem`, `BattleUI`.
- Mekanik: attack1/2/3, skill unik per hero, shield (blok 100%, tanpa batas), dash, jump (tanpa serang di udara), knockback, combo counter, hit-stop, screen shake, partikel, SFX prosedural (Web Audio oscillator).
- HUD: nama, HP bar (dengan delay/ghost bar), skill cooldown bar, combo text, skill flash text, overlay menang/kalah.
- Menu: grid pilih hero dengan preview idle animasi, lawan AI dipilih random.

---

## Prioritas

- **P0** — dampak besar ke feel game, effort kecil–menengah. Kerjakan duluan.
- **P1** — penting untuk kelengkapan, effort menengah.
- **P2** — polish/nice-to-have, bisa nyusul kapan saja.

---

## A. UI / HUD

### A1. Battle HUD (`game/ui/BattleUI.ts`) — P0
- [ ] **Round intro** — teks "ROUND 1" / "FIGHT!" sebelum input aktif (freeze input ~1 detik), biar gak ada yang kena serang sebelum siap.
- [ ] **Result screen lebih informatif** — bukan cuma "KAMU MENANG/KALAH", tambahin ringkasan: damage dealt, combo terpanjang, durasi match.
- [ ] **Indikator ultimate/skill ready** — saat ini skill bar cuma progress bar tipis; tambah glow/pulse di nama atau portrait saat skill ready supaya lebih kebaca sekilas.
- [ ] **Portrait kecil di HUD** — crop frame Idle jadi ikon di pojok kiri/kanan, di samping nama.

### A2. Menu & Character Select (`game/scenes/MenuScene.ts`) — P1
- [ ] **Preview loop lebih hidup** — sekarang preview Idle statis; tambah opsi preview Walk saat card di-hover/selected biar keliatan gaya gerak karakter.
- [ ] **Layar VS** sebelum battle mulai: portrait player vs enemy + nama, transisi ke BattleScene.
- [ ] **Pemilihan lawan manual** (opsional) — sekarang lawan AI selalu random; kasih opsi pilih lawan sendiri atau random.
- [ ] **Difficulty select** untuk AI (lihat B3).

### A3. Feedback Visual (`game/systems/EffectsSystem.ts`) — P1/P2
- [ ] **Low HP warning** — vignette merah tipis / karakter berkedip saat HP < 25%.
- [ ] **Variasi hit-VFX per elemen** — vampire heroes pakai partikel darah/ungu, fighter/samurai/shinobi pakai spark putih-kuning (saat ini semua sama).
- [ ] **Screen-space damage direction indicator** (opsional, P2) — kalau nanti ada mode 2P/multi-lawan.

---

## B. Mekanik Battle

### B1. Shield rework (`game/entities/Character.ts`, `game/systems/StateMachine.ts`) — P0
Saat ini shield = damage immunity 100% selama tombol ditahan, tanpa biaya. Ini gampang di-exploit (spam block).
- [ ] Tambah **stamina/guard meter** yang berkurang saat kena hit sambil shield, regen saat idle.
- [ ] **Guard break** — kalau stamina habis, karakter stagger (state baru, mirip `hurt` tapi lebih lama) dan kena full damage.
- [ ] **Chip damage kecil** saat block (10–15% dari damage normal) supaya block bukan solusi gratis.
- [ ] **Perfect block/parry** (opsional, P1) — kalau shield dipencet tepat sebelum hit landing, dapat window counter-attack.

### B2. Aerial actions — P1
- [ ] Izinkan **attack ringan saat jump** (state baru `jumpAttack`, animasi bisa reuse `Attack_1` dengan hitbox lebih kecil/miring ke bawah).
- [ ] **Air-dash** opsional untuk hero gesit (Shinobi) sebagai bagian dari identitas karakter.

### B3. AI lanjutan (`game/systems/AISystem.ts`) — P1
AI baru saja diperbaiki (attack cooldown 0.45–0.95s), tapi masih 1 tingkat kesulitan.
- [ ] **Difficulty tiers** (Easy/Normal/Hard) — beda di `ATTACK_RECOVERY_MIN/MAX`, reaction time (`thinkTimer`), dan seberapa sering AI defend/punish.
- [ ] **Punish behavior** — AI lebih agresif menyerang kalau player baru saja whiff attack (attack meleset), bukan cuma reaktif ke jarak.
- [ ] **Variasi mood** — AI jangan selalu langsung ke 'attack' begitu masuk range; kasih jeda "baca" pendek biar terasa lebih manusiawi.

### B4. Combat feel / anti-infinite — P0
- [ ] **Hit-stun scaling per combo count** — combo panjang harusnya makin susah di-extend (damage scaling atau stun berkurang), supaya gak ada infinite juggle.
- [ ] **Invulnerability frame singkat** setelah keluar dari `hurt` state, supaya gak bisa di-chain-lock terus-menerus oleh attack super cepat.
- [ ] **Grab/throw mechanic** (opsional, P2) — counter buat lawan yang shield-turtling terus.

### B5. Match structure — P1
- [ ] **Best-of-3 rounds** per match, bukan sekali mati langsung selesai.
- [ ] **Round timer** (mis. 60 detik), pemenang berdasarkan HP tersisa kalau waktu habis.
- [ ] **Sudden death** kalau draw di ronde penentu.

### B6. Local 2-Player — P2
- `InputSystem.ts` sudah punya binding lengkap untuk Player 2 (panah + numpad) tapi belum pernah dipakai di `BattleScene.ts` (yang jalan cuma vs AI lewat `Enemy`/`AISystem`).
- [ ] Tambah mode "VS Player 2" di MenuScene yang instantiate `Character` biasa (bukan `Enemy`) untuk slot kedua, dan pakai `inputSystem.getPlayer2()` alih-alih `enemy.getAIInput(...)`.

---

## Saran urutan pengerjaan

1. **Fase 1 (fondasi feel & fairness)** — B1 (shield rework), B4 (anti-infinite), A1 (round intro + result screen).
2. **Fase 2 (kedalaman gameplay)** — B2 (aerial), B3 (AI difficulty), B5 (best-of-3 + timer).
3. **Fase 3 (polish & fitur tambahan)** — A2/A3 (menu & VFX polish), B6 (2P lokal).

Tiap fase bisa dikerjakan independen — gak ada dependency ketat antar fase, jadi bisa disesuaikan sama mana yang paling penting buat kamu duluan.