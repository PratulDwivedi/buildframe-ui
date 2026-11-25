// Plain functions with no React and no browser: safe in server components, route handlers and export routes.
export * from "./data/list";
export { brandCss, readableOn, isHex, type BrandColours } from "./lib/brand";
export { safeNext, authMessage, signInErrorText, AUTH_MESSAGES, type AuthMessageCode } from "./auth/messages";
export * from "./dashboard/series";
export { CATEGORY_COUNT, categoryOf, categoryStyle } from "./lib/category";
export { themeInitScript, type ThemeDefault } from "./theme/init";
export { APPEARANCE_MODES, appearanceErrors, brandFromAppearance, emptyAppearance, isAppearanceMode, type AppearanceMode, type AppearanceValue } from "./site/appearance";
export { initials, type AvatarUser } from "./people/initials";
