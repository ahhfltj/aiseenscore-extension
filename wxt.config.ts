import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AI Seen Score',
    description:
      'Check how readable your site is for AI crawlers, and whether AI answers mention your brand.',
    permissions: ['activeTab', 'scripting', 'storage'],
    icons: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 128: 'icon/128.png' },
    action: { default_title: 'AI Seen Score' },
  },
});
