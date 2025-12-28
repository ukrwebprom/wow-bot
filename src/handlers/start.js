import { mainMenuKb, languageSelectKb } from "../ui/keyboards.js";
import { getProfile } from "../storage/profiles.js";
import { t } from "../i18n/t.js";

const normLang = (v) => {
  const s = String(v || "").trim().toUpperCase();
  return s === "RU" || s === "UA" || s === "EN" ? s : "EN";
};

export function registerStart(bot, { userState }) {
  bot.start(async (ctx) => {
    userState.set(ctx.from.id, { mode: "idle" });

    const profile = await getProfile(ctx.from.id);

    if (!profile?.language) {
      await ctx.reply(t("language.choose", "EN"), languageSelectKb);
      return;
    }

    const lang = normLang(profile.language);

    await ctx.reply(t("home.welcome", lang), mainMenuKb);
  });
}
