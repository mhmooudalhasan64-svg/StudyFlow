export function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#05040f' : '#f5f3ff');
}
