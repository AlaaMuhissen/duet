import { zipSync, strToU8 } from "fflate";
import { writeFileSync } from "node:fs";

let clock = Date.parse("2024-03-01T10:00:00Z");
function e(title, id, channel, { music = false, gap = 240 } = {}) {
  clock += gap * 1000 + Math.floor(Math.random() * 600000);
  return {
    header: music ? "YouTube Music" : "YouTube",
    title: "Watched " + title,
    titleUrl: `https://${music ? "music" : "www"}.youtube.com/watch?v=${id}`,
    subtitles: channel ? [{ name: channel, url: "https://www.youtube.com/channel/x" }] : undefined,
    time: new Date(clock).toISOString(),
    products: ["YouTube"],
    activityControls: ["YouTube watch history"],
  };
}
const rep = (n, f) => Array.from({ length: n }, f);
const noise = () => [
  e("How to make pasta in 10 minutes", "pasta000001", "Tasty"),
  e("React Server Components explained", "rsc00000001", "Fireship"),
  e("Daily vlog 42", "vlog0000042", "Some Vlogger"),
  e("https://www.youtube.com/watch?v=gone0000001", "gone0000001", null),
];

// IDs are real-looking 11-char ids. Playback isn't tested here.
const alaa = [
  ...rep(12, () => e("The Weeknd - Blinding Lights (Official Video)", "4NRXx6U8ABQ", "TheWeekndVEVO")),
  ...rep(6, () => e("Blinding Lights", "fHI8X4OXluQ", "The Weeknd - Topic", { music: true })),
  ...rep(14, () => e("Amr Diab - Tamally Maak | عمرو دياب - تملي معاك", "EgmXTmj62ic", "Amr Diab")),
  ...rep(9, () => e("Ya Lili", "yaLili00001", "Balti - Topic", { music: true })),
  ...rep(7, () => e("Enta Eih", "entaEih0001", "Nancy Ajram - Topic", { music: true })),
  ...rep(5, () => e("Levitating", "levitate001", "Dua Lipa - Topic", { music: true })),
  ...rep(4, () => e("Fairuz - Kifak Inta (Official Audio)", "kifak000001", "Fairuz")),
  ...rep(8, () => e("Flowers", "flowers0001", "Miley Cyrus - Topic", { music: true })),
  ...rep(3, () => e("Coldplay - Yellow (Official Video)", "yellow00001", "Coldplay")),
  ...rep(6, () => e("وائل كفوري - بحبك وبغار (فيديو كليب)", "wael0000001", "Wael Kfoury")),
  ...rep(3, noise).flat(),
];
const sara = [
  ...rep(7, () => e("The Weeknd - Blinding Lights (Lyrics)", "lyrics00001", "7clouds")),
  ...rep(11, () => e("Tamally Maak", "amrTopic001", "Amr Diab - Topic", { music: true })),
  ...rep(3, () => e("Nancy Ajram - Enta Eih (Official Video)", "nancyVid001", "Nancy Ajram")),
  ...rep(9, () => e("Levitating", "levitate001", "Dua Lipa - Topic", { music: true })),
  ...rep(5, () => e("Ya Lili", "yaLili00001", "Balti - Topic", { music: true })),
  ...rep(10, () => e("Nour El Ein", "nour0000001", "Amr Diab - Topic", { music: true })),
  ...rep(6, () => e("Coldplay - Viva La Vida (Official Video)", "viva0000001", "Coldplay")),
  ...rep(4, () => e("Wael Kfoury - Bhebbak W Bghar", "wael0000002", "Wael Kfoury - Topic", { music: true })),
  ...rep(2, noise).flat(),
];
// Alaa: English folder names. Sara: Hebrew account, translated folder names.
writeFileSync("e2e/alaa-takeout.zip", zipSync({ "Takeout/YouTube and YouTube Music/history/watch-history.json": strToU8(JSON.stringify(alaa.reverse())) }));
writeFileSync("e2e/sara-takeout.zip", zipSync({ "Takeout/YouTube ו-YouTube Music/היסטוריה/היסטוריית צפייה.json": strToU8(JSON.stringify(sara.reverse())) }));
writeFileSync("e2e/wrong.json", JSON.stringify({ hello: "world" }));
console.log("alaa", alaa.length, "sara", sara.length);
