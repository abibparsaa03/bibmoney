// ==========================================
// bibmoney - Smart Weekly Budget & Expense Tracker
// Powered by Advanced Indonesian NLP Voice Parser
// iOS Optimized with Auto-Silence & "Simpan" Keyword
// Built-in Web Audio Sound Effects (Consistent & Zero-Latency)
// ==========================================

// Inisialisasi Data (Migrasi otomatis jika ada data lama)
const STORAGE_KEY = 'bibmoney';
const LEGACY_STORAGE_KEY = 'keuanganRef';

let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || 'null') || {
  tab: 50000,
  ong: 50000,
  mulai: Date.now(),
  trx: []
};

// State Aplikasi
let tipeTransaksi = 'keluar';
let filterAktif = 'semua';

function simpan() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function rp(n) {
  if (isNaN(n) || n === null || n === undefined) n = 0;
  return 'Rp' + Math.round(n).toLocaleString('id-ID');
}

// Toast Notifikasi Halus
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

// =================================================================
// 🎵 WEB AUDIO SYNTHESIZER (Efek Suara Konsisten di iOS & Android)
// Bekerja 100% offline, tanpa unduh file eksternal, latensi nol
// =================================================================
let audioCtx = null;

function getAudioContext() {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (e) {}
  return audioCtx;
}

// 1. Suara Saat Menekan Mic (Start Listening Chime - Rising Two-Tone)
function playSoundStart() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Nada naik ramah: 500Hz -> 720Hz
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {}
}

// 2. Suara Saat Selesai & Berhasil Simpan (Success Chime - C Major Triad Bell)
function playSoundSuccess() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Nada akor sukses ceria: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
    const tones = [
      { freq: 523.25, start: 0, dur: 0.09 },
      { freq: 659.25, start: 0.08, dur: 0.09 },
      { freq: 783.99, start: 0.16, dur: 0.25 }
    ];

    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(t.freq, now + t.start);

      gain.gain.setValueAtTime(0.001, now + t.start);
      gain.gain.linearRampToValueAtTime(0.22, now + t.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t.start + t.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t.start);
      osc.stop(now + t.start + t.dur + 0.02);
    });
  } catch (e) {}
}

// 3. Suara Batal / Tanpa Suara (Cancel Soft Blip)
function playSoundCancel() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.15);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  } catch (e) {}
}

// Deteksi Ikon Kategori Berdasarkan Keterangan
function getCategoryIcon(ket, jenis) {
  const low = (ket || '').toLowerCase();
  if (jenis === 'masuk') {
    if (/gaji|upah|freelance|proyek|cair/.test(low)) return '💼';
    if (/ortu|mama|papa|ayah|ibu|keluarga|bokap|nyokap/.test(low)) return '👨‍👩‍👦';
    if (/bonus|hadiah|cashback|menang|arisan|angpao|thr/.test(low)) return '🎁';
    return '💵';
  }

  // Pengeluaran
  if (/makan|sarapan|siang|malam|resto|warteg|padang|sate|bakso|ayam|mie|nasi|katsu|burger|pizza|kfc|mcd|geprek|seblak|batagor|siomay|pecel|martabak|cilok|gorengan/.test(low)) return '🍔';
  if (/kopi|coffee|cafe|boba|chatime|teh|jus|minum|es|ngopi|kenangan|janji jiwa|starbucks/.test(low)) return '☕';
  if (/bensin|pertalite|pertamax|spbu|shell|gojek|grab|maxim|ojol|parkir|toll|tol|angkot|krl|busway|kereta|bus|ongkos|transport/.test(low)) return '🛵';
  if (/belanja|indomaret|alfamart|superindo|supermarket|laundry|odol|sabun|shopee|tokped|baju|celana|tas/.test(low)) return '🛍️';
  if (/pulsa|kuota|paket|data|wifi|indihome|listrik|token|pln|tagihan/.test(low)) return '📱';
  if (/obat|apotek|dokter|klinik|sakit|vitamin|bodrex|paracetamol/.test(low)) return '💊';
  if (/nonton|bioskop|game|topup|steam|netflix|spotify|hiburan|rokok|udud/.test(low)) return '🎮';
  return '💸';
}

// =================================================================
// 🧠 PARSER BAHASA INDONESIA SANTAI & GAUL (Words & Slang to Number)
// =================================================================

// Kamus Angka Kata Bahasa Indonesia
const KATA_ANGKA = {
  'nol': 0, 'kosong': 0,
  'satu': 1, 'se': 1,
  'dua': 2,
  'tiga': 3,
  'empat': 4, 'pat': 4,
  'lima': 5,
  'enam': 6,
  'tujuh': 7, 'tuju': 7,
  'delapan': 8, 'lapan': 8,
  'sembilan': 9,
  'sepuluh': 10, 'sepulu': 10,
  'sebelas': 11,
  'seratus': 100,
  'seribu': 1000,
  'sejuta': 1000000
};

// Konversi untaian kata angka Indonesia menjadi nilai numerik
function convertIndoWordsToNumber(str) {
  const tokens = str.trim().toLowerCase().split(/\s+/);
  let total = 0;
  let group = 0;
  let sub = 0;
  let adaAngka = false;

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];

    if (KATA_ANGKA[w] !== undefined) {
      adaAngka = true;
      if (w === 'seratus') {
        group += 100;
        sub = 0;
      } else if (w === 'seribu') {
        group += sub;
        total += (group === 0 ? 1 : group) * 1000;
        group = 0;
        sub = 0;
      } else if (w === 'sejuta') {
        group += sub;
        total += (group === 0 ? 1 : group) * 1000000;
        group = 0;
        sub = 0;
      } else if (w === 'sepuluh') {
        group += 10;
        sub = 0;
      } else if (w === 'sebelas') {
        group += 11;
        sub = 0;
      } else {
        sub += KATA_ANGKA[w];
      }
    } else if (w === 'belas') {
      adaAngka = true;
      group += (sub === 0 ? 1 : sub) + 10;
      sub = 0;
    } else if (w === 'puluh') {
      adaAngka = true;
      group += (sub === 0 ? 1 : sub) * 10;
      sub = 0;
    } else if (w === 'ratus') {
      adaAngka = true;
      group += (sub === 0 ? 1 : sub) * 100;
      sub = 0;
    } else if (w === 'ribu' || w === 'rebu') {
      adaAngka = true;
      group += sub;
      total += (group === 0 ? 1 : group) * 1000;
      group = 0;
      sub = 0;
    } else if (w === 'juta') {
      adaAngka = true;
      group += sub;
      total += (group === 0 ? 1 : group) * 1000000;
      group = 0;
      sub = 0;
    } else if (w === 'setengah') {
      adaAngka = true;
      const next = tokens[i + 1];
      if (next === 'juta') {
        total += 500000;
        i++;
      } else if (next === 'ribu' || next === 'rebu') {
        total += 500;
        i++;
      }
    }
  }

  group += sub;
  total += group;

  return adaAngka && total > 0 ? total : null;
}

// Ekstraksi Nominal Utama (Mendukung Slang, Kata Huruf, & Angka Digit)
function extractNominalDanMatch(text) {
  let low = text.toLowerCase()
    .replace(/[.,](?=\d{3})/g, '') // hilangkan titik pemisah ribuan
    .replace(/,/g, '.');

  // --- TAHAP 1: Deteksi Slang Populer ---
  const slangTable = [
    { regex: /\b(ceban)\b/i, val: 10000 },
    { regex: /\b(goceng)\b/i, val: 5000 },
    { regex: /\b(gocap|goban)\b/i, val: 50000 },
    { regex: /\b(seceng)\b/i, val: 1000 },
    { regex: /\b(noceng)\b/i, val: 2000 },
    { regex: /\b(noban)\b/i, val: 20000 },
    { regex: /\b(pekgo)\b/i, val: 150000 },
    { regex: /\b(cepek\s*(?:ribu|rebu)?)\b/i, val: 100000 },
    { regex: /\b(gopek\s*(?:ribu|rebu))\b/i, val: 500000 },
    { regex: /\b(gopek)\b/i, val: 500 },
    { regex: /\b(cetiau)\b/i, val: 1000000 },
    { regex: /\b(gotiau)\b/i, val: 5000000 },
    { regex: /\b(setengah\s*juta)\b/i, val: 500000 },
    { regex: /\b(seperempat\s*juta)\b/i, val: 250000 }
  ];

  for (const s of slangTable) {
    const m = low.match(s.regex);
    if (m) {
      return { nominal: s.val, matchedText: m[0] };
    }
  }

  // --- TAHAP 2: Deteksi Digit Gabungan Satuan ---
  // Juta
  let mJt = low.match(/(\d+(?:\.\d+)?)\s*(?:juta|jt)\b/);
  if (mJt) {
    return { nominal: parseFloat(mJt[1]) * 1000000, matchedText: mJt[0] };
  }

  // Ribu / Rebu / Rb / K
  let mRb = low.match(/(\d+(?:\.\d+)?)\s*(?:ribu|rebu|rb|k)\b/);
  if (mRb) {
    return { nominal: parseFloat(mRb[1]) * 1000, matchedText: mRb[0] };
  }

  // Format Rp (mis: Rp 25000, Rp25000)
  let mRp = low.match(/(?:rp|idr)\.?\s*(\d+)/);
  if (mRp) {
    return { nominal: parseFloat(mRp[1]), matchedText: mRp[0] };
  }

  // Angka ribuan murni (>= 1000, mis: 25000, 50000, 100000)
  let mNum = low.match(/\b(\d{4,9})\b/);
  if (mNum) {
    return { nominal: parseFloat(mNum[1]), matchedText: mNum[0] };
  }

  // --- TAHAP 3: Deteksi Angka Kata Bahasa Indonesia ---
  const polaKataAngka = /\b((?:(?:nol|kosong|se|satu|dua|tiga|empat|pat|lima|enam|tujuh|tuju|delapan|lapan|sembilan|sepuluh|sepulu|sebelas|belas|puluh|seratus|ratus|seribu|ribu|rebu|sejuta|juta|setengah)\s*){1,8})\b/i;
  const mKata = low.match(polaKataAngka);
  if (mKata && mKata[1].trim()) {
    const parsedWordNum = convertIndoWordsToNumber(mKata[1]);
    if (parsedWordNum && parsedWordNum > 0) {
      return { nominal: parsedWordNum, matchedText: mKata[0] };
    }
  }

  // --- TAHAP 4: Singkatan santai (misal: "ngopi 25", "seblak 15", "bensin 20") ---
  let mSantai = low.match(/(?:abis|kena|bayar|seharga|beli|buat|dapet)?\s*\b([1-9]\d{0,2})\s*(?:perak|rupiah)?$/);
  if (mSantai) {
    let n = parseFloat(mSantai[1]);
    if (n >= 5 && n <= 500) {
      return { nominal: n * 1000, matchedText: mSantai[1] };
    }
  }

  return null;
}

// Deteksi Keterangan Bersih & Jenis Transaksi dari Kalimat Santai
function parseSuara(kalimatAsli) {
  if (!kalimatAsli || typeof kalimatAsli !== 'string') return null;

  // Bersihkan kata kunci pemicu simpan / selesai di awal
  let text = kalimatAsli.toLowerCase().replace(/\b(simpan|disimpan|selesai|oke simpan|catat)\b/gi, ' ');

  const deteksi = extractNominalDanMatch(text);
  if (!deteksi || !deteksi.nominal) return null;

  const nominal = deteksi.nominal;

  // 1. Tentukan Jenis Transaksi (Masuk vs Keluar)
  const kataMasuk = /\b(kiriman|dikirimin|dikirim|transfer|transferan|ditransfer|ditransferin|dapet|dapat|nerima|terima|pemasukan|gaji|gajian|cair|dikasih|diberi|nemu|nemuin|bonus|thr|angpao|sangu|uang saku|uang jajan|laku|menang|arisan|cashback|kembalian|tips|freelance)\b/i;
  const jenis = kataMasuk.test(text) ? 'masuk' : 'keluar';

  // 2. Bersihkan Keterangan dari nominal dan kata-kata filler / informal
  let ket = text;

  // Hapus bagian nominal yang cocok
  if (deteksi.matchedText) {
    ket = ket.replace(deteksi.matchedText.toLowerCase(), '');
  }

  // Daftar kata umum/informal yang ingin dibersihkan dari keterangan
  const filterKata = [
    // Kata aksi simpan
    /\b(simpan|disimpan|selesai|oke simpan|catat)\b/gi,
    // Subjek santai & formal
    /\b(gue|gua|gw|gueh|ane|aku|kulo|saya|saia|w|lu|lo|loe|kamu|kita|kami)\b/gi,
    // Keterangan waktu / penghubung santai
    /\b(tadi|tadi tuh|barusan|abis|abisan|abisnya|kemarin|semalem|trus|terus|pas|waktu|nih|tuh|dong|deh|ya|kan|sih|loh|lho|cuy|bro|sis|rek|bang|mas|mbak|min|anjir|jir)\b/gi,
    // Kata kerja transaksi
    /\b(beli|beliin|belanja|jajan|bayar|bayarin|ngeluarin|keluar|buat|untuk|kena|seharga|sebesar|senilai|nyari|mesen|pesen|checkout|topup|top up)\b/gi,
    // Kata pemasukan
    /\b(dapet|dapat|nemu|nemukan|dikasih|dikirimin|dikirim|transferan|ditransfer|ditransferin|nerima|terima|kiriman|cair|gajian|gaji|bonus|uang saku|sangu|dari)\b/gi,
    // Satuan & uang
    /\b(rp|rupiah|perak|idr|uang|duit)\b/gi
  ];

  filterKata.forEach(regex => {
    ket = ket.replace(regex, ' ');
  });

  // Hapus karakter non-huruf yang tersisa & rapikan spasi
  ket = ket.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Jika setelah dibersihkan kosong, berikan nama default yang rapi
  if (!ket) {
    ket = jenis === 'masuk' ? 'Uang Masuk' : 'Pengeluaran';
  } else {
    // Title Case
    ket = ket.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return {
    jenis,
    jml: nominal,
    ket
  };
}

// ---------- Pencatatan Data ----------
function catat(jenis, jml, ket) {
  data.trx.push({
    id: Date.now() + Math.random().toString(36).substring(2, 6),
    jenis,
    jml,
    ket,
    waktu: Date.now()
  });
  simpan();
  render();
}

function hapusTrx(id) {
  const item = data.trx.find(x => x.id === id);
  const konfirmasi = confirm(`Hapus catatan "${item ? item.ket : 'transaksi ini'}"?`);
  if (!konfirmasi) return;

  data.trx = data.trx.filter(x => x.id !== id);
  simpan();
  render();
  showToast('Catatan berhasil dihapus');
}

// Pilih Tipe Transaksi (Pengeluaran vs Uang Masuk)
function pilihTipe(tipe) {
  tipeTransaksi = tipe;
  const tabKeluar = document.getElementById('tabKeluar');
  const tabMasuk = document.getElementById('tabMasuk');
  const btnSimpan = document.getElementById('btnSimpanTrx');

  if (tipe === 'keluar') {
    tabKeluar.classList.add('active');
    tabMasuk.classList.remove('active');
    btnSimpan.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5v14M5 12h14"></path>
      </svg>
      Simpan Pengeluaran
    `;
    btnSimpan.style.background = 'var(--primary)';
  } else {
    tabMasuk.classList.add('active');
    tabKeluar.classList.remove('active');
    btnSimpan.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5v14M5 12h14"></path>
      </svg>
      Simpan Uang Masuk
    `;
    btnSimpan.style.background = 'var(--emerald)';
  }
}

// Quick Chip Jumlah
function tambahCepat(nominal) {
  const inputJml = document.getElementById('jml');
  let currentVal = parseFloat(inputJml.value) || 0;
  inputJml.value = currentVal + nominal;
}

function simpanManualBaru() {
  const inputJml = document.getElementById('jml');
  const inputKet = document.getElementById('ket');
  const jml = parseFloat(inputJml.value);
  let ket = inputKet.value.trim();

  if (!jml || jml <= 0) {
    showToast('⚠️ Masukkan nominal uang dulu ya');
    inputJml.focus();
    return;
  }

  if (!ket) {
    ket = tipeTransaksi === 'masuk' ? 'Uang Masuk' : 'Pengeluaran';
  }

  catat(tipeTransaksi, jml, ket);
  inputJml.value = '';
  inputKet.value = '';
  playSoundSuccess();
  showToast('✅ Berhasil mencatat ' + (tipeTransaksi === 'masuk' ? 'uang masuk ' : 'pengeluaran ') + rp(jml));
}

// Modal Pengaturan Jatah
function bukaModalSetting() {
  document.getElementById('setTab').value = data.tab || 0;
  document.getElementById('setOng').value = data.ong || 0;
  document.getElementById('modalSetting').classList.add('open');
}

function tutupModalSetting() {
  document.getElementById('modalSetting').classList.remove('open');
}

function simpanSettingModal() {
  const tabVal = parseFloat(document.getElementById('setTab').value) || 0;
  const ongVal = parseFloat(document.getElementById('setOng').value) || 0;
  data.tab = tabVal;
  data.ong = ongVal;
  simpan();
  tutupModalSetting();
  render();
  playSoundSuccess();
  showToast('✅ Pengaturan jatah mingguan disimpan!');
}

function resetMinggu() {
  if (confirm('Mulai siklus minggu baru sekarang? Catatan minggu ini akan dibersihkan untuk memulai lembaran baru.')) {
    data.trx = [];
    data.mulai = Date.now();
    simpan();
    render();
    playSoundSuccess();
    showToast('✨ Selamat memulai minggu baru!');
  }
}

// Filter Riwayat
function setFilter(filter, el) {
  filterAktif = filter;
  document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
  if (el) el.classList.add('active');
  renderRiwayat();
}

// ---------- Render Tampilan ----------
function render() {
  // Hitung Agregat
  const totalMasuk = data.trx.filter(x => x.jenis === 'masuk').reduce((a, b) => a + b.jml, 0);
  const totalKeluar = data.trx.filter(x => x.jenis === 'keluar').reduce((a, b) => a + b.jml, 0);
  const jatahJajan = Math.max(0, totalMasuk - data.tab - data.ong);
  const sisa = jatahJajan - totalKeluar;

  // Hari dalam minggu
  const selisihHari = Math.floor((Date.now() - data.mulai) / 86400000);
  const hariKe = Math.min(7, Math.max(1, selisihHari + 1));
  const sisaHari = Math.max(1, 8 - hariKe);

  // Update Hero Card
  document.getElementById('sisa').textContent = rp(sisa);
  document.getElementById('hariBadge').textContent = `Hari ${hariKe} / 7`;
  document.getElementById('statMasuk').textContent = rp(totalMasuk);
  document.getElementById('statJatah').textContent = rp(jatahJajan);
  document.getElementById('statKeluar').textContent = rp(totalKeluar);

  const jatahHarian = Math.max(0, sisa) / sisaHari;
  document.getElementById('perhari').textContent =
    `Boleh jajan sekitar ${rp(jatahHarian)}/hari untuk ${sisaHari} hari ke depan`;

  // Progress Bar Jatah
  let persen = 0;
  if (jatahJajan > 0) {
    persen = Math.round((totalKeluar / jatahJajan) * 100);
  } else if (totalKeluar > 0) {
    persen = 100;
  }

  const progressFill = document.getElementById('progressFill');
  const progressPersen = document.getElementById('progressPersen');
  progressPersen.textContent = persen + '%';
  progressFill.style.width = Math.min(100, persen) + '%';

  progressFill.className = 'progress-fill';
  if (persen > 85) {
    progressFill.classList.add('danger');
  } else if (persen > 60) {
    progressFill.classList.add('warning');
  }

  // Status & Analisis Finansial
  let kelasStatus = 'pas';
  let iconStatus = '⚡';
  let teksStatus = 'Pas, pengeluaranmu terkontrol sesuai jatah mingguan.';

  if (jatahJajan > 0) {
    const ratioPakai = totalKeluar / jatahJajan;
    const targetIdeal = hariKe / 7;
    if (totalKeluar > jatahJajan || ratioPakai > targetIdeal + 0.18) {
      kelasStatus = 'boros';
      iconStatus = '🚨';
      teksStatus = 'Boros! Pemakaian jajanmu lebih cepat dari waktu minggu ini, yuk lebih hemat!';
    } else if (ratioPakai < targetIdeal - 0.15) {
      kelasStatus = 'hemat';
      iconStatus = '🌟';
      teksStatus = 'Super hemat! Pengeluaran masih sangat aman, bisa dialihkan ke tabungan ekstra.';
    }
  } else if (totalMasuk === 0) {
    kelasStatus = 'pas';
    iconStatus = '💡';
    teksStatus = 'Catat uang masuk mingguanmu untuk mulai menghitung jatah jajan otomatis.';
  }

  const banner = document.getElementById('statusBanner');
  banner.className = `status-banner ${kelasStatus}`;
  document.getElementById('statusIcon').textContent = iconStatus;
  document.getElementById('statusText').textContent = teksStatus;

  // Breakdown List
  let b = '';
  b += `
    <div class="breakdown-row">
      <span class="breakdown-label">💰 Total Pemasukan</span>
      <span class="breakdown-value text-success">${rp(totalMasuk)}</span>
    </div>
    <div class="breakdown-row">
      <span class="breakdown-label">🏦 Target Tabungan</span>
      <span class="breakdown-value">${rp(data.tab)}</span>
    </div>
    <div class="breakdown-row">
      <span class="breakdown-label">🛵 Jatah Ongkos / Transport</span>
      <span class="breakdown-value">${rp(data.ong)}</span>
    </div>
    <div class="breakdown-row">
      <span class="breakdown-label">🎯 Total Bersih Jatah Jajan</span>
      <span class="breakdown-value" style="color: var(--primary);">${rp(jatahJajan)}</span>
    </div>
    <div class="breakdown-row">
      <span class="breakdown-label">💸 Total Pengeluaran Jajan</span>
      <span class="breakdown-value" style="color: var(--rose);">${rp(totalKeluar)}</span>
    </div>
  `;
  document.getElementById('laporan').innerHTML = b;

  renderRiwayat();
}

function renderRiwayat() {
  let listTrx = data.trx.slice().reverse();
  
  if (filterAktif === 'keluar') {
    listTrx = listTrx.filter(x => x.jenis === 'keluar');
  } else if (filterAktif === 'masuk') {
    listTrx = listTrx.filter(x => x.jenis === 'masuk');
  }

  document.getElementById('trxCount').textContent = `${data.trx.length} catatan`;

  if (listTrx.length === 0) {
    document.getElementById('riwayat').innerHTML = `
      <div class="empty-history">
        <div class="empty-icon">🌱</div>
        <div><b>Belum ada catatan</b></div>
        <div style="font-size: 12px;">Bicara santai lewat suara atau catat manual di atas untuk mulai.</div>
      </div>
    `;
    return;
  }

  let html = '';
  listTrx.forEach(x => {
    if (!x.id) x.id = 'trx_' + Math.random().toString(36).substring(2, 9);

    const tgl = new Date(x.waktu).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    const icon = getCategoryIcon(x.ket, x.jenis);
    const isMasuk = x.jenis === 'masuk';

    html += `
      <div class="history-item">
        <div class="history-left">
          <div class="cat-icon-badge ${x.jenis}">${icon}</div>
          <div class="history-meta">
            <span class="history-title">${x.ket}</span>
            <span class="history-date">${tgl}</span>
          </div>
        </div>
        <div class="history-right">
          <span class="history-amount ${isMasuk ? 'in' : 'out'}">
            ${isMasuk ? '+' : '-'}${rp(x.jml)}
          </span>
          <button class="btn-del-trx" onclick="hapusTrx('${x.id}')" title="Hapus catatan">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  });

  document.getElementById('riwayat').innerHTML = html;
}

// Eksekusi Input Teks Suara / Simulasi Ucapan
function prosesTeksInput(kalimat) {
  const p = parseSuara(kalimat);
  const out = document.getElementById('hasilSuara');

  if (p) {
    catat(p.jenis, p.jml, p.ket);
    playSoundSuccess();
    out.innerHTML = `
      <div><span class="hint-label">🎯 Terdengar:</span> "${kalimat}"</div>
      <div style="margin-top: 4px;">
        <span class="hint-label">✅ Otomatis Tersimpan:</span> 
        <b style="color: ${p.jenis === 'masuk' ? 'var(--emerald)' : 'var(--rose)'}">
          ${p.jenis === 'masuk' ? '+ ' : '- '}${rp(p.jml)} (${p.ket})
        </b>
      </div>
    `;
    showToast('✅ Berhasil dicatat: ' + rp(p.jml) + ' (' + p.ket + ')');
    return true;
  } else {
    playSoundCancel();
    out.innerHTML = `
      <div><span class="hint-label">⚠️ Terdengar:</span> "${kalimat}"</div>
      <div style="font-size: 12px; color: var(--rose-dark); margin-top: 4px;">
        Nominal belum terdeteksi. Kamu bisa sebut angka dengan kata (mis: <i>"dua puluh ribu"</i>), slang (mis: <i>"ceban"</i>, <i>"goceng"</i>, <i>"gocap"</i>), atau digit (mis: <i>"25k"</i>, <i>"15 rebu"</i>).
      </div>
    `;
    return false;
  }
}

// Fungsi Tes Ucapan untuk tombol chip contoh
function tesUcapan(kalimat) {
  prosesTeksInput(kalimat);
}

// =================================================================
// 🎙️ VOICE INPUT (SPEECH RECOGNITION DENGAN EFEK SUARA & AUTO-SAVE)
// =================================================================

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const mic = document.getElementById('mic');
const micText = document.getElementById('micText');
const hasilSuara = document.getElementById('hasilSuara');

if (!SR) {
  if (micText) micText.textContent = 'Browser belum mendukung suara (gunakan Safari iOS atau Chrome)';
  if (mic) {
    mic.disabled = true;
    mic.style.opacity = '0.7';
    mic.style.cursor = 'not-allowed';
  }
} else {
  const rec = new SR();
  rec.lang = 'id-ID';
  rec.interimResults = true; // Transkripsi live
  rec.maxAlternatives = 5;

  let sedangMerekam = false;
  let timerDiam = null;          // Timer deteksi hening (silence detection)
  let timerBatasMaksimal = null; // Timer keamanan batas waktu rekaman
  let teksTerakhirDidengar = ''; // Teks terakhir yang berhasil ditangkap
  let sudahDisimpan = false;     // Mencegah double-saving

  function resetMicVisual() {
    sedangMerekam = false;
    mic.classList.remove('on');
    micText.textContent = 'Tekan lalu bicara santai';
  }

  function selesaikanDanSimpan(teks) {
    if (sudahDisimpan) return;
    sudahDisimpan = true;

    // Bersihkan semua timer
    if (timerDiam) { clearTimeout(timerDiam); timerDiam = null; }
    if (timerBatasMaksimal) { clearTimeout(timerBatasMaksimal); timerBatasMaksimal = null; }

    // Hentikan rekaman di browser/iOS
    try { rec.stop(); } catch (err) {}
    resetMicVisual();

    // Haptic feedback jika didukung perangkat (vibrasi sukses halus)
    if (navigator.vibrate) {
      try { navigator.vibrate(40); } catch (e) {}
    }

    if (teks && teks.trim()) {
      prosesTeksInput(teks.trim());
    } else {
      playSoundCancel();
    }
  }

  mic.onclick = () => {
    // Pastikan AudioContext di-resume/diaktifkan melalui gesture klik pengguna
    getAudioContext();

    // Jika sedang merekam dan tombol ditekan lagi, langsung simpan apa yang terdengar
    if (sedangMerekam) {
      if (teksTerakhirDidengar) {
        selesaikanDanSimpan(teksTerakhirDidengar);
      } else {
        if (timerDiam) clearTimeout(timerDiam);
        if (timerBatasMaksimal) clearTimeout(timerBatasMaksimal);
        try { rec.stop(); } catch (e) {}
        resetMicVisual();
        playSoundCancel();
      }
      return;
    }

    // Mulai rekaman baru
    try {
      sedangMerekam = true;
      sudahDisimpan = false;
      teksTerakhirDidengar = '';

      // Mainkan suara mulai bicara (Start Chime)
      playSoundStart();

      mic.classList.add('on');
      micText.textContent = 'Mendengarkan... (Katakan "Simpan" / Berhenti bicara)';
      hasilSuara.innerHTML = '<span class="interim-text">🎙️ Sedang mendengarkan... Bicara saja santai</span>';

      rec.start();

      // Batas waktu keamanan maksimal 15 detik (agar tidak merekam selamanya jika background noise)
      timerBatasMaksimal = setTimeout(() => {
        if (sedangMerekam && !sudahDisimpan) {
          selesaikanDanSimpan(teksTerakhirDidengar);
        }
      }, 15000);

    } catch (e) {
      try { rec.stop(); } catch (err) {}
      resetMicVisual();
    }
  };

  rec.onresult = e => {
    let teksSemua = '';

    // Ambil seluruh transcript (baik interim maupun final)
    for (let i = 0; i < e.results.length; i++) {
      let subText = e.results[i][0].transcript;
      for (let a = 0; a < e.results[i].length; a++) {
        if (extractNominalDanMatch(e.results[i][a].transcript)) {
          subText = e.results[i][a].transcript;
          break;
        }
      }
      teksSemua += subText + ' ';
    }

    teksSemua = teksSemua.trim();
    if (!teksSemua) return;

    teksTerakhirDidengar = teksSemua;

    // Tampilkan teks yang sedang didengar secara live di layar
    hasilSuara.innerHTML = `
      <div><span class="hint-label">🎙️ Mendengarkan:</span> <span class="interim-text">"${teksSemua}"...</span></div>
      <div style="font-size: 11px; color: var(--text-dim); margin-top: 3px;">
        ⚡ Bilang "<b>simpan</b>" atau <b>diam sejenak</b> untuk langsung menyimpan otomatis.
      </div>
    `;

    // -------------------------------------------------------------
    // FITUR 1: DETEKSI KATA KUNCI "SIMPAN" / "SELESAI" / "CATAT"
    // Begitu pengguna menyebut "simpan", langsung stop, bunyi lonceng & simpan!
    // -------------------------------------------------------------
    const polaKataSimpan = /\b(simpan|oke simpan|selesai|catat)\b/i;
    if (polaKataSimpan.test(teksSemua)) {
      selesaikanDanSimpan(teksSemua);
      return;
    }

    // -------------------------------------------------------------
    // FITUR 2: DETEKSI DIAM / HENING (AUTO-SAVE SAAT PENGGUNA DIAM)
    // -------------------------------------------------------------
    if (timerDiam) clearTimeout(timerDiam);

    const adaNominal = extractNominalDanMatch(teksSemua);
    const jedaDiam = adaNominal ? 1200 : 2200;

    timerDiam = setTimeout(() => {
      if (sedangMerekam && !sudahDisimpan && teksSemua) {
        selesaikanDanSimpan(teksSemua);
      }
    }, jedaDiam);
  };

  rec.onend = () => {
    if (sedangMerekam && !sudahDisimpan && teksTerakhirDidengar) {
      selesaikanDanSimpan(teksTerakhirDidengar);
    } else {
      resetMicVisual();
    }
  };

  rec.onerror = event => {
    if (event.error === 'no-speech') {
      if (!teksTerakhirDidengar) {
        resetMicVisual();
        playSoundCancel();
        hasilSuara.innerHTML = '<span class="hint-label">💡 Tidak terdengar suara:</span> Silakan tekan tombol mic dan coba bicara lagi.';
      }
      return;
    }

    resetMicVisual();
    if (event.error !== 'aborted') {
      playSoundCancel();
      hasilSuara.innerHTML = '<span class="hint-label">⚠️ Kendala mikrofon:</span> Pastikan izin mikrofon telah diizinkan di browser iOS / Safari.';
    }
  };
}

// Event Listeners
document.getElementById('btnOpenSetting').addEventListener('click', bukaModalSetting);
document.getElementById('btnResetMinggu').addEventListener('click', resetMinggu);

// Shortcut keyboard Enter
document.getElementById('jml').addEventListener('keyup', e => {
  if (e.key === 'Enter') simpanManualBaru();
});
document.getElementById('ket').addEventListener('keyup', e => {
  if (e.key === 'Enter') simpanManualBaru();
});

// Tutup modal jika klik overlay
document.getElementById('modalSetting').addEventListener('click', e => {
  if (e.target.id === 'modalSetting') tutupModalSetting();
});

// Render Tampilan Pertama
render();
